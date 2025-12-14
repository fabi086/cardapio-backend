import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

const BusinessSettingsContext = createContext();

export const BusinessSettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        restaurant_name: 'Carregando...',
        cnpj: '',
        address: '',
        phone: '',
        whatsapp: '',
        additional_phones: '',
        logo_url: null,
        favicon_url: null,
        cover_url: null,
        primary_color: '#EA1D2C',
        secondary_color: '#1c1917',
        button_color: '#EA1D2C',
        cart_color: '#1c1917',
        font_family: 'Inter',
        simple_hours_text: '',
        social_instagram: '',
        social_facebook: '',
        social_youtube: '',
        social_google: '',
        opening_hours_schema: {},
        delivery_fee_base: 5.00
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings();

        // Subscribe to changes
        const subscription = supabase
            .channel('public:business_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'business_settings' }, (payload) => {
                fetchSettings();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from('business_settings').select('*').single();
            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                setSettings(data);
                // Apply colors to CSS variables
                document.documentElement.style.setProperty('--color-italian-red', data.primary_color || '#EA1D2C');
                document.documentElement.style.setProperty('--color-stone-900', data.secondary_color || '#1c1917');
                document.documentElement.style.setProperty('--color-button', data.button_color || '#EA1D2C');
                document.documentElement.style.setProperty('--color-cart', data.cart_color || '#1c1917');

                // Apply Font
                if (data.font_family) {
                    document.body.style.fontFamily = `"${data.font_family}", sans-serif`;
                }

                // Update Favicon
                if (data.favicon_url || data.logo_url) {
                    const iconUrl = data.favicon_url || data.logo_url;
                    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
                    link.type = 'image/png';
                    link.rel = 'icon';
                    link.href = iconUrl;
                    if (!link.parentNode) document.head.appendChild(link);
                }

                // Update Apple Touch Icon (for PWA on iOS)
                if (data.logo_url) {
                    const appleIcon = document.querySelector("link[rel='apple-touch-icon']") || document.createElement('link');
                    appleIcon.rel = 'apple-touch-icon';
                    appleIcon.href = data.logo_url;
                    if (!appleIcon.parentNode) document.head.appendChild(appleIcon);
                }

                // Update PWA Manifest dynamically
                if (data.logo_url || data.restaurant_name) {
                    const manifestData = {
                        name: data.restaurant_name || 'Cardápio Digital',
                        short_name: data.restaurant_name || 'Cardápio',
                        description: 'Sistema de cardápio digital e pedidos online',
                        start_url: '/',
                        display: 'standalone',
                        background_color: '#ffffff',
                        theme_color: data.primary_color || '#EA1D2C',
                        icons: data.logo_url ? [
                            {
                                src: data.logo_url,
                                sizes: '512x512',
                                type: 'image/png',
                                purpose: 'any maskable'
                            },
                            {
                                src: data.logo_url,
                                sizes: '192x192',
                                type: 'image/png'
                            },
                            {
                                src: data.logo_url,
                                sizes: '96x96',
                                type: 'image/png'
                            }
                        ] : [
                            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
                        ]
                    };

                    // Create blob URL for manifest
                    const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
                    const manifestUrl = URL.createObjectURL(manifestBlob);

                    // Update or create manifest link
                    let manifestLink = document.querySelector("link[rel='manifest']");
                    if (manifestLink) {
                        // Revoke old blob URL if it was a blob
                        if (manifestLink.href.startsWith('blob:')) {
                            URL.revokeObjectURL(manifestLink.href);
                        }
                        manifestLink.href = manifestUrl;
                    } else {
                        manifestLink = document.createElement('link');
                        manifestLink.rel = 'manifest';
                        manifestLink.href = manifestUrl;
                        document.head.appendChild(manifestLink);
                    }
                }

                // Update Title
                if (data.restaurant_name) {
                    document.title = data.restaurant_name;
                }
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <BusinessSettingsContext.Provider value={{ settings, loading }}>
            {children}
        </BusinessSettingsContext.Provider>
    );
};

export const useBusinessSettings = () => {
    const context = useContext(BusinessSettingsContext);
    if (!context) {
        throw new Error('useBusinessSettings must be used within a BusinessSettingsProvider');
    }
    return context;
};
