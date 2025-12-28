import React, { useState, useEffect } from 'react';
import { Send, Users, BarChart3, Plus } from 'lucide-react';
import CampaignList from '../../components/marketing/CampaignList';
import ClientGroupManager from '../../components/marketing/ClientGroupManager';
import CampaignForm from '../../components/marketing/CampaignForm';

const Marketing = () => {
    const [activeTab, setActiveTab] = useState('campaigns');
    const [showNewCampaign, setShowNewCampaign] = useState(false);
    const [campaigns, setCampaigns] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCampaign, setEditingCampaign] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [campRes, groupRes] = await Promise.all([
                fetch('/api/marketing/campaigns'),
                fetch('/api/marketing/groups')
            ]);
            const campData = await campRes.json();
            const groupData = await groupRes.json();

            // Ensure data is array before setting state to prevent UI crash
            setCampaigns(Array.isArray(campData) ? campData : []);
            setGroups(Array.isArray(groupData) ? groupData : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Client-side Cron: Poll processing endpoint every 15s to keep serverless lambda alive/processing
        const cronInterval = setInterval(() => {
            fetch('/api/marketing/cron').catch(console.error);
            // Also refresh data to show progress
            if (activeTab === 'campaigns') fetchData();
        }, 15000);

        return () => clearInterval(cronInterval);
    }, [activeTab]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-stone-800 dark:text-white">Marketing & Disparos</h1>
                    <p className="text-stone-600 dark:text-stone-400">Gerencie campanhas de WhatsApp e grupos de clientes</p>
                </div>

                {activeTab === 'campaigns' && !showNewCampaign && (
                    <button
                        onClick={() => setShowNewCampaign(true)}
                        className="bg-italian-red text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        Nova Campanha
                    </button>
                )}
            </div>

            {/* Tabs */}
            {!showNewCampaign && (
                <div className="flex gap-1 bg-white dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-800 w-fit">
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'campaigns'
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white'
                            : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                            }`}
                    >
                        <Send size={16} />
                        Campanhas
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === 'groups'
                            ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white'
                            : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
                            }`}
                    >
                        <Users size={16} />
                        Grupos de Clientes
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="mt-6">
                {showNewCampaign ? (
                    <CampaignForm
                        groups={groups}
                        initialData={editingCampaign}
                        onCancel={() => {
                            setShowNewCampaign(false);
                            setEditingCampaign(null);
                        }}
                        onSuccess={() => {
                            setShowNewCampaign(false);
                            setEditingCampaign(null);
                            fetchData();
                        }}
                    />
                ) : activeTab === 'campaigns' ? (
                    <CampaignList
                        campaigns={campaigns}
                        onRefresh={fetchData}
                        onEdit={(campaign) => {
                            setEditingCampaign(campaign);
                            setShowNewCampaign(true);
                        }}
                    />
                ) : (
                    <ClientGroupManager
                        groups={groups}
                        onGroupCreated={fetchData}
                        onRefresh={fetchData}
                    />
                )}
            </div>
        </div>
    );
};

export default Marketing;
