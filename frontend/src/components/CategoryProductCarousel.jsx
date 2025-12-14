import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MenuCard from './MenuCard';

const CategoryProductCarousel = ({
    category,
    products = [],
    productsPerCarousel = 6,
    onImageClick,
    onAddClick
}) => {
    const carouselRefs = useRef([]);

    if (!products || products.length === 0) return null;

    // Split products into chunks based on productsPerCarousel
    const chunks = [];
    for (let i = 0; i < products.length; i += productsPerCarousel) {
        chunks.push(products.slice(i, i + productsPerCarousel));
    }

    const scroll = (chunkIndex, direction) => {
        const container = carouselRefs.current[chunkIndex];
        if (container) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="mb-8">
            {chunks.map((chunk, chunkIndex) => (
                <div key={`${category.id || category.name}-${chunkIndex}`} className="mb-6">
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl md:text-2xl font-display text-stone-800 dark:text-stone-100 flex items-center gap-2">
                            {category.icon && <span>{category.icon}</span>}
                            {category.name}
                            {chunks.length > 1 && (
                                <span className="text-sm font-normal text-stone-400 ml-2">
                                    ({chunkIndex + 1}/{chunks.length})
                                </span>
                            )}
                        </h2>

                        {/* Navigation Arrows - Desktop Only */}
                        <div className="hidden md:flex items-center gap-2">
                            <button
                                onClick={() => scroll(chunkIndex, 'left')}
                                className="p-2 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
                                aria-label="Scroll left"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => scroll(chunkIndex, 'right')}
                                className="p-2 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
                                aria-label="Scroll right"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Carousel Container */}
                    <div
                        ref={el => carouselRefs.current[chunkIndex] = el}
                        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {chunk.map((item) => (
                            <div
                                key={item.id}
                                className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start"
                            >
                                <MenuCard
                                    item={item}
                                    onImageClick={onImageClick}
                                    onAddClick={onAddClick}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CategoryProductCarousel;
