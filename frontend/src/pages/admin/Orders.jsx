import React, { useEffect, useState } from 'react';

import { supabase } from '../../lib/supabase';
import { Clock, CheckCircle, ChefHat, Truck, Printer, XCircle, ChevronDown, ChevronUp, Grid, List, Filter, Search, Pencil, MapPin, Trash2 } from 'lucide-react';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingOrder, setEditingOrder] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [statusFilter, setStatusFilter] = useState('all');

    // Date Filters
    const [dateRange, setDateRange] = useState('today'); // today, 7d, 15d, 30d, custom
    const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showProductList, setShowProductList] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchProducts();

        const subscription = supabase
            .channel('admin-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [dateRange, customDate]);

    const fetchOrders = async () => {
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

            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase.from('products').select('*').order('name');
            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;

            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

            // Notify AI Agent
            const order = orders.find(o => o.id === orderId);
            if (order && order.customer_phone) {
                const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3002' : '');
                // Don't await this, let it run in background
                fetch(`${API_URL}/api/ai/notify-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: order.customer_phone,
                        status: newStatus,
                        orderId: order.order_number || order.id.slice(0, 8)
                    })
                })
                    .then(async (res) => {
                        if (!res.ok) {
                            const text = await res.text();
                            console.error('Erro servidor notificação:', res.status, text);
                            try {
                                const json = JSON.parse(text);
                                throw new Error(json.details || json.error || 'Erro no servidor API');
                            } catch (e) {
                                throw new Error(`Erro API (${res.status}): ${text.slice(0, 50)}`);
                            }
                        }
                        const data = await res.json();
                        if (!data.success) console.error('Falha notificação:', data);
                    })
                    .catch(err => {
                        console.error('Erro detalhado notificação:', err);
                        alert(`⚠️ Alerta: Status atualizado, mas falha ao notificar cliente via WhatsApp.\n\nMotivo: ${err.message}`);
                    });
            }

        } catch (error) {
            console.error('Error updating status:', error);
            alert('Erro ao atualizar status');
        }
    };

    const handleUpdateOrder = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const customer_name = formData.get('customer_name');
        const customer_phone = formData.get('customer_phone');
        const customer_address = formData.get('customer_address');
        const payment_method = formData.get('payment_method');
        const change_for = formData.get('change_for');
        const delivery_fee = parseFloat(formData.get('delivery_fee') || 0);
        const total = parseFloat(formData.get('total'));

        try {
            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    customer_name,
                    customer_phone,
                    customer_address,
                    payment_method,
                    change_for,
                    delivery_fee,
                    total
                })
                .eq('id', editingOrder.id);

            if (orderError) throw orderError;

            const { error: deleteError } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', editingOrder.id);

            if (deleteError) throw deleteError;

            if (editingOrder.order_items.length > 0) {
                const itemsToInsert = editingOrder.order_items.map(item => ({
                    order_id: editingOrder.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    price: item.price,
                    modifiers: item.modifiers || {}
                }));

                const { error: insertError } = await supabase
                    .from('order_items')
                    .insert(itemsToInsert);

                if (insertError) throw insertError;
            }

            fetchOrders();
            setEditingOrder(null);
            alert('Pedido atualizado com sucesso!');

        } catch (error) {
            console.error('Error updating order:', error);
            alert('Erro ao atualizar pedido: ' + error.message);
        }
    };

    const handleAddItem = (product) => {
        const newItem = {
            id: 'temp-' + Date.now(),
            product_id: product.id,
            product_name: product.name,
            quantity: 1,
            price: product.price,
            modifiers: {}
        };

        const updatedItems = [...editingOrder.order_items, newItem];
        recalculateTotal(updatedItems, editingOrder.delivery_fee);
        setSearchTerm('');
        setShowProductList(false);
    };

    const handleRemoveItem = (index) => {
        const updatedItems = [...editingOrder.order_items];
        updatedItems.splice(index, 1);
        recalculateTotal(updatedItems, editingOrder.delivery_fee);
    };

    const handleQuantityChange = (index, newQuantity) => {
        const quantity = parseInt(newQuantity);
        if (quantity < 1) return;

        const updatedItems = [...editingOrder.order_items];
        updatedItems[index].quantity = quantity;
        recalculateTotal(updatedItems, editingOrder.delivery_fee);
    };

    const recalculateTotal = (items, fee) => {
        const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const newTotal = itemsTotal + (parseFloat(fee) || 0);

        setEditingOrder({
            ...editingOrder,
            order_items: items,
            delivery_fee: fee,
            total: newTotal
        });
    };

    const handlePrint = (order) => {
        const printWindow = window.open('', '_blank');
        const itemsHtml = order.order_items.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>${item.quantity}x ${item.product_name}</span>
                <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            ${item.modifiers ? Object.values(item.modifiers).flat().map(m => `<div style="font-size: 12px; color: #666; margin-left: 10px;">+ ${m.name}</div>`).join('') : ''}
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Pedido #${order.order_number || order.id.slice(0, 8)}</title>
                    <style>
                        body { font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .customer { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .items { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .total { text-align: right; font-weight: bold; font-size: 18px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>CARDÁPIO DIGITAL</h2>
                        <p>Pedido #${order.order_number || order.id.slice(0, 8)}</p>
                        <p>${new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div class="customer">
                        <p><strong>Cliente:</strong> ${order.customer_name}</p>
                        <p><strong>Tel:</strong> ${order.customer_phone}</p>
                        <p><strong>Endereço:</strong> ${order.customer_address}</p>
                        <p><strong>Pagamento:</strong> ${getPaymentMethodLabel(order.payment_method)} ${order.change_for ? `(Troco para ${order.change_for})` : ''}</p>
                    </div>
                    <div class="items">
                        ${itemsHtml}
                    </div>
                    <div class="total">
                        ${order.delivery_fee ? `<p style="display: flex; justify-content: space-between;"><span>Taxa Entrega:</span> <span>R$ ${Number(order.delivery_fee).toFixed(2)}</span></p>` : ''}
                        <p style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 5px;"><span>Total:</span> <span>R$ ${order.total.toFixed(2)}</span></p>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleDeleteOrder = async (order) => {
        const confirmMessage = `Tem certeza que deseja EXCLUIR o pedido #${order.order_number || order.id.slice(0, 8)}?\n\nCliente: ${order.customer_name}\nTotal: R$ ${order.total?.toFixed(2)}\n\nEsta ação NÃO pode ser desfeita!`;

        if (!window.confirm(confirmMessage)) return;

        try {
            // First delete order items
            const { error: itemsError } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', order.id);

            if (itemsError) throw itemsError;

            // Then delete the order
            const { error: orderError } = await supabase
                .from('orders')
                .delete()
                .eq('id', order.id);

            if (orderError) throw orderError;

            // Update local state
            setOrders(orders.filter(o => o.id !== order.id));
            alert('Pedido excluído com sucesso!');

        } catch (error) {
            console.error('Error deleting order:', error);
            alert('Erro ao excluir pedido: ' + error.message);
        }
    };

    const getPaymentMethodLabel = (method) => {
        const labels = {
            'pix': 'PIX',
            'credit': 'CRÉDITO',
            'debit': 'DÉBITO',
            'cash': 'DINHEIRO'
        };
        return labels[method] || method;
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending': 'bg-yellow-100 text-yellow-900 dark:bg-yellow-500/80 dark:text-yellow-950',
            'Pendente': 'bg-yellow-100 text-yellow-900 dark:bg-yellow-500/80 dark:text-yellow-950',
            'approved': 'bg-blue-100 text-blue-900 dark:bg-blue-500/80 dark:text-blue-950',
            'preparing': 'bg-orange-100 text-orange-900 dark:bg-orange-500/80 dark:text-orange-950',
            'ready': 'bg-green-100 text-green-900 dark:bg-green-500/80 dark:text-green-950',
            'out_for_delivery': 'bg-purple-100 text-purple-900 dark:bg-purple-500/80 dark:text-purple-950',
            'delivered': 'bg-stone-200 text-stone-900 dark:bg-stone-500/80 dark:text-stone-950',
            'cancelled': 'bg-red-100 text-red-900 dark:bg-red-500/80 dark:text-red-950'
        };
        return colors[status] || 'bg-stone-100 text-stone-900 dark:bg-stone-600 dark:text-stone-100';
    };

    const [typeFilter, setTypeFilter] = useState('all'); // all, dine_in, delivery, pickup

    // ... (rest of code)

    // Filter orders
    const filteredOrders = orders.filter(order => {
        // Status Filter
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;

        // Type Filter
        if (typeFilter === 'dine_in') {
            return order.table_number || order.order_type === 'dine_in';
        }
        if (typeFilter === 'delivery') {
            return !order.table_number && (order.order_type === 'delivery' || (!order.order_type && order.customer_address)); // Fallback
        }
        if (typeFilter === 'pickup') {
            return !order.table_number && (order.order_type === 'pickup' || (!order.order_type && !order.customer_address)); // Fallback
        }

        return true;
    });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const typeTabs = [
        { id: 'all', label: 'Todos', icon: List },
        { id: 'dine_in', label: 'Mesas', icon: ChefHat }, // or Utensils
        { id: 'delivery', label: 'Entrega', icon: Truck },
        { id: 'pickup', label: 'Retirada', icon: CheckCircle }, // or ShoppingBag
    ];

    const tabs = [
        { id: 'all', label: 'Todos' },
        { id: 'pending', label: 'Pendentes' },
        { id: 'approved', label: 'Aprovados' },
        { id: 'preparing', label: 'Preparando' },
        { id: 'ready', label: 'Pronto p/ Entrega' },
        { id: 'out_for_delivery', label: 'Saiu p/ Entrega' },
        { id: 'delivered', label: 'Entregues' },
        { id: 'cancelled', label: 'Cancelados' },
    ];

    // ...

    return (
        <div className="p-8">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                {/* ... (Header content unchanged) ... */}
                <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100">Pedidos</h1>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    {/* Date Filters (Unchanged) */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-stone-100 dark:bg-stone-900/50 p-1.5 rounded-xl w-full sm:w-auto">
                        {/* ... */}
                        <span className="text-xs font-bold text-stone-500 uppercase px-2 hidden sm:block">Filtre por data:</span>
                        <div className="flex gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
                            {[
                                { id: 'today', label: 'Hoje' },
                                { id: '7d', label: '7 Dias' },
                                { id: '15d', label: '15 Dias' },
                                { id: '30d', label: '30 Dias' },
                                { id: 'custom', label: 'Personalizado' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setDateRange(filter.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${dateRange === filter.id
                                        ? 'bg-white dark:bg-stone-800 shadow-sm text-stone-800 dark:text-stone-200 ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>

                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 bg-white dark:bg-stone-800 px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm animate-fadeIn">
                                <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="bg-transparent outline-none text-stone-700 dark:text-stone-200 text-xs font-medium" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Tabs (Type) */}
            <div className="flex gap-2 mb-6 border-b border-stone-200 dark:border-stone-800 pb-1">
                {typeTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setTypeFilter(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-sm transition-all
                            ${typeFilter === tab.id
                                ? 'border-italian-red text-italian-red'
                                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}
                        `}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Status Filters */}
            <div className="flex overflow-x-auto pb-4 mb-4 gap-2 no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={`
                            px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all
                            ${statusFilter === tab.id
                                ? 'bg-italian-red text-white shadow-md transform scale-105'
                                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="pb-4">
                {viewMode === 'list' ? (
                    <div className="overflow-x-auto bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="bg-stone-50 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 font-bold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Pedido</th>
                                    <th className="px-6 py-4">Cliente / Mesa</th>
                                    <th className="px-6 py-4">Status & Pagamento</th>
                                    <th className="px-6 py-4 text-center">Itens</th>
                                    <th className="px-6 py-4 text-right">Total</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                {loading && (
                                    <tr><td colSpan="6" className="p-8 text-center text-stone-400">Carregando pedidos...</td></tr>
                                )}
                                {!loading && filteredOrders.length === 0 && (
                                    <tr><td colSpan="6" className="p-8 text-center text-stone-400">Nenhum pedido encontrado.</td></tr>
                                )}
                                {filteredOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-lg text-stone-800 dark:text-stone-200">#{order.order_number || order.id.slice(0, 8)}</div>
                                            <div className="text-xs text-stone-500 flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(order.created_at).toLocaleTimeString().slice(0, 5)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-stone-700 dark:text-stone-300">{order.customer_name}</div>
                                            {order.table_number ? (
                                                <span className="inline-block mt-1 px-2 py-0.5 rounded bg-red-100 text-italian-red text-xs font-bold border border-red-200">
                                                    MESA {order.table_number}
                                                </span>
                                            ) : (
                                                <div className="text-xs text-stone-500 mt-0.5 max-w-[200px] truncate">{order.customer_address || 'Retirada'}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={order.status}
                                                onChange={(e) => updateStatus(order.id, e.target.value)}
                                                className={`text-xs font-bold uppercase py-1.5 px-3 rounded-lg border-none outline-none cursor-pointer mb-2 w-full ${getStatusColor(order.status)}`}
                                            >
                                                <option value="pending">Pendente</option>
                                                <option value="approved">Aprovado</option>
                                                <option value="preparing">Preparando</option>
                                                <option value="ready">Pronto</option>
                                                <option value="out_for_delivery">Saiu pra Entrega</option>
                                                <option value="delivered">Entregue</option>
                                                <option value="cancelled">Cancelado</option>
                                            </select>
                                            <div className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1">
                                                {getPaymentMethodLabel(order.payment_method)}
                                                {order.change_for && <span className="text-italian-red">(Troco: {order.change_for})</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="text-sm font-bold text-stone-600 dark:text-stone-400">
                                                {order.order_items?.length || 0} itens
                                            </div>
                                            <button
                                                onClick={() => setEditingOrder({ ...order, delivery_fee: order.delivery_fee || 0 })}
                                                className="text-xs text-blue-500 hover:underline mt-1"
                                            >
                                                Ver detalhes
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-lg text-italian-green">R$ {order.total.toFixed(2)}</div>
                                            {order.delivery_fee > 0 && <div className="text-xs text-stone-400">+ R$ {order.delivery_fee.toFixed(2)} entrega</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handlePrint(order)} className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors" title="Imprimir">
                                                    <Printer size={18} />
                                                </button>
                                                <button onClick={() => setEditingOrder({ ...order, delivery_fee: order.delivery_fee || 0 })} className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteOrder(order)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {loading && <div className="col-span-full py-12 text-center text-stone-400">Carregando...</div>}
                        {!loading && filteredOrders.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <h3 className="text-lg font-bold text-stone-600 dark:text-stone-300">Nenhum pedido encontrado</h3>
                            </div>
                        )}
                        {filteredOrders.map(order => (
                            <div key={order.id} className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                {/* Card Header */}
                                <div className="p-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="font-bold text-lg text-stone-800 dark:text-stone-200">#{order.order_number || order.id.slice(0, 6)}</span>
                                            <div className="text-xs text-stone-500 flex items-center gap-1">
                                                <Clock size={12} /> {new Date(order.created_at).toLocaleTimeString().slice(0, 5)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-italian-green">R$ {order.total.toFixed(2)}</div>
                                            <div className="text-[10px] font-bold text-stone-500 uppercase">{getPaymentMethodLabel(order.payment_method)}</div>
                                        </div>
                                    </div>
                                    <div className="font-medium text-stone-700 dark:text-stone-300 text-sm truncate">{order.customer_name}</div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 flex-1 overflow-y-auto max-h-[200px]">
                                    {order.table_number ? (
                                        <div className="mb-3">
                                            <span className="inline-block px-2 py-1 rounded bg-red-100 text-italian-red text-xs font-bold border border-red-200 w-full text-center">
                                                MESA {order.table_number}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="mb-3 text-xs text-stone-500">
                                            <MapPin size={12} className="inline mr-1" />
                                            {order.customer_address || 'Retirada no Balcão'}
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        {order.order_items?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-stone-600 dark:text-stone-400">
                                                    <span className="font-bold text-stone-800 dark:text-stone-200">{item.quantity}x</span> {item.product_name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="p-3 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
                                    <select
                                        value={order.status}
                                        onChange={(e) => updateStatus(order.id, e.target.value)}
                                        className={`text-xs font-bold uppercase py-2 px-2 rounded-lg border-none outline-none cursor-pointer flex-1 ${getStatusColor(order.status)}`}
                                    >
                                        <option value="pending">Pendente</option>
                                        <option value="approved">Aprovado</option>
                                        <option value="preparing">Preparando</option>
                                        <option value="ready">Pronto</option>
                                        <option value="out_for_delivery">Saiu pra Entrega</option>
                                        <option value="delivered">Entregue</option>
                                        <option value="cancelled">Cancelado</option>
                                    </select>
                                    <button onClick={() => handlePrint(order)} className="p-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-500 hover:text-stone-800 shadow-sm">
                                        <Printer size={16} />
                                    </button>
                                    <button onClick={() => setEditingOrder({ ...order, delivery_fee: order.delivery_fee || 0 })} className="p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-lg text-blue-600 shadow-sm" title="Editar">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteOrder(order)} className="p-2 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-lg text-red-500 shadow-sm" title="Excluir">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Compact Edit Modal */}
            {
                editingOrder && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-stone-200 dark:border-stone-700 flex flex-col max-h-[90vh]">

                            {/* Header */}
                            <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-white dark:bg-stone-900 shrink-0">
                                <div>
                                    <h3 className="font-bold text-xl text-stone-800 dark:text-stone-100">Editar Pedido #{editingOrder.order_number || editingOrder.id.slice(0, 8)}</h3>
                                    <p className="text-xs text-stone-500">Faça alterações nos itens e valores do pedido.</p>
                                </div>
                                <button onClick={() => setEditingOrder(null)} className="text-stone-400 hover:text-red-500 transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateOrder} className="flex-1 overflow-hidden flex flex-col md:flex-row">

                                {/* Left Column: Items (Scrollable) */}
                                <div className="flex-1 overflow-y-auto p-6 border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
                                    <div className="space-y-4">
                                        {/* Product Search */}
                                        <div className="relative">
                                            <div className="flex items-center bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-italian-red focus-within:border-transparent transition-all">
                                                <Search size={18} className="text-stone-400 mr-2" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar produto para adicionar..."
                                                    value={searchTerm}
                                                    onChange={(e) => {
                                                        setSearchTerm(e.target.value);
                                                        setShowProductList(true);
                                                    }}
                                                    onFocus={() => setShowProductList(true)}
                                                    className="flex-1 bg-transparent outline-none text-sm text-stone-800 dark:text-stone-200 placeholder-stone-400"
                                                />
                                            </div>

                                            {showProductList && searchTerm && (
                                                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 max-h-48 overflow-y-auto">
                                                    {filteredProducts.length > 0 ? (
                                                        filteredProducts.map(product => (
                                                            <div
                                                                key={product.id}
                                                                onClick={() => handleAddItem(product)}
                                                                className="px-4 py-2 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer flex justify-between items-center border-b border-stone-100 dark:border-stone-700 last:border-0 transition-colors text-sm"
                                                            >
                                                                <span className="font-medium text-stone-800 dark:text-stone-200">{product.name}</span>
                                                                <span className="text-italian-green font-bold">R$ {product.price.toFixed(2)}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 text-stone-500 text-center text-sm">Nenhum produto encontrado</div>
                                                    )}
                                                </div>
                                            )}
                                            {showProductList && (
                                                <div className="fixed inset-0 z-10" onClick={() => setShowProductList(false)}></div>
                                            )}
                                        </div>

                                        {/* Items List */}
                                        <div className="space-y-2">
                                            {editingOrder.order_items.map((item, index) => (
                                                <div key={index} className="flex items-center justify-between bg-white dark:bg-stone-800 p-3 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm group hover:border-italian-red/30 transition-colors">
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <div className="font-bold text-stone-800 dark:text-stone-200 text-sm truncate">{item.product_name}</div>
                                                        <div className="text-xs text-stone-500">R$ {item.price.toFixed(2)} un.</div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                            className="w-12 p-1 rounded border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900 text-center font-bold text-sm"
                                                        />
                                                        <div className="font-bold w-16 text-right text-italian-green text-sm">R$ {(item.price * item.quantity).toFixed(2)}</div>
                                                        <button type="button" onClick={() => handleRemoveItem(index)} className="text-stone-400 hover:text-red-500 transition-colors">
                                                            <XCircle size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Details & Actions */}
                                <div className="w-full md:w-96 bg-white dark:bg-stone-900 flex flex-col shrink-0">
                                    <div className="p-6 space-y-5 flex-1 overflow-y-auto">

                                        {/* Customer Info */}
                                        <div className="space-y-3">
                                            <h4 className="font-bold text-xs uppercase text-stone-400 tracking-wider">Cliente</h4>
                                            <div className="space-y-2">
                                                <input name="customer_name" defaultValue={editingOrder.customer_name} placeholder="Nome" className="w-full p-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:border-italian-red outline-none transition-colors" required />
                                                <input name="customer_phone" defaultValue={editingOrder.customer_phone} placeholder="Telefone" className="w-full p-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:border-italian-red outline-none transition-colors" required />
                                                <textarea name="customer_address" defaultValue={editingOrder.customer_address} placeholder="Endereço" className="w-full p-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:border-italian-red outline-none transition-colors resize-none" rows="2" />
                                            </div>
                                        </div>

                                        {/* Payment & Totals */}
                                        <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                                            <h4 className="font-bold text-xs uppercase text-stone-400 tracking-wider">Pagamento</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <select name="payment_method" defaultValue={editingOrder.payment_method} className="w-full p-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none">
                                                    <option value="pix">PIX</option>
                                                    <option value="credit">Crédito</option>
                                                    <option value="debit">Débito</option>
                                                    <option value="cash">Dinheiro</option>
                                                </select>
                                                <input name="change_for" defaultValue={editingOrder.change_for} placeholder="Troco para..." className="w-full p-2 text-sm rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 outline-none" />
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-stone-600 dark:text-stone-400">Taxa de Entrega</span>
                                                <div className="flex items-center gap-1 w-24">
                                                    <span className="text-xs text-stone-400">R$</span>
                                                    <input
                                                        name="delivery_fee"
                                                        type="number"
                                                        step="0.01"
                                                        value={editingOrder.delivery_fee}
                                                        onChange={(e) => recalculateTotal(editingOrder.order_items, e.target.value)}
                                                        className="w-full p-1 text-right text-sm font-medium bg-transparent border-b border-stone-200 focus:border-italian-red outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="font-bold text-stone-800 dark:text-stone-100">Total Final</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-sm font-bold text-italian-green">R$</span>
                                                    <input
                                                        name="total"
                                                        type="number"
                                                        step="0.01"
                                                        value={editingOrder.total}
                                                        readOnly
                                                        className="w-24 text-right font-bold text-xl text-italian-green bg-transparent border-none outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex gap-3">
                                        <button type="button" onClick={() => setEditingOrder(null)} className="flex-1 py-2.5 rounded-lg text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800 font-bold text-sm transition-colors">
                                            Cancelar
                                        </button>
                                        <button type="submit" className="flex-[2] py-2.5 rounded-lg bg-italian-green text-white font-bold text-sm hover:bg-green-700 shadow-lg hover:shadow-xl transition-all">
                                            Salvar Alterações
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Orders;
