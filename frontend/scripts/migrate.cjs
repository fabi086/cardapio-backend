
const { createClient } = require('@supabase/supabase-js');
const { menuItems, categories } = require('../../backend/data/menu');

const SUPABASE_URL = 'https://pluryiqzywfsovrcuhat.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
    console.log('Starting migration...');

    // 1. Insert Categories
    const categoryMap = {};

    for (const categoryName of categories) {
        if (categoryName === 'Todos') continue; // Skip 'Todos' as it's a virtual category

        const { data, error } = await supabase
            .from('categories')
            .insert({ name: categoryName })
            .select()
            .single();

        if (error) {
            console.error(`Error inserting category ${categoryName}:`, error);
        } else {
            console.log(`Inserted category: ${categoryName}`);
            categoryMap[categoryName] = data.id;
        }
    }

    // 2. Insert Products
    for (const item of menuItems) {
        const categoryId = categoryMap[item.category];

        if (!categoryId) {
            console.warn(`Skipping item ${item.name}: Category ${item.category} not found.`);
            continue;
        }

        const { error } = await supabase
            .from('products')
            .insert({
                name: item.name,
                description: item.description,
                price: item.price,
                category_id: categoryId,
                image_url: item.image,
                modifiers: item.modifiers || null,
                is_available: true
            });

        if (error) {
            console.error(`Error inserting product ${item.name}:`, error);
        } else {
            console.log(`Inserted product: ${item.name}`);
        }
    }

    console.log('Migration complete!');
}

migrate();
