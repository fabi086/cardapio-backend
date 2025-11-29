import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingBag, DollarSign, Package, Clock, Calendar, TrendingUp, ArrowRight, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('today'); // today, 7d, 15d, 30d, custom
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

    const [stats, setStats] = useState({
        totalOrders: 0,
        revenue: 0,
        activeProducts: 0,
        pendingOrders: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);

    useEffect(() => {
        fetchDashboardData();

        const subscription = supabase
            .channel('dashboard-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [dateRange, customDate]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            const getLocalDayBounds = (dateObj) => {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                return {
                    start: new Date(`${dateStr}T00:00:00`),
                    end: new Date(`${dateStr}T23:59:59.999`)
                };
            };

            let startDate, endDate;
            const today = new Date();

            if (dateRange === 'custom') {
                // customDate is YYYY-MM-DD
                startDate = new Date(`${customDate}T00:00:00`);
                endDate = new Date(`${customDate}T23:59:59.999`);
            } else {
                const bounds = getLocalDayBounds(today);
                endDate = bounds.end;

                startDate = bounds.start;

                if (dateRange === '7d') {
                    startDate.setDate(startDate.getDate() - 7);
                } else if (dateRange === '15d') {
                    startDate.setDate(startDate.getDate() - 15);
                } else if (dateRange === '30d') {
                    startDate.setDate(startDate.getDate() - 30);
                }
            }

            const startISO = startDate.toISOString();
            const endISO = endDate.toISOString();

            // 1. Fetch Orders for selected range
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('id, total, created_at, status, customer_name, order_number')
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            const totalOrders = orders.length;
            const revenue = orders.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
            const pendingOrders = orders.filter(o => o.status === 'pending').length;

            // 2. Fetch Active Products (Always current)
            const { count: activeProducts, error: productsError } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('is_available', true);

            if (productsError) throw productsError;

            setStats({
                totalOrders,
                revenue,
                activeProducts: activeProducts || 0,
                pendingOrders
            });

            setRecentOrders(orders.slice(0, 5));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'preparing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'ready': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'delivering': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
            case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'Pendente',
            preparing: 'Preparando',
            ready: 'Pronto',
            delivering: 'Em Entrega',
            completed: 'Concluído',
            approved: 'Aprovado',
            cancelled: 'Cancelado'
        };
        return labels[status] || status;
    };

    const FilterButton = ({ id, label }) => (
        <button
            onClick={() => setDateRange(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateRange === id
                ? 'bg-italian-red text-white shadow-md'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100">Dashboard</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 flex items-center gap-2">
                        <Calendar size={16} />
                        Visão Geral
                    </p>
                </div>

                {/* Date Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-stone-100 dark:bg-stone-900/50 p-1.5 rounded-xl">
                    <span className="text-xs font-bold text-stone-500 uppercase px-2 hidden sm:block">Filtre por data:</span>
                    <div className="flex gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
                        <FilterButton id="today" label="Hoje" />
                        <FilterButton id="7d" label="7 Dias" />
                        <FilterButton id="15d" label="15 Dias" />
                        <FilterButton id="30d" label="30 Dias" />
                        <FilterButton id="custom" label="Personalizado" />
                    </div>

                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-stone-800 px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm animate-fadeIn">
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                                className="bg-transparent outline-none text-stone-700 dark:text-stone-200 text-xs font-medium"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div>
                        <p className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase mb-1">Faturamento</p>
                        <h3 className="text-2xl font-bold text-italian-green">{formatCurrency(stats.revenue)}</h3>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-italian-green">
                        <DollarSign size={24} />
                    </div>
                </div>

                <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div>
                        <p className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase mb-1">Pendentes</p>
                        <h3 className="text-2xl font-bold text-orange-500">{stats.pendingOrders}</h3>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-500">
                        <Clock size={24} />
                    </div>
                </div>

                <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div>
                        <p className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase mb-1">Total Pedidos</p>
                        <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100">{stats.totalOrders}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500">
                        <ShoppingBag size={24} />
                    </div>
                </div>

                <div className="bg-white dark:bg-stone-900 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div>
                        <p className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase mb-1">Pratos Ativos</p>
                        <h3 className="text-2xl font-bold text-italian-red">{stats.activeProducts}</h3>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-italian-red">
                        <Package size={24} />
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <TrendingUp size={20} className="text-italian-red" />
                        Pedidos Recentes
                    </h2>
                    <Link to="/admin/orders" className="text-sm text-italian-red font-bold hover:underline flex items-center gap-1">
                        Ver Todos <ArrowRight size={16} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 text-xs uppercase">
                                <th className="p-4 font-bold">ID</th>
                                <th className="p-4 font-bold">Cliente</th>
                                <th className="p-4 font-bold">Data</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                            {recentOrders.length > 0 ? (
                                recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                                        <td className="p-4 text-sm font-mono text-stone-600 dark:text-stone-400">
                                            #{order.order_number ? order.order_number : order.id.toString().slice(0, 8)}
                                        </td>
                                        <td className="p-4 text-sm font-medium text-stone-800 dark:text-stone-200">{order.customer_name}</td>
                                        <td className="p-4 text-sm text-stone-600 dark:text-stone-400">{formatDate(order.created_at)}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                                {getStatusLabel(order.status)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-right text-stone-800 dark:text-stone-200">{formatCurrency(order.total)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-stone-500 dark:text-stone-400">
                                        Nenhum pedido encontrado neste período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
