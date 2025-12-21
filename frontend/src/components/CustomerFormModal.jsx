import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, MapPin, Home, Plus, Trash2, Star, ShoppingBag, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CustomerFormModal = ({ customer, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState('info'); // info, addresses, products
    const [formData, setFormData] = useState({
        name: '',
        phone: ''
    });
    const [addresses, setAddresses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [addressForm, setAddressForm] = useState({
        label: 'Casa',
        address: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        cep: '',
        is_default: false
    });

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || ''
            });
            fetchAddresses(customer.id);
            fetchProducts(customer.id);
        }
    }, [customer]);

    const fetchAddresses = async (customerId) => {
        setLoadingAddresses(true);
        try {
            const { data, error } = await supabase
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', customerId)
                .order('is_default', { ascending: false });

            if (error) {
                // Table might not exist yet, use legacy address
                if (customer && customer.address) {
                    setAddresses([{
                        id: 'legacy',
                        label: 'Principal',
                        address: customer.address,
                        street: customer.street,
                        number: customer.number,
                        complement: customer.complement,
                        neighborhood: customer.neighborhood,
                        city: customer.city,
                        state: customer.state,
                        cep: customer.cep,
                        is_default: true
                    }]);
                }
            } else {
                setAddresses(data || []);
            }
        } catch (err) {
            console.error('Error fetching addresses:', err);
        } finally {
            setLoadingAddresses(false);
        }
    };

    const fetchProducts = async (customerId) => {
        setLoadingProducts(true);
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('order_items(product_name, quantity, price)')
                .eq('customer_id', customerId);

            if (error) throw error;

            // Aggregate products
            const productMap = {};
            (orders || []).forEach(order => {
                (order.order_items || []).forEach(item => {
                    if (productMap[item.product_name]) {
                        productMap[item.product_name].quantity += item.quantity;
                        productMap[item.product_name].total += item.price * item.quantity;
                    } else {
                        productMap[item.product_name] = {
                            name: item.product_name,
                            quantity: item.quantity,
                            total: item.price * item.quantity
                        };
                    }
                });
            });

            // Sort by quantity and take top 10
            const sorted = Object.values(productMap)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);

            setProducts(sorted);
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const formatPhone = (val) => {
        let cleaned = val.replace(/\D/g, '');
        // If it's a Brazilian mobile/landline without country code (10 or 11 digits), add 55
        if (cleaned.length === 10 || cleaned.length === 11) {
            cleaned = '55' + cleaned;
        }
        return cleaned;
    };

    const handlePhoneChange = (e) => {
        // Just keep digits for display, but normalization happens on submit or blur if we wanted.
        // For now, let's keep simple digits in state, but normalize on save.
        // Actually, better to just store digits.
        setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            alert('Nome e Telefone são obrigatórios.');
            return;
        }

        setLoading(true);
        try {
            const normalizedPhone = formatPhone(formData.phone);
            await onSave({
                ...formData,
                phone: normalizedPhone
            });
            onClose();
        } catch (error) {
            console.error('Error saving customer:', error);
            alert('Erro ao salvar cliente: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddressFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setAddressForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSaveAddress = async () => {
        if (!addressForm.address && !addressForm.street) {
            alert('Preencha pelo menos o endereço ou rua.');
            return;
        }

        try {
            const fullAddress = addressForm.street
                ? `${addressForm.street}, ${addressForm.number}${addressForm.complement ? ' - ' + addressForm.complement : ''}, ${addressForm.neighborhood}, ${addressForm.city}/${addressForm.state}`
                : addressForm.address;

            const dataToSave = {
                ...addressForm,
                address: fullAddress,
                customer_id: customer.id
            };

            if (editingAddress && editingAddress.id !== 'legacy') {
                // Update existing
                const { error } = await supabase
                    .from('customer_addresses')
                    .update(dataToSave)
                    .eq('id', editingAddress.id);
                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase
                    .from('customer_addresses')
                    .insert([dataToSave]);
                if (error) throw error;
            }

            // If marked as default, unset others
            if (addressForm.is_default) {
                await supabase
                    .from('customer_addresses')
                    .update({ is_default: false })
                    .eq('customer_id', customer.id)
                    .neq('id', editingAddress?.id || '');
            }

            setShowAddressForm(false);
            setEditingAddress(null);
            setAddressForm({
                label: 'Casa',
                address: '',
                street: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: '',
                state: '',
                cep: '',
                is_default: false
            });
            fetchAddresses(customer.id);
        } catch (err) {
            console.error('Error saving address:', err);
            alert('Erro ao salvar endereço: ' + err.message);
        }
    };

    const handleEditAddress = (addr) => {
        setEditingAddress(addr);
        setAddressForm({
            label: addr.label || 'Casa',
            address: addr.address || '',
            street: addr.street || '',
            number: addr.number || '',
            complement: addr.complement || '',
            neighborhood: addr.neighborhood || '',
            city: addr.city || '',
            state: addr.state || '',
            cep: addr.cep || '',
            is_default: addr.is_default || false
        });
        setShowAddressForm(true);
    };

    const handleDeleteAddress = async (addrId) => {
        if (addrId === 'legacy') {
            alert('Este endereço está no cadastro antigo e não pode ser excluído daqui.');
            return;
        }
        if (!confirm('Excluir este endereço?')) return;

        try {
            const { error } = await supabase
                .from('customer_addresses')
                .delete()
                .eq('id', addrId);
            if (error) throw error;
            fetchAddresses(customer.id);
        } catch (err) {
            console.error('Error deleting address:', err);
            alert('Erro ao excluir endereço: ' + err.message);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === id
                ? 'bg-italian-red text-white shadow'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-stone-200 dark:border-stone-700 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-800/50 shrink-0">
                    <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <User size={20} className={customer ? 'text-blue-500' : 'text-green-500'} />
                        {customer ? `${customer.name}` : 'Novo Cliente'}
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                {customer && (
                    <div className="flex gap-2 p-4 border-b border-stone-200 dark:border-stone-800 shrink-0 bg-white dark:bg-stone-900">
                        <TabButton id="info" label="Dados" icon={User} />
                        <TabButton id="addresses" label="Endereços" icon={MapPin} />
                        <TabButton id="products" label="Produtos" icon={Package} />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Info Tab */}
                    {activeTab === 'info' && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nome *</label>
                                    <div className="relative">
                                        <User size={16} className="absolute left-3 top-3 text-stone-400" />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none"
                                            placeholder="Nome do cliente"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Telefone *</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-3 text-stone-400" />
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handlePhoneChange}
                                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm focus:ring-2 focus:ring-italian-red outline-none"
                                            placeholder="DD999999999"
                                        />
                                    </div>
                                    <p className="text-xs text-stone-400 mt-1">Identificador único do cliente</p>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 font-bold text-sm transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2.5 rounded-lg bg-italian-green text-white font-bold text-sm hover:bg-green-700 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? 'Salvando...' : <><Save size={18} /> Salvar</>}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Addresses Tab */}
                    {activeTab === 'addresses' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-stone-800 dark:text-stone-200">Endereços de Entrega</h3>
                                <button
                                    onClick={() => {
                                        setEditingAddress(null);
                                        setAddressForm({
                                            label: 'Casa',
                                            address: '',
                                            street: '',
                                            number: '',
                                            complement: '',
                                            neighborhood: '',
                                            city: '',
                                            state: '',
                                            cep: '',
                                            is_default: false
                                        });
                                        setShowAddressForm(true);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-italian-green text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <Plus size={14} /> Novo Endereço
                                </button>
                            </div>

                            {loadingAddresses ? (
                                <div className="text-center text-stone-400 py-8">Carregando...</div>
                            ) : addresses.length === 0 ? (
                                <div className="text-center text-stone-400 py-8 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-lg">
                                    <MapPin className="mx-auto mb-2 text-stone-300" size={32} />
                                    <p>Nenhum endereço cadastrado</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {addresses.map(addr => (
                                        <div key={addr.id} className="p-4 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-stone-800 dark:text-stone-200">{addr.label}</span>
                                                        {addr.is_default && (
                                                            <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                                                <Star size={10} /> Padrão
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-stone-600 dark:text-stone-400">
                                                        {addr.address}
                                                    </p>
                                                    {addr.cep && (
                                                        <p className="text-xs text-stone-400 mt-1">CEP: {addr.cep}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleEditAddress(addr)}
                                                        className="p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    >
                                                        <MapPin size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAddress(addr.id)}
                                                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Address Form Modal */}
                            {showAddressForm && (
                                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <h4 className="font-bold text-stone-800 dark:text-stone-200 mb-4">
                                        {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Rótulo</label>
                                            <select
                                                name="label"
                                                value={addressForm.label}
                                                onChange={handleAddressFormChange}
                                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm"
                                            >
                                                <option value="Casa">Casa</option>
                                                <option value="Trabalho">Trabalho</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">CEP</label>
                                            <input
                                                type="text"
                                                name="cep"
                                                value={addressForm.cep}
                                                onChange={handleAddressFormChange}
                                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm"
                                                placeholder="00000-000"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Rua</label>
                                            <input
                                                type="text"
                                                name="street"
                                                value={addressForm.street}
                                                onChange={handleAddressFormChange}
                                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm"
                                                placeholder="Rua, Avenida..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Número</label>
                                            <input
                                                type="text"
                                                name="number"
                                                value={addressForm.number}
                                                onChange={handleAddressFormChange}
                                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Complemento</label>
                                            <input
                                                type="text"
                                                name="complement"
                                                value={addressForm.complement}
                                                onChange={handleAddressFormChange}
                                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Bairro</label>
                                            <input
                                                type="text"
                                                name="neighborhood"
                                                value={addressForm.neighborhood}
                                                onChange={handleAddressFormChange}
                                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Cidade</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={addressForm.city}
                                                onChange={handleAddressFormChange}
                                                className="w-full p-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-2 flex items-center gap-2 mt-2">
                                            <input
                                                type="checkbox"
                                                name="is_default"
                                                checked={addressForm.is_default}
                                                onChange={handleAddressFormChange}
                                                className="accent-italian-red"
                                            />
                                            <label className="text-sm text-stone-600 dark:text-stone-400">Endereço padrão</label>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => setShowAddressForm(false)}
                                            className="flex-1 py-2 rounded-lg text-stone-600 hover:bg-stone-100 dark:text-stone-300 font-bold text-sm"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSaveAddress}
                                            className="flex-1 py-2 rounded-lg bg-italian-green text-white font-bold text-sm hover:bg-green-700"
                                        >
                                            Salvar Endereço
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Products Tab */}
                    {activeTab === 'products' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                                <ShoppingBag size={18} /> Produtos Mais Pedidos
                            </h3>

                            {loadingProducts ? (
                                <div className="text-center text-stone-400 py-8">Carregando...</div>
                            ) : products.length === 0 ? (
                                <div className="text-center text-stone-400 py-8 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-lg">
                                    <Package className="mx-auto mb-2 text-stone-300" size={32} />
                                    <p>Nenhum produto comprado ainda</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {products.map((product, idx) => (
                                        <div key={product.name} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    idx === 1 ? 'bg-stone-200 text-stone-600' :
                                                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                                                            'bg-stone-100 text-stone-500'
                                                    }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className="font-medium text-stone-800 dark:text-stone-200">{product.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-italian-green">{product.quantity}x</div>
                                                <div className="text-xs text-stone-400">{formatCurrency(product.total)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerFormModal;
