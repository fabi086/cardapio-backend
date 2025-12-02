
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing coupons in project:', supabaseUrl);
    
    const { data, error } = await supabase
        .from('coupons')
        .insert([{ 
            code: 'TEST_RESTORED_' + Date.now(), 
            discount_type: 'percentage', 
            discount_value: 5 
        }])
        .select();

    if (error) {
        console.error('Error inserting coupon:', error);
    } else {
        console.log('Coupon created successfully:', data);
    }
}

test();
