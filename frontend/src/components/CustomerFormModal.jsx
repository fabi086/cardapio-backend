import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, MapPin, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CustomerFormModal = ({ customer, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        cep: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                address: customer.address || '',
                number: customer.number || '',
                complement: customer.complement || '',
                neighborhood: customer.neighborhood || '',
                city: customer.city || '',
                cep: customer.cep || ''
            });
        }
    }, [customer]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const formatPhone = (val) => {
        return val.replace(/\D/g, '');
    };

    const handlePhoneChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, phone: formatPhone(val) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            alert('Nome e Telefone são obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                phone: formatPhone(formData.phone) // Ensure clean phone
            };

            await onSave(dataToSave);
            onClose();
        } catch (error) {
            console.error('Error saving customer:', error);
            alert('Erro ao salvar cliente: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-stone-200 dark:border-stone-700">
                <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-800/50">
                    <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        {customer ? <User size={20} className="text-blue-500" /> : <User size={20} className="text-green-500" />}
                        {customer ? 'Editar Cliente' : 'Novo Cliente'}
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nome *</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-3 text-stone-400" />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none"
                                    placeholder="Nome do cliente"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Telefone *</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3 text-stone-400" />
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none"
                                    placeholder="DD999999999"
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin size={14} className="text-stone-400" />
                                <label className="text-xs font-bold text-stone-500 uppercase">Endereço</label>
                            </div>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none"
                                placeholder="Rua, Avenida..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Número</label>
                            <input
                                type="text"
                                name="number"
                                value={formData.number}
                                onChange={handleChange}
                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none"
                                placeholder="123"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Compl.</label>
                            <input
                                type="text"
                                name="complement"
                                value={formData.complement}
                                onChange={handleChange}
                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none"
                                placeholder="Apto 101"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Bairro</label>
                            <input
                                type="text"
                                name="neighborhood"
                                value={formData.neighborhood}
                                onChange={handleChange}
                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none"
                                placeholder="Bairro"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Cidade</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 font-bold text-sm transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-lg bg-italian-green text-white font-bold text-sm hover:bg-green-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : <><Save size={18} /> Salvar Cliente</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormModal;
