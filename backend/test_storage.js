const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testStorage() {
    console.log('Testing storage upload...');
    const fileName = `test_upload_${Date.now()}.txt`;
    const { data, error } = await supabase.storage
        .from('menu-items')
        .upload(fileName, 'Test content');

    if (error) {
        console.error('Upload failed:', error);
    } else {
        console.log('Upload successful:', data);
        // Clean up
        await supabase.storage.from('menu-items').remove([fileName]);
    }

    // List buckets just in case
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) console.error('List buckets failed:', bucketError);
    else console.log('Buckets:', buckets.map(b => b.name));
}

testStorage();
