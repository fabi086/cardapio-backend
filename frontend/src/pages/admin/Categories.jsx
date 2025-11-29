import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, Trash2, Save, X, Loader, Upload, Search } from 'lucide-react';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        parent_id: '',
        image_url: '',
        order: 0
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            parent_id: category.parent_id || '',
            image_url: category.image_url || '',
            order: category.order || 0
        });
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingCategory(null);
        setFormData({ name: '', parent_id: '', image_url: '', order: categories.length + 1 });
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza? Isso pode afetar produtos vinculados.')) return;

        try {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Erro ao excluir categoria');
        }
    };

    const handleOrderChange = async (categoryId, newOrder) => {
        // Optimistic update
        const updatedCategories = categories.map(c =>
            c.id === categoryId ? { ...c, order: parseInt(newOrder) } : c
        );
        // Sort immediately for better UX or keep position? 
        // Keeping position is less jarring, but sorting is more accurate.
        // Let's just update state and let user refresh or wait for re-fetch if needed, 
        // but actually sorting in UI is nice.
        updatedCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(updatedCategories);

        try {
            await supabase.from('categories').update({ order: parseInt(newOrder) }).eq('id', categoryId);
        } catch (error) {
            console.error('Error updating order:', error);
            fetchCategories(); // Revert
        }
    };

    const handleImageUpload = async (e) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `cat_${Math.random()}.${fileExt}`;
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const dataToSave = {
                name: formData.name,
                parent_id: formData.parent_id || null,
                image_url: formData.image_url,
                order: parseInt(formData.order)
            };

            if (editingCategory) {
                const { error } = await supabase
                    .from('categories')
                    .update(dataToSave)
                    .eq('id', editingCategory.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('categories')
                    .insert([dataToSave]);
                if (error) throw error;
            }

            setIsFormOpen(false);
            fetchCategories();
        } catch (error) {
            console.error('Error saving category:', error);
            alert('Erro ao salvar categoria');
        } finally {
            setLoading(false);
        }
    };

    // Helper to get parent name
    const getParentName = (parentId) => {
        const parent = categories.find(c => c.id === parentId);
        return parent ? parent.name : '-';
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && !categories.length) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100">Categorias</h1>
                <button
                    onClick={handleAddNew}
                    className="bg-italian-green hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    Nova Categoria
                </button>
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">
                                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                            </h2>
                            <button onClick={() => setIsFormOpen(false)} className="text-stone-500 hover:text-stone-800">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Image Upload */}
                            <div className="flex justify-center">
                                <label className="cursor-pointer relative group w-24 h-24 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden border border-stone-300 dark:border-stone-700">
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Upload className="text-stone-400" size={24} />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Upload className="text-white" size={20} />
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>
                            {uploading && <p className="text-center text-xs text-stone-500">Enviando imagem...</p>}

                            <div>
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Nome</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Categoria Pai (Opcional)</label>
                                <select
                                    value={formData.parent_id}
                                    onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                                >
                                    <option value="">Nenhuma (Categoria Principal)</option>
                                    {categories
                                        .filter(c => c.id !== editingCategory?.id)
                                        .map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Ordem</label>
                                <input
                                    type="number"
                                    value={formData.order}
                                    onChange={e => setFormData({ ...formData, order: e.target.value })}
                                    className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || uploading}
                                className="w-full bg-italian-red hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
                            >
                                {loading ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                                Salvar
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-stone-200 dark:border-stone-800">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar categorias..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-italian-red"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-bold text-sm uppercase">
                            <tr>
                                <th className="px-6 py-4 w-20">Ordem</th>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Pai</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                            {filteredCategories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            value={cat.order || 0}
                                            onChange={(e) => handleOrderChange(cat.id, e.target.value)}
                                            className="w-16 p-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-center text-sm"
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-stone-800 dark:text-stone-200 flex items-center gap-3">
                                        {cat.image_url && (
                                            <img src={cat.image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                        )}
                                        {cat.name}
                                    </td>
                                    <td className="px-6 py-4 text-stone-600 dark:text-stone-400">
                                        {getParentName(cat.parent_id)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(cat)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(cat.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Categories;
