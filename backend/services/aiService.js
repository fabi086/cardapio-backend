const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const pushService = require('./pushService');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

class AIService {
    constructor() {
        this.settings = null;
        this.openai = null;
        console.log('AIService initialized');
    }

    async loadSettings() {
        const { data: aiData, error: aiError } = await supabase
            .from('ai_integration_settings')
            .select('*')
            .single();

        const { data: businessData, error: businessError } = await supabase
            .from('business_settings')
            .select('whatsapp')
            .single();

        if (aiData) {
            this.settings = { ...aiData };

            // Merge whatsapp from business settings
            if (businessData && businessData.whatsapp) {
                this.settings.whatsapp = businessData.whatsapp;
            }

            const apiKey = aiData.openai_api_key ? aiData.openai_api_key.trim() : process.env.OPENAI_API_KEY;

            if (apiKey) {
                this.openai = new OpenAI({ apiKey: apiKey });
            } else {
                console.error('OpenAI API Key missing in settings and env vars');
                this.logToDb('error', 'OpenAI API Key missing', { context: 'loadSettings' });
            }
        }
        return this.settings;
    }

    async logToDb(level, message, details = {}) {
        try {
            console.log(`[${level.toUpperCase()}] ${message}`, details);
            // Fire and forget - don't await availability check if table missing
            const { error } = await supabase.from('system_logs').insert([{
                level,
                message,
                details,
                created_at: new Date()
            }]);

            if (error) console.error('Failed to write to system_logs:', error.message);
        } catch (err) {
            console.error('Error in logToDb:', err);
        }
    }

    // --- HELPERS ---
    formatPhone(phone) {
        if (!phone) return phone;
        let cleaned = phone.replace(/\D/g, '');

        if (cleaned.length > 15) return cleaned;

        if (cleaned.length === 8 || cleaned.length === 9) {
            cleaned = '5511' + cleaned;
        }
        else if (cleaned.length === 10 || cleaned.length === 11) {
            cleaned = '55' + cleaned;
        }

        return cleaned;
    }

    // Buscar endereço pelo CEP usando ViaCEP
    async lookupCep(cep) {
        try {
            const cleanCep = cep.replace(/\D/g, '');
            if (cleanCep.length !== 8) {
                return { error: 'CEP deve ter 8 dígitos' };
            }

            const response = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);

            if (response.data.erro) {
                return { error: 'CEP não encontrado' };
            }

            return {
                cep: response.data.cep,
                street: response.data.logradouro,
                neighborhood: response.data.bairro,
                city: response.data.localidade,
                state: response.data.uf,
                success: true
            };
        } catch (error) {
            console.error('Erro ao buscar CEP:', error.message);
            return { error: 'Erro ao buscar CEP' };
        }
    }

    // Buscar cliente pelo telefone
    async getCustomerByPhone(phone) {
        try {
            const formattedPhone = this.formatPhone(phone);

            // Buscar cliente
            const { data: customer, error } = await supabase
                .from('customers')
                .select('*')
                .eq('phone', formattedPhone)
                .single();

            if (error || !customer) {
                return JSON.stringify({
                    found: false,
                    message: 'Cliente não encontrado. Precisamos fazer um cadastro rápido!'
                });
            }

            // Buscar endereços do cliente
            const { data: addresses } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', customer.id)
                .order('is_default', { ascending: false });

            // Buscar último pedido
            const { data: lastOrder } = await supabase
                .from('orders')
                .select('id, order_number, total, status, created_at, customer_address')
                .eq('customer_phone', formattedPhone)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return JSON.stringify({
                found: true,
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                cep: customer.cep,
                street: customer.street,
                number: customer.number,
                neighborhood: customer.neighborhood,
                city: customer.city,
                addresses: addresses || [], // Retorna a lista de endereços
                lastOrder: lastOrder ? {
                    orderNumber: lastOrder.order_number,
                    total: lastOrder.total,
                    address: lastOrder.customer_address,
                    date: lastOrder.created_at
                } : null,
                message: `Cliente encontrado: ${customer.name}`
            });
        } catch (error) {
            console.error('Erro ao buscar cliente:', error.message);
            return JSON.stringify({ error: 'Erro ao buscar cliente' });
        }
    }

    // --- TOOLS IMPLEMENTATION ---

    async getMenu(categoryName = null) {
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');

        const logToFile = (msg) => {
            try {
                fs.appendFileSync(logFile, `${new Date().toISOString()} - [getMenu] ${msg}\n`);
            } catch (e) {
                console.error('Failed to write to log file:', e);
            }
        };

        logToFile(`Tool called: getMenu with category: ${categoryName || 'all'}`);

        try {
            // Fetch categories first
            const { data: categories, error: catError } = await supabase
                .from('categories')
                .select('id, name')
                .order('display_order');

            if (catError) {
                logToFile(`Error fetching categories: ${catError.message}`);
            }

            // Build query
            let query = supabase
                .from('products')
                .select('id, name, description, price, category_id, track_stock, stock_quantity, paused')
                .eq('is_available', true);

            // If category specified, filter by it
            if (categoryName && categories) {
                const category = categories.find(c =>
                    c.name.toLowerCase().includes(categoryName.toLowerCase()) ||
                    categoryName.toLowerCase().includes(c.name.toLowerCase())
                );
                if (category) {
                    query = query.eq('category_id', category.id);
                    logToFile(`Filtering by category: ${category.name} (id: ${category.id})`);
                }
            }

            const { data: productsData, error } = await query;

            if (error) {
                logToFile(`Supabase Error: ${JSON.stringify(error)}`);
                return JSON.stringify({ error: error.message });
            }

            // Filter out stock items and paused products
            const products = productsData.filter(p => (!p.track_stock || p.stock_quantity > 0) && !p.paused);

            logToFile(`Query success. Found ${products ? products.length : 0} items (after stock filter).`);

            // If no category specified, show ALL products grouped by category
            if (!categoryName && categories && categories.length > 0) {
                // Group products by category
                const productsByCategory = {};

                categories.forEach(cat => {
                    const categoryProducts = products.filter(p => p.category_id === cat.id);
                    if (categoryProducts.length > 0) {
                        productsByCategory[cat.name] = categoryProducts.map(p => ({
                            id: p.id,
                            name: p.name,
                            price: parseFloat(p.price).toFixed(2)
                        }));
                    }
                });

                return JSON.stringify({
                    type: 'full_menu',
                    categories: productsByCategory,
                    totalProducts: products.length,
                    instruction: 'Mostre o cardápio de forma LIMPA e LEGÍVEL para WhatsApp. Use este formato EXATO:\n\n🍕 *CATEGORIA*\n\n• Nome do Produto - R$ XX,XX\n• Outro Produto - R$ XX,XX\n\n(linha em branco entre categorias)\n\nAPENAS nome e preço. SEM descrições. Use quebras de linha duplas entre categorias.'
                });
            }

            // Format products for WhatsApp-friendly display (single category)
            const formattedProducts = products.map(p => ({
                id: p.id,
                name: p.name,
                price: parseFloat(p.price).toFixed(2)
            }));

            return JSON.stringify({
                type: 'category_menu',
                products: formattedProducts,
                count: formattedProducts.length,
                instruction: 'Mostre apenas NOME e PREÇO. Formato: • Nome - R$ XX,XX (uma linha por produto). SEM descrições.'
            });
        } catch (err) {
            logToFile(`Unexpected Error: ${err.message}`);
            return JSON.stringify({ error: err.message });
        }
    }

    async calculateDeliveryFee(cep) {
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Calculating delivery fee for CEP: ${cep}`);

        try {
            // Buscar zonas de entrega ativas
            const { data: zones, error } = await supabase
                .from('delivery_zones')
                .select('*')
                .eq('active', true);

            if (error) {
                log(`Error fetching zones: ${error.message}`);
                return { fee: null, zone: null, error: 'Erro ao buscar zonas de entrega' };
            }

            if (!zones || zones.length === 0) {
                log('No delivery zones configured');
                return { fee: 0, zone: null, error: null, message: 'Sem zonas configuradas, frete grátis' };
            }

            const cleanCep = parseInt(cep.replace(/\D/g, ''));
            log(`Clean CEP: ${cleanCep}`);

            for (const zone of zones) {
                const start = parseInt(zone.cep_start.replace(/\D/g, ''));
                const end = parseInt(zone.cep_end.replace(/\D/g, ''));

                if (cleanCep >= start && cleanCep <= end) {
                    // Verificar CEPs excluídos
                    if (zone.excluded_ceps) {
                        const excluded = zone.excluded_ceps.split(',')
                            .map(c => parseInt(c.trim().replace(/\D/g, '')));
                        if (excluded.includes(cleanCep)) {
                            log(`CEP ${cleanCep} is in excluded list for zone ${zone.name}`);
                            continue;
                        }
                    }

                    log(`CEP ${cleanCep} found in zone: ${zone.name}, fee: ${zone.fee}`);
                    return {
                        fee: zone.fee,
                        zone: zone.name,
                        estimated_time: zone.estimated_time,
                        min_order: zone.min_order,
                        error: null
                    };
                }
            }

            log(`CEP ${cleanCep} not found in any zone`);
            return { fee: null, zone: null, error: 'CEP fora da área de entrega' };
        } catch (err) {
            log(`Error calculating delivery fee: ${err.message}`);
            return { fee: null, zone: null, error: 'Erro ao calcular frete' };
        }
    }

    async registerCustomer({ name, phone, address, cep, street, number, complement, neighborhood, city, state }) {
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Tool called: registerCustomer. Input: ${JSON.stringify({ name, phone, address, cep, street, number, complement, neighborhood, city, state })}`);

        const formattedPhone = this.formatPhone(phone);
        log(`Formatted phone: ${formattedPhone}`);

        // Buscar cliente existente
        const { data: existing } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', formattedPhone)
            .single();

        if (existing) {
            // Cliente existe - atualizar se novos dados fornecidos
            const updateData = {};
            if (name && name !== existing.name) updateData.name = name;
            if (address && address !== existing.address) updateData.address = address;
            if (cep && cep !== existing.cep) updateData.cep = cep;
            if (street && street !== existing.street) updateData.street = street;
            if (number && number !== existing.number) updateData.number = number;
            if (complement && complement !== existing.complement) updateData.complement = complement;
            if (neighborhood && neighborhood !== existing.neighborhood) updateData.neighborhood = neighborhood;
            if (city && city !== existing.city) updateData.city = city;
            if (state && state !== existing.state) updateData.state = state;

            if (Object.keys(updateData).length > 0) {
                await supabase.from('customers').update(updateData).eq('id', existing.id);
                log(`Customer updated: ${existing.id}`);
            }

            // Tentar salvar/atualizar endereço na nova tabela também se dados fornecidos
            if (street || address) {
                const fullAddress = street
                    ? `${street}, ${number}${complement ? ' - ' + complement : ''}, ${neighborhood}, ${city}/${state}`
                    : address;

                // Primeiro, desmarcar todos os endereços como padrão para este cliente
                await supabase.from('customer_addresses')
                    .update({ is_default: false })
                    .eq('customer_id', existing.id);

                // Inserir o novo endereço e marcá-lo como padrão
                const { error: addrError } = await supabase
                    .from('customer_addresses')
                    .insert([{
                        customer_id: existing.id,
                        label: 'Atual',
                        address: fullAddress,
                        cep,
                        street,
                        number,
                        complement,
                        neighborhood,
                        city,
                        state,
                        is_default: true // Marca este como o novo padrão
                    }]);
                if (addrError) {
                    log(`Error saving customer address for existing customer: ${addrError.message}`);
                }
            }

            log(`Customer already exists: ${existing.id}`);
            return JSON.stringify({
                success: true,
                customerId: existing.id,
                customerExists: true,
                savedData: {
                    name: existing.name,
                    address: existing.address,
                    cep: existing.cep,
                    street: existing.street,
                    number: existing.number,
                    complement: existing.complement,
                    neighborhood: existing.neighborhood,
                    city: existing.city,
                    state: existing.state
                },
                message: 'Cliente já cadastrado. Dados salvos carregados.'
            });
        }

        // Cliente novo - cadastrar
        const { data, error } = await supabase
            .from('customers')
            .insert([{
                name,
                phone: formattedPhone,
                address, // Manter legado para compatibilidade
                cep,
                street,
                number,
                complement,
                neighborhood,
                city,
                state
            }])
            .select()
            .single();

        if (error) {
            log(`Error registering customer: ${error.message}`);
            return JSON.stringify({ error: error.message });
        }

        // Salvar na tabela de endereços (Multi-endereços)
        if (address || street) {
            const fullAddress = street
                ? `${street}, ${number}${complement ? ' - ' + complement : ''}, ${neighborhood}, ${city}/${state}`
                : address;

            const { error: addrError } = await supabase
                .from('customer_addresses')
                .insert([{
                    customer_id: data.id,
                    label: 'Casa', // Padrão inicial
                    address: fullAddress,
                    cep,
                    street,
                    number,
                    complement,
                    neighborhood,
                    city,
                    state,
                    is_default: true
                }]);

            if (addrError) log(`Error saving customer address: ${addrError.message}`);
        }

        log(`Customer registered: ${data.id}`);
        return JSON.stringify({
            success: true,
            customerId: data.id,
            customerExists: false,
            message: 'Cliente cadastrado com sucesso!'
        });
    }

    async createOrder({ customerPhone, items, paymentMethod, changeFor, cep, deliveryType = 'delivery' }) {
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`===== CREATE ORDER CALLED =====`);
        log(`Input customerPhone: ${customerPhone}`);
        log(`Input items: ${JSON.stringify(items)}`);
        log(`Input paymentMethod: ${paymentMethod}`);
        log(`Input cep: ${cep}`);
        log(`Input deliveryType: ${deliveryType}`);

        const formattedPhone = this.formatPhone(customerPhone);
        log(`Formatted customer phone: ${formattedPhone}`);

        // 1. Buscar cliente
        const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', formattedPhone)
            .single();

        if (!customer) {
            log(`Customer not found for phone: ${formattedPhone}`);
            return JSON.stringify({
                error: `Cliente não encontrado para o telefone ${formattedPhone}. Registre primeiro com register_customer.`
            });
        }

        log(`Customer found: ID=${customer.id}, Name=${customer.name}, Phone=${customer.phone}`);

        // 2. Calcular taxa de entrega
        let deliveryFee = 0;
        let deliveryZone = null;

        if (deliveryType === 'delivery') {
            const cepToUse = cep || customer.cep;
            if (cepToUse) {
                const feeResult = await this.calculateDeliveryFee(cepToUse);

                if (feeResult.error) {
                    log(`Delivery fee calculation error: ${feeResult.error}`);
                    return JSON.stringify({
                        error: feeResult.error,
                        suggestion: 'Tente outro CEP ou escolha retirada no local.'
                    });
                }

                deliveryFee = feeResult.fee || 0;
                deliveryZone = feeResult.zone;
                log(`Delivery fee calculated: ${deliveryFee} for zone: ${deliveryZone}`);
            } else {
                log('No CEP provided for delivery, fee = 0');
            }
        }

        // 3. Calcular total
        let subtotal = 0;
        const orderItemsData = [];
        const notFoundProducts = []; // Rastrear produtos não encontrados

        for (const item of items) {
            log(`Processing item: ${JSON.stringify(item)}`);
            let product = null;
            const searchTerm = item.productName || item.productId;

            // 1. Try to find by ID if it looks like a UUID
            if (item.productId && typeof item.productId === 'string' && item.productId.length > 20) {
                const { data } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', item.productId)
                    .single();
                product = data;
            }

            // 2. If not found, try by Name
            if (!product) {
                log(`Looking up product by name: ${searchTerm}`);

                if (typeof searchTerm === 'string') {
                    // 1. FIRST: Try exact match (case-insensitive)
                    let { data: exactData } = await supabase
                        .from('products')
                        .select('*')
                        .ilike('name', searchTerm)
                        .eq('is_available', true)
                        .limit(1);

                    if (exactData && exactData.length > 0) {
                        product = exactData[0];
                        log(`Product found by exact match: ${product.name} (ID: ${product.id})`);
                    }

                    // 2. If not found, try contains search
                    if (!product) {
                        let { data } = await supabase
                            .from('products')
                            .select('*')
                            .ilike('name', `%${searchTerm}%`)
                            .eq('is_available', true);

                        // If multiple results, try to find best match
                        if (data && data.length > 1) {
                            // Score matches by how close they are
                            const searchLower = searchTerm.toLowerCase();
                            data.sort((a, b) => {
                                const aName = a.name.toLowerCase();
                                const bName = b.name.toLowerCase();
                                // Prefer exact word match
                                const aExact = aName === searchLower ? 100 : 0;
                                const bExact = bName === searchLower ? 100 : 0;
                                // Prefer name contains full search term
                                const aContains = aName.includes(searchLower) ? 50 : 0;
                                const bContains = bName.includes(searchLower) ? 50 : 0;
                                // Prefer shorter names (more specific)
                                const aLen = 30 - Math.min(aName.length, 30);
                                const bLen = 30 - Math.min(bName.length, 30);
                                return (bExact + bContains + bLen) - (aExact + aContains + aLen);
                            });
                            log(`Multiple matches found, sorted: ${data.map(p => p.name).join(', ')}`);
                        }

                        if (data && data.length > 0) {
                            product = data[0];
                            log(`Product found by contains: ${product.name} (ID: ${product.id})`);
                        }
                    }

                    // 3. Fallback: try splitting words for pizza flavors
                    if (!product) {
                        const cleanSearch = searchTerm.replace(/meia|1\/2|pizza|com|sem/gi, '').trim();
                        const { data: flavorData } = await supabase
                            .from('products')
                            .select('*')
                            .ilike('name', `%${cleanSearch}%`)
                            .eq('is_available', true)
                            .limit(1);

                        if (flavorData && flavorData.length > 0) {
                            product = flavorData[0];
                            log(`Product found by flavor: ${product.name} (ID: ${product.id})`);
                        }
                    }
                }

                if (!product) {
                    log(`Product not found: ${searchTerm}`);
                    notFoundProducts.push(searchTerm || 'Item desconhecido');
                    continue;
                }
            }

            const quantity = parseFloat(item.quantity) || 1;
            const itemTotal = product.price * quantity;
            subtotal += itemTotal;

            orderItemsData.push({
                product_id: product.id,
                product_name: product.name,
                quantity: quantity,
                price: product.price,
                modifiers: item.modifiers || []
            });
        }

        // IMPORTANTE: Se algum produto não foi encontrado, NÃO criar pedido e avisar cliente
        if (notFoundProducts.length > 0) {
            log(`Products not found: ${notFoundProducts.join(', ')}`);
            return JSON.stringify({
                error: `Não encontrei os seguintes produtos no cardápio: ${notFoundProducts.join(', ')}. Por favor, verifique os nomes corretos no cardápio e tente novamente.`,
                notFoundProducts: notFoundProducts,
                suggestion: 'Use get_menu para ver os produtos disponíveis com os nomes corretos.'
            });
        }

        if (orderItemsData.length === 0) {
            return JSON.stringify({
                error: "Não foi possível identificar os produtos do pedido. Por favor, verifique o cardápio novamente e use os nomes exatos ou IDs dos produtos."
            });
        }

        const total = subtotal + deliveryFee;
        log(`Subtotal: ${subtotal}, Delivery Fee: ${deliveryFee}, Total: ${total}`);
        log(`Collected ${orderItemsData.length} items for order`);

        // 4. Gerar order_number sequencial
        const { data: lastOrder } = await supabase
            .from('orders')
            .select('order_number')
            .order('order_number', { ascending: false })
            .limit(1)
            .single();

        const orderNumber = (lastOrder?.order_number || 0) + 1;
        log(`Generated order number: ${orderNumber}`);

        // 5. Criar pedido
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                order_number: orderNumber,
                customer_id: customer.id,
                customer_name: customer.name,
                customer_phone: customer.phone,
                customer_address: customer.address,
                customer_cep: cep || customer.cep,
                total: total,
                payment_method: paymentMethod || 'Não informado',
                change_for: changeFor,
                delivery_fee: deliveryFee,
                delivery_type: deliveryType,
                status: 'pending'
            }])
            .select()
            .single();

        if (orderError) {
            log(`Error creating order: ${orderError.message}`);
            return JSON.stringify({ error: orderError.message });
        }

        // 6. Inserir itens
        const itemsToInsert = orderItemsData.map(item => ({
            ...item,
            order_id: order.id
        }));

        log(`Attempting to insert ${itemsToInsert.length} items: ${JSON.stringify(itemsToInsert)}`);

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsError) {
            log(`Error inserting items: ${itemsError.message}`);
            return JSON.stringify({ error: 'Pedido criado mas itens falharam: ' + itemsError.message });
        }

        log(`Successfully inserted ${itemsToInsert.length} items`);

        log(`Order created successfully: ${order.id}, number: ${orderNumber}`);

        // NOTIFICAR ADMIN (WhatsApp + Push)
        try {
            await this.loadSettings(); // Ensure settings are loaded
            if (this.settings && this.settings.whatsapp) {
                const adminPhone = this.settings.whatsapp.replace(/\D/g, '');

                // Format items for display
                let itemsList = '';
                if (itemsToInsert && itemsToInsert.length > 0) {
                    itemsList = '\n\n🛒 *Itens:*\n' + itemsToInsert.map(i => `- ${i.quantity}x ${i.product_name || i.name}`).join('\n');
                }

                const msg = `🔥 *NOVO PEDIDO #${orderNumber} CHEGOU!* 🔥\n\n👤 *Cliente:* ${customer.name}\n💰 *Total:* R$ ${total.toFixed(2)}\n🛵 *Tipo:* ${deliveryType === 'delivery' ? 'Entrega' : 'Retirada'}${itemsList}\n\nAcesse o painel para ver detalhes!`;

                await this.sendMessage(`${adminPhone}@s.whatsapp.net`, msg);
            }

            // Push Notification
            let pushBody = `R$ ${total.toFixed(2)} - ${customer.name}`;

            // Adicionar itens
            if (itemsToInsert && itemsToInsert.length > 0) {
                const itemsSummary = itemsToInsert.map(i => `${i.quantity}x ${i.product_name || i.name}`).join(', ');
                pushBody += `\n📦 ${itemsSummary}`;
            }

            // Adicionar endereço se for entrega
            if (deliveryType === 'delivery' && (customer.address || customer.street)) {
                // Formatar endereço simples
                const addressStr = customer.address || `${customer.street}, ${customer.number}`;
                pushBody += `\n📍 ${addressStr}`;
            } else if (deliveryType === 'pickup') {
                pushBody += `\n🏃 Retirada no Balcão`;
            }

            await pushService.sendNotificationToAll({
                title: `Novo Pedido #${orderNumber}!`,
                body: pushBody,
                icon: 'https://cardapio-frontend-u6qq.vercel.app/logo.svg',
                url: '/admin/orders'
            });
            log('Admin notifications sent.');
        } catch (notifyError) {
            log(`Error sending admin notifications: ${notifyError.message}`);
        }

        // 7. Retornar sucesso com link de acompanhamento
        return JSON.stringify({
            success: true,
            orderId: order.id,
            orderNumber: orderNumber,
            subtotal: subtotal.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            total: total.toFixed(2),
            deliveryZone: deliveryZone,
            trackingLink: `/order/${order.id}`,
            message: `Pedido #${orderNumber} criado com sucesso!`
        });
    }

    async addToCart({ items }) {
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Tool called: addToCart.Items: ${JSON.stringify(items)}`);

        const foundItems = [];
        const notFoundItems = [];

        for (const item of items) {
            const searchTerm = item.productName;
            let product = null;

            if (searchTerm) {
                const { data } = await supabase
                    .from('products')
                    .select('*')
                    .ilike('name', `%${searchTerm}%`)
                    .eq('is_available', true)
                    .limit(1);

                if (data && data.length > 0) {
                    product = data[0];
                }
            }

            if (product) {
                foundItems.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: item.quantity || 1,
                    observation: item.observation,
                    image_url: product.image_url
                });
            } else {
                notFoundItems.push(item.productName);
            }
        }

        return JSON.stringify({
            success: true,
            action: 'add_to_cart',
            items: foundItems,
            notFound: notFoundItems,
            message: foundItems.length > 0
                ? `Adicionei ${foundItems.length} itens ao seu carrinho! Você pode finalizar o pedido agora.`
                : 'Não encontrei os itens solicitados.'
        });
    }

    async calculateTotal({ items }) {
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Tool called: calculateTotal. Items: ${JSON.stringify(items)}`);

        let total = 0;
        const calculatedItems = [];

        for (const item of items) {
            let price = 0;
            let productName = item.productName;

            // Try to find product to get real price
            if (item.productName) {
                const { data } = await supabase
                    .from('products')
                    .select('price, name')
                    .ilike('name', `%${item.productName}%`)
                    .eq('is_available', true)
                    .limit(1);

                if (data && data.length > 0) {
                    price = parseFloat(data[0].price);
                    productName = data[0].name; // Use canonical name
                }
            } else if (item.productId) {
                const { data } = await supabase
                    .from('products')
                    .select('price, name')
                    .eq('id', item.productId)
                    .single();
                if (data) {
                    price = parseFloat(data.price);
                    productName = data.name;
                }
            }

            // Add modifiers price if any (heuristic, ideally should come from DB complexity)
            // For now, assumig modifiers dont add price or user provides final price is risky.
            // Best is to trust DB price for base product.
            // If item has modifiers with price, we might need more complex logic.
            // For MVP: Base price * quantity. 

            const itemTotal = price * (item.quantity || 1);
            total += itemTotal;

            calculatedItems.push({
                name: productName,
                quantity: item.quantity || 1,
                unitPrice: price,
                subtotal: itemTotal
            });
        }

        return JSON.stringify({
            items: calculatedItems,
            total: total.toFixed(2),
            message: `O total calculado é R$ ${total.toFixed(2)}`
        });
    }

    async checkOrderStatus({ orderId }) {
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Tool called: checkOrderStatus with orderId: ${orderId} (type: ${typeof orderId})`);

        // Converter para string e remover espaços
        const orderIdStr = String(orderId).trim();
        log(`OrderId after conversion: ${orderIdStr}`);

        let order = null;

        // 1. Try to find by UUID if it looks like one
        if (orderIdStr.length > 20 && orderIdStr.includes('-')) {
            log(`Trying to find by UUID: ${orderIdStr}`);
            const { data, error } = await supabase
                .from('orders')
                .select('status, total, created_at, order_number')
                .eq('id', orderIdStr)
                .single();
            if (data) order = data;
            if (error) log(`UUID search error: ${error.message}`);
        }

        // 2. Try to find by order_number
        if (!order) {
            const orderNum = parseInt(orderIdStr, 10);
            if (!isNaN(orderNum) && orderNum > 0) {
                log(`Trying to find by order_number: ${orderNum}`);
                const { data, error } = await supabase
                    .from('orders')
                    .select('status, total, created_at, order_number')
                    .eq('order_number', orderNum)
                    .single();
                if (data) order = data;
                if (error) log(`Order number search error: ${error.message}`);
            }
        }

        if (!order) {
            log(`Order not found for: ${orderIdStr}`);
            return JSON.stringify({ error: 'Pedido não encontrado. Verifique o número.' });
        }

        log(`Order found: #${order.order_number}, status: ${order.status}`);

        const statusMap = {
            'pending': 'Pendente',
            'Pendente': 'Pendente',
            'approved': 'Aprovado',
            'preparing': 'Preparando',
            'ready': 'Pronto para Entrega',
            'out_for_delivery': 'Saiu para Entrega',
            'delivered': 'Entregue',
            'cancelled': 'Cancelado'
        };

        const statusLabel = statusMap[order.status] || order.status;

        return JSON.stringify({
            status: statusLabel,
            total: order.total,
            orderNumber: order.order_number,
            createdAt: order.created_at,
            message: `O pedido #${order.order_number} está com status: ${statusLabel}`
        });
    }

    async getHistory(phone) {
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Fetching history for ${phone}...`);
        const { data, error } = await supabase
            .from('chat_history')
            .select('role, content')
            .eq('user_phone', phone)
            .in('role', ['user', 'assistant'])
            .not('content', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Error fetching history:', error);
            log(`Error fetching history: ${JSON.stringify(error)}`);
            return [];
        }

        log(`Found ${data ? data.length : 0} previous messages for ${phone}`);
        return data ? data.reverse() : [];
    }

    async saveMessage(phone, role, content) {
        if (!content) return;
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Saving message for ${phone}(${role}): ${content.substring(0, 50)}...`);
        const { error } = await supabase.from('chat_history').insert([{ user_phone: phone, role, content }]);
        if (error) {
            console.error('Error saving message:', error);
            log(`Error saving message: ${JSON.stringify(error)}`);
        }
    }

    checkOpeningHours() {
        if (!this.settings.schedule) return { isOpen: true };

        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const now = new Date();
        const brazilDateStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
        const brazilDate = new Date(brazilDateStr);

        const dayName = days[brazilDate.getDay()];
        const currentHour = brazilDate.getHours();
        const currentMinute = brazilDate.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const daySchedule = this.settings.schedule[dayName];

        if (!daySchedule || !daySchedule.isOpen) {
            return { isOpen: false };
        }

        if (daySchedule.intervals && daySchedule.intervals.length > 0) {
            for (const interval of daySchedule.intervals) {
                const [startH, startM] = interval.start.split(':').map(Number);
                const [endH, endM] = interval.end.split(':').map(Number);

                const startTime = startH * 60 + startM;
                const endTime = endH * 60 + endM;

                if (endTime < startTime) {
                    if (currentTime >= startTime || currentTime <= endTime) return { isOpen: true };
                } else {
                    if (currentTime >= startTime && currentTime <= endTime) return { isOpen: true };
                }
            }
            return { isOpen: false };
        }

        return { isOpen: true };
    }

    async transcribeAudio(base64Audio) {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        try {
            console.log('Transcribing audio...');
            const buffer = Buffer.from(base64Audio, 'base64');
            const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`);

            fs.writeFileSync(tempFilePath, buffer);

            const transcription = await this.openai.audio.transcriptions.create({
                file: fs.createReadStream(tempFilePath),
                model: "whisper-1",
            });

            console.log('Transcription:', transcription.text);

            fs.unlinkSync(tempFilePath);

            return transcription.text;
        } catch (error) {
            console.error('Error transcribing audio:', error);
            return null;
        }
    }

    async processMessage(messageData, channel = 'whatsapp') {
        console.log(`--- AI Service: Processing Message(${channel}) ---`);
        this.logToDb('info', 'Processing Message', { channel, ...messageData });
        const responses = [];

        await this.loadSettings();
        if (!this.settings || !this.settings.is_active || !this.openai) {
            this.logToDb('warning', 'AI Service inactive or missing config', { isActive: this.settings?.is_active, hasOpenAI: !!this.openai });
            return [];
        }

        const { remoteJid, pushName, conversation, audioMessage, imageMessage, base64 } = messageData;
        let userMessage = conversation || messageData.text?.message;
        let imageBase64 = null;
        const userPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

        // Handle audio messages
        if (audioMessage && base64) {
            console.log('Audio message detected');
            userMessage = await this.transcribeAudio(base64);
            if (!userMessage) {
                await this.sendMessage(remoteJid, 'Desculpe, não consegui entender o áudio. 🎤 Pode tentar de novo ou digitar?', channel);
                return [];
            }
            console.log('Transcribed text:', userMessage);
        }

        // Handle image messages
        if (imageMessage && base64) {
            console.log('Image message detected');
            imageBase64 = base64;
            // If no caption, ask what they want to do with the image
            if (!userMessage) {
                userMessage = '[Usuário enviou uma imagem]';
            }
        }

        // If only audio/image without base64, ask to type
        if ((audioMessage || imageMessage) && !base64) {
            console.log('Media message without base64 data');
            await this.sendMessage(remoteJid, 'Não consegui processar a mídia. 😅 Pode me descrever o que você precisa?', channel);
            return [];
        }

        if (!userMessage && !imageBase64) return [];

        console.log(`User Message(${userPhone}): ${userMessage}`);

        try {
            await this.saveMessage(userPhone, 'user', userMessage);
            this.logToDb('info', 'Message Saved', { userPhone });

            const history = await this.getHistory(userPhone);

            const { isOpen } = this.checkOpeningHours();

            // Definir systemPrompt ANTES da chamada OpenAI
            const systemPrompt = `
${this.settings.system_prompt || 'Você é um atendente virtual simpático e prestativo de uma pizzaria/restaurante.'}

🚨🚨🚨 REGRAS DE OURO 🚨🚨🚨

1. **ZERO ALUCINAÇÃO DE PREÇO:** NUNCA some valores de cabeça.
2. **USE A CALCULADORA:** Antes de mostrar qualquer total para o cliente, OBRIGATORIAMENTE chame a função \`calculate_total\` com os itens do pedido. Use o valor que ela retornar.
3. **ENDEREÇO NO FINAL:** Não peça o endereço no início. Deixe para pedir/confirmar APENAS quando o cliente disser que quer fechar o pedido.
4. **CONSULTE O CARDÁPIO:** SEMPRE use \`get_menu\` antes de falar sobre produtos. NUNCA invente produtos, preços ou acompanhamentos.
5. **CARDÁPIO LIMPO E LEGÍVEL:** Quando mostrar o cardápio, use este formato EXATO:

🍕 *PIZZAS*

• Pizza Margherita - R$ 45,00
• Pizza Calabresa - R$ 48,00

🥤 *BEBIDAS*

• Coca-Cola 2L - R$ 10,00

IMPORTANTE: 
- APENAS nome e preço (SEM descrições)
- Linha em branco entre categorias
- Máximo 6 produtos por categoria (se tiver mais, diga "e mais opções...")
   
6. **NUNCA OFEREÇA O QUE NÃO EXISTE:** Se um produto não está na lista retornada por \`get_menu\`, NÃO mencione. Se o cliente pedir algo que não existe, diga educadamente que não tem e sugira alternativas DO CARDÁPIO.

🎭 PERSONALIDADE:
- Amigo, simpático e casual (use emojis 🍕😄).
- Evite textões enormes.
- Fale como gente: "Bora fechar?", "O que manda hoje?", "Deu R$ 50,00 certinho".

📋 FLUXO DE ATENDIMENTO SUGERIDO:

1. **OLÁ & IDENTIFICAÇÃO:**
   - PRIMEIRO: Chame \`get_customer\` com o telefone do cliente para verificar se ele já está cadastrado.
   - Se encontrado: Cumprimente pelo nome e mostre que você lembra dele ("Oi [Nome]! Tudo bem? Vi aqui que seu endereço é [endereço]. Vamos usar o mesmo?")
   - Se NÃO encontrado: Cumprimente e diga que é a primeira vez. Pergunte o que quer comer/beber. NÃO PEÇA ENDEREÇO AGORA.

2. **MONTAGEM DO PEDIDO:**
   - Use \`get_menu\` para ver opções (retorna produtos organizados por categoria).
   - Mostre o cardápio formatado por categorias.
   - Adicione itens conforme o pedido.
   - SEMPRE pergunte observações ("Sem cebola?", "Ao ponto?").

3. **FECHAMENTO (MOMENTO CRÍTICO):**
   - Quando o cliente disser "fecha", "acabou", "quanto deu":
   - 1º: Chame \`calculate_total\` para ter a soma exata do banco.
   - 2º: Mostre o resumo com o total retornado pela tool. NÃO FAÇA CONTAS SOZINHO.
   - 3º: AGORA peça/confirme o endereço de entrega e forma de pagamento.
   - 4º: Se cliente NÃO está cadastrado, chame \`register_customer\` com os dados.
   - 5º: Chame \`create_order\` com tudo preenchido.

4. **LINK DO PEDIDO:**
   - Envie o link puro: https://cardapio-backend.vercel.app/order/[ID]
            `;

            // Definir messages ANTES da chamada OpenAI
            // Se há imagem, usar formato multimodal para GPT-4 Vision
            let userContent;
            if (imageBase64) {
                userContent = [
                    { type: "text", text: userMessage || "O que você vê nesta imagem?" },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                ];
            } else {
                userContent = userMessage;
            }

            const messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userContent }
            ];

            // Definir tools ANTES da chamada OpenAI
            const tools = [
                {
                    type: "function",
                    function: {
                        name: "get_menu",
                        description: "Retorna o cardápio completo organizado por categorias (Pizzas, Bebidas, etc.) com nome e preço de cada produto. Se categoria específica for solicitada, retorna apenas produtos daquela categoria. SEMPRE use esta função antes de falar sobre produtos. NUNCA mencione produtos que não estejam na resposta desta função.",
                        parameters: {
                            type: "object",
                            properties: {
                                categoryName: {
                                    type: "string",
                                    description: "Nome da categoria para filtrar (ex: Lanches, Pizzas, Bebidas). Se não especificado, retorna lista de categorias."
                                }
                            }
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "register_customer",
                        description: "Registra ou atualiza um cliente.",
                        parameters: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                phone: { type: "string" },
                                address: { type: "string" },
                                cep: { type: "string" }
                            },
                            required: ["name", "phone"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "create_order",
                        description: "Cria um novo pedido. O sistema calcula o frete automaticamente se CEP for fornecido.",
                        parameters: {
                            type: "object",
                            properties: {
                                customerPhone: { type: "string", description: "Telefone do cliente" },
                                items: {
                                    type: "array",
                                    description: "Lista de itens do pedido",
                                    items: {
                                        type: "object",
                                        properties: {
                                            productId: { type: "integer", description: "ID do produto (preferencial)" },
                                            productName: { type: "string", description: "Nome do produto (caso não tenha ID)" },
                                            quantity: { type: "number", description: "Quantidade" },
                                            modifiers: { type: "array", items: { type: "string" }, description: "Modificadores opcionais" }
                                        },
                                        required: ["quantity"]
                                    }
                                },
                                paymentMethod: {
                                    type: "string",
                                    enum: ["Dinheiro", "PIX", "Cartão"],
                                    description: "Forma de pagamento"
                                },
                                changeFor: {
                                    type: "number",
                                    description: "Valor para troco (apenas se pagamento for Dinheiro)"
                                },
                                cep: {
                                    type: "string",
                                    description: "CEP para cálculo automático de frete (formato: 00000-000). Obrigatório para entrega."
                                },
                                deliveryType: {
                                    type: "string",
                                    enum: ["delivery", "pickup"],
                                    description: "Tipo: 'delivery' (entrega) ou 'pickup' (retirada)"
                                }
                            },
                            required: ["customerPhone", "items", "paymentMethod"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "calculate_total",
                        description: "Calcula o valor total exato dos itens consultando o banco de dados. Use SEMPRE antes de mostrar o resumo de valores para o cliente.",
                        parameters: {
                            type: "object",
                            properties: {
                                items: {
                                    type: "array",
                                    description: "Lista de itens para calcular",
                                    items: {
                                        type: "object",
                                        properties: {
                                            productName: { type: "string" },
                                            productId: { type: "string" },
                                            quantity: { type: "number" }
                                        },
                                        required: ["quantity"]
                                    }
                                }
                            },
                            required: ["items"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "add_to_cart",
                        description: "Adiciona itens ao carrinho de compras (Apenas para Web Chat).",
                        parameters: {
                            type: "object",
                            properties: {
                                items: {
                                    type: "array",
                                    description: "Lista de itens para adicionar",
                                    items: {
                                        type: "object",
                                        properties: {
                                            productName: { type: "string", description: "Nome do produto (ex: Pizza Calabresa)" },
                                            quantity: { type: "integer", description: "Quantidade" },
                                            observation: { type: "string", description: "Observações (ex: sem cebola)" }
                                        },
                                        required: ["productName", "quantity"]
                                    }
                                }
                            },
                            required: ["items"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "check_order_status",
                        description: "Verifica o status de um pedido.",
                        parameters: {
                            type: "object",
                            properties: {
                                orderId: { type: "integer" }
                            },
                            required: ["orderId"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "lookup_cep",
                        description: "Busca endereço completo pelo CEP. Use quando cliente informar o CEP para preencher rua, bairro, cidade automaticamente.",
                        parameters: {
                            type: "object",
                            properties: {
                                cep: { type: "string", description: "CEP para buscar (8 dígitos)" }
                            },
                            required: ["cep"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "get_customer",
                        description: "Busca dados do cliente pelo telefone. Use no INÍCIO da conversa para reconhecer cliente e mostrar endereço salvo.",
                        parameters: {
                            type: "object",
                            properties: {
                                phone: { type: "string", description: "Telefone do cliente" }
                            },
                            required: ["phone"]
                        }
                    }
                }
            ];

            // Usar gpt-4o para imagens (vision), gpt-4o-mini apenas para texto
            const modelToUse = imageBase64 ? "gpt-4o" : "gpt-4o-mini";
            this.logToDb('info', 'Sending to OpenAI', { model: modelToUse, hasImage: !!imageBase64 });

            const fs = require('fs');
            const path = require('path');
            const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
            const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

            log(`Sending request to OpenAI with model: ${modelToUse}...`);

            // STRICT TIMEOUT: Vercel Free has 10s limit. We abort at 8s to verify.
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('OPENAI_TIMEOUT')), 8000)
            );

            let completion;
            try {
                const requestParams = {
                    model: modelToUse,
                    messages: messages,
                    max_tokens: 1024
                };

                // Apenas adicionar tools se não for requisição de imagem (vision)
                // O gpt-4o suporta tools, mas vamos simplificar para imagens
                if (!imageBase64) {
                    requestParams.tools = tools;
                    requestParams.tool_choice = "auto";
                }

                completion = await Promise.race([
                    this.openai.chat.completions.create(requestParams),
                    timeoutPromise
                ]);
            } catch (err) {
                if (err.message === 'OPENAI_TIMEOUT') {
                    console.error('OpenAI Timed Out (8s limit)');
                    this.logToDb('error', 'OpenAI Timeout', { limit: '8000ms' });
                    await this.sendMessage(remoteJid, 'Estou um pouco lento agora. Poderia tentar novamente em instantes? 🐢', channel);
                    return [];
                }
                throw err;
            }
            this.logToDb('info', 'OpenAI Response Received', { id: completion.id });
            log(`OpenAI response received.`);

            const responseMessage = completion.choices[0].message;
            log(`OpenAI response received. Tool calls: ${responseMessage.tool_calls ? responseMessage.tool_calls.length : 0}`);

            let currentResponse = responseMessage;
            let loopCount = 0;
            const MAX_LOOPS = 5;
            let cartActionData = null;

            // Loop while there are tool calls and we haven't hit the limit
            while (currentResponse.tool_calls && loopCount < MAX_LOOPS) {
                loopCount++;
                console.log(`--- Tool Loop #${loopCount} ---`);
                messages.push(currentResponse); // Add the assistant's request-to-call-tool message

                for (const toolCall of currentResponse.tool_calls) {
                    const functionName = toolCall.function.name;
                    let functionArgs;
                    try {
                        functionArgs = JSON.parse(toolCall.function.arguments);
                    } catch (e) {
                        console.error('Error parsing tool args:', e);
                        functionArgs = {};
                    }

                    console.log(`Executing tool: ${functionName}`, functionArgs);
                    log(`Executing tool: ${functionName} (Loop ${loopCount})`);

                    let functionResult;

                    try {
                        if (functionName === 'get_menu') {
                            functionResult = await this.getMenu(functionArgs.categoryName);
                        } else if (functionName === 'register_customer') {
                            if (channel === 'whatsapp' || !functionArgs.phone) {
                                functionArgs.phone = userPhone;
                            }
                            functionResult = await this.registerCustomer(functionArgs);
                        } else if (functionName === 'create_order') {
                            if (!functionArgs.customerPhone) functionArgs.customerPhone = userPhone;
                            functionResult = await this.createOrder(functionArgs);
                        } else if (functionName === 'add_to_cart') {
                            functionResult = await this.addToCart(functionArgs);
                            try {
                                const parsed = JSON.parse(functionResult);
                                if (parsed.action) cartActionData = parsed;
                            } catch (e) { }
                        } else if (functionName === 'calculate_total') {
                            functionResult = await this.calculateTotal(functionArgs);
                        } else if (functionName === 'check_order_status') {
                            functionResult = await this.checkOrderStatus(functionArgs);
                        } else if (functionName === 'lookup_cep') {
                            functionResult = JSON.stringify(await this.lookupCep(functionArgs.cep));
                        } else if (functionName === 'get_customer') {
                            functionResult = await this.getCustomerByPhone(functionArgs.phone || userPhone);
                        } else {
                            functionResult = JSON.stringify({ error: "Tool not found" });
                        }
                    } catch (toolError) {
                        console.error(`Error executing ${functionName}:`, toolError);
                        functionResult = JSON.stringify({ error: `Error executing tool: ${toolError.message}` });
                    }

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: String(functionResult),
                    });
                }

                // Call OpenAI again with the tool results
                const nextResponse = await this.openai.chat.completions.create({
                    model: modelToUse,
                    messages: messages,
                    tools: tools, // Keep tools available for chaining
                    tool_choice: "auto"
                });

                currentResponse = nextResponse.choices[0].message;

                // If the next response has content AND tool calls, we might want to log/send the content?
                // Usually intermediate content is just "Thinking...", so we can ignore it or log it.
                // But if it has NO tool calls, the loop ends and we send the final content.
            }

            if (loopCount >= MAX_LOOPS) {
                console.warn('Max AI tool loop reached. Stopping.');
                log('Warning: Max AI tool loop reached.');
            }

            // Final response handling (Text)
            const finalContent = currentResponse.content;
            if (finalContent) {
                await this.saveMessage(userPhone, 'assistant', finalContent);
                const sentMsg = await this.sendMessage(remoteJid, finalContent, channel, cartActionData);
                if (sentMsg) responses.push(sentMsg);
                log(`Sent final response.`);
            } else {
                console.warn('Final response from OpenAI was empty (likely still trying to call tools but loop stopped).');
            }

        } catch (error) {
            console.error('Error processing AI message:', error);
            this.logToDb('error', 'Critical Error in processMessage', { error: error.message, stack: error.stack });

            const fs = require('fs');
            const path = require('path');
            const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
            try {
                fs.appendFileSync(logFile, `${new Date().toISOString()} - ERROR: ${error.message}\n`);
            } catch (e) { }

            // Return error to user
            const errorMsg = "⚠️ Erro ao processar mensagem: " + error.message + ". Tente novamente em alguns instantes.";
            await this.sendMessage(remoteJid, errorMsg, channel);

            responses.push({
                text: errorMsg,
                role: 'assistant',
                timestamp: new Date().toISOString()
            });
        }

        return responses;
    }

    async sendMessage(remoteJid, message, channel = 'whatsapp', mediaUrl = null, action = null) {
        // Standardize Phone Number: Ensure it starts with country code (55 for Brazil default)
        let cleanNumber = remoteJid.replace(/\D/g, '');
        if (cleanNumber.length >= 10 && cleanNumber.length <= 11) {
            cleanNumber = '55' + cleanNumber;
        }

        console.log(`Sending message to ${cleanNumber} (Channel: ${channel}):`, message, mediaUrl ? `(with media)` : '');

        // --- WEB CHANNEL HANDLING ---
        if (channel === 'web') {
            // For web, we just return the object so the frontend can display it.
            // We don't need to call Evolution API because the web client polls/receives the response directly from the API response of /chat or /poll
            console.log('Web channel detected, returning message directly.');

            // If we have an action (like add_to_cart), we pass it along
            return {
                success: true,
                text: message,
                mediaUrl,
                action
            };
        }

        // --- WHATSAPP CHANNEL HANDLING (Evolution API) ---
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');

        try {
            await this.loadSettings();

            // Check if active
            if (!this.settings || !this.settings.is_active) {
                console.log('AI Service is inactive, skipping message send.');
                return { success: false, error: 'Serviço de IA inativo' };
            }

            // Check API Key
            if (!this.settings.evolution_api_key) {
                console.warn('Evolution API Key not configured');
                this.logToDb('warning', 'Evolution API Key missing');
                throw new Error('Evolution API Key não configurada');
            }

            // Determine Payload Type (Text vs Media)
            let url, payload;

            if (mediaUrl) {
                // Media Message
                url = `${this.settings.evolution_api_url}/message/sendMedia/${this.settings.instance_name}`;
                payload = {
                    number: cleanNumber,
                    options: {
                        delay: 1200,
                        presence: 'composing'
                    },
                    mediatype: 'image',
                    caption: message,
                    media: mediaUrl
                };
            } else {
                // Text Message
                url = `${this.settings.evolution_api_url}/message/sendText/${this.settings.instance_name}`;
                payload = {
                    number: cleanNumber,
                    options: {
                        delay: 1200,
                        presence: 'composing',
                        linkPreview: true
                    },
                    text: message
                };
            }

            console.log(`Posting to Evolution API: ${url}`, JSON.stringify(payload, null, 2));

            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.settings.evolution_api_key
                }
            });

            console.log('Evolution API Response:', response.data);
            this.logToDb('info', 'Message Sent', { remoteJid, success: true, media: !!mediaUrl });

            return { success: true, data: response.data };

        } catch (error) {
            const errorDetails = {
                message: error.message,
                status: error.response?.status,
                responseData: error.response?.data || 'No response data',
                remoteJid,
                channel
            };
            console.error('Error sending message:', errorDetails);
            this.logToDb('error', 'Message Send Failed', errorDetails);
            return { success: false, error: error.message };
        }
    }



    async sendNotification(phone, status, orderId) {
        console.log(`[sendNotification] Iniciando notificação para ${phone}, status: ${status}, orderId: ${orderId}`);
        await this.loadSettings();
        if (!this.settings) {
            console.error('[sendNotification] Configurações não carregadas.');
            return;
        }

        // 1. Fetch Full Order Details
        let orderDetails = null;
        let itemsList = '';
        let addressText = '';

        try {
            // Check if orderId is UUID or Number
            let query = supabase.from('orders').select('*, order_items(*)');
            if (typeof orderId === 'string' && orderId.length > 20) {
                query = query.eq('id', orderId);
            } else {
                query = query.eq('order_number', orderId);
            }

            const { data, error } = await query.single();

            if (!error && data) {
                orderDetails = data;

                // Format Items
                if (orderDetails.order_items && orderDetails.order_items.length > 0) {
                    itemsList = '\n\🛒 *Itens do Pedido:*\n' + orderDetails.order_items.map(i => `- ${i.quantity}x ${i.product_name || i.name}`).join('\n');
                }

                // Format Address (if delivery)
                if (orderDetails.delivery_type === 'delivery') {
                    const addr = orderDetails.customer_address || `${orderDetails.customer_street}, ${orderDetails.customer_number}`;
                    if (addr) addressText = `\n📍 *Entrega em:* ${addr}`;
                } else if (orderDetails.delivery_type === 'pickup') {
                    addressText = '\n🏃 *Retirada no Balcão*';
                }
            } else {
                console.error('[sendNotification] Erro ao buscar detalhes do pedido:', error?.message);
            }
        } catch (fetchErr) {
            console.error('[sendNotification] Erro fetch details:', fetchErr);
        }

        const statusMap = {
            'pending': '⏳ Pendente',
            'approved': '✅ Aprovado',
            'preparing': '🔥 Preparando',
            'ready': '🥡 Pronto para Entrega/Retirada',
            'out_for_delivery': '🛵 Saiu para Entrega',
            'delivered': '😋 Entregue',
            'cancelled': '❌ Cancelado'
        };

        const statusLabel = statusMap[status] || status;

        let message = `🔔 *Atualização do Pedido #${orderDetails ? (orderDetails.order_number || orderId) : orderId}*`;
        message += `\nStatus: *${statusLabel}*`;

        // Get custom templates from settings or use defaults
        const templates = this.settings.whatsapp_templates || {};
        const defaultTemplates = {
            'approved': 'Oba! Seu pedido foi aceito e já vai para a cozinha.',
            'preparing': 'Estamos preparando tudo com carinho! 🔥',
            'ready': 'Seu pedido está pronto!',
            'out_for_delivery': 'Nosso entregador já está a caminho! 🛵',
            'delivered': 'Pedido entregue. Bom apetite! 😋',
            'cancelled': 'Que pena! O pedido foi cancelado. Se tiver dúvidas, entre em contato.'
        };

        // Use custom template if available, fallback to default
        const customMessage = templates[status] || defaultTemplates[status];
        if (customMessage) {
            message += `\n\n${customMessage}`;
            // Special case for ready + pickup
            if (status === 'ready' && orderDetails?.delivery_type === 'pickup' && !templates[status]) {
                message += ` Pode vir buscar.`;
            }
        }

        // Add details if available
        if (itemsList) message += `\n${itemsList}`;

        if (orderDetails) {
            message += `\n\n💰 *Total:* R$ ${orderDetails.total.toFixed(2)}`;
            if (orderDetails.delivery_fee > 0) message += ` (Taxa: R$ ${orderDetails.delivery_fee.toFixed(2)})`;

            // Payment Method
            const paymentMap = {
                'credit': 'Cartão de Crédito',
                'debit': 'Cartão de Débito',
                'pix': 'PIX',
                'cash': 'Dinheiro'
            };
            const paymentLabel = paymentMap[orderDetails.payment_method] || orderDetails.payment_method || 'Não informado';
            message += `\n💳 *Pagamento:* ${paymentLabel}`;
            if (orderDetails.change_for) message += ` (Troco para R$ ${orderDetails.change_for})`;
        }

        if (addressText) message += addressText;

        // Sanitize phone
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
            cleanPhone = '55' + cleanPhone;
        }

        const remoteJid = `${cleanPhone}@s.whatsapp.net`;
        console.log(`[sendNotification] Enviando mensagem detalhada para ${remoteJid}`);

        await this.saveMessage(cleanPhone, 'assistant', message);

        try {
            await this.sendMessage(remoteJid, message);
            console.log('[sendNotification] Mensagem enviada com sucesso.');
        } catch (error) {
            console.error('[sendNotification] Erro ao enviar mensagem:', error.message);
        }
    }
}

module.exports = new AIService();
