const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID Keys (Generated dynamically for this project)
const publicVapidKey = 'BBiGySh7odgAmNF4Zk7AnvtjM504dcZfuLcdxh5NZ8xB8MNxFj-1XXvy1Sx60YodVQXnoCfPbSKwIw6xizc-v4U';
const privateVapidKey = 'CedhmszA_d763Qw4o06UZ-pSQFJyj-cAyOP5RtjYvSY';

try {
    webpush.setVapidDetails(
        'mailto:fabio@example.com',
        publicVapidKey,
        privateVapidKey
    );
    console.log('VAPID details set successfully');
} catch (error) {
    console.error('Failed to set VAPID details:', error);
}

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
