import React from 'react';
import { MapPin, Phone, Instagram, Facebook } from 'lucide-react';
import { useBusinessSettings } from '../hooks/useBusinessSettings';

const Footer = () => {
    const { settings } = useBusinessSettings();

    const formatHours = (schedule) => {
        if (!schedule || schedule.closed) return 'Fechado';
        return `${schedule.open} - ${schedule.close}`;
    };

    return (
        <footer className="bg-stone-900 text-stone-400 py-12 border-t border-stone-800 mt-auto" style={{ backgroundColor: settings.secondary_color }}>
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                    {/* Brand & Social */}
                    <div className="space-y-4 flex flex-col items-center md:items-start">
                        <h3 className="text-2xl font-display text-italian-white">
                            {settings.restaurant_name || 'Cantina Bella'}
                        </h3>
                        <p className="text-sm max-w-xs">
                            Tradição e sabor em cada prato. Ingredientes selecionados e receitas de família.
                        </p>
                        <div className="flex gap-4 pt-2">
                            {settings.social_instagram && (
                                <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="hover:text-italian-red transition-colors" style={{ color: settings.primary_color }}>
                                    <Instagram size={24} />
                                </a>
                            )}
                            {settings.social_facebook && (
                                <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" className="hover:text-italian-red transition-colors" style={{ color: settings.primary_color }}>
                                    <Facebook size={24} />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-4 flex flex-col items-center md:items-start">
                        <h4 className="text-lg font-bold text-italian-white">Contato</h4>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center md:items-start gap-3">
                                <MapPin className="shrink-0 text-italian-red" size={18} style={{ color: settings.primary_color }} />
                                <span>
                                    {settings.address || 'Endereço não cadastrado'}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <Phone className="shrink-0 text-italian-red" size={18} style={{ color: settings.primary_color }} />
                                    <div className="flex flex-col">
                                        <a href={`tel:${settings.phone?.replace(/\D/g, '')}`} className="hover:text-white transition-colors">
                                            {settings.phone || '(00) 00000-0000'}
                                        </a>
                                        {settings.additional_phones && settings.additional_phones.split(',').map((phone, index) => (
                                            <a key={index} href={`tel:${phone.trim().replace(/\D/g, '')}`} className="hover:text-white transition-colors">
                                                {phone.trim()}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Opening Hours */}
                    <div className="space-y-4 flex flex-col items-center md:items-start">
                        <h4 className="text-lg font-bold text-italian-white">Horários</h4>
                        <div className="space-y-2 text-sm w-full max-w-xs">
                            {settings.simple_hours_text ? (
                                <p className="text-white">{settings.simple_hours_text}</p>
                            ) : (
                                settings.opening_hours_schema && (
                                    <>
                                        <p className="flex justify-between border-b border-stone-800 pb-1">
                                            <span>Seg - Qui:</span>
                                            <span className="text-white">{formatHours(settings.opening_hours_schema.monday)}</span>
                                        </p>
                                        <p className="flex justify-between border-b border-stone-800 pb-1">
                                            <span>Sex - Sáb:</span>
                                            <span className="text-white">{formatHours(settings.opening_hours_schema.friday)}</span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span>Domingo:</span>
                                            <span className="text-white">{formatHours(settings.opening_hours_schema.sunday)}</span>
                                        </p>
                                    </>
                                )
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-stone-800 mt-12 pt-8 text-center text-xs">
                    <p>
                        &copy; {new Date().getFullYear()} {settings.restaurant_name || 'Cantina Bella'}
                        {settings.cnpj && ` - CNPJ: ${settings.cnpj}`}
                        . Todos os direitos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
