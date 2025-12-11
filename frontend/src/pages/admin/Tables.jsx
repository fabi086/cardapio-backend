import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, RefreshCw, Trash2, Plus, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Tables = () => {
    // Start with empty list or load from localStorage if desired (optional)
    const [activeTables, setActiveTables] = useState([1, 2, 3, 4, 5]);
    const [newTableNum, setNewTableNum] = useState('');
    const [baseUrl, setBaseUrl] = useState(window.location.origin);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await supabase.from('business_settings').select('logo_url, restaurant_name, primary_color, secondary_color').single();
            if (data) setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const addTable = (e) => {
        e.preventDefault();
        const num = Number(newTableNum);
        if (!num || num < 1) return alert('Número inválido');
        if (activeTables.includes(num)) return alert('Mesa já está na lista');

        const newList = [...activeTables, num].sort((a, b) => a - b);
        setActiveTables(newList);
        setNewTableNum('');
    };

    const removeTable = (tableNum) => {
        setActiveTables(prev => prev.filter(t => t !== tableNum));
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir QR Codes - ${settings?.restaurant_name || 'Cardápio Digital'}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 20px; }
                        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                        .card { 
                            border: 2px solid #e7e5e4; 
                            padding: 24px; 
                            text-align: center; 
                            page-break-inside: avoid; 
                            border-radius: 16px; 
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            background: white;
                        }
                        .logo { height: 40px; margin-bottom: 10px; object-fit: contain; }
                        .title { font-size: 20px; font-weight: 900; margin-bottom: 15px; color: ${settings?.primary_color || '#EA1D2C'}; text-transform: uppercase; }
                        .scan-text { font-size: 14px; font-weight: bold; margin-top: 15px; color: #57534e; text-transform: uppercase; letter-spacing: 1px; }
                    </style>
                </head>
                <body>
                    <div class="grid">
                        ${activeTables.map(num => `
                            <div class="card">
                                ${settings?.logo_url ? `<img src="${settings.logo_url}" class="logo" />` : ''}
                                <span class="title">MESA ${num}</span>
                                <div style="padding: 10px; background: white; border-radius: 8px;">
                                    ${document.getElementById(`qr-code-${num}`)?.outerHTML || ''}
                                </div>
                                <span class="scan-text">Escaneie para pedir</span>
                            </div>
                        `).join('')}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 800);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100">Mesas e QR Codes</h1>
                    <p className="text-stone-500 dark:text-stone-400 mt-1">Gerencie os QR Codes. Adicione as mesas que deseja imprimir.</p>
                </div>

                <form onSubmit={addTable} className="flex gap-2 items-center bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800 shadow-sm">
                    <span className="text-sm font-bold text-stone-500 pl-2">Adicionar Mesa:</span>
                    <input
                        type="number"
                        placeholder="Nº"
                        value={newTableNum}
                        onChange={(e) => setNewTableNum(e.target.value)}
                        className="w-16 p-1 bg-transparent font-bold text-center outline-none border-b-2 border-transparent focus:border-italian-red transition-colors dark:text-white"
                    />
                    <button
                        type="submit"
                        className="bg-stone-800 hover:bg-stone-700 text-white p-2 rounded-lg transition-colors"
                        title="Adicionar"
                    >
                        <Plus size={18} />
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Preview e Controles */}
                <div className="lg:col-span-3">
                    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 md:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-lg text-stone-700 dark:text-stone-200 flex items-center gap-2">
                                <Printer size={20} /> Preview de Impressão ({activeTables.length})
                            </h2>
                            <button
                                onClick={handlePrint}
                                className="bg-italian-green hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <Printer size={20} />
                                Imprimir Tudo
                            </button>
                        </div>

                        <div ref={printRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                            {activeTables.map(num => (
                                <div key={num} className="group relative border-2 border-stone-100 dark:border-stone-700 rounded-2xl p-6 flex flex-col items-center bg-white dark:bg-stone-800 aspect-[3/4] justify-between transition-all hover:border-italian-red/30 hover:shadow-lg">
                                    <button
                                        onClick={() => removeTable(num)}
                                        className="absolute top-2 right-2 p-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-stone-800 rounded-full shadow-sm"
                                        title="Remover mesa da impressão"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    {settings?.logo_url && (
                                        <img src={settings.logo_url} alt="Logo" className="h-8 object-contain mb-2 opacity-80" />
                                    )}

                                    <span className="text-xl font-black mb-2 uppercase tracking-wide" style={{ color: settings?.primary_color || '#EA1D2C' }}>
                                        Mesa {num}
                                    </span>

                                    <div className="bg-white p-3 rounded-xl shadow-sm border border-stone-100">
                                        <QRCodeSVG
                                            id={`qr-code-${num}`}
                                            value={`${baseUrl}/?table=${num}`}
                                            size={140}
                                            level="H"
                                            includeMargin={true}
                                            imageSettings={settings?.logo_url ? {
                                                src: settings.logo_url,
                                                x: undefined,
                                                y: undefined,
                                                height: 24,
                                                width: 24,
                                                excavate: true,
                                            } : undefined}
                                        />
                                    </div>

                                    <span className="text-xs font-bold text-stone-400 mt-4 uppercase tracking-widest text-center">
                                        Escaneie para pedir
                                    </span>
                                </div>
                            ))}
                        </div>

                        {activeTables.length === 0 && (
                            <div className="text-center py-20 text-stone-400">
                                <p>Nenhuma mesa para imprimir.</p>
                                <button onClick={() => setActiveTables([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])} className="text-italian-red font-bold mt-2 hover:underline">Restaurar Mesas Padrão (1-10)</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Info - (Optional customization controls could go here later) */}
                <div className="space-y-6">
                    <div className="p-6 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-200 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <RefreshCw className="mb-4 text-blue-600 dark:text-blue-400" size={32} />
                        <h3 className="font-bold text-lg mb-2">Personalização Automática</h3>
                        <p className="text-sm opacity-90 leading-relaxed">
                            O design dos QR Codes utiliza automaticamente o <strong>Logo</strong> e a <strong>Cor Primária</strong> definidos nas Configurações da sua loja.
                        </p>
                        <a href="/admin/settings" className="inline-flex items-center gap-2 text-xs font-bold bg-blue-100 dark:bg-blue-800/30 px-3 py-2 rounded-lg mt-4 hover:bg-blue-200 transition-colors">
                            <Settings size={14} />
                            Acessar Configurações
                        </a>
                    </div>

                    <div className="p-6 bg-stone-50 dark:bg-stone-900/30 rounded-xl border border-stone-200 dark:border-stone-800">
                        <h3 className="font-bold text-stone-700 dark:text-stone-300 mb-4">Dicas de Uso</h3>
                        <ul className="space-y-3 text-sm text-stone-500 dark:text-stone-400">
                            <li className="flex gap-2">
                                <span className="font-bold text-italian-red">•</span>
                                Imprima em papel adesivo ou cartolina de alta gramatura.
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-italian-red">•</span>
                                Plastifique para maior durabilidade nas mesas.
                            </li>
                            <li className="flex gap-2">
                                <span className="font-bold text-italian-red">•</span>
                                Teste um QR Code antes de imprimir todos.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tables;
