const { createClient } = require('@supabase/supabase-js');

// Config
const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to normalize phone
function normalizePhone(phone) {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
        clean = '55' + clean;
    }
    return clean;
}

async function cleanupDuplicates() {
    console.log('--- Starting Duplicate Cleanup ---');

    // 1. Fetch all customers
    const { data: customers, error } = await supabase
        .from('customers')
        .select('*');

    if (error) {
        console.error('Error fetching customers:', error);
        return;
    }

    console.log(`Total customers found: ${customers.length}`);

    // 2. Identify Groups by Normalized Phone
    const groupByPhone = {};

    customers.forEach(c => {
        const normalized = normalizePhone(c.phone);
        if (!groupByPhone[normalized]) {
            groupByPhone[normalized] = [];
        }
        groupByPhone[normalized].push(c);
    });

    // 3. Process Duplicates
    let duplicatesGroups = 0;
    let customersMerged = 0;

    for (const [phone, group] of Object.entries(groupByPhone)) {
        if (group.length > 1) {
            duplicatesGroups++;
            console.log(`\nDuplicate found for phone ${phone}: ${group.length} records`);

            // Sort by ID to keep the oldest or by completeness?
            // Strategy: Keep the one that looks "most correct" or just the first created.
            // Let's prefer the one that already has '55' in the original phone if possible, or oldest.

            group.sort((a, b) => {
                // Prefer one that starts with 55 in raw data
                const aHas55 = a.phone.startsWith('55');
                const bHas55 = b.phone.startsWith('55');
                if (aHas55 && !bHas55) return -1;
                if (!aHas55 && bHas55) return 1;

                // Otherwise prefer oldest ID (numeric assuming auto-increment or similar, but IDs are UUIDs?)
                // If UUID, just pick date if available, or just first one.
                return 0;
            });

            const winner = group[0];
            const losers = group.slice(1);

            console.log(`Keeping winner: ${winner.name} (${winner.phone}) ID: ${winner.id}`);

            for (const loser of losers) {
                console.log(`  Merging loser: ${loser.name} (${loser.phone}) ID: ${loser.id}`);

                // A. Update Orders to point to Winner
                const { error: orderError } = await supabase
                    .from('orders')
                    .update({ customer_id: winner.id })
                    .eq('customer_id', loser.id);

                if (orderError) console.error(`    Error moving orders: ${orderError.message}`);

                // B. Move Addresses (if table exists and populated)
                const { error: addrError } = await supabase
                    .from('customer_addresses')
                    .update({ customer_id: winner.id })
                    .eq('customer_id', loser.id);

                if (addrError) console.error(`    Error moving addresses: ${addrError.message}`);

                // C. Delete Loser
                const { error: delError } = await supabase
                    .from('customers')
                    .delete()
                    .eq('id', loser.id);

                if (delError) {
                    console.error(`    Error deleting loser: ${delError.message}`);
                } else {
                    console.log(`    ✅ Merged and Deleted`);
                    customersMerged++;
                }
            }

            // D. Ensure winner has normalized phone in DB
            if (winner.phone !== phone) {
                await supabase.from('customers').update({ phone: phone }).eq('id', winner.id);
                console.log(`    Normalized winner phone to ${phone}`);
            }
        } else {
            // Even if not duplicate, normalize the single record if needed
            const single = group[0];
            if (single.phone !== phone) {
                // Update to normalized
                await supabase.from('customers').update({ phone: phone }).eq('id', single.id);
                // console.log(`Normalized single record ${single.id} to ${phone}`);
            }
        }
    }

    console.log(`\n--- Cleanup Complete ---`);
    console.log(`Duplicate Groups Processed: ${duplicatesGroups}`);
    console.log(`Records Merged/Deleted: ${customersMerged}`);
}

cleanupDuplicates();
