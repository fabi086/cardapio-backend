import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, User, Phone, MapPin, ShoppingBag, Calendar, ArrowRight, X } from 'lucide-react';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerOrders, setCustomerOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('customers')
                .select('*, orders(count)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data to include order count
            const formattedData = data.map(c => ({
                ...c,
                total_orders: c.orders ? c.orders[0].count : 0
            }));

            setCustomers(formattedData);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const [metrics, setMetrics] = useState({
        totalSpent: 0,
        avgTicket: 0,
        favoriteItems: []
    });

    const fetchCustomerOrders = async (customerId) => {
        try {
            setLoadingOrders(true);
            // Fetch orders with items
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCustomerOrders(data);

            // Calculate Metrics
            if (data && data.length > 0) {
                const totalSpent = data.reduce((sum, order) => sum + (order.total || 0), 0);
                const avgTicket = totalSpent / data.length;

                // Calculate favorite items
                const itemCounts = {};
                data.forEach(order => {
                    if (order.order_items) {
                        order.order_items.forEach(item => {
                            const name = item.product_name;
                            if (itemCounts[name]) {
                                itemCounts[name].count += item.quantity;
                                itemCounts[name].totalSpent += (item.price * item.quantity);
                            } else {
                                itemCounts[name] = {
                                    name,
                                    count: item.quantity,
                                    totalSpent: item.price * item.quantity
                                };
                            }
                        });
                    }
                });

                const sortedItems = Object.values(itemCounts)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5); // Top 5 items

                setMetrics({
                    totalSpent,
                    avgTicket,
                    favoriteItems: sortedItems
                });
            } else {
                setMetrics({ totalSpent: 0, avgTicket: 0, favoriteItems: [] });
            }

        } catch (error) {
            console.error('Error fetching customer orders:', error);
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleCustomerClick = (customer) => {
        setSelectedCustomer(customer);
        fetchCustomerOrders(customer.id);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100">Clientes</h1>
                    <p className="text-stone-500 dark:text-stone-400">Gerencie sua base de clientes</p>
                </div>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-stone-200 dark:border-stone-800">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-italian-red"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-bold text-sm uppercase">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4 hidden md:table-cell">Endereço</th>
                                <th className="px-6 py-4 text-center">Pedidos</th>
                                <th className="px-6 py-4 hidden lg:table-cell">Cadastro</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-stone-500">Nenhum cliente encontrado.</td></tr>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer md:cursor-default" onClick={() => window.innerWidth < 768 && handleCustomerClick(customer)}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-italian-red/10 text-italian-red flex items-center justify-center font-bold shrink-0">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-stone-800 dark:text-stone-200">{customer.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 dark:text-stone-400">
                                            <div className="flex items-center gap-2">
                                                <Phone size={16} className="shrink-0" />
                                                {customer.phone}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 dark:text-stone-400 max-w-xs truncate hidden md:table-cell">
                                            {customer.address}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-full text-xs font-bold text-stone-700 dark:text-stone-300">
                                                {customer.total_orders}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-stone-600 dark:text-stone-400 text-sm hidden lg:table-cell">
                                            {formatDate(customer.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCustomerClick(customer);
                                                }}
                                                className="text-italian-red hover:text-red-700 font-medium text-sm flex items-center gap-1 ml-auto"
                                            >
                                                <span className="hidden md:inline">Detalhes</span> <ArrowRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Customer Details Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-3">
                                <User className="text-italian-red" />
                                {selectedCustomer.name}
                            </h2>
                            <button onClick={() => setSelectedCustomer(null)} className="text-stone-500 hover:text-stone-800">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {/* Metrics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
                                    <p className="text-xs font-bold text-stone-500 uppercase mb-1">Total Gasto</p>
                                    <p className="text-2xl font-bold text-italian-green">
                                        {formatCurrency(metrics.totalSpent)}
                                    </p>
                                </div>
                                <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
                                    <p className="text-xs font-bold text-stone-500 uppercase mb-1">Ticket Médio</p>
                                    <p className="text-2xl font-bold text-stone-800 dark:text-stone-200">
                                        {formatCurrency(metrics.avgTicket)}
                                    </p>
                                </div>
                                <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
                                    <p className="text-xs font-bold text-stone-500 uppercase mb-1">Total de Pedidos</p>
                                    <p className="text-2xl font-bold text-stone-800 dark:text-stone-200">
                                        {customerOrders.length}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Info & Favorites */}
                                <div className="space-y-6">
                                    <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl">
                                        <h3 className="font-bold text-stone-800 dark:text-stone-100 mb-3 flex items-center gap-2">
                                            <User size={18} /> Dados Pessoais
                                        </h3>
                                        <div className="space-y-3 text-sm">
                                            <div>
                                                <p className="text-stone-500 text-xs uppercase">Telefone</p>
                                                <p className="font-medium text-stone-800 dark:text-stone-200">{selectedCustomer.phone}</p>
                                            </div>
                                            <div>
                                                <p className="text-stone-500 text-xs uppercase">Endereço</p>
                                                <p className="font-medium text-stone-800 dark:text-stone-200">{selectedCustomer.address}</p>
                                            </div>
                                            <div>
                                                <p className="text-stone-500 text-xs uppercase">Cliente Desde</p>
                                                <p className="font-medium text-stone-800 dark:text-stone-200">{formatDate(selectedCustomer.created_at)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {metrics.favoriteItems.length > 0 && (
                                        <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl">
                                            <h3 className="font-bold text-stone-800 dark:text-stone-100 mb-3 flex items-center gap-2">
                                                <ShoppingBag size={18} /> Mais Pedidos
                                            </h3>
                                            <div className="space-y-2">
                                                {metrics.favoriteItems.map((item, index) => (
                                                    <div key={index} className="flex justify-between items-center text-sm border-b border-stone-200 dark:border-stone-700 pb-2 last:border-0 last:pb-0">
                                                        <span className="text-stone-700 dark:text-stone-300 font-medium">{item.name}</span>
                                                        <span className="text-stone-500 text-xs bg-white dark:bg-stone-900 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-700">
                                                            {item.count}x
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Order History */}
                                <div className="lg:col-span-2">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-stone-800 dark:text-stone-100">
                                        <Calendar size={20} />
                                        Histórico de Pedidos
                                    </h3>

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                        {loadingOrders ? (
                                            <p className="text-center py-4">Carregando pedidos...</p>
                                        ) : customerOrders.length === 0 ? (
                                            <p className="text-center py-4 text-stone-500">Nenhum pedido encontrado.</p>
                                        ) : (
                                            customerOrders.map(order => (
                                                <div key={order.id} className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-stone-800 dark:text-stone-200">
                                                                    #{order.order_number || order.id.slice(0, 8)}
                                                                </span>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                        'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                    {order.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-stone-500 mt-1">
                                                                {new Date(order.created_at).toLocaleString('pt-BR')}
                                                            </p>
                                                        </div>
                                                        <p className="font-bold text-italian-green">{formatCurrency(order.total)}</p>
                                                    </div>

                                                    {/* Order Items Preview */}
                                                    {order.order_items && order.order_items.length > 0 && (
                                                        <div className="text-sm text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-900/50 p-2 rounded border border-stone-100 dark:border-stone-800">
                                                            {order.order_items.map((item, idx) => (
                                                                <span key={idx}>
                                                                    {item.quantity}x {item.product_name}
                                                                    {idx < order.order_items.length - 1 ? ', ' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
