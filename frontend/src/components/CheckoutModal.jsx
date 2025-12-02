import React, { useState, useEffect } from 'react';
import { X, MapPin, User, CreditCard, Banknote, Phone, Loader, MapPinned, Home, Search } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useViaCep } from '../hooks/useViaCep';


const CheckoutModal = ({ isOpen, onClose }) => {
    const { cartTotal, submitOrder } = useCart();
    const navigate = useNavigate();
    const { searchCep, formatCep, isValidCep, loading: loadingCep, error: cepError, clearError } = useViaCep();

    const [loading, setLoading] = useState(false);
    const [searchingCustomer, setSearchingCustomer] = useState(false);
    const [addressMode, setAddressMode] = useState('cep'); // 'cep' ou 'manual'
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [loadingFee, setLoadingFee] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        // Campos de endereço estruturado
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        // Campo de endereço completo (para modo manual e compatibilidade)
        address: '',
        paymentMethod: 'pix',
        changeFor: ''
    });
    const [customerId, setCustomerId] = useState(null);
    const [storeSettings, setStoreSettings] = useState(null);


    useEffect(() => {
        if (isOpen) {
            const savedData = localStorage.getItem('customerData');
            if (savedData) {
                setFormData(prev => ({ ...prev, ...JSON.parse(savedData) }));
            }
            fetchStoreSettings();
        }
    }, [isOpen]);

    const fetchStoreSettings = async () => {
        try {
            const { data } = await supabase.from('business_settings').select('whatsapp, restaurant_name').single();
            if (data) setStoreSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const calculateDeliveryFee = async (cep) => {
        if (!cep || cep.replace(/\D/g, '').length < 8) {
            setDeliveryFee(0);
            return;
        }

        setLoadingFee(true);
        try {
            const { data: zones, error } = await supabase
                .from('delivery_zones')
                .select('*')
                .eq('active', true);

            if (error || !zones || zones.length === 0) {
                setDeliveryFee(0);
                setLoadingFee(false);
                return;
            }

            const cleanCep = parseInt(cep.replace(/\D/g, ''));

            for (const zone of zones) {
                const start = parseInt(zone.cep_start.replace(/\D/g, ''));
                const end = parseInt(zone.cep_end.replace(/\D/g, ''));

                if (cleanCep >= start && cleanCep <= end) {
                    // Verificar CEPs excluídos
                    if (zone.excluded_ceps) {
                        const excluded = zone.excluded_ceps.split(',')
                            .map(c => parseInt(c.trim().replace(/\D/g, '')));
                        if (excluded.includes(cleanCep)) {
                            continue;
                        }
                    }

                    setDeliveryFee(zone.fee);
                    setLoadingFee(false);
                    return;
                }
            }

            setDeliveryFee(0);
        } catch (error) {
            console.error('Error calculating delivery fee:', error);
            setDeliveryFee(0);
        } finally {
            setLoadingFee(false);
        }
    };

    // Calcular frete automaticamente quando CEP mudar (modo CEP)
    useEffect(() => {
        if (addressMode === 'cep' && formData.cep.length === 9) {
            calculateDeliveryFee(formData.cep);
        } else {
            setDeliveryFee(0);
        }
    }, [formData.cep, addressMode]);

    const formatWhatsAppMessage = (order, customer, settings) => {
        const itemsList = order.items.map(item =>
            `• ${item.quantity}x ${item.product_name || item.name}${item.observation ? `\n  Obs: ${item.observation}` : ''}`
        ).join('\n');

        const total = order.total.toFixed(2);
        const fee = order.deliveryFee ? `\n🚚 *Taxa de Entrega:* R$ ${order.deliveryFee.toFixed(2)}` : '';

        let paymentInfo = '';
        if (order.paymentMethod === 'pix') paymentInfo = 'PIX';
        else if (order.paymentMethod === 'card') paymentInfo = 'Cartão';
        else if (order.paymentMethod === 'cash') paymentInfo = `Dinheiro${order.changeFor ? ` (Troco para ${order.changeFor})` : ''}`;

        return `🔔 *NOVO PEDIDO #${order.order_number || order.id.slice(0, 8)}*
--------------------------------
👤 *Cliente:* ${customer.name}
📞 *Telefone:* ${customer.phone}
📍 *Endereço:* ${customer.address}
--------------------------------
🛒 *PEDIDO:*
${itemsList}
--------------------------------
💰 *Pagamento:* ${paymentInfo}${fee}
💲 *TOTAL: R$ ${total}*
--------------------------------
_Pedido enviado via Cardápio Digital_`;
    };

    if (!isOpen) return null;

    const handlePhoneBlur = async () => {
        if (formData.phone.length < 8) return;

        setSearchingCustomer(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('phone', formData.phone)
                .single();

            if (data) {
                setFormData(prev => ({
                    ...prev,
                    name: data.name,
                    address: data.address || prev.address
                }));
                setCustomerId(data.id);
            }
        } catch (error) {
            // Customer not found, that's fine
        } finally {
            setSearchingCustomer(false);
        }
    };

    const handleCepSearch = async () => {
        clearError();
        const result = await searchCep(formData.cep);

        if (result) {
            setFormData(prev => ({
                ...prev,
                cep: result.cep,
                street: result.street,
                neighborhood: result.neighborhood,
                city: result.city,
                state: result.state
            }));
        }
    };

    const handleCepChange = (e) => {
        const formatted = formatCep(e.target.value);
        setFormData(prev => ({ ...prev, cep: formatted }));
        clearError();
    };

    // Monta endereço completo a partir dos campos estruturados
    const buildFullAddress = () => {
        if (addressMode === 'manual') {
            return formData.address;
        }

        const parts = [];
        if (formData.street) parts.push(formData.street);
        if (formData.number) parts.push(formData.number);
        if (formData.neighborhood) parts.push(`- ${formData.neighborhood}`);
        if (formData.city && formData.state) parts.push(`${formData.city}/${formData.state}`);
        if (formData.complement) parts.push(`(${formData.complement})`);

        return parts.join(', ');
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Monta endereço completo
            const fullAddress = buildFullAddress();

            // 1. Create or Update Customer
            let currentCustomerId = customerId;
            const customerData = {
                phone: formData.phone,
                name: formData.name,
                address: fullAddress,
                // Salvar campos estruturados também
                cep: formData.cep || null,
                street: formData.street || null,
                number: formData.number || null,
                complement: formData.complement || null,
                neighborhood: formData.neighborhood || null,
                city: formData.city || null,
                state: formData.state || null,
                updated_at: new Date()
            };

            if (currentCustomerId) {
                await supabase
                    .from('customers')
                    .update(customerData)
                    .eq('id', currentCustomerId);
            } else {
                // Check again if exists to avoid duplicates
                const { data: existing } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('phone', formData.phone)
                    .single();

                if (existing) {
                    currentCustomerId = existing.id;
                    await supabase
                        .from('customers')
                        .update(customerData)
                        .eq('id', currentCustomerId);
                } else {
                    const { data: newCustomer, error } = await supabase
                        .from('customers')
                        .insert([customerData])
                        .select()
                        .single();

                    if (error) throw error;
                    currentCustomerId = newCustomer.id;
                }
            }

            // Save to localStorage
            localStorage.setItem('customerData', JSON.stringify({
                name: formData.name,
                phone: formData.phone,
                address: fullAddress
            }));

            // 2. Submit Order with customer_id
            const order = await submitOrder({
                ...formData,
                address: fullAddress,
                deliveryFee,
                cep: formData.cep,
                customer_id: currentCustomerId
            });


            // Save last order ID for quick tracking
            localStorage.setItem('lastOrderId', order.id);

            // 3. Redirect to WhatsApp
            if (storeSettings?.whatsapp) {
                const message = formatWhatsAppMessage(
                    { ...order, items: order.items || [], paymentMethod: formData.paymentMethod, changeFor: formData.changeFor, deliveryFee },
                    formData,
                    storeSettings
                );

                // Remove non-digits from phone number
                const cleanPhone = storeSettings.whatsapp.replace(/\D/g, '');
                const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

                window.open(whatsappUrl, '_blank');
            } else {
                console.warn('WhatsApp number not configured in settings');
                alert('Pedido realizado! O número do WhatsApp da loja não está configurado, mas seu pedido foi salvo.');
            }

            onClose();
            navigate(`/order/${order.id}`);
        } catch (error) {
            console.error('Error submitting order:', error);
            alert('Erro ao enviar pedido. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const finalTotal = cartTotal + (deliveryFee || 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/50">
                    <h2 className="text-xl font-display text-stone-800 dark:text-stone-100">
                        Finalizar Pedido
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors text-stone-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-600 dark:text-stone-400 flex items-center gap-2">
                            <Phone size={16} /> Seu Telefone
                        </label>
                        <div className="relative">
                            <input
                                required
                                type="tel"
                                placeholder="Ex: (11) 99999-9999"
                                className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                onBlur={handlePhoneBlur}
                            />
                            {searchingCustomer && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader className="animate-spin text-italian-red" size={16} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-600 dark:text-stone-400 flex items-center gap-2">
                            <User size={16} /> Seu Nome
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Ex: João Silva"
                            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-stone-600 dark:text-stone-400 flex items-center gap-2">
                            <MapPin size={16} /> Endereço de Entrega
                        </label>

                        {/* Toggle entre modos */}
                        <div className="flex gap-2 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setAddressMode('cep')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${addressMode === 'cep'
                                    ? 'bg-white dark:bg-stone-700 text-italian-red shadow-sm'
                                    : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                                    }`}
                            >
                                <MapPinned size={16} />
                                Buscar por CEP
                            </button>
                            <button
                                type="button"
                                onClick={() => setAddressMode('manual')}
                                className={`flex-1 py-2 px-3 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${addressMode === 'manual'
                                    ? 'bg-white dark:bg-stone-700 text-italian-red shadow-sm'
                                    : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                                    }`}
                            >
                                <Home size={16} />
                                Endereço Manual
                            </button>
                        </div>

                        {/* Modo CEP */}
                        {addressMode === 'cep' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                {/* Campo de CEP com busca */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-stone-500 uppercase">CEP</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="00000-000"
                                            maxLength={9}
                                            className="flex-1 p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                                            value={formData.cep}
                                            onChange={handleCepChange}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCepSearch}
                                            disabled={!isValidCep(formData.cep) || loadingCep}
                                            className="px-4 py-3 rounded-xl bg-italian-red text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-all flex items-center gap-2"
                                        >
                                            {loadingCep ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
                                            Buscar
                                        </button>
                                    </div>
                                    {cepError && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            ⚠️ {cepError}
                                        </p>
                                    )}
                                </div>

                                {/* Campos preenchidos automaticamente */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-stone-500 uppercase">Rua</label>
                                        <input
                                            type="text"
                                            placeholder="Nome da rua"
                                            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                                            value={formData.street}
                                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase">Número *</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="123"
                                            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                                            value={formData.number}
                                            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase">Complemento</label>
                                        <input
                                            type="text"
                                            placeholder="Apto 45"
                                            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                                            value={formData.complement}
                                            onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-stone-500 uppercase">Bairro</label>
                                        <input
                                            type="text"
                                            placeholder="Nome do bairro"
                                            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                                            value={formData.neighborhood}
                                            onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase">Cidade</label>
                                        <input
                                            type="text"
                                            placeholder="Cidade"
                                            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-stone-500 uppercase">Estado</label>
                                        <input
                                            type="text"
                                            placeholder="UF"
                                            maxLength={2}
                                            className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all uppercase"
                                            value={formData.state}
                                            onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modo Manual */}
                        {addressMode === 'manual' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <textarea
                                    required
                                    placeholder="Rua, Número, Bairro e Complemento"
                                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-red outline-none transition-all h-24 resize-none"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-600 dark:text-stone-400 flex items-center gap-2">
                            <CreditCard size={16} /> Forma de Pagamento
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentMethod: 'pix' })}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === 'pix'
                                    ? 'border-italian-green bg-italian-green/10 text-italian-green'
                                    : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:border-italian-green/50'
                                    }`}
                            >
                                <span className="font-bold">PIX</span>
                                <span className="text-[10px]">Instantâneo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentMethod: 'card' })}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === 'card'
                                    ? 'border-italian-red bg-italian-red/10 text-italian-red'
                                    : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:border-italian-red/50'
                                    }`}
                            >
                                <CreditCard size={20} />
                                <span className="font-bold">Cartão</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === 'cash'
                                    ? 'border-italian-yellow bg-italian-yellow/10 text-yellow-600'
                                    : 'border-stone-200 dark:border-stone-700 text-stone-500 hover:border-italian-yellow/50'
                                    }`}
                            >
                                <Banknote size={20} />
                                <span className="font-bold">Dinheiro</span>
                            </button>
                        </div>

                        {formData.paymentMethod === 'cash' && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-bold text-stone-600 dark:text-stone-400 flex items-center gap-2 mb-1">
                                    Troco para quanto?
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: 50,00 (Deixe vazio se não precisar)"
                                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 focus:ring-2 focus:ring-italian-yellow outline-none transition-all"
                                    value={formData.changeFor || ''}
                                    onChange={(e) => setFormData({ ...formData, changeFor: e.target.value })}
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-stone-500">Subtotal</span>
                            <span className="font-bold text-stone-700 dark:text-stone-300">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                        {deliveryFee !== null && (
                            <div className="flex justify-between items-center text-sm text-green-600">
                                <span>Taxa de Entrega</span>
                                <span>+ R$ {deliveryFee.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-stone-100 dark:border-stone-800">
                            <span className="text-stone-500 font-bold">Total a pagar</span>
                            <span className="text-xl font-bold text-italian-green">
                                R$ {finalTotal.toFixed(2)}
                            </span>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-italian-green hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-green-900/20 transition-all flex justify-center items-center gap-2 mt-4"
                        >
                            {loading ? <Loader className="animate-spin" /> : 'Confirmar Pedido'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CheckoutModal;
