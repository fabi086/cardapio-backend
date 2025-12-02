const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pluryiqzywfsovrcuhat.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdXJ5aXF6eXdmc292cmN1aGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDc2NzMsImV4cCI6MjA3OTgyMzY3M30.qidjRUyB-_uspMzVAKEWGxuSHMCezAxZsHtN3IgxZqA';

console.log('--- CouponRoutes Config ---');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'MISSING');
console.log('---------------------------');

const supabase = createClient(supabaseUrl, supabaseKey);

// List Coupons
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Coupon
router.post('/', async (req, res) => {
    console.log('Creating coupon:', req.body);
    try {
        const { code, discount_type, discount_value, min_order_value, usage_limit, expiration_date } = req.body;

        const couponData = {
            code: code.toUpperCase(),
            discount_type,
            discount_value,
            min_order_value: min_order_value || 0,
            usage_limit: usage_limit || null,
            expiration_date: expiration_date || null
        };
        console.log('Insert data:', couponData);

        const { data, error } = await supabase
            .from('coupons')
            .insert([couponData])
            .select()
            .single();

        if (error) {
            console.error('Supabase error creating coupon:', error);
            throw error;
        }
        console.log('Coupon created:', data);
        res.json(data);
    } catch (error) {
        console.error('Server error creating coupon:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Coupon
router.delete('/:id', async (req, res) => {
    try {
        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Validate Coupon
router.post('/validate', async (req, res) => {
    try {
        const { code, orderTotal } = req.body;

        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();

        if (error || !coupon) {
            return res.status(404).json({ error: 'Cupom inválido' });
        }

        if (!coupon.active) {
            return res.status(400).json({ error: 'Cupom inativo' });
        }

        if (coupon.expiration_date && new Date(coupon.expiration_date) < new Date()) {
            return res.status(400).json({ error: 'Cupom expirado' });
        }

        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ error: 'Limite de uso atingido' });
        }

        if (orderTotal < coupon.min_order_value) {
            return res.status(400).json({ error: `Valor mínimo do pedido: R$ ${coupon.min_order_value}` });
        }

        res.json(coupon);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
