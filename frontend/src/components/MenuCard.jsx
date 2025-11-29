import React, { useState } from 'react';
import { Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductDetailsModal from './ProductDetailsModal';

const MenuCard = ({ item, onImageClick, onAddClick }) => {
    const { addToCart } = useCart();

    const handleAddClick = () => {
        if (item.modifiers && item.modifiers.length > 0) {
            onAddClick && onAddClick(item);
        } else {
            addToCart(item);
        }
    };

    return (
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group border border-stone-100 dark:border-stone-800 flex flex-col h-full">
            <div className="relative h-48 overflow-hidden shrink-0 cursor-pointer" onClick={() => onImageClick && onImageClick(item.image, item.name)}>
                <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                        className="bg-italian-red hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 font-bold text-sm flex items-center gap-2"
                    >
                        {item.modifiers && item.modifiers.length > 0 ? (
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
