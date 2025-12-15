import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const OrderNotificationListener = () => {
    const audioRef = useRef(null);
    const [notificationSettings, setNotificationSettings] = useState({
        sound_enabled: true,
        sound_url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        volume: 80
    });

    // Fetch notification settings from database
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await supabase
                    .from('business_settings')
                    .select('notification_settings')
                    .single();

                if (data?.notification_settings) {
                    setNotificationSettings(prev => ({
                        ...prev,
                        ...data.notification_settings
                    }));
                }
            } catch (error) {
                console.log('Using default notification settings');
            }
        };

        fetchSettings();

        // Subscribe to settings changes
        const settingsChannel = supabase
            .channel('business_settings_changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'business_settings'
            }, (payload) => {
                if (payload.new?.notification_settings) {
                    setNotificationSettings(prev => ({
                        ...prev,
                        ...payload.new.notification_settings
                    }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(settingsChannel);
        };
    }, []);

    useEffect(() => {
        // 1. Request Browser Permission & Subscribe to Web Push
        const subscribeToPush = async () => {
            if (typeof Notification === 'undefined') return;

            if (Notification.permission === 'default') {
                await Notification.requestPermission();
            }

            if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.ready;

                    // Check existing subscription
                    let subscription = await registration.pushManager.getSubscription();

                    if (!subscription) {
                        // Fetch Public Key
                        const apiUrl = import.meta.env.VITE_API_URL || '';
                        const response = await fetch(`${apiUrl}/api/push/vapid-public-key`);
                        const { publicKey } = await response.json();

                        const convertedKey = urlBase64ToUint8Array(publicKey);

                        subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: convertedKey
                        });

                        // Send to Backend
                        await fetch(`${apiUrl}/api/push/subscribe`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(subscription)
                        });
                        console.log('Registered for Web Push Notifications');
                    }
                } catch (err) {
                    console.error('Failed to subscribe to Web Push:', err);
                }
            }
        };

        subscribeToPush();

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

                    // 1. Play Sound (if enabled)
                    if (notificationSettings.sound_enabled && audioRef.current) {
                        try {
                            audioRef.current.volume = (notificationSettings.volume || 80) / 100;
                            audioRef.current.currentTime = 0;
                            const playPromise = audioRef.current.play();
                            if (playPromise !== undefined) {
                                playPromise.catch(error => console.log('Audio Autoplay blocked:', error));
                            }
                        } catch (e) { console.error(e); }
                    }

                    // 2. Browser Notification (Foreground/Background active tab)
                    if (Notification.permission === 'granted') {
                        try {
                            const n = new Notification('Novo Pedido Recebido! 🍔', {
                                body: `Pedido #${payload.new.order_number}\nTotal: R$ ${parseFloat(payload.new.total).toFixed(2)}\nCliente: ${payload.new.customer_name}`,
                                icon: '/icon-512.png',
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
            .subscribe((status) => console.log('Supabase Channel:', status));

        return () => {
            supabase.removeChannel(channel);
        };
    }, [notificationSettings]);

    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    return (
        <audio
            ref={audioRef}
            src={notificationSettings.sound_url}
            preload="auto"
            style={{ display: 'none' }}
        />
    );
};

export default OrderNotificationListener;

