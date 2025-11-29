import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, ChefHat, Truck, ArrowLeft, MessageCircle } from 'lucide-react';

const OrderTracking = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrder();

        // Real-time subscription
        const subscription = supabase
            .channel(`order-${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, (payload) => {
                setOrder(prev => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [id]);

    const fetchOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            setOrder(data);
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100">Carregando pedido...</div>;

    if (!order) return <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100">Pedido não encontrado.</div>;

    const steps = [
        { status: 'pending', label: 'Aguardando Aprovação', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100' },
        { status: 'approved', label: 'Pedido Aprovado', icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
        { status: 'preparing', label: 'Em Preparo', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-100' },
        { status: 'ready', label: 'Pronto para Entrega', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
        { status: 'delivered', label: 'Entregue', icon: Truck, color: 'text-stone-500', bg: 'bg-stone-200' },
    ];

    const currentStepIndex = steps.findIndex(s => s.status === order.status);

    return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-950 p-4">
            <div className="max-w-md mx-auto bg-white dark:bg-stone-900 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 bg-italian-red text-white">
                    <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors">
                        <ArrowLeft size={20} /> Voltar ao Cardápio
                    </Link>
                    <h1 className="text-2xl font-display">Pedido #{order.order_number || order.id.slice(0, 8)}</h1>
                    <p className="opacity-90">Acompanhe o status do seu pedido</p>
                </div>

                <div className="p-6 space-y-8">
                    {/* Status Timeline */}
                    <div className="space-y-6 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-stone-200 dark:bg-stone-800" />

                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;

                            return (
                                <div key={step.status} className={`relative flex items-center gap-4 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${isActive ? step.bg : 'bg-stone-200 dark:bg-stone-800'} ${isActive ? step.color : 'text-stone-400'}`}>
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <h3 className={`font-bold ${isActive ? 'text-stone-800 dark:text-stone-100' : 'text-stone-500'}`}>
                                            {step.label}
                                        </h3>
                                        {isCurrent && (
                                            <span className="text-xs font-bold text-italian-red animate-pulse">
                                                Status Atual
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Order Details */}
                    <div className="border-t border-stone-200 dark:border-stone-800 pt-6">
                        <h3 className="font-bold text-lg text-stone-800 dark:text-stone-100 mb-4">Detalhes do Pedido</h3>
                        <div className="space-y-3">
                            {order.order_items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <div className="text-stone-600 dark:text-stone-300">
                                        <span className="font-bold text-stone-800 dark:text-stone-100">{item.quantity}x</span> {item.product_name}
                                    </div>
                                    <div className="text-stone-800 dark:text-stone-100 font-medium">
                                        R$ {(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-stone-200 dark:border-stone-800 mt-4 pt-4 flex justify-between items-center">
                            <span className="font-bold text-stone-800 dark:text-stone-100">Total</span>
                            <span className="text-xl font-bold text-italian-green">R$ {order.total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4">
                        <a
                            href={`https://wa.me/5511966887073?text=Olá, gostaria de falar sobre o pedido ${order.id.slice(0, 8)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-green-500 hover:bg-green-600 text-white text-center py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <MessageCircle size={20} />
                            Falar no WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderTracking;
