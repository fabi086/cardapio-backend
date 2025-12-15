import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Gift, Plus, Trash2, Users, TrendingUp, Award, Settings, Search, Edit2, X, Check } from 'lucide-react';

const Loyalty = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [rewards, setRewards] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingReward, setEditingReward] = useState(null);

    // Settings
    const [settings, setSettings] = useState({
        points_per_real: 1, // 1 ponto por real gasto
        min_points_redeem: 100,
        points_expiry_days: 365,
        enabled: true
    });

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        points_required: 100,
        reward_type: 'discount_percent',
        reward_value: 10,
        is_active: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch rewards
            const { data: rewardsData } = await supabase
                .from('loyalty_rewards')
                .select('*')
                .order('points_required');
            setRewards(rewardsData || []);

            // Fetch customers with points
            const { data: customersData } = await supabase
                .from('customers')
                .select('id, name, phone, loyalty_points, total_points_earned')
                .order('loyalty_points', { ascending: false })
                .limit(50);
            setCustomers(customersData || []);

            // Fetch recent transactions
            const { data: transData } = await supabase
                .from('loyalty_transactions')
                .select('*, customers(name)')
                .order('created_at', { ascending: false })
                .limit(20);
            setTransactions(transData || []);

            // Fetch settings
            const { data: settingsData } = await supabase
                .from('business_settings')
                .select('loyalty_settings')
                .single();
            if (settingsData?.loyalty_settings) {
                setSettings(prev => ({ ...prev, ...settingsData.loyalty_settings }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReward = async () => {
        try {
            if (editingReward) {
                await supabase
                    .from('loyalty_rewards')
                    .update(formData)
                    .eq('id', editingReward.id);
            } else {
                await supabase
                    .from('loyalty_rewards')
                    .insert([formData]);
            }
            setShowModal(false);
            setEditingReward(null);
            setFormData({
                name: '',
                description: '',
                points_required: 100,
                reward_type: 'discount_percent',
                reward_value: 10,
                is_active: true
            });
            fetchData();
        } catch (error) {
            alert('Erro ao salvar recompensa: ' + error.message);
        }
    };

    const handleDeleteReward = async (id) => {
        if (!window.confirm('Excluir esta recompensa?')) return;
        try {
            await supabase.from('loyalty_rewards').delete().eq('id', id);
            fetchData();
        } catch (error) {
            alert('Erro ao excluir: ' + error.message);
        }
    };

    const handleEditReward = (reward) => {
        setFormData(reward);
        setEditingReward(reward);
        setShowModal(true);
    };

    const handleSaveSettings = async () => {
        try {
            const { data: existing } = await supabase
                .from('business_settings')
                .select('id')
                .single();

            if (existing) {
                await supabase
                    .from('business_settings')
                    .update({ loyalty_settings: settings })
                    .eq('id', existing.id);
            }
            alert('Configurações salvas!');
        } catch (error) {
            alert('Erro ao salvar: ' + error.message);
        }
    };

    const handleAdjustPoints = async (customerId, adjustment, reason) => {
        try {
            // Get current points
            const { data: customer } = await supabase
                .from('customers')
                .select('loyalty_points')
                .eq('id', customerId)
                .single();

            const newPoints = Math.max(0, (customer?.loyalty_points || 0) + adjustment);

            // Update customer
            await supabase
                .from('customers')
                .update({
                    loyalty_points: newPoints,
                    total_points_earned: adjustment > 0 ? supabase.sql`total_points_earned + ${adjustment}` : undefined
                })
                .eq('id', customerId);

            // Log transaction
            await supabase.from('loyalty_transactions').insert([{
                customer_id: customerId,
                type: adjustment > 0 ? 'bonus' : 'adjustment',
                points: adjustment,
                description: reason
            }]);

            fetchData();
        } catch (error) {
            alert('Erro: ' + error.message);
        }
    };

    const stats = {
        totalCustomers: customers.length,
        totalPoints: customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0),
        activeRewards: rewards.filter(r => r.is_active).length,
        totalRedemptions: transactions.filter(t => t.type === 'redeemed').length
    };

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const getRewardTypeLabel = (type) => {
        const labels = {
            'discount_percent': '% Desconto',
            'discount_fixed': 'R$ Desconto',
            'free_item': 'Item Grátis',
            'free_delivery': 'Entrega Grátis'
        };
        return labels[type] || type;
    };

    if (loading) return <div className="p-8 text-center">Carregando...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-display text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <Gift className="text-italian-red" /> Programa de Fidelidade
                    </h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                        Gerencie pontos e recompensas para seus clientes
                    </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${settings.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {settings.enabled ? '✓ Ativo' : '✗ Inativo'}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                    <Users size={24} className="opacity-80 mb-2" />
                    <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                    <p className="text-xs opacity-80">Clientes com Pontos</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-4 text-white">
                    <TrendingUp size={24} className="opacity-80 mb-2" />
                    <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
                    <p className="text-xs opacity-80">Pontos em Circulação</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white">
                    <Award size={24} className="opacity-80 mb-2" />
                    <p className="text-2xl font-bold">{stats.activeRewards}</p>
                    <p className="text-xs opacity-80">Recompensas Ativas</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                    <Gift size={24} className="opacity-80 mb-2" />
                    <p className="text-2xl font-bold">{stats.totalRedemptions}</p>
                    <p className="text-xs opacity-80">Resgates Realizados</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-stone-200 dark:border-stone-700">
                {['overview', 'rewards', 'customers', 'settings'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 font-bold text-sm transition-all ${activeTab === tab
                                ? 'text-italian-red border-b-2 border-italian-red'
                                : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
                            }`}
                    >
                        {tab === 'overview' && '📊 Visão Geral'}
                        {tab === 'rewards' && '🎁 Recompensas'}
                        {tab === 'customers' && '👥 Clientes'}
                        {tab === 'settings' && '⚙️ Configurações'}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-stone-800 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <TrendingUp size={18} /> Últimas Transações
                        </h3>
                        {transactions.length === 0 ? (
                            <p className="text-stone-500 text-center py-4">Nenhuma transação ainda</p>
                        ) : (
                            <div className="space-y-2">
                                {transactions.slice(0, 10).map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-700/50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{t.customers?.name || 'Cliente'}</p>
                                            <p className="text-xs text-stone-500">{t.description || t.type}</p>
                                        </div>
                                        <div className={`font-bold ${t.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.points > 0 ? '+' : ''}{t.points} pts
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Rewards Tab */}
            {activeTab === 'rewards' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                setEditingReward(null);
                                setFormData({
                                    name: '',
                                    description: '',
                                    points_required: 100,
                                    reward_type: 'discount_percent',
                                    reward_value: 10,
                                    is_active: true
                                });
                                setShowModal(true);
                            }}
                            className="bg-italian-red text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700"
                        >
                            <Plus size={18} /> Nova Recompensa
                        </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {rewards.map(reward => (
                            <div key={reward.id} className={`bg-white dark:bg-stone-800 rounded-xl p-4 shadow-sm border-2 ${reward.is_active ? 'border-transparent' : 'border-red-200 opacity-60'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg">{reward.name}</h4>
                                        <p className="text-sm text-stone-500">{reward.description}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEditReward(reward)} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteReward(reward.id)} className="p-2 hover:bg-red-100 rounded text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end mt-4">
                                    <div className="bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
                                        <span className="text-yellow-700 dark:text-yellow-400 font-bold text-sm">
                                            {reward.points_required} pts
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs bg-stone-100 dark:bg-stone-700 px-2 py-1 rounded">
                                            {getRewardTypeLabel(reward.reward_type)}
                                        </span>
                                        <p className="font-bold text-italian-green mt-1">
                                            {reward.reward_type === 'discount_percent' && `${reward.reward_value}%`}
                                            {reward.reward_type === 'discount_fixed' && `R$ ${reward.reward_value}`}
                                            {reward.reward_type === 'free_delivery' && 'Frete Grátis'}
                                            {reward.reward_type === 'free_item' && 'Brinde'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente por nome ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
                        />
                    </div>

                    <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-stone-50 dark:bg-stone-700">
                                <tr>
                                    <th className="text-left p-4 font-bold text-sm">Cliente</th>
                                    <th className="text-center p-4 font-bold text-sm">Pontos Atuais</th>
                                    <th className="text-center p-4 font-bold text-sm">Total Acumulado</th>
                                    <th className="text-right p-4 font-bold text-sm">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map(customer => (
                                    <tr key={customer.id} className="border-t border-stone-100 dark:border-stone-700">
                                        <td className="p-4">
                                            <p className="font-medium">{customer.name}</p>
                                            <p className="text-xs text-stone-500">{customer.phone}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full font-bold">
                                                {customer.loyalty_points || 0} pts
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-stone-500">
                                            {customer.total_points_earned || 0} pts
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => {
                                                    const points = prompt('Quantidade de pontos (use negativo para remover):');
                                                    const reason = prompt('Motivo do ajuste:');
                                                    if (points && reason) {
                                                        handleAdjustPoints(customer.id, parseInt(points), reason);
                                                    }
                                                }}
                                                className="text-xs bg-stone-100 dark:bg-stone-700 px-3 py-1 rounded hover:bg-stone-200"
                                            >
                                                Ajustar Pontos
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="max-w-2xl">
                    <div className="bg-white dark:bg-stone-800 rounded-xl p-6 shadow-sm space-y-6">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Settings size={18} /> Configurações do Programa
                        </h3>

                        {/* Enable/Disable */}
                        <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-700/50 rounded-lg">
                            <div>
                                <p className="font-bold">Programa Ativo</p>
                                <p className="text-xs text-stone-500">Clientes acumulam pontos em cada compra</p>
                            </div>
                            <button
                                onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                                className={`w-14 h-7 rounded-full transition-colors relative ${settings.enabled ? 'bg-italian-green' : 'bg-stone-300'
                                    }`}
                            >
                                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enabled ? 'left-8' : 'left-1'
                                    }`} />
                            </button>
                        </div>

                        {/* Points per Real */}
                        <div>
                            <label className="block text-sm font-bold mb-2">Pontos por R$ 1 gasto</label>
                            <input
                                type="number"
                                value={settings.points_per_real}
                                onChange={(e) => setSettings(prev => ({ ...prev, points_per_real: parseInt(e.target.value) || 1 }))}
                                className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-600 bg-transparent"
                                min="1"
                            />
                            <p className="text-xs text-stone-500 mt-1">Ex: Pedido de R$ 50 = {50 * settings.points_per_real} pontos</p>
                        </div>

                        {/* Min Points to Redeem */}
                        <div>
                            <label className="block text-sm font-bold mb-2">Mínimo de pontos para resgatar</label>
                            <input
                                type="number"
                                value={settings.min_points_redeem}
                                onChange={(e) => setSettings(prev => ({ ...prev, min_points_redeem: parseInt(e.target.value) || 100 }))}
                                className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-600 bg-transparent"
                                min="1"
                            />
                        </div>

                        {/* Points Expiry */}
                        <div>
                            <label className="block text-sm font-bold mb-2">Validade dos pontos (dias)</label>
                            <input
                                type="number"
                                value={settings.points_expiry_days}
                                onChange={(e) => setSettings(prev => ({ ...prev, points_expiry_days: parseInt(e.target.value) || 365 }))}
                                className="w-full p-3 rounded-lg border border-stone-200 dark:border-stone-600 bg-transparent"
                                min="30"
                            />
                            <p className="text-xs text-stone-500 mt-1">0 = Pontos não expiram</p>
                        </div>

                        <button
                            onClick={handleSaveSettings}
                            className="w-full bg-italian-green text-white py-3 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                            <Check size={18} /> Salvar Configurações
                        </button>
                    </div>
                </div>
            )}

            {/* Modal for Reward */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">{editingReward ? 'Editar' : 'Nova'} Recompensa</h3>
                            <button onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full p-2 rounded border dark:bg-stone-700 dark:border-stone-600"
                                    placeholder="Ex: 10% de desconto"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Descrição</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full p-2 rounded border dark:bg-stone-700 dark:border-stone-600"
                                    placeholder="Desconto no pedido"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Pontos Necessários</label>
                                <input
                                    type="number"
                                    value={formData.points_required}
                                    onChange={(e) => setFormData(prev => ({ ...prev, points_required: parseInt(e.target.value) }))}
                                    className="w-full p-2 rounded border dark:bg-stone-700 dark:border-stone-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Tipo</label>
                                <select
                                    value={formData.reward_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, reward_type: e.target.value }))}
                                    className="w-full p-2 rounded border dark:bg-stone-700 dark:border-stone-600"
                                >
                                    <option value="discount_percent">% Desconto</option>
                                    <option value="discount_fixed">R$ Desconto Fixo</option>
                                    <option value="free_delivery">Entrega Grátis</option>
                                </select>
                            </div>

                            {formData.reward_type !== 'free_delivery' && (
                                <div>
                                    <label className="block text-sm font-bold mb-1">
                                        Valor {formData.reward_type === 'discount_percent' ? '(%)' : '(R$)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.reward_value}
                                        onChange={(e) => setFormData(prev => ({ ...prev, reward_value: parseFloat(e.target.value) }))}
                                        className="w-full p-2 rounded border dark:bg-stone-700 dark:border-stone-600"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="rounded"
                                />
                                <label className="text-sm">Recompensa Ativa</label>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 bg-stone-100 dark:bg-stone-700 py-2 rounded-lg font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveReward}
                                className="flex-1 bg-italian-red text-white py-2 rounded-lg font-bold"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Loyalty;
