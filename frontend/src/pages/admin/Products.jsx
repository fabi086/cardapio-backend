import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Categories
            const { data: cats, error: catError } = await supabase
                .from('categories')
                .select('*')
                .order('order', { ascending: true });

            if (catError) throw catError;
            setCategories(cats);

            // Initialize all categories as expanded
            const initialExpanded = {};
            cats.forEach(c => initialExpanded[c.id] = true);
            setExpandedCategories(initialExpanded);

            // Fetch Products
            const { data: prods, error: prodError } = await supabase
                .from('products')
                .select('*, categories(name)')
                .order('order', { ascending: true }); // Order by product order

            if (prodError) throw prodError;
            setProducts(prods);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;

        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            setProducts(products.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Erro ao excluir produto');
        }
    };

    const handleOrderChange = async (productId, newOrder) => {
        // Optimistic update
        const updatedProducts = products.map(p =>
            p.id === productId ? { ...p, order: parseInt(newOrder) } : p
        );
        setProducts(updatedProducts);

        try {
            await supabase.from('products').update({ order: parseInt(newOrder) }).eq('id', productId);
        } catch (error) {
            console.error('Error updating order:', error);
            fetchData(); // Revert on error
        }
    };

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group products by category
    const groupedProducts = categories.map(category => {
        const categoryProducts = filteredProducts.filter(p => p.category_id === category.id);
        // Sort by order
        categoryProducts.sort((a, b) => (a.order || 0) - (b.order || 0));
        return {
            ...category,
            products: categoryProducts
        };
    }).filter(group => group.products.length > 0 || searchTerm === ''); // Show empty categories only if not searching

    if (loading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100">Produtos</h1>
                <Link
                    to="/admin/products/new"
                    className="bg-italian-green hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                >
                    <Plus size={20} />
                    Novo Produto
                </Link>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-stone-200 dark:border-stone-800">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar produtos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-italian-red"
                        />
                    </div>
                </div>

                {/* Grouped List */}
                <div className="divide-y divide-stone-200 dark:divide-stone-800">
                    {groupedProducts.map(group => (
                        <div key={group.id} className="bg-white dark:bg-stone-900">
                            {/* Category Header */}
                            <div
                                onClick={() => toggleCategory(group.id)}
                                className="px-6 py-4 bg-stone-50 dark:bg-stone-800/50 flex items-center justify-between cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedCategories[group.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    <h3 className="font-bold text-lg text-stone-800 dark:text-stone-200">{group.name}</h3>
                                    <span className="text-sm text-stone-500">({group.products.length} produtos)</span>
                                </div>
                            </div>

                            {/* Products Table for this Category */}
                            {expandedCategories[group.id] && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-white dark:bg-stone-900 text-stone-500 dark:text-stone-400 font-bold text-xs uppercase border-b border-stone-100 dark:border-stone-800">
                                            <tr>
                                                <th className="px-6 py-3 w-20">Ordem</th>
                                                <th className="px-6 py-3">Imagem</th>
                                                <th className="px-6 py-3">Nome</th>
                                                <th className="px-6 py-3">Preço</th>
                                                <th className="px-6 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                            {group.products.map((product) => (
                                                <tr key={product.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <input
                                                            type="number"
                                                            value={product.order || 0}
                                                            onChange={(e) => handleOrderChange(product.id, e.target.value)}
                                                            className="w-16 p-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-center text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-200">
                                                            <img
                                                                src={product.image_url}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 font-medium text-stone-800 dark:text-stone-200">
                                                        {product.name}
                                                    </td>
                                                    <td className="px-6 py-3 text-stone-600 dark:text-stone-400">
                                                        R$ {product.price.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Link
                                                                to={`/admin/products/${product.id}`}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            >
                                                                <Pencil size={16} />
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(product.id)}
                                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {group.products.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="px-6 py-8 text-center text-stone-500 italic">
                                                        Nenhum produto nesta categoria.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Products;
