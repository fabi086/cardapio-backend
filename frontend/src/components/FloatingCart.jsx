import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useBusinessSettings } from '../hooks/useBusinessSettings';

const FloatingCart = () => {
    const { cartCount, cartTotal, setIsCartOpen } = useCart();
    const { settings } = useBusinessSettings();

    if (cartCount === 0) return null;

    return (
        <button
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-italian-red text-white p-4 rounded-full shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform animate-in slide-in-from-bottom-10"
            style={{ backgroundColor: settings.primary_color }}
        >
            <div className="relative">
                <ShoppingBag size={24} />
                <span className="absolute -top-2 -right-2 bg-white text-italian-red font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-italian-red" style={{ color: settings.primary_color, borderColor: settings.primary_color }}>
                    {cartCount}
                </span>
            </div>
            <div className="flex flex-col items-start">
                <span className="text-xs font-medium opacity-90">Ver Carrinho</span>
                <span className="font-bold text-sm">R$ {cartTotal.toFixed(2)}</span>
            </div>
        </button>
    );
};

export default FloatingCart;
