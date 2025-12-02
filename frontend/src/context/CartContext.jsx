import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const storedCart = localStorage.getItem('cartItems');
            return storedCart ? JSON.parse(storedCart) : [];
        } catch (error) {
            console.error("Failed to load cart from localStorage", error);
            return [];
        }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
        } catch (error) {
            console.error("Failed to save cart to localStorage", error);
        }
    }, [cartItems]);

    const addToCart = (item, quantity = 1) => {
        setCartItems((prevItems) => {
            // Use cartId if available (for customized items), otherwise use item.id
            const itemId = item.cartId || item.id;

            const existingItem = prevItems.find((i) => (i.cartId || i.id) === itemId);

            if (existingItem) {
                return prevItems.map((i) =>
                    (i.cartId || i.id) === itemId ? { ...i, quantity: i.quantity + quantity } : i
                );
            }
            return [...prevItems, { ...item, quantity }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (itemId) => {
        setCartItems((prevItems) => prevItems.filter((item) => (item.cartId || item.id) !== itemId));
    };

    const updateQuantity = (itemId, change) => {
        setCartItems((prevItems) =>
            prevItems.map((item) => {
                if ((item.cartId || item.id) === itemId) {
                    const newQuantity = item.quantity + change;
                    return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
                }
                return item;
            })
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const [appliedCoupon, setAppliedCoupon] = useState(null);

    const applyCoupon = (coupon) => {
        setAppliedCoupon(coupon);
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
    };

    const subtotal = cartItems.reduce(
        (total, item) => total + (item.finalPrice || item.price) * item.quantity,
        0
    );

    let discountAmount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discount_type === 'percentage') {
            discountAmount = (subtotal * appliedCoupon.discount_value) / 100;
        } else {
            discountAmount = Number(appliedCoupon.discount_value);
        }
    }

    const cartTotal = Math.max(0, subtotal - discountAmount);

    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    const submitOrder = async (customerData) => {
        try {
            // 1. Gerar order_number sequencial
            const { data: lastOrder } = await supabase
                .from('orders')
                .select('order_number')
                .order('order_number', { ascending: false })
                .limit(1)
                .single();

            const orderNumber = (lastOrder?.order_number || 0) + 1;

            // 2. Create Order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    order_number: orderNumber,
                    customer_name: customerData.name,
                    customer_phone: customerData.phone,
                    customer_address: customerData.address,
                    customer_cep: customerData.cep,
                    customer_id: customerData.customer_id,
                    payment_method: customerData.paymentMethod,
                    change_for: customerData.changeFor,
                    delivery_fee: customerData.deliveryFee || 0,
                    total: cartTotal + (customerData.deliveryFee || 0),
                    discount: discountAmount,
                    coupon_code: appliedCoupon ? appliedCoupon.code : null,
                    status: 'Pendente'
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 3. Create Order Items
            const itemsToInsert = cartItems.map(item => ({
                order_id: order.id,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                price: item.finalPrice || item.price,
                modifiers: item.selectedModifiers || {}
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // 4. Update Coupon Usage
            if (appliedCoupon) {
                await supabase.rpc('increment_coupon_usage', { coupon_id: appliedCoupon.id });
            }

            clearCart();
            setAppliedCoupon(null);
            return { ...order, items: itemsToInsert };

        } catch (error) {
            console.error('Error submitting order:', error);
            throw error;
        }
    };

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                isCartOpen,
                setIsCartOpen,
                cartTotal,
                subtotal,
                discountAmount,
                appliedCoupon,
                applyCoupon,
                removeCoupon,
                cartCount,
                submitOrder,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};
