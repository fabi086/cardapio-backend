import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ searchTerm, setSearchTerm, items = [], onProductClick }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setShowDropdown(true);
    };

    const handleItemClick = (item) => {
        onProductClick && onProductClick(item);
        setShowDropdown(false);
        setSearchTerm(''); // Optional: clear search after selection
    };

    return (
        <div className="relative max-w-md mx-auto mb-6 px-4 sm:px-0" ref={dropdownRef}>
            <input
                type="text"
                placeholder="O que você quer comer hoje?"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-6 pr-12 py-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 shadow-lg shadow-stone-200/50 dark:shadow-black/20 focus:ring-2 focus:ring-italian-red focus:border-transparent outline-none transition-all placeholder-stone-400 text-lg text-center"
            />
            {searchTerm ? (
                <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-14 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                    <X size={20} />
                </button>
            ) : null}
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-italian-red" size={24} />

            {/* Dropdown Results */}
            {showDropdown && searchTerm && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 rounded-xl shadow-xl border border-stone-100 dark:border-stone-800 max-h-80 overflow-y-auto z-50">
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className="flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer border-b border-stone-100 dark:border-stone-800 last:border-none transition-colors"
                            >
                                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                                <div className="flex-1 text-left">
                                    <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm">{item.name}</h4>
                                    <span className="text-italian-green font-bold text-xs">R$ {Number(item.price).toFixed(2)}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-stone-500 text-sm">
                            Nenhum produto encontrado.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
