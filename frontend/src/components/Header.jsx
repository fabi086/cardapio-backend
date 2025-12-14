import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, ShoppingBag, Search, Clock, Moon, Sun, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import OrderTrackingModal from './OrderTrackingModal';

const Header = ({ searchTerm, setSearchTerm }) => {
    const { cartCount, setIsCartOpen } = useCart();
    const { settings } = useBusinessSettings();
    const [isOpen, setIsOpen] = useState(false);
    const [isTrackingOpen, setIsTrackingOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check local storage or system preference
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    useEffect(() => {
        const checkOpenStatus = () => {
            if (!settings.opening_hours_schema) return;

            const now = new Date();
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const today = days[now.getDay()];
            const schedule = settings.opening_hours_schema[today];

            if (!schedule || schedule.closed) {
                setIsOpen(false);
                return;
            }

            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const [openHour, openMinute] = schedule.open.split(':').map(Number);
            const [closeHour, closeMinute] = schedule.close.split(':').map(Number);

            const openMinutes = openHour * 60 + openMinute;
            let closeMinutes = closeHour * 60 + closeMinute;

            // Handle closing after midnight (e.g., 00:00 or 01:00)
            if (closeMinutes < openMinutes) {
                closeMinutes += 24 * 60;
            }

            setIsOpen(currentMinutes >= openMinutes && currentMinutes < closeMinutes);
        };

        checkOpenStatus();
        const interval = setInterval(checkOpenStatus, 60000);
        return () => clearInterval(interval);
    }, [settings]);

    return (
        <>
            <OrderTrackingModal isOpen={isTrackingOpen} onClose={() => setIsTrackingOpen(false)} />
            <header className="bg-italian-red text-italian-white shadow-lg sticky top-0 z-50 transition-all dark:bg-stone-900 dark:border-b dark:border-stone-800" style={{ backgroundColor: isDark ? '' : settings.primary_color }}>
                <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
                        {/* Logo & Status */}
                        <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                            <div className="flex items-center gap-3">
                                {settings.logo_url ? (
                                    <img src={settings.logo_url} alt="Logo" className="h-12 w-12 object-contain bg-white rounded-full p-1 shadow-md" />
                                ) : (
                                    <div className="bg-italian-white p-2 rounded-full shadow-md">
                                        <UtensilsCrossed className="h-6 w-6 text-italian-red" style={{ color: settings.primary_color }} />
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-2xl sm:text-3xl font-display text-italian-white tracking-wide leading-none">
                                        {settings.restaurant_name || 'Cantina Bella'}
                                    </span>
                                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit mt-1 ${isOpen ? 'bg-green-500 text-white' : 'bg-red-800 text-white/80'}`}>
                                        <Clock size={12} />
                                        {isOpen ? 'ABERTO AGORA' : 'FECHADO'}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Actions - Only theme toggle, cart/tracking moved to bottom bar */}
                            <div className="flex items-center gap-2 sm:hidden">
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 text-white/90 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                >
                                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Desktop Cart & Login */}
                        <div className="hidden sm:flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-italian-white/90 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                title={isDark ? "Modo Claro" : "Modo Escuro"}
                            >
                                {isDark ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <button
                                onClick={() => setIsTrackingOpen(true)}
                                className="text-italian-white/90 hover:text-white transition-colors text-sm font-medium flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20"
                            >
                                <Package size={16} />
                                <span>Acompanhar Pedido</span>
                            </button>

                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="bg-italian-green hover:bg-green-700 text-white px-6 py-2 rounded-full text-sm font-bold transition-colors shadow-md border-2 border-italian-white/20 flex items-center gap-2"
                            >
                                <ShoppingBag size={18} />
                                <span>Ver Carrinho</span>
                                {cartCount > 0 && (
                                    <span className="bg-white text-italian-red text-xs font-bold px-2 py-0.5 rounded-full ml-1" style={{ color: settings.primary_color }}>
                                        {cartCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
