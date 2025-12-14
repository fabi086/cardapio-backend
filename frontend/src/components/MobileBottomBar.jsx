import React from 'react';
import { ShoppingBag, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useBusinessSettings } from '../hooks/useBusinessSettings';

const MobileBottomBar = ({ onTrackingClick }) => {
    const { cartCount, cartTotal, setIsCartOpen } = useCart();
    const { settings } = useBusinessSettings();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 shadow-lg">
            <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
                {/* Track Order Button */}
                <button
                    onClick={onTrackingClick}
                    className="flex flex-col items-center gap-1 py-2 px-4 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                    <Package size={22} />
                    <span className="text-[10px] font-medium">Meu Pedido</span>
                </button>

                {/* Cart Button - More prominent */}
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="flex items-center gap-2 py-2.5 px-6 rounded-full text-white font-bold shadow-lg transition-transform active:scale-95"
                    style={{ backgroundColor: settings.primary_color || '#EA1D2C' }}
                >
                    <div className="relative">
                        <ShoppingBag size={20} />
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full" style={{ color: settings.primary_color }}>
                                {cartCount}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] opacity-90">Ver Carrinho</span>
                        {cartCount > 0 && (
                            <span className="text-sm font-bold">R$ {cartTotal.toFixed(2)}</span>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
};

export default MobileBottomBar;
