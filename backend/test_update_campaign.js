const MarketingService = require('./services/marketingService');

// Mock AI Service
const mockAiService = {
    formatPhone: (phone) => phone.replace(/\D/g, ''),
    sendMessage: async () => console.log('Mock send message')
};

// Config
const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

async function runTest() {
    const service = new MarketingService(supabaseUrl, supabaseKey, mockAiService);
    let groupId, campaignId;

    try {
        console.log('1. Creating Group...');
        const group = await service.createGroup('Test Group ' + Date.now(), 'Test Description');
        groupId = group.id;
        console.log('Group created:', groupId);

        console.log('2. Creating Campaign...');
        const campaign = await service.createCampaign({
            title: 'Test Campaign',
            messageTemplate: 'Hello',
            messageVariations: [],
            imageUrl: 'http://example.com/img.jpg',
            targetGroupId: groupId,
            scheduledAt: new Date().toISOString()
        });
        campaignId = campaign.id;
        console.log('Campaign created:', campaignId);

        console.log('3. Updating Campaign (simulating PUT request)...');
        const updates = {
            title: 'Updated Title',
            imageUrl: 'http://example.com/updated.jpg', // Checking mapping
            messageTemplate: 'Updated Message',
            targetGroupId: groupId // Same group
        };

        const updated = await service.updateCampaign(campaignId, updates);
        console.log('Campaign updated:', updated.title, updated.image_url);

        if (updated.image_url !== updates.imageUrl) {
            console.error('ERROR: imageUrl not updated correctly!');
        } else {
            console.log('SUCCESS: imageUrl updated correctly.');
        }

    } catch (err) {
        console.error('TEST FAILED:', err);
    } finally {
        // Cleanup
        if (campaignId) {
            console.log('Cleaning up campaign...');
            await service.deleteCampaign(campaignId).catch(console.error);
        }
        if (groupId) {
            console.log('Cleaning up group...');
            await service.deleteGroup(groupId).catch(console.error);
        }
    }
}

runTest();
