import React from 'react';
import { Star, Flame, Leaf, Sparkles } from 'lucide-react';

const FilterTags = () => {
    const filters = [
        { label: 'Mais Pedidos', icon: Star },
        { label: 'Novidades', icon: Sparkles },
        { label: 'Vegetarianos', icon: Leaf },
        { label: 'Picantes', icon: Flame },
    ];

    return (
        <div className="flex flex-wrap justify-center gap-3 mb-8 px-4 sm:px-0">
            {filters.map((filter) => (
                <button
                    key={filter.label}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full text-sm font-bold text-stone-600 dark:text-stone-300 hover:border-italian-red hover:text-italian-red transition-colors shadow-sm whitespace-nowrap"
                >
                    <filter.icon size={16} />
                    <span>{filter.label}</span>
                </button>
            ))}
        </div>
    );
};

export default FilterTags;
