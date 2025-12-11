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

    // --- TOOLS IMPLEMENTATION ---

    async getMenu() {
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

        logToFile('Tool called: getMenu');
        logToFile(`Supabase URL defined: ${!!process.env.SUPABASE_URL}`);

        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('id, name, description, price, category_id')
                .eq('is_available', true);

            if (error) {
                logToFile(`Supabase Error: ${JSON.stringify(error)}`);
                return JSON.stringify({ error: error.message });
            }

            logToFile(`Query success. Found ${products ? products.length : 0} items.`);
            return JSON.stringify(products);
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
                    return { fee: zone.fee, zone: zone.name, error: null };
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
                address,
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

        for (const item of items) {
            log(`Processing item: ${JSON.stringify(item)}`);
            let product = null;

            // 1. Try to find by ID if it looks like a UUID
            if (item.productId && typeof item.productId === 'string' && item.productId.length > 20) {
                const { data } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', item.productId)
                    .single();
                product = data;
            }

            // 2. If not found, try by Name (fuzzy match)
            if (!product) {
                // Sometimes AI passes the name in productId or we just need to search by name
                const searchTerm = item.productName || item.productId;
                log(`Looking up product by name: ${searchTerm}`);

                if (typeof searchTerm === 'string') {
                    // 1. Try exact/fuzzy match
                    let { data } = await supabase
                        .from('products')
                        .select('*')
                        .ilike('name', `%${searchTerm}%`)
                        .eq('is_available', true)
                        .limit(1);

                    // 2. If not found, try splitting words (e.g. "Meia Calabresa" -> "Calabresa")
                    if (!data || data.length === 0) {
                        // Remove "Meia", "1/2", "Pizza" to find the flavor
                        const cleanSearch = searchTerm.replace(/meia|1\/2|pizza|com|sem/gi, '').trim();

                        const { data: flavorData } = await supabase
                            .from('products')
                            .select('*')
                            .ilike('name', `%${cleanSearch}%`)
                            .eq('is_available', true)
                            .limit(1);

                        if (flavorData && flavorData.length > 0) {
                            data = flavorData;
                            log(`Product found by flavor: ${cleanSearch}`);
                        } else {
                            // Fallback to word splitting
                            const words = searchTerm.split(' ').filter(w => w.length > 3 && !['meia', 'pizza', 'com', 'sem'].includes(w.toLowerCase()));
                            for (const word of words) {
                                const { data: fallbackData } = await supabase
                                    .from('products')
                                    .select('*')
                                    .ilike('name', `%${word}%`)
                                    .eq('is_available', true)
                                    .limit(1);

                                if (fallbackData && fallbackData.length > 0) {
                                    data = fallbackData;
                                    log(`Product found by fallback word: ${word}`);
                                    break;
                                }
                            }
                        }

                        if (data && data.length > 0) {
                            product = data[0];
                            log(`Product found by name: ${product.name} (ID: ${product.id})`);
                        } else {
                            log(`Product NOT found by name: ${searchTerm}`);
                        }
                    }
                }

                if (!product) {
                    log(`Product not found: ${item.productId}`);
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

    async checkOrderStatus({ orderId }) {
        console.log('Tool called: checkOrderStatus', { orderId });

        // Try to find by UUID first
        let { data: order, error } = await supabase
            .from('orders')
            .select('status, total, created_at, order_number')
            .eq('id', orderId)
            .single();

        if (error) {
            // Fallback: try to find by order_number (if input is a number)
            if (!isNaN(orderId)) {
                const { data: orderByNum, error: numError } = await supabase
                    .from('orders')
                    .select('status, total, created_at, order_number')
                    .eq('order_number', orderId)
                    .single();

                if (orderByNum) {
                    order = orderByNum;
                    error = null;
                }
            }
        }

        if (error || !order) return JSON.stringify({ error: 'Pedido não encontrado. Verifique o número.' });

        const statusMap = {
            'pending': 'Pendente',
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

        const { remoteJid, pushName, conversation, audioMessage, base64 } = messageData;
        let userMessage = conversation || messageData.text?.message;
        const userPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

        if (audioMessage || base64) {
            console.log('Audio message detected');
            if (base64) {
                userMessage = await this.transcribeAudio(base64);
                if (!userMessage) {
                    await this.sendMessage(remoteJid, 'Desculpe, não consegui entender o áudio.', channel);
                    return [];
                }
                console.log('Transcribed text:', userMessage);
            } else {
                console.log('Audio message without base64 data');
                await this.sendMessage(remoteJid, 'Não consegui processar o áudio. Pode escrever?', channel);
                return [];
            }
        }

        if (!userMessage) return [];

        console.log(`User Message(${userPhone}): ${userMessage}`);

        try {
            await this.saveMessage(userPhone, 'user', userMessage);
            this.logToDb('info', 'Message Saved', { userPhone });

            const history = await this.getHistory(userPhone);

            const { isOpen } = this.checkOpeningHours();
            // ... (setup prompt)

            this.logToDb('info', 'Sending to OpenAI', { model: "gpt-4o-mini" });

            // STRICT TIMEOUT: Vercel Free has 10s limit. We abort at 8s to verify.
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('OPENAI_TIMEOUT')), 8000)
            );

            let response;
            try {
                response = await Promise.race([
                    this.openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        messages: messages,
                        tools: tools,
                        tool_choice: "auto"
                    }),
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
            this.logToDb('info', 'OpenAI Response Received', { id: response.id });
            const systemPrompt = `
${this.settings.system_prompt || 'Você é um assistente virtual.'}

${!isOpen ? 'AVISO: O estabelecimento está FECHADO agora. Avise o cliente e diga que o pedido será processado quando abrir.' : ''}

CONTEXTO DO CLIENTE:
Nome: ${pushName || 'Cliente'}
Telefone: ${userPhone}

FLUXO DE PEDIDO COMPLETO:

1. **VERIFICAR CLIENTE**
   - Primeiro, chame \`register_customer\` com o telefone do cliente
   - Se cliente já existe (customerExists: true), use os dados salvos (savedData)
   - Confirme com o cliente se os dados estão corretos
   - Se dados mudaram, atualize chamando register_customer novamente

2. **COLETAR ITENS**
   - Mostre o cardápio com \`get_menu\`
   - Organize por categorias, use negrito para nomes (*Nome*), mostre preço (R$ XX,XX)
   - Anote os itens que o cliente quer com quantidade

3. **TIPO DE ENTREGA**
   - Pergunte: "Vai ser entrega ou retirada?"
   - Se RETIRADA (pickup): pule para pagamento
   - Se ENTREGA (delivery): continue para próximo passo

4. **ENDEREÇO E CEP (apenas para entrega)**
   - Se cliente já tem CEP salvo, confirme: "Vou usar o endereço salvo: [endereço]. Está correto?"
   - Se não tem ou mudou, peça:
     * CEP completo (00000-000)
     * Endereço completo (rua, número, complemento)
   - Atualize com \`register_customer\` se necessário

5. **PAGAMENTO**
   - Pergunte: "Como vai pagar? PIX, Cartão ou Dinheiro?"
   - Se Dinheiro: "Precisa de troco para quanto?"

6. **CRIAR PEDIDO**
   - Chame \`create_order\` com TODOS os dados:
     * items: array com productId e quantity
     * paymentMethod: "PIX", "Cartão" ou "Dinheiro"
     * changeFor: valor do troco (se Dinheiro)
     * cep: CEP do cliente (se entrega)
     * deliveryType: "delivery" ou "pickup"
   - O sistema calculará o frete automaticamente pelo CEP
   - Número do pedido será gerado automaticamente

7. **CONFIRMAÇÃO**
   - Mostre o resumo completo:
     * Itens pedidos
     * Subtotal: R$ XX,XX
     * Taxa de entrega: R$ XX,XX (se aplicável)
     * Total: R$ XX,XX
     - Forneça o link de acompanhamento: "Acompanhe seu pedido aqui: [Link](${process.env.FRONTEND_URL || 'http://localhost:5173'}/order/ID)"
   - Agradeça e deseje bom apetite! 😋

REGRAS IMPORTANTES:
- SEMPRE use dados salvos do cliente quando disponíveis
- O frete é calculado AUTOMATICAMENTE pelo CEP - não invente valores
            `;

            const messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage }
            ];

            const tools = [
                {
                    type: "function",
                    function: {
                        name: "get_menu",
                        description: "Retorna os itens do cardápio.",
                        parameters: { type: "object", properties: {} }
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
                }
            ];

            const fs = require('fs');
            const path = require('path');
            const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');
            const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

            log(`Sending request to OpenAI...`);

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: messages,
                tools: tools,
                tool_choice: "auto"
            });

            const responseMessage = completion.choices[0].message;
            log(`OpenAI response received. Tool calls: ${responseMessage.tool_calls ? responseMessage.tool_calls.length : 0}`);

            if (responseMessage.tool_calls) {
                messages.push(responseMessage);

                let cartActionData = null;

                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    console.log(`Executing tool: ${functionName}`, functionArgs);
                    log(`Executing tool: ${functionName}`);

                    let functionResult;

                    if (functionName === 'get_menu') {
                        functionResult = await this.getMenu();
                    } else if (functionName === 'register_customer') {
                        // Only force-override phone if on WhatsApp (trusted sender) or if missing
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
                            cartActionData = JSON.parse(functionResult);
                        } catch (e) { }
                    } else if (functionName === 'check_order_status') {
                        functionResult = await this.checkOrderStatus(functionArgs);
                    }

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: functionResult,
                    });
                }

                const secondResponse = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: messages
                });

                const finalContent = secondResponse.choices[0].message.content;
                await this.saveMessage(userPhone, 'assistant', finalContent);
                const sentMsg = await this.sendMessage(remoteJid, finalContent, channel, cartActionData);
                if (sentMsg) responses.push(sentMsg);
                log(`Sent final response (after tools).`);

            } else {
                await this.saveMessage(userPhone, 'assistant', responseMessage.content);
                const sentMsg = await this.sendMessage(remoteJid, responseMessage.content, channel);
                if (sentMsg) responses.push(sentMsg);
                log(`Sent final response (text only).`);
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
            responses.push({
                text: "⚠️ Erro ao processar mensagem: " + error.message + ". Verifique a API Key da OpenAI no painel.",
                role: 'assistant',
                timestamp: new Date().toISOString()
            });
        }

        return responses;
    }

    async sendMessage(remoteJid, message, channel = 'whatsapp', mediaUrl = null) {
        console.log(`Sending message to ${remoteJid}:`, message, mediaUrl ? `(with media: ${mediaUrl})` : '');
        const fs = require('fs');
        const path = require('path');
        const logFile = process.env.VERCEL ? path.join('/tmp', 'debug_memory.log') : path.join(__dirname, '../debug_memory.log');

        try {
            await this.loadSettings();

            // Check if active
            if (!this.settings || !this.settings.is_active) {
                console.log('AI Service is inactive, skipping message send.');
                return;
            }

            // Check API Key
            if (this.settings.evolution_api_key) {
                // Determine Payload Type (Text vs Media)
                let url, payload;

                if (mediaUrl) {
                    // Media Message
                    url = `${this.settings.evolution_api_url}/message/sendMedia/${this.settings.instance_name}`;
                    payload = {
                        number: remoteJid.replace('@s.whatsapp.net', ''),
                        options: {
                            delay: 1200,
                            presence: 'composing'
                        },
                        mediaMessage: {
                            mediatype: 'image',
                            caption: message,
                            media: mediaUrl
                        }
                    };
                } else {
                    // Text Message
                    url = `${this.settings.evolution_api_url}/message/sendText/${this.settings.instance_name}`;
                    payload = {
                        number: remoteJid.replace('@s.whatsapp.net', ''),
                        options: {
                            delay: 1200,
                            presence: 'composing',
                            linkPreview: true
                        },
                        textMessage: {
                            text: message
                        }
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

            } else {
                console.warn('Evolution API Key not configured');
                this.logToDb('warning', 'Evolution API Key missing');
            }

        } catch (error) {
            console.error('Error sending message:', error.response?.data || error.message);
            this.logToDb('error', 'Failed to send message', { error: error.message, remoteJid });
            const fs = require('fs');
            try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ERROR SENDING: ${error.message}\n`); } catch (e) { }
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

        // Custom messages based on status
        if (status === 'approved') {
            message += `\n\nOba! Seu pedido foi aceito e já vai para a cozinha.`;
        } else if (status === 'preparing') {
            message += `\n\nEstamos preparando tudo com carinho! 🔥`;
        } else if (status === 'ready') {
            message += `\n\nSeu pedido está pronto!`;
            if (orderDetails?.delivery_type === 'pickup') message += ` Pode vir buscar.`;
        } else if (status === 'out_for_delivery') {
            message += `\n\nNosso entregador já está a caminho! 🛵`;
        } else if (status === 'delivered') {
            message += `\n\nPedido entregue. Bom apetite! 😋`;
        } else if (status === 'cancelled') {
            message += `\n\nQue pena! O pedido foi cancelado. Se tiver dúvidas, entre em contato.`;
        }

        // Add details if available
        if (itemsList) message += `\n${itemsList}`;

        if (orderDetails) {
            message += `\n\n💰 *Total:* R$ ${orderDetails.total.toFixed(2)}`;
            if (orderDetails.delivery_fee > 0) message += ` (Taxa: R$ ${orderDetails.delivery_fee.toFixed(2)})`;
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
