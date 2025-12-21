import React, { useState } from 'react';
import { Send, Calendar, Sparkles, X, Plus } from 'lucide-react';

const CampaignForm = ({ groups, onCancel, onSuccess }) => {
    const [step, setStep] = useState(1);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : new Date().toISOString()
            };

            const res = await fetch('/api/marketing/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSuccess();
            } else {
                alert('Erro ao criar campanha');
            }
        } catch (err) {
            console.error(err);
            alert('Erro de conexão');
        } finally {
            setLoading(false);
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
                <h3 className="text-xl font-bold text-stone-800 dark:text-white">Nova Campanha</h3>
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

                {/* 3. Scheduling */}
                <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Agendar Envio (Opcional)</label>
                    <input
                        type="datetime-local"
                        className="w-full md:w-auto p-2 rounded-lg border border-stone-200 dark:border-stone-700 dark:bg-stone-800"
                        value={formData.scheduledAt}
                        onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                    />
                    <p className="text-xs text-stone-500 mt-1">Deixe em branco para enviar imediatamente.</p>
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
                        {formData.scheduledAt ? 'Agendar Campanha' : 'Enviar Agora'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default CampaignForm;
