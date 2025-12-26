const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkState() {
    const now = new Date().toISOString();
    const result = {
        scanTime: now,
        scheduled: [],
        processing: [],
        pendingMessagesCount: 0,
        failedMessages: []
    };

    // 1. Check Scheduled Campaigns
    const { data: scheduled } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'scheduled');

    if (scheduled) {
        result.scheduled = scheduled.map(c => ({
            id: c.id,
            title: c.title,
            scheduledAt: c.scheduled_at,
            isDue: c.scheduled_at <= now,
            minutesLate: c.scheduled_at ? (new Date(now) - new Date(c.scheduled_at)) / 60000 : 0
        }));
    }

    // 2. Check Processing Campaigns
    const { data: processing } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'processing');

    if (processing) {
        result.processing = processing.map(c => ({
            id: c.id,
            title: c.title
        }));
    }

    // 3. Check Pending Messages
    const { count: pendingCount } = await supabase
        .from('campaign_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    result.pendingMessagesCount = pendingCount;

    // 4. Check Failed Messages (Sample)
    const { data: failed } = await supabase
        .from('campaign_messages')
        .select('error_message, created_at')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(5);

    if (failed) result.failedMessages = failed;

    fs.writeFileSync('marketing_state.json', JSON.stringify(result, null, 2));
    console.log('State written to marketing_state.json');
}

checkState();
