const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class AIService {
    constructor() {
        this.settings = null;
        this.openai = null;
    }

    async loadSettings() {
        const { data, error } = await supabase
            .from('ai_integration_settings')
            .select('*')
            .single();

        if (data) {
            this.settings = data;
            if (data.openai_api_key) {
                this.openai = new OpenAI({ apiKey: data.openai_api_key });
            }
        }
        return this.settings;
    }

    // --- HELPERS ---
    formatPhone(phone) {
        if (!phone) return phone;
        let cleaned = phone.replace(/\D/g, '');

        // If it's the LID (starts with 5666... and is long), return as is or handle differently?
        // Actually, we want to format REAL numbers.
        if (cleaned.length > 15) return cleaned; // Probably a LID or ID

        // Default to BR (+55) and SP (11) if missing
        // Case: 99999-9999 (9 digits) -> 5511999999999
        if (cleaned.length === 8 || cleaned.length === 9) {
            cleaned = '5511' + cleaned;
        }
        // Case: 1199999-9999 (11 digits) -> 5511999999999
        else if (cleaned.length === 10 || cleaned.length === 11) {
            cleaned = '55' + cleaned;
        }

        return cleaned;
    }

    // --- TOOLS IMPLEMENTATION ---

    async getMenu() {
        console.log('Tool called: getMenu');
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, description, price, category_id')
            .eq('is_available', true);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify(products);
    }

    async registerCustomer({ name, phone, address, cep }) {
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Tool called: registerCustomer. Input: ${JSON.stringify({ name, phone, address, cep })}`);

        const formattedPhone = this.formatPhone(phone);
        log(`Formatted phone: ${formattedPhone}`);

        // Combine address and CEP if CEP is provided
        let fullAddress = address;
        if (cep) {
            fullAddress = `${address} - CEP: ${cep}`;
        }

        // Check if exists
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', formattedPhone)
            .single();

        if (existing) {
            // Update address if provided
            if (address) {
                await supabase.from('customers').update({ address: fullAddress, name }).eq('id', existing.id);
                log(`Customer updated: ${existing.id}`);
                return JSON.stringify({ success: true, message: 'Customer updated', customerId: existing.id });
            }
            log(`Customer already exists: ${existing.id}`);
            return JSON.stringify({ success: true, message: 'Customer already exists', customerId: existing.id });
        }

        const { data, error } = await supabase
            .from('customers')
            .insert([{ name, phone: formattedPhone, address: fullAddress }])
            .select()
            .single();

        if (error) {
            log(`Error registering customer: ${error.message}`);
            return JSON.stringify({ error: error.message });
        }

        log(`Customer registered: ${data.id}`);
        return JSON.stringify({ success: true, customerId: data.id });
    }

    async createOrder({ customerPhone, items, paymentMethod, changeFor, deliveryFee = 0 }) {
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Tool called: createOrder. Input: ${JSON.stringify({ customerPhone, items })}`);

        const formattedPhone = this.formatPhone(customerPhone);
        log(`Formatted customer phone: ${formattedPhone}`);

        // 1. Get Customer
        const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', formattedPhone)
            .single();

        if (!customer) {
            log(`Customer not found for phone: ${formattedPhone}`);
            return JSON.stringify({ error: `Customer not found for phone ${formattedPhone}. Register first.` });
        }

        // 2. Calculate Total & Validate Items
        let total = 0;
        const orderItemsData = [];

        for (const item of items) {
            const { data: product } = await supabase
                .from('products')
                .select('*')
                .eq('id', item.productId)
                .single();

            if (!product) continue;

            const itemTotal = product.price * item.quantity;
            total += itemTotal;

            orderItemsData.push({
                product_id: product.id,
                product_name: product.name,
                quantity: item.quantity,
                price: product.price,
                modifiers: item.modifiers || [] // Store modifiers as JSON/Array
            });
        }

        total += deliveryFee;

        // 3. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert([{
                customer_id: customer.id,
                customer_name: customer.name,
                customer_phone: customer.phone,
                customer_address: customer.address,
                total: total,
                payment_method: paymentMethod,
                change_for: changeFor,
                delivery_fee: deliveryFee,
                status: 'Pendente'
            }])
            .select()
            .single();

        if (orderError) {
            log(`Error creating order: ${orderError.message}`);
            return JSON.stringify({ error: orderError.message });
        }

        // 4. Insert Order Items
        const itemsToInsert = orderItemsData.map(item => ({
            ...item,
            order_id: order.id
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(itemsToInsert);

        if (itemsError) return JSON.stringify({ error: 'Order created but items failed: ' + itemsError.message });

        // 5. Notify Admin (Optional: via WebSocket or just rely on polling)
        log(`Order created successfully: ${order.id}`);
        return JSON.stringify({ success: true, orderId: order.id, total, message: 'Order placed successfully' });
    }

    async checkOrderStatus({ orderId }) {
        console.log('Tool called: checkOrderStatus', { orderId });
        const { data: order, error } = await supabase
            .from('orders')
            .select('status, total, created_at')
            .eq('id', orderId)
            .single();

        if (error) return JSON.stringify({ error: 'Order not found' });
        return JSON.stringify(order);
    }

    // --- MEMORY & SCHEDULE HELPERS ---

    async getHistory(phone) {
        const fs = require('fs');
        const path = require('path');
        const logFile = path.join(__dirname, '../debug_memory.log');
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
        const logFile = path.join(__dirname, '../debug_memory.log');
        const log = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`); } catch (e) { } };

        log(`Saving message for ${phone} (${role}): ${content.substring(0, 50)}...`);
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
        // Force Brazil Timezone
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

                // Handle overnight intervals (e.g. 18:00 to 02:00)
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

            // Cleanup
            fs.unlinkSync(tempFilePath);

            return transcription.text;
        } catch (error) {
            console.error('Error transcribing audio:', error);
            return null;
        }
    }

    async processMessage(messageData, channel = 'whatsapp') {
        console.log(`--- AI Service: Processing Message (${channel}) ---`);
        const responses = [];

        await this.loadSettings();
        if (!this.settings || !this.settings.is_active || !this.openai) return [];

        const { remoteJid, pushName, conversation, audioMessage, base64 } = messageData;
        let userMessage = conversation || messageData.text?.message;
        const userPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

        // Handle Audio
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

        console.log(`User Message (${userPhone}): ${userMessage}`);

        try {
            // 1. Save User Message
            await this.saveMessage(userPhone, 'user', userMessage);

            // 2. Get History
            const history = await this.getHistory(userPhone);

            // 3. Check Opening Hours
            const { isOpen } = this.checkOpeningHours();
            const systemPrompt = `
${this.settings.system_prompt || 'Você é um assistente virtual.'}

${!isOpen ? 'AVISO: O estabelecimento está FECHADO agora. Avise o cliente e diga que o pedido será processado quando abrir.' : ''}

CONTEXTO DO CLIENTE:
Nome: ${pushName || 'Cliente'}
Telefone: ${userPhone}
Histórico de Pedidos: (Consultar se necessário)

INSTRUÇÕES:
- Seja educado e prestativo.
- Use emojis.
- AO MOSTRAR O CARDÁPIO: Organize por categorias, use negrito para nomes (*Nome*), e mostre o preço (R$ XX,XX). Não mande JSON cru.
- AO CRIAR PEDIDO:
  1. Pergunte se é **Entrega** ou **Retirada**.
  2. Se for **Entrega**: Pergunte o **Endereço Completo** e o **CEP**.
  3. Se for **Retirada**: Avise que o endereço é Rua Exemplo, 123.
  4. Confirme o valor total e a forma de pagamento.
  5. SÓ DEPOIS de ter tudo isso, chame `create_order`.
  6. Forneça o link de acompanhamento no formato: [Acompanhar Pedido](/tracking/ID_DO_PEDIDO).
- Para ver status, use check_order_status.
- Se o cliente mandar o número de telefone, use register_customer para salvar.
`;

            const messages = [
                { role: "system", content: systemPrompt },
                ...history.map(msg => ({ role: msg.role, content: msg.content })),
                { role: "user", content: userMessage }
            ];

            // 4. Define Tools
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
                        description: "Cria um novo pedido.",
                        parameters: {
                            type: "object",
                            properties: {
                                customerPhone: { type: "string" },
                                items: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            productId: { type: "integer" },
                                            quantity: { type: "integer" },
                                            modifiers: { type: "array", items: { type: "string" } }
                                        },
                                        required: ["productId", "quantity"]
                                    }
                                },
                                paymentMethod: { type: "string", enum: ["Dinheiro", "Pix", "Cartão"] },
                                changeFor: { type: "number" },
                                deliveryFee: { type: "number" }
                            },
                            required: ["customerPhone", "items"]
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
            const logFile = path.join(__dirname, '../debug_memory.log');
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

            // Handle Tool Calls
            if (responseMessage.tool_calls) {
                messages.push(responseMessage);

                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    console.log(`Executing tool: ${functionName}`, functionArgs);
                    log(`Executing tool: ${functionName}`);

                    let functionResult;

                    if (functionName === 'get_menu') {
                        functionResult = await this.getMenu();
                    } else if (functionName === 'register_customer') {
                        functionArgs.phone = userPhone;
                        functionResult = await this.registerCustomer(functionArgs);
                    } else if (functionName === 'create_order') {
                        // Do NOT override customerPhone with userPhone (which is web_xxx)
                        // Let the AI pass the phone number it collected from the user
                        if (!functionArgs.customerPhone) functionArgs.customerPhone = userPhone; // Fallback only
                        functionResult = await this.createOrder(functionArgs);
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
                const sentMsg = await this.sendMessage(remoteJid, finalContent, channel);
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
            const fs = require('fs');
            const path = require('path');
            const logFile = path.join(__dirname, '../debug_memory.log');
            try {
                fs.appendFileSync(logFile, `${new Date().toISOString()} - ERROR: ${error.message}\n`);
            } catch (e) { }
        }

        return responses;
    }

    async sendMessage(remoteJid, text, channel = 'whatsapp') {
        if (!this.settings) await this.loadSettings();

        if (channel === 'web') {
            return { text, role: 'assistant', timestamp: new Date().toISOString() };
        }

        try {
            await axios.post(
                `${this.settings.evolution_api_url}/message/sendText/${this.settings.instance_name}`,
                {
                    number: remoteJid.replace('@s.whatsapp.net', ''),
                    text: text,
                    options: {
                        delay: 1200,
                        presence: 'composing',
                        linkPreview: false
                    }
                },
                {
                    headers: {
                        'apikey': this.settings.evolution_api_key,
                        'Content-Type': 'application/json'
                    }
                }
            );
        } catch (error) {
            console.error('Error sending WhatsApp message:', error.response?.data || error.message);
        }
    }

    async sendNotification(phone, status, orderId) {
        await this.loadSettings();
        if (!this.settings) return;

        let message = `🔔 * Atualização do Pedido #${orderId}*\n\nSeu pedido está: *${status}*`;

        if (status === 'Saiu para entrega') {
            message += '\n\n🛵 Nosso entregador já está a caminho!';
        } else if (status === 'Entregue') {
            message += '\n\n😋 Bom apetite! Esperamos que goste.';
        }

        const remoteJid = `${phone}@s.whatsapp.net`;

        // Save to history so Web Chat can see it via polling
        await this.saveMessage(phone, 'assistant', message);

        await this.sendMessage(remoteJid, message);
    }
}

module.exports = new AIService();
