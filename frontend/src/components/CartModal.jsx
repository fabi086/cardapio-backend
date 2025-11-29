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
    } = useCart();

    const { settings } = useBusinessSettings();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [cep, setCep] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(null);
    const [deliveryError, setDeliveryError] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [zones, setZones] = useState([]);
    const [bypassCep, setBypassCep] = useState(false);

    useEffect(() => {
        if (isCartOpen) {
            fetchZones();
        }
    }, [isCartOpen]);

    const fetchZones = async () => {
        const { data } = await supabase.from('delivery_zones').select('*');
        setZones(data || []);
    };

    const handleCepChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
        setCep(value);
        setDeliveryError('');
        setDeliveryFee(null);
        setBypassCep(false);
    };

    const validateCep = () => {
        if (cep.length < 9) {
            setDeliveryError('CEP inválido');
            return;
        }

        setIsValidating(true);
        setDeliveryError('');

        const cleanCep = parseInt(cep.replace('-', ''));
        let foundZone = null;

        for (const zone of zones) {
            if (zone.cep_start && zone.cep_end) {
                const start = parseInt(zone.cep_start.replace('-', ''));
                const end = parseInt(zone.cep_end.replace('-', ''));

                if (cleanCep >= start && cleanCep <= end) {
                    // Check excluded CEPs
                    if (zone.excluded_ceps) {
                        const excluded = zone.excluded_ceps.split(',').map(c => parseInt(c.trim().replace('-', '')));
                        if (excluded.includes(cleanCep)) continue;
                    }
                    foundZone = zone;
                    break;
                }
            }
        }

        setIsValidating(false);

        if (foundZone) {
            setDeliveryFee(foundZone.fee);
        } else {
            setDeliveryError('Não entregamos neste CEP. Entre em contato.');
        }
    };

    const handleBypass = () => {
        setBypassCep(true);
        setDeliveryFee(0); // Or handle as "To be calculated"
        setDeliveryError('');
    };

    const canCheckout = bypassCep || deliveryFee !== null;

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
                        <div className="p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 space-y-4">

                            {/* CEP Calculation */}
                            <div className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200 dark:border-stone-700">
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-2">Calcular Entrega</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={cep}
                                        onChange={handleCepChange}
                                        maxLength={9}
                                        placeholder="00000-000"
                                        className="flex-1 p-2 rounded border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 text-sm outline-none focus:border-italian-red"
                                    />
                                    <button
                                        onClick={validateCep}
                                        disabled={cep.length < 9 || isValidating}
                                        className="bg-stone-800 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50"
                                    >
                                        {isValidating ? '...' : 'OK'}
                                    </button>
                                </div>

                                {deliveryError && (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle size={12} /> {deliveryError}</p>
                                        <button onClick={handleBypass} className="text-xs text-blue-500 underline text-left">
                                            Não sei meu CEP / Combinar com atendente
                                        </button>
                                    </div>
                                )}

                                {deliveryFee !== null && (
                                    <div className="flex justify-between items-center text-sm text-green-600 font-bold mt-2">
                                        <span className="flex items-center gap-1"><CheckCircle size={14} /> Entrega</span>
                                        <span>R$ {deliveryFee.toFixed(2)}</span>
                                    </div>
                                )}

                                {bypassCep && (
                                    <div className="text-xs text-orange-500 mt-2 font-medium">
                                        * Taxa de entrega será combinada pelo WhatsApp.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-600 dark:text-stone-400">Subtotal</span>
                                    <span className="font-bold text-stone-800 dark:text-white">R$ {cartTotal.toFixed(2)}</span>
                                </div>
                                {deliveryFee !== null && (
                                    <div className="flex justify-between items-center text-green-600">
                                        <span>Taxa de Entrega</span>
                                        <span className="font-bold">+ R$ {deliveryFee.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-xl font-bold text-stone-800 dark:text-white pt-2 border-t border-stone-200 dark:border-stone-700">
                                    <span>Total</span>
                                    <span>R$ {(cartTotal + (deliveryFee || 0)).toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                className="w-full text-white py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setIsCheckoutOpen(true)}
                                disabled={!canCheckout}
                                style={{ backgroundColor: settings.button_color }}
                            >
                                Finalizar Pedido
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>

            <CheckoutModal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                deliveryFee={deliveryFee}
                bypassCep={bypassCep}
                cep={cep}
            />
        </AnimatePresence>
    );
};

export default CartModal;
