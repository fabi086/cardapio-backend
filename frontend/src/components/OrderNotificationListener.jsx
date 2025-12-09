import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const OrderNotificationListener = () => {
    const audioRef = useRef(null);

    useEffect(() => {
        // Request notification permission immediately
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
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

                    // 1. Play Sound (using HTML5 Audio is more reliable than WebAudio for notifications)
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(e => console.error('Audio play failed:', e));
                    }

                    // 2. Browser Notification
                    if (Notification.permission === 'granted') {
                        try {
                            const n = new Notification('Novo Pedido Recebido! 🍔', {
                                body: `Pedido #${payload.new.order_number}\nTotal: R$ ${parseFloat(payload.new.total).toFixed(2)}\nCliente: ${payload.new.customer_name}`,
                                icon: '/logo.svg',
                                tag: 'new-order',
                                requireInteraction: true,
                                silent: false
                            });

                            n.onclick = () => {
                                window.focus();
                                window.location.href = `/admin/orders`;
                            };
                        } catch (e) {
                            console.error('Notification error:', e);
                        }
                    } else {
                        // Fallback alert if notifications denied
                        alert(`NOVO PEDIDO #${payload.new.order_number}!\nCliente: ${payload.new.customer_name}`);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Simple beep sound
    return (
        <audio
            ref={audioRef}
            src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
            preload="auto"
            style={{ display: 'none' }}
        />
    );
};

export default OrderNotificationListener;
