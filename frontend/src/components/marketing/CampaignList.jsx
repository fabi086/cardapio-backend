import React from 'react';
import { Calendar, CheckCircle, Clock, AlertCircle, RefreshCw, Trash2, Edit2, Send } from 'lucide-react';

const CampaignList = ({ campaigns, onRefresh, onEdit }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'scheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-stone-800 dark:text-stone-400';
            case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle size={16} />;
            case 'processing': return <RefreshCw size={16} className="animate-spin" />;
            case 'scheduled': return <Clock size={16} />;
            case 'failed': return <AlertCircle size={16} />;
            default: return <Edit2 size={16} />;
        }
    };

    const translateStatus = (status) => {
        const map = {
            completed: 'Concluído',
            processing: 'Enviando',
            scheduled: 'Agendado',
            draft: 'Rascunho',
            failed: 'Falhou'
        };
        return map[status] || status;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-stone-800 dark:text-white">Campanhas Recentes</h3>
                <button
                    onClick={onRefresh}
                    className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {campaigns.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-stone-900 rounded-xl border border-dashed border-stone-300 dark:border-stone-700">
                    <p className="text-stone-500 dark:text-stone-400">Nenhuma campanha encontrada.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {campaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            className="bg-white dark:bg-stone-900 rounded-xl p-4 border border-stone-200 dark:border-stone-800 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-stone-800 dark:text-white">{campaign.title}</h4>
                                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getStatusColor(campaign.status)}`}>
                                            {getStatusIcon(campaign.status)}
                                            {translateStatus(campaign.status)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-stone-500 dark:text-stone-400 mb-2 line-clamp-1">
                                        {campaign.message_template || "Variações de mensagem usadas"}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {new Date(campaign.scheduled_at).toLocaleDateString()}
                                        </div>
                                        {campaign.stats && (
                                            <>
                                                <span>•</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                                        ✓ {campaign.stats.sent || 0} enviadas
                                                    </span>
                                                    {campaign.stats.failed > 0 && (
                                                        <span className="text-red-600 dark:text-red-400 font-medium">
                                                            ✗ {campaign.stats.failed} falhas
                                                        </span>
                                                    )}
                                                    {campaign.stats.pending > 0 && (
                                                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                            ⏳ {campaign.stats.pending} pendentes
                                                        </span>
                                                    )}
                                                </div>
                                                {campaign.stats.salesCount > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-green-600 dark:text-green-400 font-semibold">
                                                            💰 {campaign.stats.salesCount} vendas (R$ {campaign.stats.salesTotal})
                                                        </span>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Pause button for processing campaigns */}
                                    {campaign.status === 'processing' && (
                                        <button
                                            onClick={async () => {
                                                if (confirm('Pausar o envio desta campanha? As mensagens pendentes não serão enviadas até você reativar.')) {
                                                    const res = await fetch(`/api/marketing/campaigns/${campaign.id}/pause`, { method: 'POST' });
                                                    if (res.ok) onRefresh();
                                                }
                                            }}
                                            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-yellow-500"
                                            title="Pausar Campanha"
                                        >
                                            <Clock size={18} />
                                        </button>
                                    )}

                                    {/* Edit button - allow for draft, scheduled, and processing (with warning) */}
                                    {(campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'processing') && (
                                        <button
                                            onClick={() => {
                                                if (campaign.status === 'processing') {
                                                    if (!confirm('Esta campanha está em andamento. Editar pode causar inconsistências. Deseja continuar?')) {
                                                        return;
                                                    }
                                                }
                                                onEdit(campaign);
                                            }}
                                            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-blue-500"
                                            title="Editar Campanha"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    )}

                                    {/* Delete button - allow for all except completed (with strong warning for processing) */}
                                    {campaign.status !== 'completed' && (
                                        <button
                                            onClick={() => {
                                                let confirmMsg = 'Tem certeza que deseja excluir esta campanha?';
                                                if (campaign.status === 'processing') {
                                                    confirmMsg = 'ATENÇÃO: Esta campanha está em andamento! Excluir irá cancelar o envio das mensagens pendentes. Tem certeza?';
                                                }
                                                if (confirm(confirmMsg)) {
                                                    fetch(`/api/marketing/campaigns/${campaign.id}`, { method: 'DELETE' })
                                                        .then(res => {
                                                            if (res.ok) onRefresh();
                                                        });
                                                }
                                            }}
                                            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-red-500"
                                            title="Excluir Campanha"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CampaignList;
