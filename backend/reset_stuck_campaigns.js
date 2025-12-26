const { createClient } = require('@supabase/supabase-js');

// Use env vars or hardcoded for this script execution
const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetStuckCampaigns() {
    console.log('--- Resetting Stuck Campaigns ---');

    // 1. Find stuck campaigns (processing)
    const { data: stuck } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'processing');

    if (!stuck || stuck.length === 0) {
        console.log('No stuck campaigns found.');
        return;
    }

    console.log(`Found ${stuck.length} stuck campaigns. Resetting...`);

    for (const campaign of stuck) {
        console.log(`Processing ID: ${campaign.id} (${campaign.title})`);

        // Check if it has any sent messages (if so, maybe we shouldn't fully reset, but mark failed?)
        const { count: sentCount } = await supabase
            .from('campaign_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'sent');

        if (sentCount > 0) {
            console.log(`  -> Has ${sentCount} sent messages. Marking as 'completed' (or 'failed') to stop processing loop, not resetting to draft.`);
            // Mark as completed so it doesn't get picked up again as stuck, or maybe failed?
            // Let's mark as failed so user knows it didn't finish.
            await supabase.from('campaigns').update({
                status: 'failed',
                completed_at: new Date() // Mark done
            }).eq('id', campaign.id);
        } else {
            console.log(`  -> No messages sent. Resetting to 'draft' and cleaning pending messages.`);

            // Delete pending/failed messages for this campaign to start fresh
            const { error: delError } = await supabase
                .from('campaign_messages')
                .delete()
                .eq('campaign_id', campaign.id);

            if (delError) console.error('Error deleting messages:', delError);

            // Reset campaign status
            await supabase.from('campaigns').update({
                status: 'draft',
                scheduled_at: null // Remove schedule to prevent auto-start immediately
            }).eq('id', campaign.id);

            console.log(`  -> Reset to draft.`);
        }
    }
    console.log('Done.');
}

resetStuckCampaigns();
