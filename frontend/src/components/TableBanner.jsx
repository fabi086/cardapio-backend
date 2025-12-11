import React from 'react';
import { useCart } from '../context/CartContext';
import { Utensils } from 'lucide-react';

const TableBanner = () => {
    const { tableNumber } = useCart();

    if (!tableNumber) return null;

    return (
        <div className="bg-italian-green text-white px-4 py-2 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300 relative z-50">
            <Utensils size={18} className="animate-pulse" />
            <span className="font-bold text-sm md:text-base">
                Você está na <span className="underline decoration-2 underline-offset-2">Mesa {tableNumber}</span>
            </span>
        </div>
    );
};

export default TableBanner;
