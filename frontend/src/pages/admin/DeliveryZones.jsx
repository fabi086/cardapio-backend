import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MapPin, Plus, Pencil, Trash2, Save, X, Search, DollarSign, Clock } from 'lucide-react';

const DeliveryZones = () => {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingZone, setEditingZone] = useState(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        neighborhood: '',
        city: '',
        fee: '',
        min_order: '',
        estimated_time: '',
        active: true
    });

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('delivery_zones')
                .select('*')
                .order('neighborhood', { ascending: true });

            if (error) {
                // Table might not exist yet
                if (error.code === '42P01') {
                    console.log('Table delivery_zones does not exist yet');
                    setZones([]);
                    return;
                }
                throw error;
            }
            setZones(data || []);
        } catch (error) {
            console.error('Error fetching zones:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.neighborhood.trim()) {
            alert('Informe o nome do bairro');
            return;
        }

        try {
            const zoneData = {
                neighborhood: formData.neighborhood.trim(),
                city: formData.city.trim() || 'Cidade não informada',
                fee: parseFloat(formData.fee) || 0,
                min_order: parseFloat(formData.min_order) || 0,
                estimated_time: formData.estimated_time.trim() || null,
                active: formData.active
            };

            if (editingZone) {
                // Update
                const { error } = await supabase
                    .from('delivery_zones')
                    .update(zoneData)
                    .eq('id', editingZone.id);

                if (error) throw error;
                alert('Zona atualizada com sucesso!');
            } else {
                // Insert
                const { error } = await supabase
                    .from('delivery_zones')
                    .insert([zoneData]);

                if (error) throw error;
                alert('Zona adicionada com sucesso!');
            }

            resetForm();
            fetchZones();
        } catch (error) {
            console.error('Error saving zone:', error);
            alert('Erro ao salvar zona: ' + error.message);
        }
    };

    const handleEdit = (zone) => {
        setEditingZone(zone);
        setFormData({
            neighborhood: zone.neighborhood,
            city: zone.city || '',
            fee: zone.fee?.toString() || '',
            min_order: zone.min_order?.toString() || '',
            estimated_time: zone.estimated_time || '',
            active: zone.active
        });
        setIsAddingNew(true);
    };

    const handleDelete = async (zone) => {
        if (!window.confirm(`Excluir zona "${zone.neighborhood}"?`)) return;

        try {
            const { error } = await supabase
                .from('delivery_zones')
                .delete()
                .eq('id', zone.id);

            if (error) throw error;
            fetchZones();
        } catch (error) {
            console.error('Error deleting zone:', error);
            alert('Erro ao excluir zona');
        }
    };

    const resetForm = () => {
        setEditingZone(null);
        setIsAddingNew(false);
        setFormData({
            neighborhood: '',
            city: '',
            fee: '',
            min_order: '',
            estimated_time: '',
            active: true
        });
    };

    const filteredZones = zones.filter(z =>
        z.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (z.city && z.city.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100 flex items-center gap-3">
                        <MapPin className="text-italian-red" />
                        Zonas de Entrega
                    </h1>
                    <p className="text-sm text-stone-500">Gerencie bairros e taxas de entrega</p>
                </div>

                <button
                    onClick={() => { resetForm(); setIsAddingNew(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-italian-red text-white rounded-lg font-bold hover:bg-red-700 transition-all"
                >
                    <Plus size={18} />
                    Nova Zona
                </button>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 mb-6">
                <div className="flex items-center gap-3">
                    <Search size={20} className="text-stone-400" />
                    <input
                        type="text"
                        placeholder="Buscar bairro ou cidade..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-stone-800 dark:text-stone-200"
                    />
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {isAddingNew && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                                {editingZone ? 'Editar Zona' : 'Nova Zona de Entrega'}
                            </h2>
                            <button onClick={resetForm} className="text-stone-400 hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-stone-600 dark:text-stone-400 mb-1">
                                    Bairro *
                                </label>
                                <input
                                    type="text"
                                    value={formData.neighborhood}
                                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                                    placeholder="Ex: Centro, Vila Nova..."
                                    className="w-full px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-600 dark:text-stone-400 mb-1">
                                    Cidade
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Ex: São Paulo"
                                    className="w-full px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-stone-600 dark:text-stone-400 mb-1">
                                        Taxa de Entrega (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.fee}
                                        onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-stone-600 dark:text-stone-400 mb-1">
                                        Pedido Mínimo (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.min_order}
                                        onChange={(e) => setFormData({ ...formData, min_order: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-600 dark:text-stone-400 mb-1">
                                    Tempo Estimado
                                </label>
                                <input
                                    type="text"
                                    value={formData.estimated_time}
                                    onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                                    placeholder="Ex: 30-45 min"
                                    className="w-full px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={formData.active}
                                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                    className="w-5 h-5 rounded"
                                />
                                <label htmlFor="active" className="text-sm font-medium text-stone-700 dark:text-stone-300">
                                    Zona ativa (aceita entregas)
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-bold hover:bg-stone-100 dark:hover:bg-stone-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 rounded-lg bg-italian-green text-white font-bold hover:bg-green-700 flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    {editingZone ? 'Atualizar' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-italian-red"></div>
                </div>
            )}

            {/* Zones List */}
            {!loading && (
                <>
                    {filteredZones.length === 0 ? (
                        <div className="bg-white dark:bg-stone-900 rounded-xl p-12 text-center border border-stone-200 dark:border-stone-800">
                            <MapPin size={48} className="mx-auto mb-4 text-stone-300" />
                            <h3 className="text-lg font-bold text-stone-600 dark:text-stone-400 mb-2">
                                {searchTerm ? 'Nenhuma zona encontrada' : 'Nenhuma zona cadastrada'}
                            </h3>
                            <p className="text-stone-500 mb-4">
                                {searchTerm ? 'Tente outro termo de busca' : 'Adicione zonas de entrega para gerenciar taxas por bairro'}
                            </p>
                            {!searchTerm && (
                                <button
                                    onClick={() => setIsAddingNew(true)}
                                    className="px-4 py-2 bg-italian-red text-white rounded-lg font-bold"
                                >
                                    Adicionar Primeira Zona
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredZones.map((zone) => (
                                <div
                                    key={zone.id}
                                    className={`bg-white dark:bg-stone-900 rounded-xl shadow-sm border overflow-hidden transition-all ${zone.active
                                        ? 'border-stone-200 dark:border-stone-800'
                                        : 'border-red-200 dark:border-red-900/50 opacity-60'
                                        }`}
                                >
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-lg text-stone-800 dark:text-stone-100">
                                                    {zone.neighborhood}
                                                </h3>
                                                {zone.city && (
                                                    <p className="text-sm text-stone-500">{zone.city}</p>
                                                )}
                                            </div>
                                            {!zone.active && (
                                                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 text-xs font-bold rounded">
                                                    INATIVO
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <DollarSign size={16} className="text-green-500" />
                                                <span className="text-stone-600 dark:text-stone-400">Taxa:</span>
                                                <span className="font-bold text-green-600">{formatCurrency(zone.fee)}</span>
                                            </div>

                                            {zone.min_order > 0 && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <DollarSign size={16} className="text-orange-500" />
                                                    <span className="text-stone-600 dark:text-stone-400">Pedido mín:</span>
                                                    <span className="font-bold text-orange-600">{formatCurrency(zone.min_order)}</span>
                                                </div>
                                            )}

                                            {zone.estimated_time && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock size={16} className="text-blue-500" />
                                                    <span className="text-stone-600 dark:text-stone-400">Tempo:</span>
                                                    <span className="font-bold text-blue-600">{zone.estimated_time}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(zone)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(zone)}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stats */}
                    {zones.length > 0 && (
                        <div className="mt-6 p-4 bg-stone-100 dark:bg-stone-900 rounded-xl text-center text-sm text-stone-500">
                            <span className="font-bold text-stone-700 dark:text-stone-300">{zones.length}</span> zona(s) cadastrada(s)
                            {' • '}
                            <span className="font-bold text-green-600">{zones.filter(z => z.active).length}</span> ativas
                            {' • '}
                            Taxa média: <span className="font-bold text-stone-700 dark:text-stone-300">
                                {formatCurrency(zones.reduce((sum, z) => sum + (z.fee || 0), 0) / zones.length)}
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default DeliveryZones;
