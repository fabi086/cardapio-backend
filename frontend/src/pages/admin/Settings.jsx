import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Building2, Phone, MapPin, Clock, DollarSign, Upload, Trash2, Plus, Palette, Map, Share2, Globe, Facebook, Youtube, Instagram, Truck, Type, X } from 'lucide-react';

const TabButton = ({ id, label, icon, activeTab, setActiveTab }) => {
    const Icon = icon;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`p-3 rounded-lg text-left font-medium flex items-center gap-3 transition-all text-sm ${activeTab === id ? 'bg-italian-red text-white shadow-md' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
        >
            <Icon size={18} /> {label}
        </button>
    );
};

const InputGroup = ({ label, name, value, onChange, placeholder, type = "text", colSpan = 1 }) => (
    <div className={colSpan > 1 ? `col-span-${colSpan}` : ''}>
        <label className="block text-xs font-bold mb-1 text-stone-500 dark:text-stone-400 uppercase tracking-wider">{label}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full p-2 rounded border border-stone-300 dark:border-stone-600 bg-transparent dark:text-white outline-none focus:border-italian-red transition-colors text-sm"
            placeholder={placeholder}
        />
    </div>
);

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general'); // general, hours, delivery, appearance, social

    const [settings, setSettings] = useState({
        restaurant_name: '',
        cnpj: '',
        address: '',
        phone: '',
        whatsapp: '',
        additional_phones: '', // Stored as comma separated string
        logo_url: '',
        favicon_url: '',
        cover_url: '',
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
        opening_hours_schema: {
            monday: { open: '18:00', close: '23:00', closed: false },
            tuesday: { open: '18:00', close: '23:00', closed: false },
            wednesday: { open: '18:00', close: '23:00', closed: false },
            thursday: { open: '18:00', close: '23:00', closed: false },
            friday: { open: '18:00', close: '00:00', closed: false },
            saturday: { open: '18:00', close: '00:00', closed: false },
            sunday: { open: '18:00', close: '23:00', closed: false }
        }
    });

    const [zones, setZones] = useState([]);
    // Helper state for dynamic phone inputs
    const [extraPhones, setExtraPhones] = useState([]);

    useEffect(() => {
        fetchSettings();
        fetchZones();
    }, []);

    useEffect(() => {
        if (settings.additional_phones) {
            setExtraPhones(settings.additional_phones.split(',').map(p => p.trim()).filter(Boolean));
        }
    }, [settings.additional_phones]);

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase.from('business_settings').select('*').single();
            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                console.log('Fetched settings:', data);
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    restaurant_name: data.restaurant_name ?? '',
                    cnpj: data.cnpj ?? '',
                    address: data.address ?? '',
                    phone: data.phone ?? '',
                    whatsapp: data.whatsapp ?? '',
                    additional_phones: data.additional_phones ?? '',
                    logo_url: data.logo_url ?? '',
                    favicon_url: data.favicon_url ?? '',
                    cover_url: data.cover_url ?? '',
                    primary_color: data.primary_color ?? '#EA1D2C',
                    secondary_color: data.secondary_color ?? '#1c1917',
                    button_color: data.button_color ?? '#EA1D2C',
                    cart_color: data.cart_color ?? '#1c1917',
                    font_family: data.font_family ?? 'Inter',
                    simple_hours_text: data.simple_hours_text ?? '',
                    social_instagram: data.social_instagram ?? '',
                    social_facebook: data.social_facebook ?? '',
                    social_youtube: data.social_youtube ?? '',
                    social_google: data.social_google ?? '',
                    opening_hours_schema: data.opening_hours_schema ?? prev.opening_hours_schema
                }));
            } else {
                console.log('No settings found, using defaults');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchZones = async () => {
        try {
            const { data, error } = await supabase.from('delivery_zones').select('*').order('name');
            if (error) throw error;
            setZones(data || []);
        } catch (error) {
            console.error('Error fetching zones:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        console.log(`Changing ${name} to:`, value); // Debug log
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    // Phone handlers
    const addPhone = () => {
        setExtraPhones([...extraPhones, '']);
    };

    const updatePhone = (index, value) => {
        const newPhones = [...extraPhones];
        newPhones[index] = value;
        setExtraPhones(newPhones);
        setSettings(prev => ({ ...prev, additional_phones: newPhones.join(',') }));
    };

    const removePhone = (index) => {
        const newPhones = extraPhones.filter((_, i) => i !== index);
        setExtraPhones(newPhones);
        setSettings(prev => ({ ...prev, additional_phones: newPhones.join(',') }));
    };

    const handleImageUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setSaving(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${field}-${Math.random()}.${fileExt}`;
            const filePath = `settings/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('menu-images')
                .getPublicUrl(filePath);

            setSettings(prev => ({ ...prev, [field]: publicUrl }));
        } catch (error) {
            alert('Erro ao fazer upload: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleImageRemove = async (field) => {
        if (!window.confirm('Tem certeza que deseja remover esta imagem?')) return;

        try {
            setSaving(true);
            // Optional: Delete from storage if you want to clean up
            // const path = settings[field].split('/').pop();
            // await supabase.storage.from('menu-images').remove([`settings/${path}`]);

            setSettings(prev => ({ ...prev, [field]: '' }));
        } catch (error) {
            console.error('Error removing image:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleHoursChange = (day, field, value) => {
        setSettings(prev => ({
            ...prev,
            opening_hours_schema: {
                ...prev.opening_hours_schema,
                [day]: {
                    ...prev.opening_hours_schema[day],
                    [field]: value
                }
            }
        }));
    };

    const handleZoneChange = (index, field, value) => {
        const newZones = [...zones];
        newZones[index] = { ...newZones[index], [field]: value };
        setZones(newZones);
    };

    const addZone = () => {
        setZones([...zones, {
            id: `temp-${Date.now()}`,
            name: 'Nova Faixa de CEP',
            fee: 0,
            min_order: 0,
            estimated_time: '40-50 min',
            cep_start: '',
            cep_end: '',
            excluded_ceps: '',
            neighborhoods: '',
            active: true
        }]);
    };

    const removeZone = async (index) => {
        const zone = zones[index];
        if (zone.id.toString().startsWith('temp')) {
            setZones(zones.filter((_, i) => i !== index));
        } else {
            if (window.confirm('Tem certeza que deseja remover esta zona?')) {
                try {
                    await supabase.from('delivery_zones').delete().eq('id', zone.id);
                    setZones(zones.filter((_, i) => i !== index));
                } catch (error) {
                    alert('Erro ao remover zona');
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Save Settings
            const { data: existing } = await supabase.from('business_settings').select('id').single();

            if (existing) {
                await supabase.from('business_settings').update(settings).eq('id', existing.id);
            } else {
                await supabase.from('business_settings').insert([{ ...settings, id: 1 }]);
            }

            // Save Zones
            for (const zone of zones) {
                if (zone.id.toString().startsWith('temp')) {
                    const { id, ...zoneData } = zone;
                    await supabase.from('delivery_zones').insert([zoneData]);
                } else {
                    await supabase.from('delivery_zones').update(zone).eq('id', zone.id);
                }
            }

            fetchZones();
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Error saving:', error);
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const days = {
        monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta',
        friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo'
    };

    const fonts = [
        { name: 'Inter', value: 'Inter' },
        { name: 'Roboto', value: 'Roboto' },
        { name: 'Open Sans', value: 'Open Sans' },
        { name: 'Lato', value: 'Lato' },
        { name: 'Montserrat', value: 'Montserrat' },
        { name: 'Poppins', value: 'Poppins' },
    ];

    if (loading) return <div className="p-8">Carregando...</div>;

    const getBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
        return window.location.origin;
    };
    const webhookUrl = `${getBaseUrl()}/api/ai/webhook`;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-display text-stone-800 dark:text-stone-100">Configurações</h1>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="bg-italian-green hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? 'Salvando...' : 'Salvar'}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Compact Sidebar */}
                <div className="w-full lg:w-56 flex flex-col gap-1 shrink-0">
                    <TabButton id="general" label="Geral" icon={Building2} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton id="appearance" label="Identidade Visual" icon={Palette} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton id="social" label="Redes Sociais" icon={Share2} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton id="hours" label="Horários" icon={Clock} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton id="delivery" label="Entregas" icon={Truck} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <TabButton id="debug" label="Testar Notificações" icon={X} activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>

                {/* Content Area - Transparent Background for Dark Mode Integration */}
                <div className="flex-1 rounded-xl p-6 border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">

                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-fadeIn">
                            <h2 className="text-lg font-bold border-b border-stone-200 dark:border-stone-700 pb-2 mb-4 flex items-center gap-2 text-stone-700 dark:text-stone-200"><Building2 size={18} /> Informações da Loja</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <InputGroup label="Nome da Loja" name="restaurant_name" value={settings.restaurant_name} onChange={handleChange} placeholder="Ex: AkiraMix Pizzaria" />
                                <InputGroup label="CNPJ" name="cnpj" value={settings.cnpj} onChange={handleChange} placeholder="00.000.000/0000-00" />
                                <InputGroup label="WhatsApp" name="whatsapp" value={settings.whatsapp} onChange={handleChange} placeholder="5511999999999" />
                                <InputGroup label="Endereço Completo" name="address" value={settings.address} onChange={handleChange} placeholder="Rua, Número, Bairro..." colSpan={2} />

                                {/* Dynamic Phones */}
                                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                                    <label className="block text-xs font-bold mb-2 text-stone-500 dark:text-stone-400 uppercase tracking-wider">Telefones Adicionais</label>
                                    <div className="space-y-2">
                                        {extraPhones.map((phone, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={phone}
                                                    onChange={(e) => updatePhone(index, e.target.value)}
                                                    className="flex-1 p-2 rounded border border-stone-300 dark:border-stone-600 bg-transparent dark:text-white outline-none focus:border-italian-red transition-colors text-sm"
                                                    placeholder="(00) 0000-0000"
                                                />
                                                <button onClick={() => removePhone(index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                        <button onClick={addPhone} className="text-xs flex items-center gap-1 text-italian-red font-bold hover:underline"><Plus size={14} /> Adicionar Telefone</button>
                                    </div>
                                </div>

                                {/* Webhook URL Display */}
                                <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                    <label className="block text-xs font-bold mb-2 text-blue-800 dark:text-blue-300 uppercase tracking-wider">Webhook para Agente IA</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={webhookUrl}
                                            className="flex-1 p-2 rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 text-sm font-mono"
                                        />
                                        <button
                                            onClick={() => navigator.clipboard.writeText(webhookUrl)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs font-bold transition-colors"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                                        Use este link na configuração da sua Evolution API ou serviço de IA.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* APPEARANCE TAB */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-fadeIn">
                            <h2 className="text-lg font-bold border-b border-stone-200 dark:border-stone-700 pb-2 mb-4 flex items-center gap-2 text-stone-700 dark:text-stone-200"><Palette size={18} /> Identidade Visual</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Logo */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Logo</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 border dark:border-stone-700 flex items-center justify-center overflow-hidden relative group">
                                            {settings.logo_url ? <img src={settings.logo_url} className="w-full h-full object-contain" /> : <Upload size={20} className="text-stone-400" />}
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'logo_url')} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-blue-500 font-bold cursor-pointer relative">Alterar<input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'logo_url')} /></span>
                                            {settings.logo_url && (
                                                <button onClick={() => handleImageRemove('logo_url')} className="text-xs text-red-500 font-bold flex items-center gap-1 hover:underline">
                                                    <Trash2 size={12} /> Remover
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Favicon */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Favicon</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded bg-stone-100 dark:bg-stone-800 border dark:border-stone-700 flex items-center justify-center overflow-hidden relative group">
                                            {settings.favicon_url ? <img src={settings.favicon_url} className="w-6 h-6 object-contain" /> : <Globe size={16} className="text-stone-400" />}
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'favicon_url')} />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-blue-500 font-bold cursor-pointer relative">Alterar<input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'favicon_url')} /></span>
                                            {settings.favicon_url && (
                                                <button onClick={() => handleImageRemove('favicon_url')} className="text-xs text-red-500 font-bold flex items-center gap-1 hover:underline">
                                                    <Trash2 size={12} /> Remover
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Cover */}
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase">Capa (SEO)</label>
                                    <div className="w-full h-16 rounded bg-stone-100 dark:bg-stone-800 border dark:border-stone-700 flex items-center justify-center overflow-hidden relative group">
                                        {settings.cover_url ? <img src={settings.cover_url} className="w-full h-full object-cover" /> : <span className="text-xs text-stone-400">1200x630</span>}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'cover_url')} />
                                        {settings.cover_url && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleImageRemove('cover_url');
                                                }}
                                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                title="Remover capa"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-stone-200 dark:border-stone-700">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Fonte do Sistema</label>
                                    <select name="font_family" value={settings.font_family} onChange={handleChange} className="w-full p-2 rounded border border-stone-300 dark:border-stone-600 bg-transparent dark:text-white text-sm">
                                        {fonts.map(f => <option key={f.value} value={f.value} className="text-stone-900">{f.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Cor Primária</label>
                                    <div className="flex gap-1"><input type="color" name="primary_color" value={settings.primary_color} onChange={handleChange} className="h-8 w-8 rounded cursor-pointer border-0" /><input type="text" name="primary_color" value={settings.primary_color} onChange={handleChange} className="w-full p-1 text-xs border rounded dark:bg-stone-800 dark:border-stone-600 dark:text-white" /></div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Cor Secundária</label>
                                    <div className="flex gap-1"><input type="color" name="secondary_color" value={settings.secondary_color} onChange={handleChange} className="h-8 w-8 rounded cursor-pointer border-0" /><input type="text" name="secondary_color" value={settings.secondary_color} onChange={handleChange} className="w-full p-1 text-xs border rounded dark:bg-stone-800 dark:border-stone-600 dark:text-white" /></div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Cor Botões</label>
                                    <div className="flex gap-1"><input type="color" name="button_color" value={settings.button_color} onChange={handleChange} className="h-8 w-8 rounded cursor-pointer border-0" /><input type="text" name="button_color" value={settings.button_color} onChange={handleChange} className="w-full p-1 text-xs border rounded dark:bg-stone-800 dark:border-stone-600 dark:text-white" /></div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1">Cor Carrinho</label>
                                    <div className="flex gap-1"><input type="color" name="cart_color" value={settings.cart_color} onChange={handleChange} className="h-8 w-8 rounded cursor-pointer border-0" /><input type="text" name="cart_color" value={settings.cart_color} onChange={handleChange} className="w-full p-1 text-xs border rounded dark:bg-stone-800 dark:border-stone-600 dark:text-white" /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SOCIAL TAB */}
                    {activeTab === 'social' && (
                        <div className="space-y-6 animate-fadeIn">
                            <h2 className="text-lg font-bold border-b border-stone-200 dark:border-stone-700 pb-2 mb-4 flex items-center gap-2 text-stone-700 dark:text-stone-200"><Share2 size={18} /> Redes Sociais</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputGroup label="Instagram" name="social_instagram" value={settings.social_instagram} onChange={handleChange} placeholder="URL" />
                                <InputGroup label="Facebook" name="social_facebook" value={settings.social_facebook} onChange={handleChange} placeholder="URL" />
                                <InputGroup label="YouTube" name="social_youtube" value={settings.social_youtube} onChange={handleChange} placeholder="URL" />
                                <InputGroup label="Google Meu Negócio" name="social_google" value={settings.social_google} onChange={handleChange} placeholder="URL" />
                            </div>
                        </div>
                    )}

                    {/* HOURS TAB */}
                    {activeTab === 'hours' && (
                        <div className="space-y-6 animate-fadeIn">
                            <h2 className="text-lg font-bold border-b border-stone-200 dark:border-stone-700 pb-2 mb-4 flex items-center gap-2 text-stone-700 dark:text-stone-200"><Clock size={18} /> Horários de Funcionamento</h2>

                            <InputGroup label="Texto Simples (Rodapé)" name="simple_hours_text" value={settings.simple_hours_text} onChange={handleChange} placeholder="Ex: Seg a Sex das 18h às 23h" />

                            <div className="bg-transparent dark:bg-stone-800/20 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
                                <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase mb-3">Configuração Automática</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Object.entries(days).map(([key, label]) => (
                                        <div key={key} className="flex items-center justify-between p-2 bg-transparent dark:bg-stone-800/50 rounded border border-stone-200 dark:border-stone-700">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={!settings.opening_hours_schema?.[key]?.closed} onChange={(e) => handleHoursChange(key, 'closed', !e.target.checked)} className="rounded text-italian-red focus:ring-italian-red" />
                                                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{label}</span>
                                            </label>
                                            {!settings.opening_hours_schema?.[key]?.closed && (
                                                <div className="flex gap-1">
                                                    <input type="time" value={settings.opening_hours_schema?.[key]?.open || '18:00'} onChange={(e) => handleHoursChange(key, 'open', e.target.value)} className="p-1 text-xs border rounded bg-transparent dark:text-white dark:border-stone-600 w-16" />
                                                    <input type="time" value={settings.opening_hours_schema?.[key]?.close || '23:00'} onChange={(e) => handleHoursChange(key, 'close', e.target.value)} className="p-1 text-xs border rounded bg-transparent dark:text-white dark:border-stone-600 w-16" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DELIVERY TAB */}
                    {activeTab === 'delivery' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-700 pb-2 mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-stone-700 dark:text-stone-200"><Truck size={18} /> Taxas de Entrega por CEP</h2>
                                <button onClick={addZone} className="text-xs bg-stone-800 dark:bg-stone-700 text-white px-3 py-1.5 rounded hover:bg-stone-700 flex items-center gap-1"><Plus size={14} /> Nova Faixa</button>
                            </div>

                            <div className="space-y-3">
                                {zones.map((zone, index) => (
                                    <div key={zone.id} className="p-3 bg-transparent dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Nome (Opcional)</label>
                                                <input type="text" value={zone.name} onChange={(e) => handleZoneChange(index, 'name', e.target.value)} className="w-full p-1.5 text-sm border rounded bg-transparent dark:text-white dark:border-stone-600" placeholder="Ex: Zona Norte" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">CEP Inicial</label>
                                                <input type="text" value={zone.cep_start || ''} onChange={(e) => handleZoneChange(index, 'cep_start', e.target.value)} className="w-full p-1.5 text-sm border rounded bg-transparent dark:text-white dark:border-stone-600" placeholder="00000-000" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">CEP Final</label>
                                                <input type="text" value={zone.cep_end || ''} onChange={(e) => handleZoneChange(index, 'cep_end', e.target.value)} className="w-full p-1.5 text-sm border rounded bg-transparent dark:text-white dark:border-stone-600" placeholder="00000-000" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Taxa (R$)</label>
                                                <input type="number" step="0.01" value={zone.fee} onChange={(e) => handleZoneChange(index, 'fee', e.target.value)} className="w-full p-1.5 text-sm border rounded bg-transparent dark:text-white dark:border-stone-600 font-bold text-italian-green" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Tempo Est.</label>
                                                <input type="text" value={zone.estimated_time} onChange={(e) => handleZoneChange(index, 'estimated_time', e.target.value)} className="w-full p-1.5 text-sm border rounded bg-transparent dark:text-white dark:border-stone-600" />
                                            </div>
                                            <div className="md:col-span-1 flex justify-end">
                                                <button onClick={() => removeZone(index)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">CEPs Excluídos (Separar por vírgula)</label>
                                                <input type="text" value={zone.excluded_ceps || ''} onChange={(e) => handleZoneChange(index, 'excluded_ceps', e.target.value)} className="w-full p-1.5 text-xs border rounded bg-transparent dark:text-white dark:border-stone-600" placeholder="Ex: 00000-001, 00000-002" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Bairros (Opcional - Apenas Referência)</label>
                                                <input type="text" value={zone.neighborhoods || ''} onChange={(e) => handleZoneChange(index, 'neighborhoods', e.target.value)} className="w-full p-1.5 text-xs border rounded bg-transparent dark:text-white dark:border-stone-600" placeholder="Centro, Jardim..." />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DEBUG TAB */}
                    {activeTab === 'debug' && (
                        <div className="space-y-6 animate-fadeIn">
                            <h2 className="text-lg font-bold border-b border-stone-200 dark:border-stone-700 pb-2 mb-4 flex items-center gap-2 text-stone-700 dark:text-stone-200">
                                <X size={18} /> Diagnóstico de Notificações
                            </h2>

                            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg mb-4 text-sm text-orange-800 dark:text-orange-200">
                                Use esta área para testar se o sistema consegue enviar alertas para você.
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* 1. Audio Test */}
                                <div className="p-4 bg-white dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700">
                                    <h3 className="font-bold flex items-center gap-2 mb-2"><Clock size={16} /> 1. Teste de Som (Navegador)</h3>
                                    <p className="text-sm text-stone-500 mb-4">Verifique se o seu dispositivo consegue tocar sons de alerta.</p>
                                    <button
                                        onClick={() => {
                                            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
                                            audio.play().catch(e => alert("Erro ao tocar som: " + e.message));
                                        }}
                                        className="bg-stone-800 text-white px-4 py-2 rounded hover:bg-stone-700"
                                    >
                                        Tocar Som
                                    </button>
                                </div>

                                {/* 2. WhatsApp Test */}
                                <div className="p-4 bg-white dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700">
                                    <h3 className="font-bold flex items-center gap-2 mb-2"><Phone size={16} /> 2. Teste de WhatsApp</h3>
                                    <p className="text-sm text-stone-500 mb-4">Envia uma mensagem de teste para o número configurado ({settings.whatsapp}).</p>
                                    <button
                                        onClick={async () => {
                                            try {
                                                if (!settings.whatsapp) return alert('Configure o WhatsApp na aba Geral primeiro.');
                                                const apiUrl = import.meta.env.VITE_API_URL || '';
                                                const res = await fetch(`${apiUrl}/api/ai/notify-admin`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ order: { order_number: 999, customer_name: 'Teste Admin', total: 1.00, delivery_type: 'pickup' } })
                                                });
                                                const data = await res.json();
                                                alert(data.success ? 'Mensagem enviada com sucesso!' : 'Falha: ' + (data.error || JSON.stringify(data)));
                                            } catch (e) {
                                                alert('Erro de conexão: ' + e.message);
                                            }
                                        }}
                                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500"
                                    >
                                        Enviar WhatsApp de Teste
                                    </button>
                                </div>

                                {/* 3. Web Push Test */}
                                <div className="p-4 bg-white dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700">
                                    <h3 className="font-bold flex items-center gap-2 mb-2"><Share2 size={16} /> 3. Teste Push (App)</h3>
                                    <p className="text-sm text-stone-500 mb-4">Envia uma notificação real para este dispositivo (mesmo com navegador fechado).</p>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const apiUrl = import.meta.env.VITE_API_URL || '';
                                                // 1. Check Permission
                                                if (Notification.permission === 'default') {
                                                    await Notification.requestPermission();
                                                }
                                                if (Notification.permission !== 'granted') {
                                                    return alert('Permissão de notificação negada pelo navegador.');
                                                }

                                                // 2. Trigger
                                                const res = await fetch(`${apiUrl}/api/push/send-test`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ message: 'Isso é um teste de Notificação Push!' })
                                                });
                                                const data = await res.json();
                                                alert(data.success ? 'Notificação enviada! Veja sua barra de status.' : 'Falha: ' + (data.error || JSON.stringify(data)));
                                            } catch (e) {
                                                alert('Erro de conexão: ' + e.message);
                                            }
                                        }}
                                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
                                    >
                                        Enviar Notificação Push
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            );
};


            export default Settings;
