import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Search, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ClientGroupManager = ({ groups, onGroupCreated, onRefresh }) => {
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Fetch members when group selected
    useEffect(() => {
        if (selectedGroup) {
            loadMembers(selectedGroup.id);
        } else {
            setMembers([]);
        }
    }, [selectedGroup]);

    const loadMembers = async (groupId) => {
        setLoadingMembers(true);
        try {
            const { data } = await supabase.from('client_group_members')
                .select('customer_id, customers(id, name, phone)')
                .eq('group_id', groupId);

            setMembers(data.map(d => d.customers));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        try {
            // Using direct supabase for speed or via API if preferred. 
            // The plan said we created Backend API, so let's stick to API for writes if possible, 
            // but here I am mixing. Let's use fetch to backend to test API integration.
            const res = await fetch('/api/marketing/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName })
            });
            if (res.ok) {
                onRefresh();
                setIsCreating(false);
                setNewGroupName('');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const searchCustomers = async (term = '') => {
        let query = supabase
            .from('customers')
            .select('id, name, phone')
            .limit(10);

        if (term && term.trim()) {
            query = query.ilike('name', `%${term}%`);
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (error) console.error('Error fetching customers:', error);
        setSearchResults(data || []);
    };

    // Load initial suggestions
    useEffect(() => {
        searchCustomers('');
    }, []);

    const addMember = async (customerId) => {
        if (!selectedGroup) return;
        await fetch(`/api/marketing/groups/${selectedGroup.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId })
        });
        loadMembers(selectedGroup.id);
        setCustomerSearch('');
        setSearchResults([]);
    };

    const removeMember = async (customerId) => {
        if (!selectedGroup) return;
        await fetch(`/api/marketing/groups/${selectedGroup.id}/members/${customerId}`, {
            method: 'DELETE'
        });
        loadMembers(selectedGroup.id);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Groups List */}
            <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col">
                <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
                    <h3 className="font-bold text-stone-800 dark:text-white flex items-center gap-2">
                        <Users size={20} /> Grupos
                    </h3>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-italian-red"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {isCreating && (
                    <form onSubmit={handleCreateGroup} className="p-2 border-b border-stone-200 dark:border-stone-800">
                        <input
                            autoFocus
                            type="text"
                            className="w-full p-2 text-sm rounded-lg border border-stone-200 dark:border-stone-700 dark:bg-stone-800"
                            placeholder="Nome do grupo..."
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                        />
                    </form>
                )}

                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {groups.map(group => (
                        <button
                            key={group.id}
                            onClick={() => setSelectedGroup(group)}
                            className={`w-full text-left p-3 rounded-lg transition-colors flex justify-between items-center ${selectedGroup?.id === group.id
                                ? 'bg-red-50 dark:bg-red-900/20 text-italian-red border border-red-100 dark:border-red-900/30'
                                : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
                                }`}
                        >
                            <span className="font-medium">{group.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Selected Group Details */}
            <div className="col-span-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col">
                {selectedGroup ? (
                    <>
                        <div className="p-4 border-b border-stone-200 dark:border-stone-800">
                            <h3 className="font-bold text-lg text-stone-800 dark:text-white">{selectedGroup.name}</h3>
                            <p className="text-sm text-stone-500 dark:text-stone-400">Gerenciar membros do grupo</p>
                        </div>

                        <div className="p-4 border-b border-stone-200 dark:border-stone-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-stone-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente para adicionar..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 dark:bg-stone-800"
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        searchCustomers(e.target.value);
                                    }}
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                        {searchResults.map(customer => (
                                            <button
                                                key={customer.id}
                                                onClick={() => addMember(customer.id)}
                                                className="w-full text-left p-2 hover:bg-stone-100 dark:hover:bg-stone-700 flex justify-between items-center px-4"
                                            >
                                                <span className="text-sm font-medium">{customer.name}</span>
                                                <span className="text-xs text-stone-500">{customer.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingMembers ? (
                                <div className="p-4 text-center">Carregando...</div>
                            ) : members.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-stone-500">
                                    <UserPlus size={48} className="mb-2 opacity-20" />
                                    <p>Este grupo está vazio.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {members.map(member => (
                                        <div key={member.id} className="flex justify-between items-center p-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-100 dark:border-stone-700">
                                            <div>
                                                <p className="font-medium text-sm">{member.name}</p>
                                                <p className="text-xs text-stone-500">{member.phone}</p>
                                            </div>
                                            <button
                                                onClick={() => removeMember(member.id)}
                                                className="text-stone-400 hover:text-red-500 p-1"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-stone-500">
                        <Users size={48} className="mb-4 opacity-20" />
                        <p>Selecione um grupo para gerenciar</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientGroupManager;
