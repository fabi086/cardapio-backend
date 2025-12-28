const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkErrors() {
    console.log('Checking for errors in last 24 hours...\n');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Check for error logs
    const { data: errorLogs } = await supabase
        .from('system_logs')
        .select('*')
        .in('level', ['error', 'warning'])
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

    if (errorLogs && errorLogs.length > 0) {
        console.log(`Found ${errorLogs.length} errors/warnings:\n`);
        errorLogs.forEach((log, i) => {
            console.log(`${i + 1}. [${log.level.toUpperCase()}] ${new Date(log.created_at).toLocaleString()}`);
            console.log(`   Message: ${log.message}`);
            if (log.details) {
                console.log(`   Details: ${JSON.stringify(log.details).substring(0, 200)}`);
            }
            console.log('');
        });
    } else {
        console.log('✅ No errors or warnings found in the last 24 hours.');
    }

    // Check recent chat history to see if messages are being received
    const { data: recentChats } = await supabase
        .from('chat_history')
        .select('role, content, created_at, user_phone')
        .gte('created_at', yesterday.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

    console.log('\n=== Recent Chat Activity ===');
    if (recentChats && recentChats.length > 0) {
        console.log(`Found ${recentChats.length} recent messages:\n`);
        recentChats.forEach((msg, i) => {
            const time = new Date(msg.created_at).toLocaleString();
            console.log(`${i + 1}. [${msg.role}] ${time} - ${msg.user_phone}`);
            console.log(`   ${msg.content.substring(0, 100)}...`);
        });
    } else {
        console.log('⚠️ No chat messages found in last 24 hours!');
        console.log('This suggests webhook is not receiving messages from Evolution API.');
    }
}

checkErrors();
