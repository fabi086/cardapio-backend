import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Check, Ban } from 'lucide-react';
import { useCart } from '../context/CartContext';

const ProductDetailsModal = ({ item, isOpen, onClose }) => {
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [selectedModifiers, setSelectedModifiers] = useState({});

    if (!isOpen || !item) return null;

    // Calculate price dynamically (Derived State)
    const modifiersPrice = Object.values(selectedModifiers).reduce((total, selection) => {
        if (Array.isArray(selection)) {
            // Checkbox (multiple)
            return total + selection.reduce((sum, opt) => sum + (Number(opt.price) || 0), 0);
        } else {
            // Radio (single)
            return total + (Number(selection.price) || 0);
        }
    }, 0);

    const unitPrice = (Number(item.price) || 0) + modifiersPrice;
    const finalPrice = unitPrice * quantity;

    const handleModifierChange = (modifierId, option, type, isChecked) => {
        setSelectedModifiers((prev) => {
            const current = prev[modifierId];
            let newState;

            if (type === 'checkbox') {
                const currentList = Array.isArray(current) ? current : [];
                if (isChecked) {
                    newState = { ...prev, [modifierId]: [...currentList, option] };
                } else {
                    newState = {
                        ...prev,
                        [modifierId]: currentList.filter((opt) => opt.name !== option.name),
                    };
                }
            } else {
                // Radio
                newState = { ...prev, [modifierId]: option };
            }
            return newState;
        });
    };

    const handleAddToCart = () => {
        const customizedItem = {
            ...item,
            selectedModifiers,
            finalPrice: unitPrice,
            cartId: `${item.id}-${JSON.stringify(selectedModifiers)}`,
        };
        addToCart(customizedItem, quantity);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header Image */}
                <div className="relative h-48 sm:h-64 shrink-0">
                    <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                    />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
                    >
                        <X size={24} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
                        <h2 className="text-3xl font-display text-white">{item.name}</h2>
                        <p className="text-white/80 line-clamp-2">{item.description}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {item.modifiers?.map((modifier) => (
                        <div key={modifier.id} className="space-y-3">
                            <h3 className="font-bold text-lg text-stone-800 dark:text-stone-100 flex items-center gap-2">
                                {modifier.title}
                                <span className="text-xs font-normal text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full">
                                    {modifier.type === 'checkbox' ? 'Opcional' : 'Obrigatório'}
                                </span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {modifier.options.map((option) => {
                                    const isSelected =
                                        modifier.type === 'checkbox'
                                            ? selectedModifiers[modifier.id]?.some(
                                                (opt) => opt.name === option.name
                                            )
                                            : selectedModifiers[modifier.id]?.name === option.name;

                                    return (
                                        <label
                                            key={option.name}
                                            className={`
                          flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
                          ${isSelected
                                                    ? 'border-italian-red bg-italian-red/5 dark:bg-italian-red/10 ring-1 ring-italian-red'
                                                    : 'border-stone-200 dark:border-stone-700 hover:border-italian-red/50'
                                                }
                        `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`
                            w-5 h-5 rounded-full border flex items-center justify-center
                            ${isSelected
                                                        ? 'bg-italian-red border-italian-red text-white'
                                                        : 'border-stone-400'
                                                    }
                          `}>
                                                    {isSelected && <Check size={12} />}
                                                </div>
                                                <span className="font-medium text-stone-700 dark:text-stone-200">
                                                    {option.name}
                                                </span>
                                            </div>
                                            {option.price > 0 && (
                                                <span className="text-italian-green font-bold text-sm">
                                                    + R$ {option.price.toFixed(2)}
                                                </span>
                                            )}
                                            <input
                                                type={modifier.type}
                                                name={modifier.id}
                                                className="hidden"
                                                checked={!!isSelected}
                                                onChange={(e) =>
                                                    handleModifierChange(
                                                        modifier.id,
                                                        option,
                                                        modifier.type,
                                                        e.target.checked
                                                    )
                                                }
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 shrink-0">
                    {item.paused ? (
                        <div className="w-full bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 py-3 sm:py-4 rounded-xl font-bold text-center text-base sm:text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                            <span>Produto Indisponível</span>
                            <Ban size={20} />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-1">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="p-2 sm:p-3 text-stone-500 hover:text-italian-red transition-colors"
                                >
                                    <Minus size={18} className="sm:w-5 sm:h-5" />
                                </button>
                                <span className="text-lg sm:text-xl font-bold w-6 sm:w-8 text-center">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="p-2 sm:p-3 text-stone-500 hover:text-italian-green transition-colors"
                                >
                                    <Plus size={18} className="sm:w-5 sm:h-5" />
                                </button>
                            </div>

                            <button
                                onClick={handleAddToCart}
                                className="flex-1 bg-italian-green hover:bg-green-700 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg shadow-lg shadow-green-900/20 transition-all flex items-center justify-between px-4 sm:px-6"
                            >
                                <span>Adicionar</span>
                                <span>R$ {finalPrice.toFixed(2)}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductDetailsModal;
