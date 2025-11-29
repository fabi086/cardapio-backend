import { supabase } from './lib/supabase';

export const getCategories = async () => {
    const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('order', { ascending: true });

    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }

    // Add 'Todos' at the beginning and map to array of strings
    return ['Todos', ...data.map(c => c.name)];
};

export const getMenuItems = async (category) => {
    let query = supabase
        .from('products')
        .select(`
            *,
            categories!inner (
                name
            )
        `);

    if (category && category !== 'Todos') {
        query = query.eq('categories.name', category);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching menu items:', error);
        return [];
    }

    // Transform data to match expected format (flatten category name if needed, though App.jsx uses category string from state)
    // We also need to ensure 'image' property exists (DB has 'image_url')
    return data.map(item => ({
        ...item,
        category: item.categories.name, // Map relationship back to flat property
        image: item.image_url // Map DB column to frontend prop
    }));
};
