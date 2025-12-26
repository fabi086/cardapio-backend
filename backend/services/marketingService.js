const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai'); // Assuming we use same OpenAI instance or new one for text variations? 
// Actually we can reuse or just implement simple rotation provided by user, but plan says "AI Rephrasing" in frontend. 
// For backend sending, it just picks from variations.

class MarketingService {
    constructor(supabaseUrl, supabaseKey, aiService) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.aiService = aiService; // Reuse existing AI service for sending messages
        this.isProcessing = false;
        console.log('MarketingService initialized');
    }

    // --- GRUPOS ---

    async createGroup(name, description) {
        const { data, error } = await this.supabase
            .from('client_groups')
            .insert([{ name, description }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async getGroups() {
        const { data, error } = await this.supabase
            .from('client_groups')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async addCustomerToGroup(groupId, customerId) {
        const { error } = await this.supabase
            .from('client_group_members')
            .insert([{ group_id: groupId, customer_id: customerId }]);
        if (error) throw error;
        return true;
    }

    async removeCustomerFromGroup(groupId, customerId) {
        const { error } = await this.supabase
            .from('client_group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('customer_id', customerId);
        if (error) throw error;
        return true;
    }

    async getGroupMembers(groupId) {
        const { data, error } = await this.supabase
            .from('client_group_members')
            .select('customer_id, customers(name, phone, id)')
            .eq('group_id', groupId);

        if (error) throw error;
        return data.map(item => item.customers);
    }

    async getCustomers(limit = 50, search = '') {
        console.log(`[MarketingService] Fetching customers... limit=${limit} search='${search}'`);
        let query = this.supabase
            .from('customers')
            .select('id, name, phone, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('[MarketingService] Supabase Error:', error);
            throw error;
        }
        console.log(`[MarketingService] Success, returned ${data ? data.length : 0} rows`);
        return data;
    }

    // --- CAMPANHAS ---

    async createCampaign({ title, messageTemplate, messageVariations, imageUrl, targetGroupId, scheduledAt }) {
        const { data, error } = await this.supabase
            .from('campaigns')
            .insert([{
                title,
                message_template: messageTemplate,
                message_variations: messageVariations, // JSON array
                image_url: imageUrl,
                target_group_id: targetGroupId,
                scheduled_at: scheduledAt || new Date().toISOString(),
                status: 'scheduled'
            }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async getCampaigns() {
        const { data, error } = await this.supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getCampaignDetails(campaignId) {
        // Get Basic Info
        const { data: campaign, error } = await this.supabase
            .from('campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();
        if (error) throw error;

        // Get Stats
        const { count: sentCount } = await this.supabase
            .from('campaign_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .eq('status', 'sent');

        const { count: failedCount } = await this.supabase
            .from('campaign_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .eq('status', 'failed');

        const { count: pendingCount } = await this.supabase
            .from('campaign_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .eq('status', 'pending');

        // CALCULAR VENDAS (Atribuição)
        // Pedidos feitos por pessoas que receberam a mensagem nas últimas 24h a partir do envio
        // Como 'sent_at' varia, vamos pegar pedidos feitos >= campanha.created_at (aprox) E customer IN (recipients)

        // 1. Get recipients phones
        const { data: messages } = await this.supabase
            .from('campaign_messages')
            .select('customer_id, sent_at')
            .eq('campaign_id', campaignId)
            .eq('status', 'sent');

        let salesCount = 0;
        let salesTotal = 0;

        if (messages && messages.length > 0) {
            const customerIds = messages.map(m => m.customer_id).filter(id => id);

            if (customerIds.length > 0) {
                const { data: orders } = await this.supabase
                    .from('orders')
                    .select('total, created_at, customer_id')
                    .in('customer_id', customerIds)
                    .gte('created_at', campaign.created_at); // Simplification: orders after campaign creation

                if (orders) {
                    salesCount = orders.length;
                    salesTotal = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
                }
            }
        }

        return {
            ...campaign,
            stats: {
                sent: sentCount,
                failed: failedCount,
                pending: pendingCount,
                salesCount,
                salesTotal: salesTotal.toFixed(2)
            }
        };
    }

    // --- EXECUÇÃO (Scheduler) ---

    // Called every min by server.js
    async processScheduledCampaigns() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // 1. Find campaigns due
            const now = new Date().toISOString();
            const { data: campaigns } = await this.supabase
                .from('campaigns')
                .select('*')
                .eq('status', 'scheduled')
                .lte('scheduled_at', now);

            if (campaigns && campaigns.length > 0) {
                console.log(`[Marketing] Found ${campaigns.length} campaigns to process.`);
                for (const campaign of campaigns) {
                    await this.startCampaign(campaign);
                }
            }

            // 2. Process pending messages (Queue)
            // Pick a batch of pending messages across ANY running campaign
            // But we need to update campaign status to 'processing' first

            await this.processMessageQueue();

        } catch (err) {
            console.error('[Marketing] Error in scheduler:', err);
        } finally {
            this.isProcessing = false;
        }
    }

    async startCampaign(campaign) {
        console.log(`[Marketing] Starting campaign: ${campaign.title}`);

        // 1. Update status to processing
        await this.supabase.from('campaigns').update({ status: 'processing' }).eq('id', campaign.id);

        // 2. Populate campaign_messages from group members
        // Fetch members
        const members = await this.getGroupMembers(campaign.target_group_id);

        if (!members || members.length === 0) {
            console.log(`[Marketing] No members in group for campaign ${campaign.title}`);
            await this.supabase.from('campaigns').update({ status: 'completed', completed_at: new Date() }).eq('id', campaign.id);
            return;
        }

        // Create message entries
        const messagesToInsert = members.map(member => ({
            campaign_id: campaign.id,
            customer_id: member.id,
            phone: member.phone,
            status: 'pending'
        }));

        // Batch insert (check limits, split if needed but usually okay for <1000)
        const batchSize = 100;
        for (let i = 0; i < messagesToInsert.length; i += batchSize) {
            const batch = messagesToInsert.slice(i, i + batchSize);
            const { error } = await this.supabase.from('campaign_messages').insert(batch);
            if (error) console.error('[Marketing] Error inserting messages:', error);
        }

        console.log(`[Marketing] Queued ${messagesToInsert.length} messages for campaign ${campaign.title}`);
    }

    async processMessageQueue() {
        // Fetch pending messages (limit 5 per tick to avoid spam blocks)
        const { data: messages } = await this.supabase
            .from('campaign_messages')
            .select('*, campaigns(message_template, message_variations, image_url)')
            .eq('status', 'pending')
            .limit(5); // Conservative batch size

        if (!messages || messages.length === 0) return;

        console.log(`[Marketing] Processing ${messages.length} pending messages...`);

        for (const msg of messages) {
            try {
                // 1. Select message text (Variation or Template)
                let textToSend = msg.campaigns.message_template;

                // If variations exist, pick random
                if (msg.campaigns.message_variations && Array.isArray(msg.campaigns.message_variations) && msg.campaigns.message_variations.length > 0) {
                    const vars = msg.campaigns.message_variations;
                    const randomIndex = Math.floor(Math.random() * vars.length);
                    textToSend = vars[randomIndex];
                }

                if (!textToSend) textToSend = "Olá!"; // Fallback

                // 2. Send via AIService (WhatsApp)
                // Use formatPhone from AIService if possible, but here we assume simple mapping
                // Sending to: phone@s.whatsapp.net
                // We need to clean phone first using aiService helper

                const cleanPhone = this.aiService.formatPhone(msg.phone);
                const jid = `${cleanPhone}@s.whatsapp.net`; // Assuming internal format

                console.log(`[Marketing] Sending to ${cleanPhone}: "${textToSend.substring(0, 20)}..."`);

                // Add jitter/delay to avoid being robotic (1s - 5s)
                await new Promise(r => setTimeout(r, 1000 + Math.random() * 4000));

                await this.aiService.sendMessage(jid, textToSend);

                // If image exists, send it too
                if (msg.campaigns.image_url) {
                    // TODO: Send Media if supported by aiService. 
                    // Assuming aiService.sendMessage defaults to text.
                    // If we have sendMedia, call it.
                    // Ignoring for MVP unless requested.
                }

                // 3. Mark as sent
                await this.supabase
                    .from('campaign_messages')
                    .update({
                        status: 'sent',
                        sent_at: new Date(),
                        sent_message: textToSend
                    })
                    .eq('id', msg.id);

            } catch (err) {
                console.error(`[Marketing] Failed to send to ${msg.phone}:`, err.message);
                await this.supabase
                    .from('campaign_messages')
                    .update({
                        status: 'failed',
                        error_message: err.message
                    })
                    .eq('id', msg.id);
            }
        }

        // Update completed campaigns
        // Check if any campaign has 0 pending items but is still 'processing'
        // This is expensive to check every time. Let's assume we do it lazily or user checks status.
    }
}

module.exports = MarketingService;
