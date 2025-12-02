require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('SUPABASE_KEY is missing in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrdersColumns() {
    console.log('Checking columns for table: orders');

    // Tenta inserir um registro dummy para ver o erro e descobrir colunas, 
    // ou melhor, tenta fazer um select * limit 0 para ver a estrutura se possível,
    // mas a melhor forma é tentar pegar um registro e ver as chaves.

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching orders:', error);
    } else if (data && data.length > 0) {
        console.log('Columns found in existing record:', Object.keys(data[0]));
    } else {
        console.log('No orders found, cannot infer columns easily via select.');
        // Fallback: tentar inserir com colunas suspeitas para ver se falha
    }
}

checkOrdersColumns();
