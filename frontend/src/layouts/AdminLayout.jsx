import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, LogOut, Settings, UtensilsCrossed, Clock, Sun, Moon, Users, Bot, Menu, X, Tag, QrCode, ShoppingBag, ChefHat, FileSpreadsheet } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import InstallPrompt from '../components/InstallPrompt';
import OrderNotificationListener from '../components/OrderNotificationListener';

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (!data.session) {
                    navigate('/admin/login');
                }
            } catch (error) {
                console.error('Auth check error:', error);
                // Optionally navigate to login on error or show error
                navigate('/admin/login');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) {
                navigate('/admin/login');
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    // Close mobile menu when navigating
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    }

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        { path: '/admin/orders', label: 'Pedidos', icon: ShoppingBag },
        { path: '/admin/kitchen', label: 'Cozinha (KDS)', icon: ChefHat },
        { path: '/admin/tables', label: 'Mesas / QR', icon: QrCode },
        { path: '/admin/customers', label: 'Clientes', icon: Users },
        { icon: UtensilsCrossed, label: 'Produtos', path: '/admin/products' },
        { icon: UtensilsCrossed, label: 'Categorias', path: '/admin/categories' },
        { icon: LayoutDashboard, label: 'Banners', path: '/admin/banners' },
        { icon: Tag, label: 'Cupons', path: '/admin/coupons' },
        { icon: FileSpreadsheet, label: 'Relatórios', path: '/admin/reports' },
        { icon: Bot, label: 'Agente IA', path: '/admin/ai-agent' },
        { icon: Settings, label: 'Configurações', path: '/admin/settings' },
    ];

    return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col lg:flex-row">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 p-4 flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 -ml-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <h2 className="text-xl font-display text-italian-red">Admin</h2>
                </div>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 z-50 h-screen w-64 
                bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 
                flex flex-col transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center hidden lg:flex">
                    <h2 className="text-2xl font-display text-italian-red">Admin</h2>
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors"
                        aria-label="Alternar tema"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <InstallPrompt />
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-italian-red text-white'
                                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-stone-200 dark:border-stone-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left text-stone-600 dark:text-stone-400 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 overflow-auto w-full">
                <Outlet />
            </main>
            <OrderNotificationListener />
        </div>
    );
};

export default AdminLayout;
