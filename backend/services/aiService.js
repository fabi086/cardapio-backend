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
        console.log('Tool called: registerCustomer', { name, phone });
        // Check if exists
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', phone)
            .single();

        if (existing) {
            // Update address if provided
            if (address) {
                await supabase.from('customers').update({ address, cep, name }).eq('id', existing.id);
                return JSON.stringify({ success: true, message: 'Customer updated', customerId: existing.id });
            }
            return JSON.stringify({ success: true, message: 'Customer already exists', customerId: existing.id });
        }

        const { data, error } = await supabase
            .from('customers')
            .insert([{ name, phone, address, cep }])
            .select()
            .single();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, customerId: data.id });
    }

    async createOrder({ customerPhone, items, paymentMethod, changeFor, deliveryFee = 0 }) {
        console.log('Tool called: createOrder', { customerPhone, items });

        // 1. Get Customer
        const { data: customer } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', customerPhone)
            .single();

        if (!customer) return JSON.stringify({ error: 'Customer not found. Register first.' });

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

        if (orderError) return JSON.stringify({ error: orderError.message });

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
        const { data } = await supabase
            .from('chat_history')
            .select('role, content')
            .eq('user_phone', phone)
            .in('role', ['user', 'assistant']) // Only get text messages to avoid tool errors
            .not('content', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10);

        return data ? data.reverse() : [];
    }

    // ... (rest of methods)

    // Inside processMessage catch block
} catch (error) {
    console.error('Error processing AI message:', error);
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, '..', 'ai_error.log'), `${new Date().toISOString()}: ${error.stack || error.message}\n${JSON.stringify(error, null, 2)}\n`);
}

    async saveMessage(phone, role, content) {
    if (!content) return;
    await supabase.from('chat_history').insert([{ user_phone: phone, role, content }]);
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

    // --- AUDIO HANDLING ---

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

    // --- MAIN PROCESS ---

    async processMessage(messageData) {
    console.log('--- AI Service: Processing Message ---');

    await this.loadSettings();
    if (!this.settings || !this.settings.is_active || !this.openai) return;

    const { remoteJid, pushName, conversation, audioMessage, base64 } = messageData;
    let userMessage = conversation || messageData.text?.message;
    const userPhone = remoteJid.replace('@s.whatsapp.net', '');

    // Handle Audio
    if (audioMessage) {
        console.log('Audio message detected');
        if (base64) {
            userMessage = await this.transcribeAudio(base64);
            if (!userMessage) {
                await this.sendMessage(remoteJid, "Desculpe, não consegui ouvir seu áudio. Pode escrever?");
                return;
            }
            await this.sendMessage(remoteJid, `🎤 *Entendi:* "${userMessage}"`);
        } else {
            console.log('❌ No base64 found for audio message.');
            await this.sendMessage(remoteJid, "⚠️ *Configuração Necessária*\n\nRecebi seu áudio, mas ele veio vazio.\n\nPor favor, na **Evolution API**, vá em **Webhook** e ative a opção **Download Media** (ou Include Base64).");
            return;
        }
    }

    if (!userMessage) return;

    try {
        // 1. Save User Message
        await this.saveMessage(userPhone, 'user', userMessage);

        // 2. Check Opening Hours
        const { isOpen } = this.checkOpeningHours();
        const statusMessage = isOpen ? "The store is currently OPEN." : "The store is currently CLOSED. Inform the customer but allow them to schedule an order if they wish.";

        // 3. Fetch History
        const history = await this.getHistory(userPhone);

        // 4. Fetch Customer Profile (Long-Term Memory)
        const { data: customer } = await supabase
            .from('customers')
            .select('name, address, cep')
            .eq('phone', userPhone)
            .single();

        // 5. Fetch Last Order (Long-Term Memory)
        const { data: lastOrder } = await supabase
            .from('orders')
            .select('id, total, created_at, order_items(product_name, quantity)')
            .eq('customer_phone', userPhone)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        const tools = [
            {
                type: "function",
                function: {
                    name: "get_menu",
                    description: "Get the list of available products in the menu",
                    parameters: { type: "object", properties: {} }
                }
            },
            {
                type: "function",
                function: {
                    name: "register_customer",
                    description: "Register or update a customer",
                    parameters: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            phone: { type: "string", description: "Customer phone number (e.g., 5511999999999)" },
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
                    description: "Place a new order",
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
                            changeFor: { type: "number", description: "Change needed for cash payment" }
                        },
                        required: ["customerPhone", "items", "paymentMethod"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "check_order_status",
                    description: "Check the status of an order",
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

        let contextInfo = `\n\nCURRENT STATUS: ${statusMessage}`;
        contextInfo += `\nCURRENT DATE: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

        if (customer) {
            contextInfo += `\n\nCUSTOMER PROFILE:\nName: ${customer.name}\nAddress: ${customer.address || 'Not registered'}`;
        }

        if (lastOrder) {
            const itemsList = lastOrder.order_items.map(i => `${i.quantity}x ${i.product_name}`).join(', ');
            contextInfo += `\n\nLAST ORDER (${new Date(lastOrder.created_at).toLocaleDateString()}): ${itemsList} (Total: R$ ${lastOrder.total})`;
        }

        const systemPrompt = `${this.settings.system_prompt}${contextInfo}
            
            IMPORTANT: You have access to the conversation history and customer profile. Use it to remember preferences and context.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history, // Inject history
            { role: 'user', content: `User Phone: ${userPhone}\nName: ${pushName}\nMessage: ${userMessage}` }
        ];

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            tools: tools,
            tool_choice: "auto"
        });

        const responseMessage = completion.choices[0].message;

        // Handle Tool Calls
        if (responseMessage.tool_calls) {
            messages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
                console.log(`Executing tool: ${functionName}`, functionArgs);

                let functionResult;

                if (functionName === 'get_menu') {
                    functionResult = await this.getMenu();
                } else if (functionName === 'register_customer') {
                    functionArgs.phone = userPhone;
                    functionResult = await this.registerCustomer(functionArgs);
                } else if (functionName === 'create_order') {
                    functionArgs.customerPhone = userPhone;
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
            await this.sendMessage(remoteJid, finalContent);

        } else {
            await this.saveMessage(userPhone, 'assistant', responseMessage.content);
            await this.sendMessage(remoteJid, responseMessage.content);
        }

    } catch (error) {
        console.error('Error processing AI message:', error);
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(__dirname, '..', 'ai_error.log'), `${new Date().toISOString()}: ${error.stack || error.message}\n${JSON.stringify(error, null, 2)}\n`);
    }
}

async sendMessage(remoteJid, text) {
    if (!this.settings) await this.loadSettings();

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

    let message = `🔔 *Atualização do Pedido #${orderId}*\n\nSeu pedido está: *${status}*`;

    if (status === 'Saiu para entrega') {
        message += '\n\n🛵 Nosso entregador já está a caminho!';
    } else if (status === 'Entregue') {
        message += '\n\n😋 Bom apetite! Esperamos que goste.';
    }

    const remoteJid = `${phone}@s.whatsapp.net`;
    await this.sendMessage(remoteJid, message);
}
}

module.exports = new AIService();
