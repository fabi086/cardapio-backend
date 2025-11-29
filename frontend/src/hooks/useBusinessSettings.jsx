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
                if (data.favicon_url) {
                    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
                    link.type = 'image/x-icon';
                    link.rel = 'shortcut icon';
                    link.href = data.favicon_url;
                    document.getElementsByTagName('head')[0].appendChild(link);
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
