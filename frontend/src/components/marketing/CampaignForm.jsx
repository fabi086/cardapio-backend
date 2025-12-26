import React, { useState, useEffect } from 'react';
import { Send, Calendar, Sparkles, X, Plus, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CampaignForm = ({ groups, onCancel, onSuccess, initialData }) => {
    const [formData, setFormData] = useState({
        title: '',
        targetGroupId: '',
        messageTemplate: '',
        messageVariations: [],
        scheduledAt: '',
        imageUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                targetGroupId: initialData.target_group_id || '',
                messageTemplate: initialData.message_template || '',
                messageVariations: initialData.message_variations || [],
                scheduledAt: initialData.scheduled_at ? new Date(initialData.scheduled_at).toISOString().slice(0, 16) : '',
                imageUrl: initialData.image_url || ''
            });
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : new Date().toISOString()
            };

            const url = initialData ? `/api/marketing/campaigns/${initialData.id}` : '/api/marketing/campaigns';
            const method = initialData ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSuccess();
            } else {
                const err = await res.json();
                alert('Erro ao salvar campanha: ' + (err.error || 'Erro desconhecido'));
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `marketing/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('menu-items') // Reusing existing public bucket
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('menu-items')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, imageUrl: data.publicUrl }));
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Erro ao fazer upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const generateVariations = async () => {
        if (!formData.messageTemplate) return alert('Escreva uma mensagem base primeiro.');
        setGenerating(true);
        try {
            const res = await fetch('/api/marketing/generate-variations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseMessage: formData.messageTemplate })
            });
            const data = await res.json();
            if (data.variations) {
                setFormData(prev => ({
                    ...prev,
                    messageVariations: [...prev.messageVariations, ...data.variations]
                }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    const removeVariation = (index) => {
        const newVars = [...formData.messageVariations];
        newVars.splice(index, 1);
        setFormData({ ...formData, messageVariations: newVars });
    };

    return (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-stone-800 dark:text-white">{initialData ? 'Editar Campanha' : 'Nova Campanha'}</h3>
                <button onClick={onCancel} className="text-stone-500 hover:text-stone-800"><X /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Título da Campanha</label>
                        <input
                            required
                            type="text"
                            className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 dark:bg-stone-800"
                            placeholder="Ex: Promoção Fim de Semana"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Grupo Alvo</label>
                        <select
                            required
                            className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 dark:bg-stone-800"
                            value={formData.targetGroupId}
                            onChange={e => setFormData({ ...formData, targetGroupId: e.target.value })}
                        >
                            <option value="">Selecione um grupo...</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 2. Message & Variations */}
                <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Mensagem Base</label>
                    <textarea
                        required
                        rows={4}
                        className="w-full p-2 rounded-lg border border-stone-200 dark:border-stone-700 dark:bg-stone-800"
                        placeholder="Olá! Temos uma oferta especial hoje..."
                        value={formData.messageTemplate}
                        onChange={e => setFormData({ ...formData, messageTemplate: e.target.value })}
                    />
                    <div className="mt-2 flex justify-between items-center">
                        <p className="text-xs text-stone-500">Use essa mensagem ou gere variações para evitar spam.</p>
                        <button
                            type="button"
                            onClick={generateVariations}
                            disabled={generating || !formData.messageTemplate}
                            className="flex items-center gap-2 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Sparkles size={14} />
                            {generating ? 'Gerando...' : 'Gerar Variações com IA'}
                        </button>
                    </div>
                </div>

                {/* Variations List */}
                {formData.messageVariations.length > 0 && (
                    <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-lg space-y-3">
                        <label className="block text-xs font-bold uppercase text-stone-500 mb-2">Variações Geradas ({formData.messageVariations.length})</label>
                        {formData.messageVariations.map((v, i) => (
                            <div key={i} className="flex gap-2 items-start bg-white dark:bg-stone-800 p-2 rounded border border-stone-200 dark:border-stone-700 text-sm">
                                <span className="flex-1">{v}</span>
                                <button type="button" onClick={() => removeVariation(i)} className="text-stone-400 hover:text-red-500"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. Image/Video Upload */}
                <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
                    <label className="block text-sm font-bold text-stone-700 dark:text-white mb-2 flex items-center gap-2">
                        <ImageIcon size={16} /> Mídia (Imagem/Vídeo)
                    </label>

                    <div className="flex gap-4 items-start flex-col md:flex-row">
                        <div className="flex-1 w-full">
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    placeholder="URL da imagem (opcional)"
                                    className="flex-1 p-2 rounded border border-stone-200 dark:border-stone-700 dark:bg-stone-900 text-sm"
                                    value={formData.imageUrl}
                                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    id="media-upload"
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="media-upload"
                                    className={`flex items-center justify-center gap-2 p-2 border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-lg cursor-pointer hover:border-italian-red hover:text-italian-red transition-colors text-sm text-stone-500 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <UploadCloud size={18} />
                                    {uploading ? 'Enviando...' : 'Clique para fazer upload de arquivo'}
                                </label>
                            </div>
                        </div>

                        {formData.imageUrl && (
                            <div className="w-24 h-24 relative bg-stone-200 dark:bg-stone-700 rounded-lg overflow-hidden border border-stone-300 dark:border-stone-600 shrink-0">
                                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl-lg hover:bg-red-700"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Scheduling */}
                <div className="bg-stone-50 dark:bg-stone-800/50 p-4 rounded-lg border border-stone-200 dark:border-stone-700">
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="checkbox"
                            id="enableSchedule"
                            className="w-4 h-4 accent-italian-red"
                            checked={!!formData.scheduledAt}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    // Set default to tomorrow 9am if checked
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    tomorrow.setHours(9, 0, 0, 0);
                                    const localIso = tomorrow.toISOString().slice(0, 16);
                                    setFormData({ ...formData, scheduledAt: localIso });
                                } else {
                                    setFormData({ ...formData, scheduledAt: '' });
                                }
                            }}
                        />
                        <label htmlFor="enableSchedule" className="font-bold text-stone-800 dark:text-white cursor-pointer select-none">
                            Agendar Envio?
                        </label>
                    </div>

                    {formData.scheduledAt && (
                        <div className="mt-2 pl-6">
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Data e Hora do Disparo</label>
                            <input
                                type="datetime-local"
                                required={!!formData.scheduledAt}
                                className="w-full md:w-auto p-2 rounded-lg border border-stone-300 dark:border-stone-600 dark:bg-stone-900 focus:ring-2 focus:ring-italian-red outline-none"
                                value={formData.scheduledAt}
                                onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                            />
                            <p className="text-xs text-stone-500 mt-1">O sistema enviará automaticamente nesta data.</p>
                        </div>
                    )}
                    {!formData.scheduledAt && (
                        <p className="text-xs text-stone-500 pl-6">Desmarcado: O envio será feito <b>imediatamente</b> ao salvar.</p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-italian-red text-white hover:bg-red-700 flex items-center gap-2"
                    >
                        {loading ? <span className="animate-spin">⌛</span> : <Send size={18} />}
                        {initialData ? 'Salvar Alterações' : (formData.scheduledAt ? 'Agendar Campanha' : 'Enviar Agora')}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default CampaignForm;
