const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (ensure you have these env vars or pass them in)
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

class AIService {
    constructor() {
        this.settings = null;
    }

    async loadSettings() {
        const { data, error } = await supabase
            .from('ai_integration_settings')
            .select('*')
            .single();

        if (data) {
            this.settings = data;
        }
        return this.settings;
    }

    async processMessage(messageData) {
        await this.loadSettings();
        if (!this.settings || !this.settings.is_active) return;

        const { remoteJid, pushName, conversation, messageType } = messageData;
        const userMessage = conversation || messageData.text?.message; // Adjust based on Evolution API payload

        if (!userMessage) return;

        try {
            // 1. Get Chat Completion from OpenAI
            const completion = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o-mini', // or gpt-3.5-turbo
                    messages: [
                        { role: 'system', content: this.settings.system_prompt },
                        { role: 'user', content: userMessage }
                    ],
                    // Add function calling definitions here if needed
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.settings.openai_api_key}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const aiResponse = completion.data.choices[0].message.content;

            // 2. Send Response via Evolution API
            await this.sendMessage(remoteJid, aiResponse);

        } catch (error) {
            console.error('Error processing AI message:', error.response?.data || error.message);
        }
    }

    async sendMessage(remoteJid, text) {
        if (!this.settings) await this.loadSettings();

        try {
            await axios.post(
                `${this.settings.evolution_api_url}/message/sendText/${this.settings.instance_name}`,
                {
                    number: remoteJid.replace('@s.whatsapp.net', ''),
                    options: {
                        delay: 1200,
                        presence: 'composing',
                        linkPreview: false
                    },
                    textMessage: {
                        text: text
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
}

module.exports = new AIService();
