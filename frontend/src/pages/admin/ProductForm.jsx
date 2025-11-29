import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Upload, Save, Loader, Plus, Trash2, GripVertical, X } from 'lucide-react';

const ProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        is_available: true,
        modifiers: []
    });

    useEffect(() => {
        fetchCategories();
        if (isEditing) {
            fetchProduct();
        }
    }, [id]);

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        setCategories(data || []);
    };

    const fetchProduct = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (data) {
            setFormData({
                ...data,
                modifiers: data.modifiers || []
            });
        }
        setLoading(false);
    };

    const handleImageUpload = async (e) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('menu-images').getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Erro ao fazer upload da imagem');
        } finally {
            setUploading(false);
        }
    };

    // Modifiers Logic
    const addModifierGroup = () => {
        setFormData(prev => ({
            ...prev,
            modifiers: [
                ...prev.modifiers,
                {
                    id: Math.random().toString(36).substr(2, 9),
                    title: 'Novo Grupo',
                    type: 'radio',
                    required: false,
                    min: 0,
                    max: 1,
                    options: [{ name: 'Opção 1', price: 0 }]
                }
            ]
        }));
    };

    const removeModifierGroup = (index) => {
        const newModifiers = [...formData.modifiers];
        newModifiers.splice(index, 1);
        setFormData({ ...formData, modifiers: newModifiers });
    };

    const updateModifierGroup = (index, field, value) => {
        const newModifiers = [...formData.modifiers];
        newModifiers[index][field] = value;
        setFormData({ ...formData, modifiers: newModifiers });
    };

    const addOption = (groupIndex) => {
        const newModifiers = [...formData.modifiers];
        newModifiers[groupIndex].options.push({ name: '', price: 0 });
        setFormData({ ...formData, modifiers: newModifiers });
    };

    const removeOption = (groupIndex, optionIndex) => {
        const newModifiers = [...formData.modifiers];
        newModifiers[groupIndex].options.splice(optionIndex, 1);
        setFormData({ ...formData, modifiers: newModifiers });
    };

    const updateOption = (groupIndex, optionIndex, field, value) => {
        const newModifiers = [...formData.modifiers];
        newModifiers[groupIndex].options[optionIndex][field] = value;
        setFormData({ ...formData, modifiers: newModifiers });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const productData = {
                ...formData,
                price: parseFloat(formData.price),
            };

            if (isEditing) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);
                if (error) throw error;
            }

            navigate('/admin/products');
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Erro ao salvar produto');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/admin/products')}
                    className="p-2 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl md:text-3xl font-display text-stone-800 dark:text-stone-100">
                    {isEditing ? 'Editar Produto' : 'Novo Produto'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Basic Info */}
                <div className="bg-white dark:bg-stone-900 p-4 md:p-8 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
                    <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-4">Informações Básicas</h2>

                    {/* Image Upload */}
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-xl bg-stone-50 dark:bg-stone-800/50">
                        {formData.image_url ? (
                            <div className="relative group w-full max-w-xs aspect-video rounded-lg overflow-hidden">
                                <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <label className="cursor-pointer bg-white text-stone-900 px-4 py-2 rounded-lg font-bold hover:bg-stone-100 transition-colors">
                                        Trocar Foto
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center cursor-pointer p-4">
                                <div className="w-16 h-16 bg-stone-200 dark:bg-stone-700 rounded-full flex items-center justify-center mb-4">
                                    {uploading ? <Loader className="animate-spin" /> : <Upload size={24} />}
                                </div>
                                <span className="text-stone-600 dark:text-stone-400 font-medium">
                                    {uploading ? 'Enviando...' : 'Clique para enviar uma foto'}
                                </span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Nome do Produto</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Preço Base (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                className="w-full p-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Categoria</label>
                            <select
                                required
                                value={formData.category_id}
                                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                className="w-full p-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none"
                            >
                                <option value="">Selecione uma categoria</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">Descrição</label>
                            <textarea
                                rows="4"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full p-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Modifiers / Extras */}
                <div className="bg-white dark:bg-stone-900 p-4 md:p-8 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">Complementos e Opções</h2>
                        <button
                            type="button"
                            onClick={addModifierGroup}
                            className="text-italian-red hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors text-sm md:text-base"
                        >
                            <Plus size={20} />
                            <span className="hidden md:inline">Adicionar Grupo</span>
                            <span className="md:hidden">Add</span>
                        </button>
                    </div>

                    {formData.modifiers.length === 0 && (
                        <p className="text-stone-500 text-center py-8 italic">Nenhum complemento adicionado (ex: Tamanho, Adicionais, Molhos)</p>
                    )}

                    {formData.modifiers.map((group, groupIndex) => (
                        <div key={groupIndex} className="border border-stone-200 dark:border-stone-700 rounded-xl p-4 md:p-6 bg-stone-50 dark:bg-stone-800/30">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                                    <input
                                        type="text"
                                        placeholder="Título (ex: Escolha o Tamanho)"
                                        value={group.title}
                                        onChange={e => updateModifierGroup(groupIndex, 'title', e.target.value)}
                                        className="p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 w-full"
                                    />
                                    <select
                                        value={group.type}
                                        onChange={e => updateModifierGroup(groupIndex, 'type', e.target.value)}
                                        className="p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 w-full"
                                    >
                                        <option value="radio">Seleção Única (Radio)</option>
                                        <option value="checkbox">Múltipla Escolha (Checkbox)</option>
                                    </select>

                                    {/* Limits for Checkbox */}
                                    {group.type === 'checkbox' && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                value={group.min}
                                                onChange={e => updateModifierGroup(groupIndex, 'min', parseInt(e.target.value))}
                                                className="w-full p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800"
                                                title="Mínimo de opções"
                                            />
                                            <span className="text-stone-500">-</span>
                                            <input
                                                type="number"
                                                placeholder="Max"
                                                value={group.max}
                                                onChange={e => updateModifierGroup(groupIndex, 'max', parseInt(e.target.value))}
                                                className="w-full p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800"
                                                title="Máximo de opções"
                                            />
                                        </div>
                                    )}

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={group.required}
                                            onChange={e => updateModifierGroup(groupIndex, 'required', e.target.checked)}
                                            className="w-5 h-5 text-italian-red rounded focus:ring-italian-red"
                                        />
                                        <span className="font-medium">Obrigatório</span>
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeModifierGroup(groupIndex)}
                                    className="text-red-500 hover:bg-red-100 p-2 rounded-lg self-end md:self-start"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            {/* Options List */}
                            <div className="space-y-3 pl-0 md:pl-4 border-l-0 md:border-l-2 border-stone-200 dark:border-stone-700">
                                {group.options.map((option, optionIndex) => (
                                    <div key={optionIndex} className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-stone-900/50 p-3 rounded-lg border border-stone-100 dark:border-stone-700">
                                        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                                            <GripVertical size={16} className="text-stone-400 hidden sm:block" />
                                            <input
                                                type="text"
                                                placeholder="Nome da Opção"
                                                value={option.name}
                                                onChange={e => updateOption(groupIndex, optionIndex, 'name', e.target.value)}
                                                className="flex-1 p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 w-full"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <div className="relative w-full sm:w-32">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={option.price}
                                                    onChange={e => updateOption(groupIndex, optionIndex, 'price', parseFloat(e.target.value))}
                                                    className="w-full pl-8 p-2 rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeOption(groupIndex, optionIndex)}
                                                className="text-stone-400 hover:text-red-500 p-1"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => addOption(groupIndex)}
                                    className="text-sm text-blue-600 font-bold hover:underline mt-2 flex items-center gap-1"
                                >
                                    <Plus size={14} /> Adicionar Opção
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading || uploading}
                        className="bg-italian-green hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-green-900/20 disabled:opacity-50"
                    >
                        {loading ? <Loader className="animate-spin" /> : <Save size={20} />}
                        Salvar Produto Completo
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;
