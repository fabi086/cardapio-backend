import React, { useState, useEffect, useMemo } from 'react';
import { useBusinessSettings } from '../hooks/useBusinessSettings';
import Header from '../components/Header';
import CategoryTabs from '../components/CategoryTabs';
import MenuCard from '../components/MenuCard';
import { getCategories, getMenuItems } from '../api';

import CartModal from '../components/CartModal';
import BannerCarousel from '../components/BannerCarousel';
import SearchBar from '../components/SearchBar';
import Footer from '../components/Footer';
import FilterTags from '../components/FilterTags';
import ImagePreviewModal from '../components/ImagePreviewModal';
import ProductDetailsModal from '../components/ProductDetailsModal';
import FloatingCart from '../components/FloatingCart';
import CategoryProductCarousel from '../components/CategoryProductCarousel';
import { Search, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const { settings } = useBusinessSettings();
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [menuItems, setMenuItems] = useState([]);
    const [allItems, setAllItems] = useState([]); // For carousel mode
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [orderIdSearch, setOrderIdSearch] = useState('');
    const navigate = useNavigate();

    const handleOrderSearch = (e) => {
        e.preventDefault();
        if (orderIdSearch.trim()) {
            navigate(`/order/${orderIdSearch.trim()}`);
        }
    };

    // Group products by category for carousel mode
    const groupedProducts = useMemo(() => {
        const grouped = {};
        allItems.forEach(item => {
            const cat = item.category || 'Outros';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });
        return grouped;
    }, [allItems]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const cats = await getCategories();
                setCategories(cats);

                // Fetch all items for carousel mode
                const items = await getMenuItems('Todos');
                setAllItems(items);
                setMenuItems(items);
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const items = await getMenuItems(activeCategory);
                setMenuItems(items);
            } catch (error) {
                console.error("Error fetching items:", error);
            } finally {
                setLoading(false);
            }
        };

        if (categories.length > 0 && settings.display_mode !== 'carousel') {
            fetchItems();
        }
    }, [activeCategory, settings.display_mode]);

    const isCarouselMode = settings.display_mode === 'carousel';
    const productsPerCarousel = settings.products_per_carousel || 6;

    return (
        <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-800 dark:text-stone-100 font-sans transition-colors duration-300 flex flex-col">
            <Header />
            <CartModal />
            <FloatingCart />

            <ImagePreviewModal
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                imageUrl={selectedImage?.url}
                altText={selectedImage?.alt}
            />

            {selectedProduct && (
                <ProductDetailsModal
                    item={selectedProduct}
                    isOpen={!!selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            )}

            <main className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">

                {/* 1. Banner */}
                <BannerCarousel />

                {/* 2. Categories - Shown in grid mode only */}
                {!isCarouselMode && (
                    <div className="mb-6">
                        <CategoryTabs
                            categories={categories}
                            activeCategory={activeCategory}
                            onSelectCategory={setActiveCategory}
                        />
                    </div>
                )}

                {/* 3. Search Bar */}
                <SearchBar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    items={isCarouselMode ? allItems : menuItems}
                    onProductClick={setSelectedProduct}
                />

                {/* 4. Filter Tags */}
                <FilterTags />

                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-display text-italian-red mb-2" style={{ color: settings.primary_color }}>
                        {isCarouselMode ? 'Nosso Cardápio' : 'Destaques do Menu'}
                    </h1>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-italian-red" style={{ borderColor: settings.primary_color, borderTopColor: 'transparent' }}></div>
                    </div>
                ) : isCarouselMode ? (
                    /* Carousel Mode - Products grouped by category */
                    <div className="space-y-8">
                        {categories.filter(cat => cat.name !== 'Todos' && groupedProducts[cat.name]?.length > 0).map((category) => (
                            <CategoryProductCarousel
                                key={category.id}
                                category={category}
                                products={groupedProducts[category.name] || []}
                                productsPerCarousel={productsPerCarousel}
                                onImageClick={(url, alt) => setSelectedImage({ url, alt })}
                                onAddClick={setSelectedProduct}
                            />
                        ))}
                    </div>
                ) : (
                    /* Grid Mode - Traditional layout */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {menuItems.map((item) => (
                            <MenuCard
                                key={item.id}
                                item={item}
                                onImageClick={(url, alt) => setSelectedImage({ url, alt })}
                                onAddClick={setSelectedProduct}
                            />
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}

export default Home;

