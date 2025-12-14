import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, ChefHat, CheckCircle, AlertCircle, Volume2, VolumeX, RefreshCw, Maximize2, Timer, Zap } from 'lucide-react';

const Kitchen = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // active, all
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [blinkEnabled, setBlinkEnabled] = useState(false); // Piscar desativado por padrão
    const [isFullscreen, setIsFullscreen] = useState(false);
    const audioRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        fetchOrders();

        // Real-time subscription for new/updated orders
        const subscription = supabase
            .channel('kitchen-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
                console.log('Kitchen: Order update', payload);

                // Play sound for new orders
                if (payload.eventType === 'INSERT' && soundEnabled) {
                    playNotificationSound();
                }

                fetchOrders();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [soundEnabled]);

    const fetchOrders = async () => {
        try {
            let query = supabase
                .from('orders')
                .select('*, order_items(*)')
                .order('created_at', { ascending: true });

            // Filter active orders (pending, approved, preparing)
            if (filter === 'active') {
                query = query.in('status', ['pending', 'Pendente', 'approved', 'preparing']);
            } else {
                // Show last 50 orders
                query = query.limit(50);
            }

            const { data, error } = await query;
            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const playNotificationSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            fetchOrders();
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Erro ao atualizar pedido');
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const getTimeSinceOrder = (createdAt) => {
        const now = new Date();
        const orderTime = new Date(createdAt);
        const diffMs = now - orderTime;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins} min`;
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours}h ${diffMins % 60}m`;
    };

    const getStatusConfig = (status) => {
        const configs = {
            'pending': { label: 'NOVO', color: 'bg-yellow-500', textColor: 'text-yellow-900', icon: AlertCircle, nextStatus: 'preparing', nextLabel: 'Iniciar Preparo' },
            'Pendente': { label: 'NOVO', color: 'bg-yellow-500', textColor: 'text-yellow-900', icon: AlertCircle, nextStatus: 'preparing', nextLabel: 'Iniciar Preparo' },
            'approved': { label: 'APROVADO', color: 'bg-blue-500', textColor: 'text-blue-900', icon: CheckCircle, nextStatus: 'preparing', nextLabel: 'Iniciar Preparo' },
            'preparing': { label: 'PREPARANDO', color: 'bg-orange-500', textColor: 'text-orange-900', icon: ChefHat, nextStatus: 'ready', nextLabel: 'Marcar Pronto' },
            'ready': { label: 'PRONTO', color: 'bg-green-500', textColor: 'text-green-900', icon: CheckCircle, nextStatus: 'delivering', nextLabel: 'Saiu p/ Entrega' },
            'delivering': { label: 'EM ENTREGA', color: 'bg-purple-500', textColor: 'text-purple-900', icon: CheckCircle, nextStatus: 'completed', nextLabel: 'Concluir' },
            'completed': { label: 'CONCLUÍDO', color: 'bg-gray-400', textColor: 'text-gray-900', icon: CheckCircle, nextStatus: null, nextLabel: null },
            'cancelled': { label: 'CANCELADO', color: 'bg-red-500', textColor: 'text-red-900', icon: AlertCircle, nextStatus: null, nextLabel: null }
        };
        return configs[status] || configs['pending'];
    };

    const getTimeUrgency = (createdAt) => {
        const diffMins = Math.floor((new Date() - new Date(createdAt)) / 60000);
        if (diffMins >= 30) return `border-red-500 border-4 ${blinkEnabled ? 'animate-pulse' : ''}`; // Urgente
        if (diffMins >= 15) return 'border-orange-400 border-2'; // Atenção
        return 'border-stone-200 dark:border-stone-700';
    };

    // Group orders by status for Kanban-style view
    const pendingOrders = orders.filter(o => ['pending', 'Pendente', 'approved'].includes(o.status));
    const preparingOrders = orders.filter(o => o.status === 'preparing');
    const readyOrders = orders.filter(o => ['ready', 'delivering'].includes(o.status));

    const OrderCard = ({ order }) => {
        const config = getStatusConfig(order.status);
        const Icon = config.icon;
        const urgencyClass = getTimeUrgency(order.created_at);
        const isTableOrder = order.order_type === 'dine_in' || order.table_number;

        return (
            <div className={`bg-white dark:bg-stone-800 rounded-xl shadow-lg overflow-hidden ${urgencyClass} transition-all`}>
                {/* Header */}
                <div className={`${config.color} px-4 py-3 flex justify-between items-center`}>
                    <div className="flex items-center gap-2">
                        <Icon size={20} className={config.textColor} />
                        <span className={`font-bold text-lg ${config.textColor}`}>
                            #{order.order_number || order.id.slice(0, 6)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/90">
                        <Timer size={16} />
                        <span className="font-mono font-bold">{getTimeSinceOrder(order.created_at)}</span>
                    </div>
                </div>

                {/* Customer Info */}
                <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
                    <p className="font-bold text-stone-800 dark:text-stone-100 text-lg">{order.customer_name}</p>
                    {isTableOrder ? (
                        <p className="text-italian-green font-bold text-sm">🍽️ MESA {order.table_number}</p>
                    ) : (
                        <p className="text-stone-500 text-sm truncate">{order.customer_address}</p>
                    )}
                </div>

                {/* Order Items */}
                <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
                    {(order.order_items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                            <div className="flex-1">
                                <span className="font-bold text-stone-800 dark:text-stone-200 text-lg">
                                    {item.quantity}x
                                </span>
                                <span className="ml-2 text-stone-700 dark:text-stone-300">
                                    {item.product_name}
                                </span>
                                {item.observation && (
                                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-0.5 font-medium">
                                        ⚠️ {item.observation}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer with Action Button */}
                {config.nextStatus && (
                    <div className="px-4 py-3 bg-stone-50 dark:bg-stone-900">
                        <button
                            onClick={() => updateOrderStatus(order.id, config.nextStatus)}
                            className={`w-full py-3 rounded-lg font-bold text-white text-lg transition-all 
                                ${order.status === 'preparing'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-italian-red hover:bg-red-700'
                                } active:scale-95`}
                        >
                            {config.nextLabel}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const Column = ({ title, orders, icon: Icon, color }) => (
        <div className="flex-1 min-w-[320px] max-w-[400px]">
            <div className={`${color} rounded-t-xl px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2 text-white">
                    <Icon size={24} />
                    <h2 className="font-bold text-xl">{title}</h2>
                </div>
                <span className="bg-white/20 text-white px-3 py-1 rounded-full font-bold">
                    {orders.length}
                </span>
            </div>
            <div className="bg-stone-100 dark:bg-stone-900 rounded-b-xl p-3 min-h-[calc(100vh-200px)] space-y-3 overflow-y-auto">
                {orders.length === 0 ? (
                    <div className="text-center text-stone-400 py-8">
                        <Icon size={48} className="mx-auto mb-2 opacity-30" />
                        <p>Nenhum pedido</p>
                    </div>
                ) : (
                    orders.map(order => <OrderCard key={order.id} order={order} />)
                )}
            </div>
        </div>
    );

    return (
        <div ref={containerRef} className={`p-4 ${isFullscreen ? 'bg-stone-950' : ''}`}>
            {/* Audio for notifications */}
            <audio ref={audioRef} preload="auto">
                <source src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAD//wAA" type="audio/wav" />
            </audio>

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <ChefHat size={32} className="text-italian-red" />
                    <div>
                        <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Kitchen Display</h1>
                        <p className="text-sm text-stone-500">Visualização em tempo real dos pedidos</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Sound Toggle */}
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-3 rounded-xl transition-all ${soundEnabled
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                            : 'bg-stone-100 text-stone-400 dark:bg-stone-800'
                            }`}
                        title={soundEnabled ? 'Som ativado' : 'Som desativado'}
                    >
                        {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                    </button>

                    {/* Blink Toggle */}
                    <button
                        onClick={() => setBlinkEnabled(!blinkEnabled)}
                        className={`p-3 rounded-xl transition-all ${blinkEnabled
                            ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                            : 'bg-stone-100 text-stone-400 dark:bg-stone-800'
                            }`}
                        title={blinkEnabled ? 'Piscar atrasados: LIGADO' : 'Piscar atrasados: DESLIGADO'}
                    >
                        <Zap size={24} />
                    </button>

                    {/* Refresh */}
                    <button
                        onClick={fetchOrders}
                        className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                        title="Atualizar"
                    >
                        <RefreshCw size={24} />
                    </button>

                    {/* Fullscreen */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-3 rounded-xl bg-italian-red text-white hover:bg-red-700 transition-all"
                        title="Tela cheia"
                    >
                        <Maximize2 size={24} />
                    </button>

                    {/* Filter */}
                    <select
                        value={filter}
                        onChange={(e) => { setFilter(e.target.value); fetchOrders(); }}
                        className="px-4 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold border-none outline-none"
                    >
                        <option value="active">Ativos</option>
                        <option value="all">Todos</option>
                    </select>
                </div>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-italian-red"></div>
                </div>
            ) : (
                /* Kanban Columns */
                <div className="flex gap-4 overflow-x-auto pb-4">
                    <Column
                        title="Novos"
                        orders={pendingOrders}
                        icon={AlertCircle}
                        color="bg-yellow-500"
                    />
                    <Column
                        title="Preparando"
                        orders={preparingOrders}
                        icon={ChefHat}
                        color="bg-orange-500"
                    />
                    <Column
                        title="Prontos"
                        orders={readyOrders}
                        icon={CheckCircle}
                        color="bg-green-500"
                    />
                </div>
            )}

            {/* Stats Bar */}
            <div className="mt-4 flex items-center justify-center gap-8 text-stone-500 dark:text-stone-400 text-sm">
                <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>Última atualização: {new Date().toLocaleTimeString('pt-BR')}</span>
                </div>
                <div>
                    Total ativo: <span className="font-bold text-stone-800 dark:text-stone-200">{pendingOrders.length + preparingOrders.length + readyOrders.length}</span> pedidos
                </div>
            </div>
        </div>
    );
};

export default Kitchen;
