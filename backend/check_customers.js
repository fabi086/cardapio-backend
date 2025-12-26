const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (mesmas credenciais do projeto)
const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCustomers() {
    console.log('Verificando tabela de clientes...');

    const { data: customers, error } = await supabase
        .from('customers')
        .select('*');

    if (error) {
        console.error('Erro ao buscar clientes:', error);
    } else {
        console.log(`Encontrados ${customers.length} clientes:`);
        customers.forEach(c => {
            console.log(`- ID: ${c.id}, Nome: ${c.name}, Tel: ${c.phone}`);
        });
    }
}

checkCustomers();
