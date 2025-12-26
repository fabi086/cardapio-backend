import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Search, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ClientGroupManager = ({ groups, onGroupCreated, onRefresh }) => {
    const [viewMode, setViewMode] = useState('groups'); // 'groups' or 'customers'
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Customer Selection Mode
    const [allCustomers, setAllCustomers] = useState([]);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

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

    const loadAllCustomers = async () => {
        setIsLoadingCustomers(true);
        try {
            // Use backend proxy to ensure we get results regardless of RLS
            const params = new URLSearchParams({
                limit: '50',
                search: searchQuery
            });
            const res = await fetch(`/api/marketing/customers?${params}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                setAllCustomers(data);
            } else {
                console.error('Expected array of customers, got:', data);
                setAllCustomers([]);
            }
        } catch (e) {
            console.error('Error loading customers:', e);
            alert('Erro ao carregar clientes. Verifique o console.');
            setAllCustomers([]); // Fallback to empty
        } finally {
            setIsLoadingCustomers(false);
        }
    };

    useEffect(() => {
        loadAllCustomers();
    }, [searchQuery]); // Load on mount and search change. Independent of viewMode so we have the count.

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        try {
            const res = await fetch('/api/marketing/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName })
            });
            const data = await res.json();

            if (res.ok) {
                // If creating from selection, add members immediately
                if (viewMode === 'customers' && selectedCustomerIds.size > 0) {
                    await Promise.all(Array.from(selectedCustomerIds).map(id =>
                        fetch(`/api/marketing/groups/${data.id}/members`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ customerId: id })
                        })
                    ));
                    setSelectedCustomerIds(new Set());
                    alert('Grupo criado e clientes adicionados!');
                }

                onRefresh();
                setIsCreating(false);
                setNewGroupName('');
                if (viewMode === 'customers') setViewMode('groups'); // Go back to groups
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleSelection = (customerId) => {
        const newSet = new Set(selectedCustomerIds);
        if (newSet.has(customerId)) {
            newSet.delete(customerId);
        } else {
            newSet.add(customerId);
        }
        setSelectedCustomerIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedCustomerIds.size === allCustomers.length) {
            setSelectedCustomerIds(new Set());
        } else {
            setSelectedCustomerIds(new Set(allCustomers.map(c => c.id)));
        }
    };

    // ... existing helper functions for member management (addMember, removeMember)...
    // Reuse them or keep them if needed for 'groups' view logic
    // Re-implementing simplified versions for 'groups' view context:
    const addMemberToGroup = async (customerId) => {
        if (!selectedGroup) return;
        await fetch(`/api/marketing/groups/${selectedGroup.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId })
        });
        loadMembers(selectedGroup.id);
    };

    const removeMember = async (customerId) => {
        if (!selectedGroup) return;
        await fetch(`/api/marketing/groups/${selectedGroup.id}/members/${customerId}`, {
            method: 'DELETE'
        });
        loadMembers(selectedGroup.id);
    };

    // Search logic for standard view
    const [searchResults, setSearchResults] = useState([]);
    const searchCustomersForGroup = async (term = '') => {
        try {
            const params = new URLSearchParams({
                limit: '10',
                search: term
            });
            const res = await fetch(`/api/marketing/customers?${params}`);
            const data = await res.json();
            setSearchResults(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            setSearchResults([]);
        }
    };
    useEffect(() => { searchCustomersForGroup('') }, []);
    const [customerSearch, setCustomerSearch] = useState('');


    return (
        <div className="h-[calc(100vh-200px)] flex flex-col gap-4">

            {/* View Switcher */}
            <div className="flex gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg w-fit self-start">
                <button
                    onClick={() => setViewMode('groups')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${viewMode === 'groups' ? 'bg-white dark:bg-stone-700 shadow-sm text-italian-red' : 'text-stone-500'}`}
                >
                    <Users size={16} /> Gerenciar Grupos
                </button>
                <button
                    onClick={() => setViewMode('customers')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${viewMode === 'customers' ? 'bg-white dark:bg-stone-700 shadow-sm text-italian-red' : 'text-stone-500'}`}
                >
                    <UserPlus size={16} /> Todos os Clientes ({allCustomers.length})
                </button>
            </div>

            {viewMode === 'groups' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
                    {/* Groups List (Left) */}
                    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col">
                        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-800/50">
                            <h3 className="font-bold text-stone-800 dark:text-white">Seus Grupos</h3>
                            <button onClick={() => setIsCreating(true)} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-italian-red">
                                <Plus size={20} />
                            </button>
                        </div>

                        {isCreating && (
                            <form onSubmit={handleCreateGroup} className="p-2 border-b border-stone-200 dark:border-stone-800 bg-red-50 dark:bg-red-900/10">
                                <input
                                    autoFocus
                                    className="w-full p-2 text-sm rounded border border-red-200 focus:outline-none focus:border-italian-red"
                                    placeholder="Nome do novo grupo..."
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                />
                            </form>
                        )}

                        <div className="overflow-y-auto flex-1 p-2 space-y-1">
                            {groups.map(group => (
                                <div
                                    key={group.id}
                                    className={`w-full group flex justify-between items-center p-3 rounded-lg transition-colors cursor-pointer ${selectedGroup?.id === group.id
                                        ? 'bg-red-50 dark:bg-red-900/20 text-italian-red border border-red-100'
                                        : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300'
                                        }`}
                                    onClick={() => setSelectedGroup(group)}
                                >
                                    <span className="font-medium truncate flex-1">{group.name}</span>

                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newName = prompt('Novo nome do grupo:', group.name);
                                                if (newName && newName !== group.name) {
                                                    fetch(`/api/marketing/groups/${group.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ name: newName })
                                                    }).then(res => {
                                                        if (res.ok) onRefresh();
                                                    });
                                                }
                                            }}
                                            className="p-1.5 hover:bg-white rounded text-stone-400 hover:text-blue-500"
                                            title="Renomear"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Tem certeza que deseja excluir este grupo?')) {
                                                    fetch(`/api/marketing/groups/${group.id}`, { method: 'DELETE' })
                                                        .then(res => {
                                                            if (res.ok) {
                                                                onRefresh();
                                                                if (selectedGroup?.id === group.id) setSelectedGroup(null);
                                                            }
                                                        });
                                                }
                                            }}
                                            className="p-1.5 hover:bg-white rounded text-stone-400 hover:text-red-500"
                                            title="Excluir"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Group Details (Right) */}
                    <div className="col-span-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col">
                        {selectedGroup ? (
                            <>
                                <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg text-stone-800 dark:text-white">{selectedGroup.name}</h3>
                                        <p className="text-sm text-stone-500">{members.length} membros</p>
                                    </div>
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
                                        <input
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm"
                                            placeholder="Adicionar membro..."
                                            value={customerSearch}
                                            onChange={e => {
                                                setCustomerSearch(e.target.value);
                                                searchCustomersForGroup(e.target.value);
                                            }}
                                        />
                                        {(customerSearch || searchResults.length > 0) && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-stone-800 border border-stone-200 shadow-lg rounded-lg z-10 max-h-48 overflow-y-auto">
                                                {searchResults.map(c => (
                                                    <button key={c.id} onClick={() => { addMemberToGroup(c.id); setCustomerSearch(''); }} className="w-full text-left p-2 hover:bg-stone-100 dark:hover:bg-stone-700 text-sm flex justify-between">
                                                        <span>{c.name}</span>
                                                        <span className="text-stone-400 text-xs">{c.phone}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
                                    {members.map(m => (
                                        <div key={m.id} className="flex justify-between items-center p-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-100">
                                            <div>
                                                <p className="font-bold text-sm text-stone-700 dark:text-stone-200">{m.name}</p>
                                                <p className="text-xs text-stone-500">{m.phone}</p>
                                            </div>
                                            <button onClick={() => removeMember(m.id)} className="text-stone-400 hover:text-red-500"><X size={16} /></button>
                                        </div>
                                    ))}
                                    {members.length === 0 && <p className="text-stone-400 text-center col-span-2 py-10">Nenhum membro neste grupo.</p>}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-stone-400">Selecione um grupo ao lado</div>
                        )}
                    </div>
                </div>
            ) : (
                /* ALL CUSTOMERS VIEW */
                <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800 flex flex-col flex-1 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex flex-col md:flex-row justify-between gap-4 items-center bg-stone-50 dark:bg-stone-800/50">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80">
                                <Search className="absolute left-3 top-2.5 text-stone-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar em todos os clientes..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="text-sm text-stone-500">
                                {allCustomers.length} listados
                            </div>
                        </div>

                        {selectedCustomerIds.size > 0 && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                <span className="font-bold text-italian-red">{selectedCustomerIds.size} selecionados</span>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="bg-italian-red text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-red-700 transition-colors flex items-center gap-2"
                                >
                                    <Plus size={16} /> Criar Grupo com Seleção
                                </button>
                            </div>
                        )}
                    </div>

                    {isCreating && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border-b border-red-100 flex items-center gap-4 justify-center">
                            <span className="text-italian-red font-bold">Nome do Grupo:</span>
                            <form onSubmit={handleCreateGroup} className="flex gap-2">
                                <input
                                    autoFocus
                                    className="px-3 py-2 rounded border border-red-200 focus:outline-none focus:ring-2 focus:ring-italian-red"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    placeholder="Ex: Clientes VIP"
                                />
                                <button type="submit" className="bg-italian-red text-white px-4 py-2 rounded font-bold hover:bg-red-700">Salvar</button>
                                <button type="button" onClick={() => setIsCreating(false)} className="text-stone-500 hover:text-stone-800 px-2 font-bold">Cancelar</button>
                            </form>
                        </div>
                    )}

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-3 border-b border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 text-sm font-bold text-stone-600 dark:text-stone-400">
                        <div className="col-span-1 flex justify-center">
                            <input type="checkbox" onChange={toggleSelectAll} checked={allCustomers.length > 0 && selectedCustomerIds.size === allCustomers.length} className="w-4 h-4 accent-italian-red" />
                        </div>
                        <div className="col-span-5">Nome</div>
                        <div className="col-span-4">Telefone</div>
                        <div className="col-span-2">Desde</div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoadingCustomers ? (
                            <div className="p-10 text-center text-stone-500">Carregando clientes...</div>
                        ) : (
                            allCustomers.map(customer => (
                                <div
                                    key={customer.id}
                                    className={`grid grid-cols-12 gap-4 p-3 border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800 items-center text-sm transition-colors ${selectedCustomerIds.has(customer.id) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                                >
                                    <div className="col-span-1 flex justify-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedCustomerIds.has(customer.id)}
                                            onChange={() => toggleSelection(customer.id)}
                                            className="w-4 h-4 accent-italian-red cursor-pointer"
                                        />
                                    </div>
                                    <div className="col-span-5 font-medium text-stone-800 dark:text-stone-200">{customer.name}</div>
                                    <div className="col-span-4 text-stone-600 dark:text-stone-400">{customer.phone}</div>
                                    <div className="col-span-2 text-xs text-stone-400">{new Date(customer.created_at).toLocaleDateString()}</div>
                                </div>
                            ))
                        )}
                        {!isLoadingCustomers && allCustomers.length === 0 && (
                            <div className="p-10 text-center text-stone-400">Nenhum cliente encontrado.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientGroupManager;
