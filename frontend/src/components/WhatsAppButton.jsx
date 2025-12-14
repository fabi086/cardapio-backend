import React from 'react';
import { useBusinessSettings } from '../hooks/useBusinessSettings';

const WhatsAppButton = () => {
    const { settings } = useBusinessSettings();

    // Use the configured WhatsApp number
    const whatsappNumber = settings.whatsapp?.replace(/\D/g, '') || '';
    const message = encodeURIComponent(`Olá! Gostaria de fazer um pedido.`);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

    if (!whatsappNumber) return null;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-20 md:bottom-6 right-4 z-40 bg-[#25D366] hover:bg-[#1da851] text-white p-3 md:p-4 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
            aria-label="Pedir pelo WhatsApp"
        >
            {/* Official WhatsApp Icon */}
            <svg viewBox="0 0 32 32" className="w-6 h-6 md:w-7 md:h-7 fill-white">
                <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.916 15.916 0 0 0 16.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.316 22.59c-.39 1.1-1.932 2.014-3.15 2.282-.834.178-1.924.32-5.594-1.202-4.692-1.946-7.71-6.712-7.944-7.022-.226-.31-1.89-2.514-1.89-4.796s1.196-3.406 1.622-3.872c.39-.428.912-.616 1.398-.616.166 0 .316.008.45.016.426.018.64.044.92.712.352.836 1.21 2.946 1.316 3.162.106.218.212.508.072.81-.132.31-.25.506-.494.78-.244.274-.476.484-.72.778-.226.262-.478.544-.194.998.284.446 1.264 2.084 2.716 3.376 1.866 1.66 3.394 2.192 3.916 2.416.39.168.856.13 1.148-.178.37-.39.826-1.036 1.29-1.674.33-.454.746-.51 1.174-.346.434.156 2.742 1.294 3.212 1.53.47.236.784.354.898.552.114.196.114 1.14-.276 2.24z" />
            </svg>
            <span className="hidden group-hover:inline-block text-sm font-bold whitespace-nowrap pr-2">
                Pedir pelo WhatsApp
            </span>
        </a>
    );
};

export default WhatsAppButton;
