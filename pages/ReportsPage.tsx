import React, { useState, useMemo } from 'react';
import { useAuth } from '../App';
import { OrderStatus } from '../types';
import { ReportCard } from '../components/ReportCard';
import { formatCurrency } from '../utils/currencyFormatter';
import { formatDateTime } from '../utils/dateFormatter';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { summarizeReport } from '../services/geminiService';
import { Loader2, TrendingUp, Package, ShoppingBag, BarChart as BarChartIcon, Brain, CheckCircle, Clock, DollarSign, ScrollText, Factory, Download, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

export const ReportsPage: React.FC = () => {
  const { products, orders, rawMaterials, checkPermission, companyInfo } = useAuth(); // Use checkPermission
  const canGenerateAISummary = checkPermission('canGenerateAISummary');

  const [reportSummary, setReportSummary] = useState<string | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- Filtered Orders by Date Range ---
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (startDate && orderDate < new Date(startDate + 'T00:00:00')) return false;
      if (endDate && orderDate > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  }, [orders, startDate, endDate]);

  // --- General Metrics ---
  const totalDirectSalesValue = useMemo(() => {
    return filteredOrders
      .filter(order => order.type === 'sale' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  }, [filteredOrders]);

  const totalServiceOrdersValue = useMemo(() => {
    return filteredOrders
      .filter(order => order.type === 'service-order' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  }, [filteredOrders]);

  const totalBudgetsCount = useMemo(() => {
    return filteredOrders.filter(order => order.type === 'budget').length;
  }, [filteredOrders]);

  const completedDirectSalesCount = useMemo(() => {
    return filteredOrders.filter(order => order.type === 'sale' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED)).length;
  }, [filteredOrders]);

  const completedServiceOrdersCount = useMemo(() => {
    return filteredOrders.filter(order => order.type === 'service-order' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED)).length;
  }, [filteredOrders]);

  const pendingDirectSalesCount = useMemo(() => {
    return filteredOrders.filter(order => order.type === 'sale' && (order.status === OrderStatus.PENDING || order.status === OrderStatus.IN_PROGRESS)).length;
  }, [filteredOrders]);

  const pendingServiceOrdersCount = useMemo(() => {
    return filteredOrders.filter(order => order.type === 'service-order' && (order.status === OrderStatus.PENDING || order.status === OrderStatus.IN_PROGRESS)).length;
  }, [filteredOrders]);

  // New: Calculate total production costs for completed service orders
  const totalProductionCosts = useMemo(() => {
    return filteredOrders
      .filter(order => order.type === 'service-order' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED) && order.productionDetails)
      .reduce((orderSum, order) => {
        const itemCosts = order.productionDetails ? order.productionDetails.reduce((itemSum, item) => itemSum + (item.quantityUsed * item.costPerUnit), 0) : 0;
        return orderSum + itemCosts;
      }, 0);
  }, [filteredOrders]);


  // Calculate total value of finished products in stock (based on cost price)
  const totalFinishedProductsCostValue = useMemo(() => {
    return products.reduce((sum, product) => sum + (product.stock * product.costPrice), 0);
  }, [products]);

  const totalRawMaterialValue = useMemo(() => {
    return rawMaterials.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
  }, [rawMaterials]);

  // --- Sales by Month Chart Data (Direct Sales) ---
  const directSalesByMonthData = useMemo(() => {
    const monthlySales: { [key: string]: number } = {}; // Format: YYYY-MM
    filteredOrders
      .filter(order => order.type === 'sale' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .forEach(order => {
        const date = new Date(order.createdAt);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + (Number(order.total) || 0);
      });

    return Object.keys(monthlySales)
      .sort()
      .map(key => {
        const [year, month] = key.split('-');
        return {
          month: new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' }),
          sales: monthlySales[key],
        };
      });
  }, [filteredOrders]);

  // --- Service Orders by Month Chart Data ---
  const serviceOrdersByMonthData = useMemo(() => {
    const monthlyOrders: { [key: string]: number } = {}; // Format: YYYY-MM
    filteredOrders
      .filter(order => order.type === 'service-order' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .forEach(order => {
        const date = new Date(order.createdAt);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyOrders[monthKey] = (monthlyOrders[monthKey] || 0) + (Number(order.total) || 0);
      });

    return Object.keys(monthlyOrders)
      .sort()
      .map(key => {
        const [year, month] = key.split('-');
        return {
          month: new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' }),
          total: monthlyOrders[key],
        };
      });
  }, [filteredOrders]);

  // --- Top Products Sales Chart Data (Combined) ---
  const topProductsData = useMemo(() => {
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    filteredOrders
      .filter(order => (order.type === 'sale' || order.type === 'service-order') && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .forEach(order => {
        order.items.forEach(item => {
          if (!productSales[item.id]) {
            productSales[item.id] = { name: item.name, quantity: 0, revenue: 0 };
          }
          productSales[item.id].quantity += item.quantity;
          productSales[item.id].revenue += item.price * item.quantity;
        });
      });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5 products
  }, [filteredOrders]);



  const handleGenerateSummary = async () => {
    if (!canGenerateAISummary) {
      alert('Você não tem permissão para gerar o resumo com IA.');
      return;
    }
    setIsLoadingSummary(true);

    const productionCostsSummary = filteredOrders
      .filter(order => order.type === 'service-order' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED) && order.productionDetails)
      .map(order => {
        const costs = order.productionDetails ? order.productionDetails.reduce((itemSum, item) => itemSum + (item.quantityUsed * item.costPerUnit), 0) : 0;
        return `OS #${order.id}: Custo de Produção: ${formatCurrency(costs)}`;
      }).join('\n');

    const reportContent = `
      Relatório de Atividades da Confecção e Vendas:

      --- Vendas Diretas ---
      Valor Total de Vendas Diretas: ${formatCurrency(totalDirectSalesValue)}
      Número de Vendas Diretas Concluídas/Entregues: ${completedDirectSalesCount}
      Número de Vendas Diretas Pendentes/Em Andamento: ${pendingDirectSalesCount}

      --- Ordens de Serviço ---
      Valor Total de Ordens de Serviço Concluídas/Entregues: ${formatCurrency(totalServiceOrdersValue)}
      Número de Ordens de Serviço Concluídas/Entregues: ${completedServiceOrdersCount}
      Número de Ordens de Serviço Pendentes/Em Andamento: ${pendingServiceOrdersCount}
      Custo Total de Produção (Ordens de Serviço Concluídas): ${formatCurrency(totalProductionCosts)}
      Detalhes de Custo por OS (Concluídas):
      ${productionCostsSummary}

      --- Orçamentos ---
      Total de Orçamentos Registrados: ${totalBudgetsCount}

      --- Estoque ---
      Valor Total de Produtos Acabados em Estoque (Custo): ${formatCurrency(totalFinishedProductsCostValue)}
      Valor Total da Matéria Prima em Estoque: ${formatCurrency(totalRawMaterialValue)}

      --- Tendências Mensais ---
      Vendas Diretas por Mês:
      ${directSalesByMonthData.map(data => `${data.month}: ${formatCurrency(data.sales)}`).join('\n')}

      Ordens de Serviço por Mês:
      ${serviceOrdersByMonthData.map(data => `${data.month}: ${formatCurrency(data.total)}`).join('\n')}

      --- Produtos em Destaque (Vendas e O.S. combinadas) ---
      Top 5 Produtos por Faturamento:
      ${topProductsData.map(data => `${data.name}: ${formatCurrency(data.revenue)} (${data.quantity} unidades)`).join('\n')}
    `;
    try {
      const summary = await summarizeReport(reportContent, companyInfo.geminiApiKey, companyInfo.geminiModelText);
      setReportSummary(summary);
      setIsSummaryModalOpen(true);
    } catch (error) {
      alert('Erro ao gerar resumo com Gemini AI. Verifique a chave da API.');
      console.error(error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Resumo Geral
    const resumoData = [
      { 'Métrica': 'Valor Total Vendas Diretas', 'Valor': totalDirectSalesValue },
      { 'Métrica': 'Valor Total Ordens de Serviço', 'Valor': totalServiceOrdersValue },
      { 'Métrica': 'Vendas Diretas Concluídas', 'Valor': completedDirectSalesCount },
      { 'Métrica': 'O.S. Concluídas', 'Valor': completedServiceOrdersCount },
      { 'Métrica': 'Vendas Diretas Pendentes', 'Valor': pendingDirectSalesCount },
      { 'Métrica': 'O.S. Pendentes', 'Valor': pendingServiceOrdersCount },
      { 'Métrica': 'Total de Orçamentos', 'Valor': totalBudgetsCount },
      { 'Métrica': 'Custo Total de Produção (O.S.)', 'Valor': totalProductionCosts },
      { 'Métrica': 'Produtos Acabados em Estoque (Custo)', 'Valor': totalFinishedProductsCostValue },
      { 'Métrica': 'Valor Matéria Prima em Estoque', 'Valor': totalRawMaterialValue },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Geral');

    // 2. Vendas Diretas por Mês
    if (directSalesByMonthData.length > 0) {
      const wsVendas = XLSX.utils.json_to_sheet(directSalesByMonthData.map(d => ({
        'Mês': d.month,
        'Valor': d.sales
      })));
      wsVendas['!cols'] = [{ wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsVendas, 'Vendas por Mês');
    }

    // 3. Ordens de Serviço por Mês
    if (serviceOrdersByMonthData.length > 0) {
      const wsOS = XLSX.utils.json_to_sheet(serviceOrdersByMonthData.map(d => ({
        'Mês': d.month,
        'Valor': d.total
      })));
      wsOS['!cols'] = [{ wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsOS, 'OS por Mês');
    }

    // 4. Top 5 Produtos
    if (topProductsData.length > 0) {
      const wsProdutos = XLSX.utils.json_to_sheet(topProductsData.map((d, i) => ({
        'Ranking': i + 1,
        'Produto': d.name,
        'Quantidade': d.quantity,
        'Faturamento': d.revenue
      })));
      wsProdutos['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsProdutos, 'Top Produtos');
    }

    // 5. Detalhamento das Ordens Filtradas
    if (filteredOrders.length > 0) {
      const wsDetalhes = XLSX.utils.json_to_sheet(filteredOrders.map(order => ({
        'ID': order.id,
        'Tipo': order.type === 'sale' ? 'Venda' : order.type === 'service-order' ? 'Ordem de Serviço' : 'Orçamento',
        'Data': new Date(order.createdAt).toLocaleString('pt-BR'),
        'Cliente': order.clientName,
        'Total': order.total,
        'Status': order.status,
        'Itens': order.items.map(item => `${item.name} (${item.quantity})`).join(', ')
      })));
      wsDetalhes['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Detalhamento Ordens');
    }

    const dateFilter = startDate && endDate ? `${startDate}_ate_${endDate}` : 'completo';
    XLSX.writeFile(wb, `relatorio_atividade_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Relatórios de Atividade</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleExportExcel}
            variant="outline"
            icon={<Download className="h-5 w-5" />}
          >
            Exportar Excel
          </Button>
          <Button
            onClick={handleGenerateSummary}
            isLoading={isLoadingSummary}
            icon={<Brain className="h-5 w-5" />}
            disabled={!canGenerateAISummary}
          >
            {isLoadingSummary ? 'Gerando Resumo...' : 'Gerar Resumo com IA'}
          </Button>
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter className="h-5 w-5" />
            <span className="font-medium">Filtrar por Período:</span>
          </div>
          <Input
            id="startDate"
            label="Data Início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            containerClassName="mb-0 flex-1"
          />
          <Input
            id="endDate"
            label="Data Fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            containerClassName="mb-0 flex-1"
          />
          <Button
            variant="outline"
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="mb-4"
          >
            Limpar Filtro
          </Button>
        </div>
        {(startDate || endDate) && (
          <p className="text-sm text-gray-500 mt-2">
            Exibindo dados de {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'início'} até {endDate ? new Date(endDate + 'T23:59:59').toLocaleDateString('pt-BR') : 'atual'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        <ReportCard
          title="Valor Total Vendas Diretas"
          value={formatCurrency(totalDirectSalesValue)}
          icon={<TrendingUp className="h-8 w-8" />}
          color="green"
          description="Soma de todas as vendas diretas concluídas."
        />
        <ReportCard
          title="Valor Total Ordens de Serviço"
          value={formatCurrency(totalServiceOrdersValue)}
          icon={<ShoppingBag className="h-8 w-8" />}
          color="blue"
          description="Soma de todas as ordens de serviço concluídas."
        />
        <ReportCard
          title="Vendas Diretas Concluídas"
          value={completedDirectSalesCount}
          icon={<CheckCircle className="h-8 w-8" />}
          color="purple"
          description="Número de vendas diretas finalizadas."
        />
        <ReportCard
          title="O.S. Concluídas"
          value={completedServiceOrdersCount}
          icon={<CheckCircle className="h-8 w-8" />}
          color="teal"
          description="Número de ordens de serviço finalizadas."
        />
        <ReportCard
          title="Vendas Diretas Pendentes"
          value={pendingDirectSalesCount}
          icon={<Clock className="h-8 w-8" />}
          color="yellow"
          description="Vendas diretas aguardando finalização."
        />
        <ReportCard
          title="O.S. Pendentes"
          value={pendingServiceOrdersCount}
          icon={<Clock className="h-8 w-8" />}
          color="orange"
          description="Ordens de serviço aguardando finalização."
        />
        <ReportCard
          title="Total de Orçamentos"
          value={totalBudgetsCount}
          icon={<ScrollText className="h-8 w-8" />}
          color="blue"
          description="Orçamentos registrados (em aberto ou fechados)."
        />
        <ReportCard
          title="Custo Total de Produção (O.S.)"
          value={formatCurrency(totalProductionCosts)}
          icon={<Factory className="h-8 w-8" />}
          color="red"
          description="Custo total de matéria-prima e mão de obra para O.S. concluídas."
        />
        <ReportCard
          title="Produtos Acabados em Estoque (Custo)"
          value={formatCurrency(totalFinishedProductsCostValue)}
          icon={<Package className="h-8 w-8" />}
          color="red"
          description="Valor de custo total dos itens prontos para venda no estoque."
        />
        <ReportCard
          title="Valor Matéria Prima em Estoque"
          value={formatCurrency(totalRawMaterialValue)}
          icon={<DollarSign className="h-8 w-8" />}
          color="gray"
          description="Valor monetário total da matéria-prima."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vendas Diretas por Mês</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={directSalesByMonthData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Ordens de Serviço por Mês</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={serviceOrdersByMonthData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} /> {/* Tailwind emerald-500 */}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Produtos por Faturamento (Vendas Diretas e O.S.)</h3>
          <div className="space-y-4">
            {(() => {
              const totalRankingRevenue = topProductsData.reduce((sum, item) => sum + item.revenue, 0);
              
              if (topProductsData.length === 0) {
                return <p className="text-gray-500 text-center py-4">Nenhum dado de venda disponível.</p>;
              }

              return topProductsData.map((product, index) => {
                const percentage = totalRankingRevenue > 0 ? ((product.revenue / totalRankingRevenue) * 100).toFixed(1) : '0.0';
                
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 transition-colors hover:bg-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold rounded-full">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.quantity} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(product.revenue)}</p>
                      <p className="text-sm font-medium text-indigo-600">{percentage}% do Top 5</p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        title="Resumo do Relatório (Gerado por IA)"
        size="lg"
      >
        {reportSummary ? (
          <p className="whitespace-pre-wrap text-gray-800">{reportSummary}</p>
        ) : (
          <p className="text-gray-600">Nenhum resumo disponível.</p>
        )}
      </Modal>
    </div>
  );
};