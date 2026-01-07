import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import CheckoutModal from './CheckoutModal';

const CartModal = () => {
    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        isCartOpen,
        setIsCartOpen,
        cartTotal,
        subtotal,
        discountAmount,
        appliedCoupon,
        applyCoupon,
        removeCoupon
    } = useCart();

    const { settings } = useBusinessSettings();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const [couponCode, setCouponCode] = useState('');
    const [couponError, setCouponError] = useState('');
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setIsValidatingCoupon(true);
        setCouponError('');

        try {
            const API_URL = (import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3002' : 'https://cardapio-backend-jzit.vercel.app')).replace(/\/$/, '');
            const res = await fetch(`${API_URL}/api/coupons/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: couponCode, orderTotal: subtotal })
            });
            const data = await res.json();

            if (res.ok) {
                applyCoupon(data);
            } else {
                setCouponError(data.error || 'Erro ao validar cupom');
            }
        } catch (error) {
            console.error('Error validating coupon:', error);
            setCouponError('Erro de conexão');
        } finally {
            setIsValidatingCoupon(false);
        }
    };



    if (!isCartOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex justify-end">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsCartOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Panel */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-md h-full bg-white dark:bg-stone-900 shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-white" style={{ backgroundColor: settings.primary_color }}>
                        <div className="flex items-center gap-2">
                            <ShoppingBag size={24} />
                            <h2 className="text-xl font-display tracking-wide">Seu Pedido</h2>
                        </div>
                        <button
                            onClick={() => setIsCartOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {cartItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
                                <ShoppingBag size={64} className="opacity-20" />
                                <p className="text-lg font-medium">Seu carrinho está vazio</p>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="hover:underline"
                                    style={{ color: settings.primary_color }}
                                >
                                    Voltar ao menu
                                </button>
                            </div>
                        ) : (
                            cartItems.map((item) => (
                                <div
                                    key={item.cartId || item.id}
                                    className="flex gap-4 bg-stone-50 dark:bg-stone-800/50 p-3 rounded-xl border border-stone-100 dark:border-stone-800"
                                >
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-20 h-20 object-cover rounded-lg"
                                    />
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold text-stone-800 dark:text-stone-100 line-clamp-1">
                                                {item.name}
                                            </h3>
                                            {item.selectedModifiers && (
                                                <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 space-y-0.5">
                                                    {Object.values(item.selectedModifiers).map((mod, idx) => {
                                                        if (Array.isArray(mod)) return mod.map(m => <p key={m.name}>+ {m.name}</p>);
                                                        return <p key={mod.name}>• {mod.name}</p>;
                                                    })}
                                                </div>
                                            )}
                                            <p className="font-bold text-sm mt-1" style={{ color: settings.primary_color }}>
                                                R$ {((item.finalPrice || item.price) * item.quantity).toFixed(2)}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-3 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700 px-2 py-1">
                                                <button
                                                    onClick={() => updateQuantity(item.cartId || item.id, -1)}
                                                    className="text-stone-500 hover:text-red-500 transition-colors"
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className="text-sm font-bold w-4 text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.cartId || item.id, 1)}
                                                    className="text-stone-500 hover:text-green-500 transition-colors"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => removeFromCart(item.cartId || item.id)}
                                                className="text-stone-400 hover:text-red-500 transition-colors p-1"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {cartItems.length > 0 && (
                        <div className="p-5 pb-24 md:pb-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 space-y-4">

                            {/* Coupon Section */}
                            <div className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200 dark:border-stone-700">
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Cupom de Desconto</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="CÓDIGO"
                                        disabled={!!appliedCoupon}
                                        className="flex-1 p-2 rounded border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 text-sm outline-none focus:border-italian-red uppercase"
                                    />
                                    {appliedCoupon ? (
                                        <button
                                            onClick={() => {
                                                removeCoupon();
                                                setCouponCode('');
                                            }}
                                            className="bg-red-100 text-red-600 px-4 py-2 rounded font-bold text-sm hover:bg-red-200"
                                        >
                                            Remover
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={!couponCode || isValidatingCoupon}
                                            className="bg-stone-800 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                                        >
                                            {isValidatingCoupon ? '...' : 'Aplicar'}
                                        </button>
                                    )}
                                </div>
                                {couponError && (
                                    <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12} /> {couponError}</p>
                                )}
                                {appliedCoupon && (
                                    <p className="text-green-600 text-xs mt-2 flex items-center gap-1"><CheckCircle size={12} /> Cupom aplicado com sucesso!</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-600 dark:text-stone-400">Subtotal</span>
                                    <span className="font-bold text-stone-800 dark:text-white">R$ {subtotal.toFixed(2)}</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between items-center text-green-600">
                                        <span>Desconto ({appliedCoupon.code})</span>
                                        <span className="font-bold">- R$ {discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xl font-bold text-stone-800 dark:text-white pt-2 border-t border-stone-200 dark:border-stone-700">
                                    <span>Total</span>
                                    <span>R$ {cartTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    className="w-full bg-transparent border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 py-3 rounded-xl font-bold text-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"
                                    onClick={() => setIsCartOpen(false)}
                                >
                                    Continuar Comprando
                                </button>
                                <button
                                    className="w-full text-white py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                                    onClick={() => setIsCheckoutOpen(true)}
                                    style={{ backgroundColor: settings.button_color }}
                                >
                                    Finalizar Pedido
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
            />
        </AnimatePresence>
    );
};

export default CartModal;
