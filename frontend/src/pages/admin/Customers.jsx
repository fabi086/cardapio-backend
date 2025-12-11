import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, User, Phone, MapPin, ShoppingBag, Calendar, ArrowRight, X, Filter, Upload, Send, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';
import CampaignModal from '../../components/CampaignModal';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerOrders, setCustomerOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // CRM States
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [statusFilter, setStatusFilter] = useState('all'); // all, vip, active, inactive
    const [neighborhoodFilter, setNeighborhoodFilter] = useState('all');
    const [importing, setImporting] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            // Fetch customers with their LATEST order date and TOTAL orders
            const { data, error } = await supabase
                .from('customers')
                .select(`
                    *,
                    orders (
                        created_at,
                        total
                    )
                `);

            if (error) throw error;

            // Process RFM Data
            const processed = data.map(c => {
                const orders = c.orders || [];
                const totalOrders = orders.length;
                const lastOrderDate = orders.length > 0
                    ? new Date(Math.max(...orders.map(o => new Date(o.created_at))))
                    : null;

                // Logic:
                // VIP: > 3 orders AND ordered in last 30 days
                // Active: Ordered in last 60 days
                // Inactive: No order in last 60 days OR never ordered

                const daysSinceLastOrder = lastOrderDate
                    ? Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24))
                    : 999;

                let status = 'inactive';
                if (daysSinceLastOrder <= 30 && totalOrders > 3) status = 'vip';
                else if (daysSinceLastOrder <= 60) status = 'active';

                return {
                    ...c,
                    total_orders: totalOrders,
                    last_order_date: lastOrderDate,
                    days_since_last: daysSinceLastOrder,
                    status_crm: status,
                    neighborhood: c.neighborhood || 'Outros'
                };
            });

            // Sort by most recent activity
            setCustomers(processed.sort((a, b) => (a.days_since_last - b.days_since_last)));
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Unique Neighborhoods
    const neighborhoods = useMemo(() => {
        const unique = new Set(customers.map(c => c.neighborhood).filter(Boolean));
        return ['all', ...Array.from(unique).sort()];
    }, [customers]);

    // Filter Logic
    const filteredCustomers = useMemo(() => {
        return customers.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || c.status_crm === statusFilter;
            const matchesNeighborhood = neighborhoodFilter === 'all' || c.neighborhood === neighborhoodFilter;
            return matchesSearch && matchesStatus && matchesNeighborhood;
        });
    }, [customers, searchTerm, statusFilter, neighborhoodFilter]);

    // Selection Logic
    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredCustomers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
        }
    };

    // Import Logic
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                // Map fields (Support different column names)
                const toInsert = data.map(row => ({
                    name: row['Nome'] || row['nome'] || row['Name'],
                    phone: String(row['Telefone'] || row['telefone'] || row['Phone'] || row['Celular']).replace(/\D/g, ''),
                    address: row['Endereço'] || row['endereco'] || row['Address'],
                    neighborhood: row['Bairro'] || row['bairro'],
                    city: row['Cidade'] || row['cidade'],
                    created_at: new Date()
                })).filter(r => r.name && r.phone && r.phone.length >= 8);

                // Bulk Insert
                const { error } = await supabase.from('customers').insert(toInsert);
                if (error) throw error;

                alert(`${toInsert.length} clientes importados com sucesso!`);
                fetchCustomers();
            } catch (error) {
                console.error('Import error:', error);
                alert('Erro na importação. Verifique o formato do arquivo.');
            } finally {
                setImporting(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    // Existing Detail Logic
    const [metrics, setMetrics] = useState({ totalSpent: 0, avgTicket: 0, favoriteItems: [] });

    const fetchCustomerOrders = async (customerId) => {
        try {
            setLoadingOrders(true);
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCustomerOrders(data);

            if (data && data.length > 0) {
                const totalSpent = data.reduce((sum, order) => sum + (order.total || 0), 0);
                const avgTicket = totalSpent / data.length;
                const itemCounts = {};
                data.forEach(order => {
                    if (order.order_items) {
                        order.order_items.forEach(item => {
                            const name = item.product_name;
                            if (itemCounts[name]) {
                                itemCounts[name].count += item.quantity;
                            } else {
                                itemCounts[name] = { name, count: item.quantity };
                            }
                        });
                    }
                });
                const sortedItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5);
                setMetrics({ totalSpent, avgTicket, favoriteItems: sortedItems });
            } else {
                setMetrics({ totalSpent: 0, avgTicket: 0, favoriteItems: [] });
            }
        } catch (error) { console.error(error); } finally { setLoadingOrders(false); }
    };

    const handleCustomerClick = (customer) => {
        setSelectedCustomer(customer);
        fetchCustomerOrders(customer.id);
    };

    const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '-';
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const getStatusLabel = (status) => {
        switch (status) {
            case 'vip': return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">💎 VIP</span>;
            case 'active': return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-bold border border-green-200">🟢 Ativo</span>;
            default: return <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-xs font-bold border border-stone-200">💤 Inativo</span>;
        }
    };

    return (
        <div className="flex h-screen bg-stone-50 dark:bg-black overflow-hidden relative">

            {/* Sidebar Filters (Desktop) */}
            <div className="w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 p-6 flex-col hidden lg:flex">
                <h2 className="text-xl font-display font-bold text-stone-800 dark:text-stone-100 mb-6 flex items-center gap-2">
                    <Filter size={20} /> Filtros
                </h2>

                <div className="space-y-6">
                    {/* Status Filter */}
                    <div>
                        <label className="text-xs font-bold uppercase text-stone-400 mb-3 block">Status do Cliente</label>
                        <div className="space-y-2">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'vip', label: '💎 VIP (Pede Muito)' },
                                { id: 'active', label: '🟢 Ativos (Recentes)' },
                                { id: 'inactive', label: '💤 Inativos (Sumidos)' },
                            ].map(opt => (
                                <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="status"
                                        checked={statusFilter === opt.id}
                                        onChange={() => setStatusFilter(opt.id)}
                                        className="accent-italian-red"
                                    />
                                    <span className={`text-sm ${statusFilter === opt.id ? 'font-bold text-stone-800 dark:text-stone-100' : 'text-stone-600 group-hover:text-stone-800'}`}>
                                        {opt.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Neighborhood Filter */}
                    <div>
                        <label className="text-xs font-bold uppercase text-stone-400 mb-3 block">Bairro</label>
                        <select
                            value={neighborhoodFilter}
                            onChange={(e) => setNeighborhoodFilter(e.target.value)}
                            className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm outline-none focus:ring-2 focus:ring-italian-red"
                        >
                            <option value="all">Todos os Bairros</option>
                            {neighborhoods.filter(n => n !== 'all').map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>

                    {/* Import Button */}
                    <div className="pt-6 border-t border-stone-100 dark:border-stone-800">
                        <label className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-italian-red cursor-pointer transition-colors ${importing ? 'opacity-50' : ''}`}>
                            <Upload size={18} className="text-stone-400" />
                            <span className="text-xs font-bold text-stone-500">Importar Excel/CSV</span>
                            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} disabled={importing} className="hidden" />
                        </label>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="p-8 pb-4">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100 mb-1">CRM Clientes</h1>
                            <p className="text-stone-500 dark:text-stone-400 text-sm">
                                {filteredCustomers.length} clientes encontrados
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="bg-white dark:bg-stone-900 shadow-sm border border-stone-200 dark:border-stone-800 rounded-lg p-1 w-full max-w-md flex items-center">
                            <Search className="ml-3 text-stone-400 shrink-0" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar nome ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full p-2 bg-transparent outline-none text-sm placeholder-stone-400 text-stone-800 dark:text-stone-200"
                            />
                        </div>
                    </div>

                    {/* Bulk Action Header (Floating) */}
                    {selectedIds.size > 0 && (
                        <div className="bg-italian-red text-white px-4 py-3 rounded-lg shadow-md flex justify-between items-center animate-fadeIn mb-4">
                            <div className="font-bold text-sm flex items-center gap-2">
                                <CheckSquare size={18} />
                                {selectedIds.size} clientes selecionados
                            </div>
                            <button
                                onClick={() => setShowCampaignModal(true)}
                                className="bg-white text-italian-red px-4 py-1.5 rounded font-bold text-xs uppercase tracking-wide hover:bg-stone-100 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <Send size={14} /> Enviar Campanha
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto px-8 pb-8">
                    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-stone-50 dark:bg-stone-800/50 text-stone-500 dark:text-stone-400 font-bold text-xs uppercase tracking-wider sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">
                                        <button onClick={toggleAll} className="opacity-50 hover:opacity-100">
                                            {selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0
                                                ? <CheckSquare size={18} />
                                                : <Square size={18} />
                                            }
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Cliente</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 hidden md:table-cell">Região</th>
                                    <th className="px-6 py-4 text-center">Pedidos</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-stone-400">Carregando base de clientes...</td></tr>
                                ) : filteredCustomers.length === 0 ? (
                                    <tr><td colSpan="6" className="p-12 text-center text-stone-400">Nenhum cliente encontrado com os filtros atuais.</td></tr>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <tr key={customer.id} className={`hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors ${selectedIds.has(customer.id) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleSelection(customer.id); }}
                                                    className={`transition-colors ${selectedIds.has(customer.id) ? 'text-italian-red' : 'text-stone-300 hover:text-stone-400'}`}
                                                >
                                                    {selectedIds.has(customer.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center font-bold text-stone-500 text-xs shrink-0">
                                                        {customer.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-stone-800 dark:text-stone-200 text-sm">{customer.name}</div>
                                                        <div className="text-xs text-stone-400 flex items-center gap-1">
                                                            <Phone size={10} /> {customer.phone}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusLabel(customer.status_crm)}
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <div className="text-sm text-stone-600 dark:text-stone-400">{customer.neighborhood}</div>
                                                <div className="text-xs text-stone-400 truncate max-w-[150px]">{customer.city}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="font-bold text-stone-800 dark:text-stone-200">{customer.total_orders}</div>
                                                <div className="text-[10px] text-stone-400">Último: {customer.days_since_last === 999 ? '-' : `${customer.days_since_last}d`}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleCustomerClick(customer)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-800 transition-colors ml-auto"
                                                >
                                                    <MoreHorizontal size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Campaign Modal */}
            {showCampaignModal && (
                <CampaignModal
                    customers={filteredCustomers.filter(c => selectedIds.has(c.id))}
                    onClose={() => setShowCampaignModal(false)}
                />
            )}

            {/* Customer Details Modal (Reused) */}
            {selectedCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-stone-200 dark:border-stone-700">
                        <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-800/30">
                            <div>
                                <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                                    <User className="text-italian-red" size={24} />
                                    {selectedCustomer.name}
                                </h2>
                                <p className="text-sm text-stone-500">{selectedCustomer.phone}</p>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="text-stone-400 hover:text-red-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Wrapper for existing detail content style */}
                        <div className="p-6 overflow-y-auto bg-white dark:bg-stone-900">
                            {/* ... (Keep existing simple detail view for now, usually user just wants to see orders) */}
                            {/* Re-implementing simplified view to match new style */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2"><MapPin size={18} /> Endereço</h3>
                                    <div className="p-4 bg-stone-50 dark:bg-stone-800 rounded-lg text-sm text-stone-600 dark:text-stone-400">
                                        {selectedCustomer.address}<br />
                                        {selectedCustomer.neighborhood} - {selectedCustomer.city}<br />
                                        {selectedCustomer.cep}
                                    </div>

                                    <h3 className="font-bold text-stone-800 dark:text-stone-200 mt-6 mb-4 flex items-center gap-2"><ShoppingBag size={18} /> Métricas</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 border border-stone-200 dark:border-stone-700 rounded-lg text-center">
                                            <div className="text-xs text-stone-400 uppercase font-bold">Total Gasto</div>
                                            <div className="text-xl font-bold text-italian-green">{formatCurrency(metrics.totalSpent)}</div>
                                        </div>
                                        <div className="p-4 border border-stone-200 dark:border-stone-700 rounded-lg text-center">
                                            <div className="text-xs text-stone-400 uppercase font-bold">Ticket Médio</div>
                                            <div className="text-xl font-bold text-stone-700 dark:text-stone-300">{formatCurrency(metrics.avgTicket)}</div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-stone-800 dark:text-stone-200 mb-4 flex items-center gap-2"><Calendar size={18} /> Histórico ({customerOrders.length})</h3>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                        {loadingOrders ? <div className="text-sm text-center py-4">Carregando...</div> :
                                            customerOrders.map(order => (
                                                <div key={order.id} className="text-sm border-b border-stone-100 dark:border-stone-800 pb-2">
                                                    <div className="flex justify-between font-medium">
                                                        <span className="text-stone-800 dark:text-stone-200">#{order.order_number || order.id.slice(0, 6)}</span>
                                                        <span className="text-italian-green">{formatCurrency(order.total)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-stone-400 mt-0.5">
                                                        <span>{formatDate(order.created_at)}</span>
                                                        <span className="capitalize">{order.status}</span>
                                                    </div>
                                                </div>
                                            ))}
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
