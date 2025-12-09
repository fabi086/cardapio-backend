import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const OrderNotificationListener = () => {
    useEffect(() => {
        // Request notification permission immediately
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        console.log('--- Initializing Order Listener ---');

        const channel = supabase
            .channel('public:orders')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders'
                },
                (payload) => {
                    console.log('New order received:', payload);

                    if (Notification.permission === 'granted') {
                        try {
                            const n = new Notification('Novo Pedido Recebido! 🍔', {
                                body: `Pedido #${payload.new.order_number}\nTotal: R$ ${parseFloat(payload.new.total).toFixed(2)}\nCliente: ${payload.new.customer_name}`,
                                icon: '/vite.svg', // Placeholder
                                tag: 'new-order',
                                requireInteraction: true
                            });

                            n.onclick = () => {
                                window.focus();
                                window.location.href = `/admin/orders`; // Redirect to admin orders
                            };

                            // Play sound
                            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                            const oscillator = audioCtx.createOscillator();
                            const gainNode = audioCtx.createGain();

                            oscillator.connect(gainNode);
                            gainNode.connect(audioCtx.destination);

                            oscillator.type = 'sine';
                            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                            oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6

                            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

                            oscillator.start();
                            oscillator.stop(audioCtx.currentTime + 0.5);

                        } catch (e) {
                            console.error('Notification error:', e);
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('Supabase Channel Status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return null;
};

export default OrderNotificationListener;
