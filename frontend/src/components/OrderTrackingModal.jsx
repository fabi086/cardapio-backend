import React, { useState, useEffect } from 'react';
import { X, Search, Package, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const OrderTrackingModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [orderId, setOrderId] = useState('');
    const [lastOrder, setLastOrder] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            checkLastOrder();
        }
    }, [isOpen]);

    const checkLastOrder = async () => {
        const savedOrderId = localStorage.getItem('lastOrderId');
        if (savedOrderId) {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select('id, order_number, status, total, created_at')
                    .eq('id', savedOrderId)
                    .single();

                if (data) {
                    setLastOrder(data);
                } else {
                    localStorage.removeItem('lastOrderId');
                }
            } catch (error) {
                console.error('Error fetching last order:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (orderId.trim()) {
            onClose();
            navigate(`/order/${orderId.trim()}`);
        }
    };

    const handleGoToOrder = (id) => {
        onClose();
        navigate(`/order/${id}`);
    };

    if (!isOpen) return null;

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'Aguardando Aprovação',
            approved: 'Aprovado',
            preparing: 'Em Preparo',
            ready: 'Pronto para Entrega',
            delivered: 'Entregue',
            cancelled: 'Cancelado'
        };
        return labels[status] || status;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:justify-end sm:pr-20 sm:pt-16">
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
            />

            <div className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in fade-in">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/50">
                    <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <Package size={20} className="text-italian-red" />
                        Acompanhar Pedido
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors text-stone-500"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-italian-red border-t-transparent"></div>
                        </div>
                    ) : lastOrder ? (
                        <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-4 border border-stone-100 dark:border-stone-800">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Último Pedido</span>
                                    <p className="font-mono text-sm text-stone-800 dark:text-stone-200">#{lastOrder.order_number || lastOrder.id.slice(0, 8)}</p>
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${lastOrder.status === 'delivered' ? 'bg-stone-200 text-stone-600' :
                                    lastOrder.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                    {getStatusLabel(lastOrder.status)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center mt-3">
                                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">
                                    R$ {lastOrder.total.toFixed(2)}
                                </span>
                                <button
                                    onClick={() => handleGoToOrder(lastOrder.id)}
                                    className="text-sm bg-italian-red text-white px-3 py-1.5 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center gap-1"
                                >
                                    Ver Detalhes <ArrowRight size={14} />
                                </button>
                            </div>

                            <div className="relative flex items-center gap-2 mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                                <span className="text-xs text-stone-400 bg-stone-50 dark:bg-stone-800 px-2 absolute left-1/2 -translate-x-1/2 -top-2.5">OU</span>
                                <button
                                    onClick={() => setLastOrder(null)}
                                    className="w-full text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline text-center"
                                >
                                    Buscar outro pedido
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSearch} className="space-y-3">
                            <p className="text-sm text-stone-600 dark:text-stone-400">
                                Digite o número do seu pedido para ver o status atual.
                            </p>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="ID do Pedido"
                                    className="w-full p-3 pl-10 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                                    value={orderId}
                                    onChange={(e) => setOrderId(e.target.value)}
                                    autoFocus
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-stone-800 hover:bg-stone-700 text-white py-3 rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
                            >
                                Rastrear
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderTrackingModal;
