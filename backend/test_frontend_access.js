const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing access to customers table...');
    const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .limit(5);

    if (customerError) {
        console.error('Customer Access Error:', customerError);
    } else {
        console.log('Customer Access Success! Found', customers.length, 'customers.');
    }

    console.log('Testing access to client_group_members join...');
    // getting a group first or just querying the table
    const { data: members, error: memberError } = await supabase
        .from('client_group_members')
        .select('customer_id, customers(id, name, phone)')
        .limit(5);

    if (memberError) {
        console.error('Member Join Error:', memberError);
    } else {
        console.log('Member Join Success! Found', members.length, 'members.');
        if (members.length > 0) {
            console.log('Sample Member:', members[0]);
        }
    }
}

test();
