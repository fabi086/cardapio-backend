
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pluryiqzywfsovrcuhat.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const banners = [
    {
        image_url: 'https://images.unsplash.com/photo-1606131731446-5568d87113aa?auto=format&fit=crop&w=800&q=80',
        title: 'Combo Família',
        link: '', // No link in original
        active: true,
        order: 1
    },
    {
        image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        title: 'Terça da Pizza',
        link: '',
        active: true,
        order: 2
    },
    {
        image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
        title: 'Frete Grátis',
        link: '',
        active: true,
        order: 3
    }
];

async function migrateBanners() {
    console.log('Migrating banners...');

    // Disable RLS temporarily? Or just rely on Anon key if policy allows insert?
    // The policy "Admin All Banners" requires authentication.
    // I should probably use a service role key if I had one, or just sign in.
    // But wait, I can just use SQL to insert them via the tool, which is easier/safer.
    // I will output the SQL to run.
}

// Actually, I'll just use the mcp0_execute_sql tool directly. It's cleaner.
