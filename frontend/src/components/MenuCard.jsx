import React, { useState } from 'react';
import { Plus, ShoppingBag, Ban } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductDetailsModal from './ProductDetailsModal';

const MenuCard = ({ item, onImageClick, onAddClick }) => {
    const { addToCart } = useCart();

    const handleAddClick = () => {
        if (item.paused) return;

        if (item.modifiers && item.modifiers.length > 0) {
            onAddClick && onAddClick(item);
        } else {
            addToCart(item);
        }
    };

    return (
        <div className={`bg-white dark:bg-stone-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group border border-stone-100 dark:border-stone-800 flex flex-col h-full ${item.paused ? 'opacity-75 grayscale-[0.5]' : ''}`}>
            <div className="relative h-48 overflow-hidden shrink-0 cursor-pointer" onClick={() => onImageClick && onImageClick(item.image, item.name)}>
                <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {item.paused && (
                    <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                        <span className="text-white font-bold text-sm md:text-base px-3 py-1 border-2 border-white/80 rounded bg-black/30 backdrop-blur-sm">
                            INDISPONÍVEL
                        </span>
                    </div>
                )}
            </div>

            <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-display text-xl text-stone-800 dark:text-stone-100 group-hover:text-italian-red transition-colors">
                        {item.name}
                    </h3>
                    <span className="bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-bold px-2 py-1 rounded-full">
                        {item.category}
                    </span>
                </div>

                <p className="text-stone-500 dark:text-stone-400 text-sm mb-4 line-clamp-2 flex-1">
                    {item.description}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-stone-100 dark:border-stone-800">
                    <span className="text-italian-green font-bold text-lg">
                        R$ {Number(item.price).toFixed(2)}
                    </span>
                    <button
                        onClick={handleAddClick}
                        disabled={item.paused}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${item.paused
                                ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-not-allowed'
                                : 'bg-italian-red hover:bg-red-700 text-white shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95'
                            }`}
                    >
                        {item.paused ? (
                            <>
                                <span>Pausado</span>
                                <Ban size={18} />
                            </>
                        ) : item.modifiers && item.modifiers.length > 0 ? (
                            <>
                                <span>Personalizar</span>
                                <Plus size={18} />
                            </>
                        ) : (
                            <>
                                <span>Adicionar</span>
                                <ShoppingBag size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MenuCard;
