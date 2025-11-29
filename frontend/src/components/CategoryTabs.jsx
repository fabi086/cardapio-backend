import React, { useRef } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const CategoryTabs = ({ categories, activeCategory, onSelectCategory }) => {
    const scrollRef = useRef(null);

    const categoryImages = {
        'Burgers': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80',
        'Pizzas': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=150&q=80',
        'Acompanhamentos': 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=150&q=80',
        'Bebidas': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=150&q=80',
        'Todos': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=150&q=80'
    };

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 200;
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative px-4 sm:px-0 flex justify-center">
            <div className="relative w-full max-w-max group">
                <button
                    onClick={() => scroll('left')}
                    className="absolute -left-4 sm:-left-12 top-1/2 -translate-y-1/2 z-10 bg-white/80 dark:bg-stone-800/80 p-2 rounded-full shadow-md text-stone-600 dark:text-stone-300 hover:text-italian-red transition-all"
                >
                    <ChevronLeft size={24} />
                </button>

                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto pb-6 gap-4 no-scrollbar justify-start sm:justify-center scroll-smooth px-4 sm:px-0"
                >
                    {categories.map((category) => {
                        const isActive = activeCategory === category;
                        const image = categoryImages[category];

                        return (
                            <button
                                key={category}
                                onClick={() => onSelectCategory(category)}
                                className="flex flex-col items-center gap-2 group min-w-[80px] shrink-0"
                            >
                                <div
                                    className={`
                        w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md overflow-hidden border-2
                        ${isActive
                                            ? 'border-italian-red shadow-lg shadow-italian-red/30'
                                            : 'border-white dark:border-stone-700 opacity-80 hover:opacity-100 hover:scale-105'
                                        }
                      `}
                                >
                                    {image ? (
                                        <img src={image} alt={category} className="w-full h-full object-cover" />
                                    ) : (
                                        <Star size={24} className="text-stone-400" />
                                    )}
                                </div>
                                <span
                                    className={`
                        text-xs sm:text-sm font-bold transition-colors
                        ${isActive ? 'text-italian-red' : 'text-stone-600 dark:text-stone-400 group-hover:text-stone-800'}
                      `}
                                >
                                    {category}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => scroll('right')}
                    className="absolute -right-4 sm:-right-12 top-1/2 -translate-y-1/2 z-10 bg-white/80 dark:bg-stone-800/80 p-2 rounded-full shadow-md text-stone-600 dark:text-stone-300 hover:text-italian-red transition-all"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
};

export default CategoryTabs;
