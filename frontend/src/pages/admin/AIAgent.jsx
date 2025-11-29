import React, { useState, useEffect } from 'react';
import { Bot, Save, Power, MessageSquare, Key, Globe, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AIAgent = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        evolution_api_url: '',
        evolution_api_key: '',
        openai_api_key: '',
        instance_name: '',
        system_prompt: '',
        is_active: false
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch('http://localhost:3001/api/ai/config', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('Failed to fetch settings');

            const data = await response.json();
            if (data && Object.keys(data).length > 0) {
                setSettings(data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            // Don't block the UI, just show empty settings or error toast
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Save via backend endpoint to ensure consistency
            const response = await fetch('http://localhost:3001/api/ai/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) throw new Error('Failed to save');

            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader className="animate-spin" /></div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-italian-red/10 rounded-xl text-italian-red">
                    <Bot size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100">Agente IA</h1>
                    <p className="text-stone-500">Configure seu atendente virtual inteligente</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Status Card */}
                <div className="bg-white dark:bg-stone-900 rounded-xl p-6 shadow-sm border border-stone-200 dark:border-stone-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${settings.is_active ? 'bg-green-500 animate-pulse' : 'bg-stone-300'}`} />
                        <div>
                            <h3 className="font-bold text-stone-800 dark:text-stone-200">Status do Agente</h3>
                            <p className="text-sm text-stone-500">{settings.is_active ? 'O agente está ativo e respondendo mensagens' : 'O agente está desligado'}</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="is_active"
                            checked={settings.is_active}
                            onChange={handleChange}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-italian-red/20 dark:peer-focus:ring-italian-red/30 rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-italian-green"></div>
                    </label>
                </div>

                {/* Evolution API Configuration */}
                <div className="bg-white dark:bg-stone-900 rounded-xl p-6 shadow-sm border border-stone-200 dark:border-stone-800 space-y-4">
                    <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <Globe size={20} className="text-blue-500" />
                        Configuração Evolution API
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-stone-600 dark:text-stone-400">URL da API</label>
                            <input
                                type="url"
                                name="evolution_api_url"
                                value={settings.evolution_api_url || ''}
                                onChange={handleChange}
                                placeholder="https://api.evolution-api.com"
                                className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-stone-600 dark:text-stone-400">Nome da Instância</label>
                            <input
                                type="text"
                                name="instance_name"
                                value={settings.instance_name || ''}
                                onChange={handleChange}
                                placeholder="MinhaInstancia"
                                className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                            />
                        </div>
                        <div className="col-span-full space-y-2">
                            <label className="text-sm font-bold text-stone-600 dark:text-stone-400">API Key (Global)</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                <input
                                    type="password"
                                    name="evolution_api_key"
                                    value={settings.evolution_api_key || ''}
                                    onChange={handleChange}
                                    placeholder="Sua chave de API da Evolution"
                                    className="w-full p-3 pl-10 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* OpenAI Configuration */}
                <div className="bg-white dark:bg-stone-900 rounded-xl p-6 shadow-sm border border-stone-200 dark:border-stone-800 space-y-4">
                    <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <Bot size={20} className="text-green-500" />
                        Configuração OpenAI
                    </h2>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-600 dark:text-stone-400">OpenAI API Key</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                            <input
                                type="password"
                                name="openai_api_key"
                                value={settings.openai_api_key || ''}
                                onChange={handleChange}
                                placeholder="sk-..."
                                className="w-full p-3 pl-10 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-600 dark:text-stone-400">Prompt do Sistema</label>
                        <textarea
                            name="system_prompt"
                            value={settings.system_prompt || ''}
                            onChange={handleChange}
                            rows="6"
                            placeholder="Instruções para o comportamento do bot..."
                            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all resize-none"
                        />
                        <p className="text-xs text-stone-500">Defina como o bot deve se comportar, tom de voz e regras de negócio.</p>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-italian-red hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
                    >
                        {saving ? <Loader className="animate-spin" /> : <><Save size={20} /> Salvar Configurações</>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AIAgent;
