import React from 'react';
import { MessageCircle } from 'lucide-react';
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
            className="fixed bottom-20 md:bottom-6 left-4 z-40 bg-green-500 hover:bg-green-600 text-white p-3 md:p-4 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 group"
            aria-label="Pedir pelo WhatsApp"
        >
            <MessageCircle size={24} className="md:w-7 md:h-7" fill="white" />
            <span className="hidden group-hover:inline-block text-sm font-bold whitespace-nowrap pr-2">
                Pedir pelo WhatsApp
            </span>
        </a>
    );
};

export default WhatsAppButton;
