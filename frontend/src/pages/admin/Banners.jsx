import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, Upload, Loader, Pencil } from 'lucide-react';

const Banners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const { data, error } = await supabase
                .from('banners')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;
            setBanners(data);
        } catch (error) {
            console.error('Error fetching banners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `banner_${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('menu-images').getPublicUrl(filePath);

            // Create banner record immediately after upload
            const { error: dbError } = await supabase.from('banners').insert([{
                image_url: data.publicUrl,
                title: 'Novo Banner',
                active: true,
                order: banners.length + 1
            }]);

            if (dbError) throw dbError;
            fetchBanners();

        } catch (error) {
            console.error('Error uploading banner:', error);
            alert('Erro ao fazer upload do banner');
        } finally {
            setUploading(false);
        }
    };

    const handleImageUpdate = async (e, bannerId) => {
        try {
            setUploading(true);
            const file = e.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `banner_${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('menu-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('menu-images').getPublicUrl(filePath);

            await handleUpdate(bannerId, 'image_url', data.publicUrl);

        } catch (error) {
            console.error('Error updating banner image:', error);
            alert('Erro ao atualizar imagem do banner');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza?')) return;
        try {
            await supabase.from('banners').delete().eq('id', id);
            setBanners(banners.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error deleting banner:', error);
        }
    };

    const handleUpdate = async (id, field, value) => {
        // Optimistic update
        setBanners(banners.map(b => b.id === id ? { ...b, [field]: value } : b));

        try {
            await supabase.from('banners').update({ [field]: value }).eq('id', id);
        } catch (error) {
            console.error('Error updating banner:', error);
            fetchBanners(); // Revert on error
        }
    };

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100">Banners Promocionais</h1>
                <label className="bg-italian-green hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer">
                    {uploading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />}
                    Adicionar Banner
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map((banner) => (
                    <div key={banner.id} className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden group">
                        <div className="relative aspect-video">
                            <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <label className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 cursor-pointer shadow-lg">
                                    <Pencil size={16} />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpdate(e, banner.id)}
                                        disabled={uploading}
                                    />
                                </label>
                                <button
                                    onClick={() => handleDelete(banner.id)}
                                    className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Título</label>
                                <input
                                    type="text"
                                    value={banner.title || ''}
                                    onChange={(e) => handleUpdate(banner.id, 'title', e.target.value)}
                                    className="w-full p-2 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Link (Opcional)</label>
                                <input
                                    type="text"
                                    value={banner.link || ''}
                                    onChange={(e) => handleUpdate(banner.id, 'link', e.target.value)}
                                    className="w-full p-2 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={banner.active}
                                        onChange={(e) => handleUpdate(banner.id, 'active', e.target.checked)}
                                        className="rounded text-italian-red focus:ring-italian-red"
                                    />
                                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Ativo</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-stone-500 uppercase">Ordem:</span>
                                    <input
                                        type="number"
                                        value={banner.order}
                                        onChange={(e) => handleUpdate(banner.id, 'order', parseInt(e.target.value))}
                                        className="w-16 p-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm text-center"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Banners;
