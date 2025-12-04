import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, Calendar, DollarSign, Percent } from 'lucide-react';

const Coupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        min_order_value: '',
        usage_limit: '',
        expiration_date: ''
    });

    const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await fetch(`${API_URL}/api/coupons`);
            const data = await res.json();

            if (Array.isArray(data)) {
                setCoupons(data);
            } else {
                console.error('Expected array of coupons, got:', data);
                setCoupons([]);
            }
        } catch (error) {
            console.error('Error fetching coupons:', error);
            setCoupons([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/coupons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowForm(false);
                fetchCoupons();
                setFormData({
                    code: '',
                    discount_type: 'percentage',
                    discount_value: '',
                    min_order_value: '',
                    usage_limit: '',
                    expiration_date: ''
                });
            } else {
                alert('Erro ao criar cupom');
            }
        } catch (error) {
            console.error('Error creating coupon:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este cupom?')) return;
        try {
            await fetch(`${API_URL}/api/coupons/${id}`, { method: 'DELETE' });
            fetchCoupons();
        } catch (error) {
            console.error('Error deleting coupon:', error);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                    <Tag className="text-italian-red" /> Cupons de Desconto
                </h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-italian-green text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
                >
                    <Plus size={20} /> Novo Cupom
                </button>
            </div>

            {showForm && (
                <div className="bg-white dark:bg-stone-900 p-6 rounded-lg shadow-md mb-8 border border-stone-200 dark:border-stone-700 animate-in slide-in-from-top-5">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1 text-stone-600 dark:text-stone-400">Código</label>
                            <input
                                type="text"
                                required
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="w-full p-2 border rounded dark:bg-stone-800 dark:border-stone-700 dark:text-white uppercase"
                                placeholder="EX: PROMO10"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-stone-600 dark:text-stone-400">Tipo de Desconto</label>
                            <select
                                value={formData.discount_type}
                                onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-stone-800 dark:border-stone-700 dark:text-white"
                            >
                                <option value="percentage">Porcentagem (%)</option>
                                <option value="fixed">Valor Fixo (R$)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-stone-600 dark:text-stone-400">Valor do Desconto</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    required
                                    value={formData.discount_value}
                                    onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-stone-800 dark:border-stone-700 dark:text-white pl-8"
                                    placeholder="10"
                                />
                                <span className="absolute left-2 top-2 text-stone-400">
                                    {formData.discount_type === 'percentage' ? <Percent size={16} /> : <DollarSign size={16} />}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-stone-600 dark:text-stone-400">Pedido Mínimo (R$)</label>
                            <input
                                type="number"
                                value={formData.min_order_value}
                                onChange={e => setFormData({ ...formData, min_order_value: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-stone-800 dark:border-stone-700 dark:text-white"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-stone-600 dark:text-stone-400">Limite de Uso (Opcional)</label>
                            <input
                                type="number"
                                value={formData.usage_limit}
                                onChange={e => setFormData({ ...formData, usage_limit: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-stone-800 dark:border-stone-700 dark:text-white"
                                placeholder="Ex: 100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-stone-600 dark:text-stone-400">Validade (Opcional)</label>
                            <input
                                type="date"
                                value={formData.expiration_date}
                                onChange={e => setFormData({ ...formData, expiration_date: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-stone-800 dark:border-stone-700 dark:text-white"
                            />
                        </div>
                        <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-italian-red text-white px-6 py-2 rounded font-bold hover:bg-red-700"
                            >
                                Criar Cupom
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map(coupon => (
                    <div key={coupon.id} className="bg-white dark:bg-stone-900 p-4 rounded-lg shadow border border-stone-200 dark:border-stone-800 relative group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-mono font-bold px-2 py-1 rounded text-lg border border-stone-300 dark:border-stone-700">
                                {coupon.code}
                            </span>
                            <button
                                onClick={() => handleDelete(coupon.id)}
                                className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <div className="text-2xl font-bold text-italian-green mb-2">
                            {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `R$ ${coupon.discount_value} OFF`}
                        </div>
                        <div className="text-sm text-stone-500 dark:text-stone-400 space-y-1">
                            <p>Mínimo: R$ {coupon.min_order_value || '0,00'}</p>
                            {coupon.expiration_date && (
                                <p className="flex items-center gap-1"><Calendar size={14} /> Validade: {new Date(coupon.expiration_date).toLocaleDateString()}</p>
                            )}
                            {coupon.usage_limit && (
                                <p>Usos: {coupon.used_count} / {coupon.usage_limit}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Coupons;
