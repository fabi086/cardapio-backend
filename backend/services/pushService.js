const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID Keys (Generated dynamically for this project)
const publicVapidKey = 'BEOJRvySures7PvdtReM-3Ld1m_5M5XvV_TDMmy5sx-ZPCLLSubYC8xr94RooXb7T-P0w8y4fR_m-Q1V92hYv7M';
const privateVapidKey = '2-NNs1AM-CO55pnQTP08t46Wf33Xy023P26E9sQy-bWE';

webpush.setVapidDetails(
    'mailto:fabio@example.com',
    publicVapidKey,
    privateVapidKey
);

class PushService {
    getPublicKey() {
        return publicVapidKey;
    }

    async saveSubscription(subscription, userAgent) {
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                user_agent: userAgent,
                created_at: new Date()
            }, { onConflict: 'endpoint' });

        if (error) {
            console.error('Error saving subscription:', error);
            throw error;
        }
        return { success: true };
    }

    async sendNotificationToAll(payload) {
        // Fetch all subscriptions
        const { data: subscriptions, error } = await supabase
            .from('push_subscriptions')
            .select('*');

        if (error) {
            console.error('Error fetching subscriptions:', error);
            return;
        }

        console.log(`Sending push notification to ${subscriptions.length} devices...`);

        const notificationPayload = JSON.stringify(payload);

        const promises = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: sub.keys
            };

            return webpush.sendNotification(pushSubscription, notificationPayload)
                .catch(err => {
                    console.error('Error sending push to endpoint:', sub.endpoint, err.statusCode);
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Subscription has expired or is no longer valid
                        console.log('Removing invalid subscription:', sub.id);
                        supabase.from('push_subscriptions').delete().eq('id', sub.id).then();
                    }
                });
        });

        await Promise.all(promises);
    }
}

module.exports = new PushService();
