import React, { useState, useEffect } from 'react';
import { X, Send, Image as ImageIcon, Plus, Trash2, Clock, AlertTriangle, FileText, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CampaignModal = ({ customers, onClose }) => {
    const [step, setStep] = useState(1); // 1: Compose, 2: Review, 3: Sending, 4: Results
    const [variations, setVariations] = useState(['Olá {name}! Confira nossas ofertas!']);
    const [imageFile, setImageFile] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [delay, setDelay] = useState(10); // Seconds between messages
    const [progress, setProgress] = useState({ sent: 0, total: customers.length, failed: 0 });
    const [logs, setLogs] = useState([]);
    const [isPaused, setIsPaused] = useState(false);

    // AI Generation states
    const [showAiMessageModal, setShowAiMessageModal] = useState(false);
    const [showAiImageModal, setShowAiImageModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedMessages, setGeneratedMessages] = useState([]);

    // Use relative path '' for production to rely on Vercel rewrites (Same Origin)
    const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3002' : '';

    const handleAddVariation = () => {
        setVariations([...variations, '']);
    };

    const handleUpdateVariation = (index, value) => {
        const newVariations = [...variations];
        newVariations[index] = value;
        setVariations(newVariations);
    };

    const handleRemoveVariation = (index) => {
        if (variations.length > 1) {
            setVariations(variations.filter((_, i) => i !== index));
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setImageFile(file);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `campaigns/${fileName}`;

            const { data, error } = await supabase.storage
                .from('menu-items')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('menu-items')
                .getPublicUrl(filePath);

            setImageUrl(publicUrl);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Erro ao subir imagem. Tente novamente.');
        }
    };

    // Generate message with AI
    const handleGenerateMessage = async () => {
        if (!aiPrompt.trim()) {
            alert('Digite uma descrição da campanha');
            return;
        }

        setIsGenerating(true);
        setGeneratedMessages([]);

        try {
            const res = await fetch(`${API_URL}/api/ai/generate-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.details || error.error || 'Erro ao gerar');
            }

            const data = await res.json();
            setGeneratedMessages(data.messages || []);
        } catch (error) {
            console.error('Error generating message:', error);
            alert(`Erro ao gerar mensagens: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // Apply generated messages
    const handleApplyMessages = () => {
        if (generatedMessages.length > 0) {
            setVariations(generatedMessages);
            setShowAiMessageModal(false);
            setAiPrompt('');
            setGeneratedMessages([]);
        }
    };

    // Generate image with AI
    const handleGenerateImage = async () => {
        if (!aiPrompt.trim()) {
            alert('Digite uma descrição da imagem');
            return;
        }

        setIsGenerating(true);

        try {
            const res = await fetch(`${API_URL}/api/ai/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.details || error.error || 'Erro ao gerar');
            }

            const data = await res.json();
            setImageUrl(data.imageUrl);
            setShowAiImageModal(false);
            setAiPrompt('');
        } catch (error) {
            console.error('Error generating image:', error);
            alert(`Erro ao gerar imagem: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const startCampaign = async () => {
        setStep(3);
        setProgress({ sent: 0, total: customers.length, failed: 0 });
        setLogs([]);
        let sentCount = 0;
        let failedCount = 0;

        for (let i = 0; i < customers.length; i++) {
            if (isPaused) {
                break;
            }

            const customer = customers[i];
            const variation = variations[Math.floor(Math.random() * variations.length)];
            const message = variation.replace('{name}', customer.name.split(' ')[0]);

            try {
                const jitter = delay * 0.3;
                const actualDelay = (delay * 1000) + (Math.random() * jitter * 2 * 1000) - (jitter * 1000);

                setLogs(prev => [`[${new Date().toLocaleTimeString()}] Enviando para ${customer.name}...`, ...prev]);

                const res = await fetch(`${API_URL}/api/ai/send-message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: customer.phone,
                        message: message,
                        mediaUrl: imageUrl || null
                    })
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.details || errorData.error || `Erro ${res.status}`);
                }

                sentCount++;
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] ✅ Sucesso: ${customer.name}`, ...prev]);

            } catch (error) {
                console.error(`Falha ao enviar para ${customer.name}:`, error);
                failedCount++;
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Erro: ${customer.name} - ${error.message}`, ...prev]);
            }

            setProgress({ sent: sentCount, total: customers.length, failed: failedCount });

            if (i < customers.length - 1) {
                setLogs(prev => [`[Aguardando ${Math.round(delay)}s...]`, ...prev]);
                await sleep(delay * 1000);
            }
        }

        setStep(4);
    };

    // AI Generation Modal Component
    const AiModal = ({ title, onClose, onGenerate, onApply, isImage }) => (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-stone-200 dark:border-stone-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <Sparkles className="text-purple-500" size={20} />
                        {title}
                    </h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-red-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2 block">
                            {isImage ? 'Descreva a imagem que você quer gerar:' : 'Descreva sua campanha:'}
                        </label>
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder={isImage
                                ? 'Ex: Uma pizza margherita deliciosa com tomates frescos...'
                                : 'Ex: Promoção de pizza para o fim de semana, 20% de desconto...'
                            }
                            className="w-full p-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                            rows="3"
                        />
                    </div>

                    {/* Generated messages preview */}
                    {!isImage && generatedMessages.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                                Mensagens geradas:
                            </label>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {generatedMessages.map((msg, idx) => (
                                    <div key={idx} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 text-sm">
                                        {msg}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onGenerate}
                            disabled={isGenerating || !aiPrompt.trim()}
                            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <Wand2 size={18} />
                                    {isImage ? 'Gerar Imagem' : 'Gerar Mensagens'}
                                </>
                            )}
                        </button>
                        {!isImage && generatedMessages.length > 0 && (
                            <button
                                onClick={onApply}
                                className="flex-1 py-2.5 rounded-lg bg-italian-green text-white font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                            >
                                ✓ Usar Estas
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 dark:border-stone-700">
                {/* Header */}
                <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-800/50">
                    <div>
                        <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                            <Send size={20} className="text-italian-red" />
                            Campanha WhatsApp
                        </h2>
                        <p className="text-xs text-stone-500">Enviando para <span className="font-bold text-stone-800 dark:text-stone-200">{customers.length} clientes</span></p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 && (
                        <div className="space-y-6">

                            {/* Variations */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-bold text-stone-700 dark:text-stone-300">Mensagens (Anti-Spam)</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setShowAiMessageModal(true); setAiPrompt(''); setGeneratedMessages([]); }}
                                            className="text-xs flex items-center gap-1 text-purple-600 font-bold hover:underline bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full"
                                        >
                                            <Sparkles size={14} /> Gerar com IA
                                        </button>
                                        <button onClick={handleAddVariation} className="text-xs flex items-center gap-1 text-italian-green font-bold hover:underline">
                                            <Plus size={14} /> Adicionar Variação
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-stone-500 mb-3 bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
                                    O sistema escolherá aleatoriamente uma dessas mensagens para cada cliente. Isso ajuda a evitar bloqueios.
                                    Use <b>{'{name}'}</b> para inserir o primeiro nome do cliente.
                                </p>
                                <div className="space-y-3">
                                    {variations.map((v, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <textarea
                                                value={v}
                                                onChange={(e) => handleUpdateVariation(idx, e.target.value)}
                                                className="flex-1 p-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none resize-none"
                                                rows="3"
                                                placeholder="Digite sua mensagem..."
                                            />
                                            {variations.length > 1 && (
                                                <button onClick={() => handleRemoveVariation(idx)} className="text-stone-400 hover:text-red-500 self-start mt-2">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Image */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-bold text-stone-700 dark:text-stone-300">Imagem (Opcional)</label>
                                    {!imageUrl && (
                                        <button
                                            onClick={() => { setShowAiImageModal(true); setAiPrompt(''); }}
                                            className="text-xs flex items-center gap-1 text-purple-600 font-bold hover:underline bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full"
                                        >
                                            <Sparkles size={14} /> Gerar com IA
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    {imageUrl ? (
                                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-stone-200 dark:border-stone-700 group">
                                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => { setImageUrl(''); setImageFile(null); }}
                                                className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="w-full h-24 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-italian-red hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                                            <ImageIcon className="text-stone-400 mb-1" />
                                            <span className="text-xs text-stone-500">Clique para enviar imagem</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Settings */}
                            <div className="bg-stone-100 dark:bg-stone-800/50 p-4 rounded-xl">
                                <h3 className="font-bold text-sm text-stone-800 dark:text-stone-200 mb-3 flex items-center gap-2">
                                    <Clock size={16} /> Configurações de Envio
                                </h3>
                                <div className="flex items-center gap-4">
                                    <label className="text-sm text-stone-600 dark:text-stone-400 flex-1">
                                        Intervalo entre mensagens (segundos):
                                    </label>
                                    <input
                                        type="number"
                                        min="5"
                                        value={delay}
                                        onChange={(e) => setDelay(parseInt(e.target.value))}
                                        className="w-20 p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-center font-bold"
                                    />
                                </div>
                                <p className="text-xs text-stone-500 mt-2">
                                    Recomendado: Mínimo 10s. O sistema adicionará uma variação aleatória extra para parecer humano.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center h-full py-8 space-y-6">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="animate-spin w-full h-full text-stone-200 dark:text-stone-800" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="absolute text-xl font-bold text-italian-green">
                                    {Math.round((progress.sent / progress.total) * 100)}%
                                </span>
                            </div>

                            <div className="text-center">
                                <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-1">Enviando Campanha...</h3>
                                <p className="text-stone-500">Não feche esta janela enquanto o envio estiver em andamento.</p>
                                <p className="mt-2 font-mono text-sm bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full inline-block">
                                    {progress.sent} / {progress.total} enviados • {progress.failed} falhas
                                </p>
                            </div>

                            <div className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-3 h-32 overflow-y-auto font-mono text-xs space-y-1">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-stone-600 dark:text-stone-400 border-b border-stone-100 dark:border-stone-800/50 pb-1 last:border-0">
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <Send size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-2">Campanha Finalizada!</h3>
                            <p className="text-stone-600 dark:text-stone-400 max-w-sm mx-auto mb-6">
                                O processo de envio foi concluído.
                            </p>
                            <div className="flex gap-4 text-sm font-bold">
                                <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg border border-green-100 dark:border-green-800">
                                    ✅ {progress.sent} Sucessos
                                </div>
                                {progress.failed > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg border border-red-100 dark:border-red-800">
                                        ❌ {progress.failed} Falhas
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 flex gap-3">
                    {step === 1 && (
                        <>
                            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-700 font-bold text-sm transition-colors">
                                Cancelar
                            </button>
                            <button
                                onClick={startCampaign}
                                disabled={variations.some(v => !v.trim())}
                                className="flex-[2] py-2.5 rounded-lg bg-italian-green text-white font-bold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Send size={18} /> Iniciar Disparos
                            </button>
                        </>
                    )}
                    {(step === 3 || step === 4) && (
                        <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-sm hover:bg-stone-300 dark:hover:bg-stone-600 transition-colors">
                            {step === 3 ? 'Parar / Cancelar' : 'Fechar'}
                        </button>
                    )}
                </div>
            </div>

            {/* AI Message Modal */}
            {showAiMessageModal && (
                <AiModal
                    title="Gerar Mensagens com IA"
                    onClose={() => setShowAiMessageModal(false)}
                    onGenerate={handleGenerateMessage}
                    onApply={handleApplyMessages}
                    isImage={false}
                />
            )}

            {/* AI Image Modal */}
            {showAiImageModal && (
                <AiModal
                    title="Gerar Imagem com IA"
                    onClose={() => setShowAiImageModal(false)}
                    onGenerate={handleGenerateImage}
                    isImage={true}
                />
            )}
        </div>
    );
};

export default CampaignModal;
