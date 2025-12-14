import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileSpreadsheet, FileText, Calendar, Download, TrendingUp, DollarSign, ShoppingBag, Users, Filter, RefreshCw } from 'lucide-react';

const Reports = () => {
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
        end: new Date().toISOString().split('T')[0] // Today
    });
    const [reportData, setReportData] = useState(null);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        generateReport();
    }, []);

    const generateReport = async () => {
        try {
            setLoading(true);

            const startISO = new Date(`${dateRange.start}T00:00:00`).toISOString();
            const endISO = new Date(`${dateRange.end}T23:59:59.999`).toISOString();

            // Fetch orders with items
            const { data: ordersData, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setOrders(ordersData || []);

            // Calculate statistics
            const completedStatuses = ['delivered', 'completed', 'Entregue'];
            const completedOrders = ordersData.filter(o => completedStatuses.includes(o.status));
            const cancelledOrders = ordersData.filter(o => o.status === 'cancelled');

            const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
            const totalDeliveryFees = completedOrders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
            const avgTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

            // Products breakdown
            const productMap = {};
            completedOrders.forEach(order => {
                (order.order_items || []).forEach(item => {
                    const key = item.product_name;
                    if (productMap[key]) {
                        productMap[key].quantity += item.quantity;
                        productMap[key].revenue += item.price * item.quantity;
                    } else {
                        productMap[key] = {
                            name: item.product_name,
                            quantity: item.quantity,
                            revenue: item.price * item.quantity,
                            unitPrice: item.price
                        };
                    }
                });
            });

            const productsSorted = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);

            // Payment methods breakdown
            const paymentMethods = {};
            completedOrders.forEach(order => {
                const method = order.payment_method || 'Outro';
                if (paymentMethods[method]) {
                    paymentMethods[method].count++;
                    paymentMethods[method].total += Number(order.total) || 0;
                } else {
                    paymentMethods[method] = { count: 1, total: Number(order.total) || 0 };
                }
            });

            // Daily breakdown
            const dailyBreakdown = {};
            completedOrders.forEach(order => {
                const date = new Date(order.created_at).toLocaleDateString('pt-BR');
                if (dailyBreakdown[date]) {
                    dailyBreakdown[date].orders++;
                    dailyBreakdown[date].revenue += Number(order.total) || 0;
                } else {
                    dailyBreakdown[date] = { orders: 1, revenue: Number(order.total) || 0 };
                }
            });

            setReportData({
                totalOrders: ordersData.length,
                completedOrders: completedOrders.length,
                cancelledOrders: cancelledOrders.length,
                totalRevenue,
                totalDeliveryFees,
                avgTicket,
                products: productsSorted,
                paymentMethods,
                dailyBreakdown
            });

        } catch (error) {
            console.error('Error generating report:', error);
            alert('Erro ao gerar relatório');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!orders.length) {
            alert('Nenhum dado para exportar');
            return;
        }

        // Headers
        let csv = 'Pedido,Data,Cliente,Telefone,Endereço,Status,Pagamento,Taxa Entrega,Total,Itens\n';

        // Data rows
        orders.forEach(order => {
            const items = (order.order_items || []).map(i => `${i.quantity}x ${i.product_name}`).join(' | ');
            const row = [
                order.order_number || order.id.slice(0, 8),
                new Date(order.created_at).toLocaleString('pt-BR'),
                `"${order.customer_name}"`,
                order.customer_phone,
                `"${order.customer_address || ''}"`,
                order.status,
                order.payment_method,
                (order.delivery_fee || 0).toFixed(2),
                order.total.toFixed(2),
                `"${items}"`
            ].join(',');
            csv += row + '\n';
        });

        // Add summary
        csv += '\n\nRESUMO\n';
        csv += `Total Pedidos,${reportData.totalOrders}\n`;
        csv += `Pedidos Entregues,${reportData.completedOrders}\n`;
        csv += `Pedidos Cancelados,${reportData.cancelledOrders}\n`;
        csv += `Faturamento,R$ ${reportData.totalRevenue.toFixed(2)}\n`;
        csv += `Taxa Entrega Total,R$ ${reportData.totalDeliveryFees.toFixed(2)}\n`;
        csv += `Ticket Médio,R$ ${reportData.avgTicket.toFixed(2)}\n`;

        // Products breakdown
        csv += '\n\nPRODUTOS VENDIDOS\n';
        csv += 'Produto,Quantidade,Faturamento\n';
        reportData.products.forEach(p => {
            csv += `"${p.name}",${p.quantity},R$ ${p.revenue.toFixed(2)}\n`;
        });

        // Download
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_${dateRange.start}_a_${dateRange.end}.csv`;
        link.click();
    };

    const exportToPDF = () => {
        if (!reportData) {
            alert('Nenhum dado para exportar');
            return;
        }

        const printWindow = window.open('', '_blank');

        const productRows = reportData.products.slice(0, 20).map(p => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${p.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${p.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${p.revenue.toFixed(2)}</td>
            </tr>
        `).join('');

        const dailyRows = Object.entries(reportData.dailyBreakdown).map(([date, data]) => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${date}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${data.orders}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${data.revenue.toFixed(2)}</td>
            </tr>
        `).join('');

        const paymentRows = Object.entries(reportData.paymentMethods).map(([method, data]) => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${getPaymentLabel(method)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${data.count}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${data.total.toFixed(2)}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório de Vendas</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
                    h1 { color: #EA1D2C; margin-bottom: 5px; }
                    h2 { color: #444; margin-top: 30px; border-bottom: 2px solid #EA1D2C; padding-bottom: 5px; }
                    .period { color: #666; margin-bottom: 30px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
                    .stat-box { background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; }
                    .stat-value { font-size: 24px; font-weight: bold; color: #EA1D2C; }
                    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th { background: #EA1D2C; color: white; padding: 10px; text-align: left; }
                    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <h1>📊 Relatório de Vendas</h1>
                <p class="period">Período: ${dateRange.start} a ${dateRange.end}</p>

                <div class="stats-grid">
                    <div class="stat-box">
                        <div class="stat-value">R$ ${reportData.totalRevenue.toFixed(2)}</div>
                        <div class="stat-label">Faturamento Total</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${reportData.completedOrders}</div>
                        <div class="stat-label">Pedidos Entregues</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">R$ ${reportData.avgTicket.toFixed(2)}</div>
                        <div class="stat-label">Ticket Médio</div>
                    </div>
                </div>

                <h2>📦 Resumo de Pedidos</h2>
                <table>
                    <tr><td>Total de Pedidos</td><td style="text-align: right; font-weight: bold;">${reportData.totalOrders}</td></tr>
                    <tr><td>Entregues</td><td style="text-align: right; font-weight: bold; color: green;">${reportData.completedOrders}</td></tr>
                    <tr><td>Cancelados</td><td style="text-align: right; font-weight: bold; color: red;">${reportData.cancelledOrders}</td></tr>
                    <tr><td>Taxa de Entrega Total</td><td style="text-align: right; font-weight: bold;">R$ ${reportData.totalDeliveryFees.toFixed(2)}</td></tr>
                </table>

                <h2>🏆 Produtos Mais Vendidos</h2>
                <table>
                    <thead><tr><th>Produto</th><th style="text-align: center;">Qtd</th><th style="text-align: right;">Faturamento</th></tr></thead>
                    <tbody>${productRows}</tbody>
                </table>

                <h2>📅 Vendas por Dia</h2>
                <table>
                    <thead><tr><th>Data</th><th style="text-align: center;">Pedidos</th><th style="text-align: right;">Faturamento</th></tr></thead>
                    <tbody>${dailyRows}</tbody>
                </table>

                <h2>💳 Formas de Pagamento</h2>
                <table>
                    <thead><tr><th>Método</th><th style="text-align: center;">Pedidos</th><th style="text-align: right;">Total</th></tr></thead>
                    <tbody>${paymentRows}</tbody>
                </table>

                <div class="footer">
                    Relatório gerado em ${new Date().toLocaleString('pt-BR')} | Cardápio Digital
                </div>

                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const getPaymentLabel = (method) => {
        const labels = { pix: 'PIX', credit: 'Crédito', debit: 'Débito', cash: 'Dinheiro' };
        return labels[method] || method;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-display text-stone-800 dark:text-stone-100 flex items-center gap-3">
                        <FileSpreadsheet className="text-italian-red" />
                        Relatórios
                    </h1>
                    <p className="text-sm text-stone-500">Análise de vendas e exportação de dados</p>
                </div>

                {/* Export Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={exportToCSV}
                        disabled={loading || !reportData}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                        <FileSpreadsheet size={18} />
                        Exportar Excel
                    </button>
                    <button
                        onClick={exportToPDF}
                        disabled={loading || !reportData}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                        <FileText size={18} />
                        Exportar PDF
                    </button>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar size={20} className="text-stone-400" />
                        <span className="text-sm font-bold text-stone-600 dark:text-stone-400">Período:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-sm"
                        />
                        <span className="text-stone-400">até</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="px-3 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-sm"
                        />
                    </div>
                    <button
                        onClick={generateReport}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-italian-red text-white rounded-lg font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                        {loading ? <RefreshCw size={18} className="animate-spin" /> : <Filter size={18} />}
                        Gerar Relatório
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-italian-red"></div>
                </div>
            )}

            {/* Report Content */}
            {!loading && reportData && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-stone-900 p-5 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                                    <DollarSign size={20} />
                                </div>
                                <span className="text-xs font-bold text-stone-500 uppercase">Faturamento</span>
                            </div>
                            <h3 className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalRevenue)}</h3>
                        </div>

                        <div className="bg-white dark:bg-stone-900 p-5 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                    <ShoppingBag size={20} />
                                </div>
                                <span className="text-xs font-bold text-stone-500 uppercase">Entregues</span>
                            </div>
                            <h3 className="text-2xl font-bold text-blue-600">{reportData.completedOrders}</h3>
                            <p className="text-xs text-stone-400">de {reportData.totalOrders} pedidos</p>
                        </div>

                        <div className="bg-white dark:bg-stone-900 p-5 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="text-xs font-bold text-stone-500 uppercase">Ticket Médio</span>
                            </div>
                            <h3 className="text-2xl font-bold text-purple-600">{formatCurrency(reportData.avgTicket)}</h3>
                        </div>

                        <div className="bg-white dark:bg-stone-900 p-5 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                                    <Users size={20} />
                                </div>
                                <span className="text-xs font-bold text-stone-500 uppercase">Tx. Entrega</span>
                            </div>
                            <h3 className="text-2xl font-bold text-orange-600">{formatCurrency(reportData.totalDeliveryFees)}</h3>
                        </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Products */}
                        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                            <div className="p-4 border-b border-stone-200 dark:border-stone-800">
                                <h2 className="font-bold text-stone-800 dark:text-stone-100">🏆 Produtos Mais Vendidos</h2>
                            </div>
                            <div className="p-4 max-h-[400px] overflow-y-auto">
                                {reportData.products.length === 0 ? (
                                    <p className="text-center text-stone-400 py-8">Nenhum produto vendido no período</p>
                                ) : (
                                    <div className="space-y-3">
                                        {reportData.products.slice(0, 10).map((product, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-italian-red text-white text-xs font-bold rounded-full">
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-stone-800 dark:text-stone-200 text-sm">{product.name}</p>
                                                        <p className="text-xs text-stone-500">{product.quantity} unid. vendidas</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-green-600">{formatCurrency(product.revenue)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                            <div className="p-4 border-b border-stone-200 dark:border-stone-800">
                                <h2 className="font-bold text-stone-800 dark:text-stone-100">💳 Formas de Pagamento</h2>
                            </div>
                            <div className="p-4">
                                {Object.keys(reportData.paymentMethods).length === 0 ? (
                                    <p className="text-center text-stone-400 py-8">Nenhum dado disponível</p>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(reportData.paymentMethods).map(([method, data], idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800 rounded-lg">
                                                <div>
                                                    <p className="font-bold text-stone-800 dark:text-stone-200">{getPaymentLabel(method)}</p>
                                                    <p className="text-xs text-stone-500">{data.count} pedido(s)</p>
                                                </div>
                                                <span className="font-bold text-green-600">{formatCurrency(data.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Daily Breakdown Table */}
                    <div className="mt-6 bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden">
                        <div className="p-4 border-b border-stone-200 dark:border-stone-800">
                            <h2 className="font-bold text-stone-800 dark:text-stone-100">📅 Vendas por Dia</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-stone-50 dark:bg-stone-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-stone-500 uppercase">Data</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-stone-500 uppercase">Pedidos</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-stone-500 uppercase">Faturamento</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                    {Object.entries(reportData.dailyBreakdown).map(([date, data], idx) => (
                                        <tr key={idx} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                            <td className="px-4 py-3 text-sm text-stone-800 dark:text-stone-200">{date}</td>
                                            <td className="px-4 py-3 text-sm text-center font-bold text-stone-600 dark:text-stone-400">{data.orders}</td>
                                            <td className="px-4 py-3 text-sm text-right font-bold text-green-600">{formatCurrency(data.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Reports;
