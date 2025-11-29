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

    // --- MAIN PROCESS ---

    async processMessage(messageData) {
        console.log('--- AI Service: Processing Message ---');
        console.log('Input Data:', JSON.stringify(messageData, null, 2));

        await this.loadSettings();

        if (!this.settings) {
            console.log('❌ Settings not found in database');
            return;
        }

        if (!this.settings.is_active) {
            console.log('❌ AI Agent is disabled (is_active = false)');
            return;
        }

        if (!this.openai) {
            console.log('❌ OpenAI client not initialized (missing API Key?)');
            return;
        }

        const { remoteJid, pushName, conversation } = messageData;
        const userMessage = conversation || messageData.text?.message;
        const userPhone = remoteJid.replace('@s.whatsapp.net', '');

        console.log(`User: ${pushName} (${userPhone})`);
        console.log(`Message: "${userMessage}"`);

        if (!userMessage) {
            console.log('❌ No text message content found');
            return;
        }

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

        try {
            console.log('Sending request to OpenAI...');
            const messages = [
                { role: 'system', content: this.settings.system_prompt + `\n\nCurrent Date: ${new Date().toLocaleString('pt-BR')}` },
                { role: 'user', content: `User Phone: ${userPhone}\nName: ${pushName}\nMessage: ${userMessage}` }
            ];

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: messages,
                tools: tools,
                tool_choice: "auto"
            });

            const responseMessage = completion.choices[0].message;
            console.log('OpenAI Response:', JSON.stringify(responseMessage, null, 2));

            // Handle Tool Calls
            if (responseMessage.tool_calls) {
                console.log('Tool calls detected:', responseMessage.tool_calls.length);
                messages.push(responseMessage); // Add assistant's thought process

                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments);
                    console.log(`Executing tool: ${functionName}`, functionArgs);

                    let functionResult;

                    if (functionName === 'get_menu') {
                        functionResult = await this.getMenu();
                    } else if (functionName === 'register_customer') {
                        // Force phone from context if not provided or ensure it matches
                        functionArgs.phone = userPhone;
                        functionResult = await this.registerCustomer(functionArgs);
                    } else if (functionName === 'create_order') {
                        functionArgs.customerPhone = userPhone;
                        functionResult = await this.createOrder(functionArgs);
                    } else if (functionName === 'check_order_status') {
                        functionResult = await this.checkOrderStatus(functionArgs);
                    }

                    console.log(`Tool result (${functionName}):`, functionResult);

                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: functionResult,
                    });
                }

                // Get final response after tool execution
                console.log('Getting final response from OpenAI...');
                const secondResponse = await this.openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: messages
                });

                const finalContent = secondResponse.choices[0].message.content;
                console.log('Final AI Response:', finalContent);
                await this.sendMessage(remoteJid, finalContent);

            } else {
                // No tool called, just normal response
                console.log('No tools called, sending direct response');
                await this.sendMessage(remoteJid, responseMessage.content);
            }

        } catch (error) {
            console.error('Error processing AI message:', error);
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

    // Notification Helper
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
