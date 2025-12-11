import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, RefreshCw } from 'lucide-react';

const Tables = () => {
    const [tableCount, setTableCount] = useState(20);
    const [baseUrl, setBaseUrl] = useState(window.location.origin);
    const printRef = useRef();

    const handlePrint = () => {
        const printContent = printRef.current;
        const windowUrl = 'about:blank';
        const uniqueName = new Date();
        const windowName = 'Print' + uniqueName.getTime();
        const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir QR Codes</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                        .card { border: 2px solid #000; padding: 20px; text-align: center; page-break-inside: avoid; border-radius: 10px; }
                        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; display: block; }
                        .scan { font-size: 14px; margin-top: 5px; display: block; }
                    </style>
                </head>
                <body>
                    <div class="grid">
                        ${printContent.innerHTML}
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100">Mesas e QR Codes</h1>
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2 bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
                        <span className="text-sm font-bold text-stone-500">Qtd. Mesas:</span>
                        <input
                            type="number"
                            value={tableCount}
                            onChange={(e) => setTableCount(Number(e.target.value))}
                            className="w-16 p-1 bg-transparent font-bold text-center outline-none"
                        />
                    </div>
                    <button
                        onClick={handlePrint}
                        className="bg-italian-green hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                    >
                        <Printer size={20} />
                        Imprimir Tudo
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-8">
                <div ref={printRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {tables.map(num => (
                        <div key={num} className="border-2 border-stone-200 dark:border-stone-700 rounded-xl p-6 flex flex-col items-center bg-white dark:bg-stone-800 aspect-square justify-center">
                            <span className="text-2xl font-black text-italian-red mb-4">MESA {num}</span>
                            <div className="bg-white p-2 rounded-lg shadow-sm">
                                <QRCodeSVG
                                    value={`${baseUrl}/?table=${num}`}
                                    size={120}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <span className="text-xs font-bold text-stone-400 mt-4 uppercase tracking-wider">Escaneie para pedir</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-xl flex items-center gap-4">
                <RefreshCw className="shrink-0" />
                <div>
                    <p className="font-bold">Como funciona?</p>
                    <p className="text-sm">Imprima os QR Codes, recorte e cole nas mesas. Quando o cliente escanear, o cardápio abrirá já identificado com o número da mesa, sem pedir endereço de entrega!</p>
                </div>
            </div>
        </div>
    );
};

export default Tables;
