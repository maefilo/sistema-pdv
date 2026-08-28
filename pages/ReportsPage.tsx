import React, { useState, useMemo } from 'react';
import { useAuth } from '../App';
import { OrderStatus } from '../types';
import { ReportCard } from '../components/ReportCard';
import { formatCurrency } from '../utils/currencyFormatter';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { summarizeReport } from '../services/geminiService';
import {
  Loader2, TrendingUp, Package, ShoppingBag, Brain, CheckCircle, Clock,
  DollarSign, ScrollText, Factory, Download, Filter, Users, AlertTriangle,
  Percent, ShoppingCart, UserCheck, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

export const ReportsPage: React.FC = () => {
  const { products, orders, rawMaterials, clients, checkPermission, companyInfo } = useAuth();
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

  // ========== FINANCEIROS ==========
  const completedOrders = useMemo(() =>
    filteredOrders.filter(o => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.DELIVERED),
    [filteredOrders]
  );

  const totalRevenue = useMemo(() =>
    completedOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [completedOrders]
  );

  const totalProductionCosts = useMemo(() =>
    completedOrders
      .filter(o => o.type === 'service-order' && o.productionDetails)
      .reduce((sum, o) => {
        const costs = o.productionDetails ? o.productionDetails.reduce((s, i) => s + (i.quantityUsed * i.costPerUnit), 0) : 0;
        return sum + costs;
      }, 0),
    [completedOrders]
  );

  const totalProductCosts = useMemo(() => {
    const salesCost = completedOrders
      .filter(o => o.type === 'sale')
      .reduce((sum, o) => sum + o.items.reduce((s, i) => s + (i.costPrice || 0) * i.quantity, 0), 0);
    return salesCost + totalProductionCosts;
  }, [completedOrders, totalProductionCosts]);

  const profitLoss = useMemo(() => totalRevenue - totalProductCosts, [totalRevenue, totalProductCosts]);

  const totalInflows = useMemo(() =>
    filteredOrders
      .filter(o => o.type === 'balance_inflow')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [filteredOrders]
  );

  const totalOutflows = useMemo(() =>
    filteredOrders
      .filter(o => o.type === 'balance_outflow')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [filteredOrders]
  );

  const cashFlow = useMemo(() => totalInflows - totalOutflows, [totalInflows, totalOutflows]);

  const pendingReceivables = useMemo(() =>
    filteredOrders
      .filter(o => (o.type === 'sale' || o.type === 'service-order') && o.payments?.some(p => p.method === 'Pendente'))
      .reduce((sum, o) => sum + (o.payments?.filter(p => p.method === 'Pendente').reduce((s, p) => s + p.amount, 0) || 0), 0),
    [filteredOrders]
  );

  // ========== VENDAS ==========
  const totalDirectSalesValue = useMemo(() =>
    completedOrders.filter(o => o.type === 'sale').reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [completedOrders]
  );

  const totalServiceOrdersValue = useMemo(() =>
    completedOrders.filter(o => o.type === 'service-order').reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [completedOrders]
  );

  const completedDirectSalesCount = useMemo(() =>
    completedOrders.filter(o => o.type === 'sale').length,
    [completedOrders]
  );

  const completedServiceOrdersCount = useMemo(() =>
    completedOrders.filter(o => o.type === 'service-order').length,
    [completedOrders]
  );

  const pendingDirectSalesCount = useMemo(() =>
    filteredOrders.filter(o => o.type === 'sale' && (o.status === OrderStatus.PENDING || o.status === OrderStatus.IN_PROGRESS)).length,
    [filteredOrders]
  );

  const pendingServiceOrdersCount = useMemo(() =>
    filteredOrders.filter(o => o.type === 'service-order' && (o.status === OrderStatus.PENDING || o.status === OrderStatus.IN_PROGRESS)).length,
    [filteredOrders]
  );

  const averageTicket = useMemo(() => {
    const count = completedDirectSalesCount + completedServiceOrdersCount;
    return count > 0 ? totalRevenue / count : 0;
  }, [totalRevenue, completedDirectSalesCount, completedServiceOrdersCount]);

  const salesByProduct = useMemo(() => {
    const map: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    completedOrders.forEach(o => {
      o.items.forEach(item => {
        if (!map[item.id]) map[item.id] = { name: item.name, quantity: 0, revenue: 0 };
        map[item.id].quantity += item.quantity;
        map[item.id].revenue += item.price * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [completedOrders]);

  const salesBySeller = useMemo(() => {
    const map: { [key: string]: { name: string; count: number; revenue: number } } = {};
    completedOrders.forEach(o => {
      const seller = o.sellerName || 'Não informado';
      if (!map[seller]) map[seller] = { name: seller, count: 0, revenue: 0 };
      map[seller].count++;
      map[seller].revenue += Number(o.total) || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [completedOrders]);

  const directSalesByMonthData = useMemo(() => {
    const monthly: { [key: string]: number } = {};
    completedOrders.filter(o => o.type === 'sale').forEach(o => {
      const d = new Date(o.createdAt);
      const k = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      monthly[k] = (monthly[k] || 0) + (Number(o.total) || 0);
    });
    return Object.keys(monthly).sort().map(key => {
      const [y, m] = key.split('-');
      return {
        month: new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' }),
        sales: monthly[key],
      };
    });
  }, [completedOrders]);

  const serviceOrdersByMonthData = useMemo(() => {
    const monthly: { [key: string]: number } = {};
    completedOrders.filter(o => o.type === 'service-order').forEach(o => {
      const d = new Date(o.createdAt);
      const k = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      monthly[k] = (monthly[k] || 0) + (Number(o.total) || 0);
    });
    return Object.keys(monthly).sort().map(key => {
      const [y, m] = key.split('-');
      return {
        month: new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short' }),
        total: monthly[key],
      };
    });
  }, [completedOrders]);

  const topProductsData = useMemo(() => salesByProduct.slice(0, 5), [salesByProduct]);

  // ========== ESTOQUE ==========
  const totalFinishedProductsCostValue = useMemo(() =>
    products.reduce((sum, p) => sum + (p.stock * p.costPrice), 0),
    [products]
  );

  const totalFinishedProductsSaleValue = useMemo(() =>
    products.reduce((sum, p) => sum + (p.stock * p.price), 0),
    [products]
  );

  const totalRawMaterialValue = useMemo(() =>
    rawMaterials.reduce((sum, r) => sum + (r.quantity * r.costPerUnit), 0),
    [rawMaterials]
  );

  const lowStockProducts = useMemo(() =>
    products.filter(p => p.minStock !== undefined && p.stock <= p.minStock),
    [products]
  );

  const lowStockMaterials = useMemo(() =>
    rawMaterials.filter(r => r.minStock !== undefined && r.quantity <= r.minStock),
    [rawMaterials]
  );

  // ========== PRODUÇÃO ==========
  const totalBudgetsCount = useMemo(() =>
    filteredOrders.filter(o => o.type === 'budget').length,
    [filteredOrders]
  );

  const averageProductionTime = useMemo(() => {
    const completed = completedOrders.filter(o =>
      o.type === 'service-order' && o.updatedAt && o.createdAt
    );
    if (completed.length === 0) return 0;
    const totalMs = completed.reduce((sum, o) => {
      return sum + (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime());
    }, 0);
    return Math.round(totalMs / completed.length / (1000 * 60 * 60 * 24));
  }, [completedOrders]);

  // ========== CLIENTES ==========
  const clientRanking = useMemo(() => {
    const map: { [key: string]: { name: string; orders: number; total: number } } = {};
    completedOrders.forEach(o => {
      const key = o.clientCpf || o.clientName;
      if (!map[key]) map[key] = { name: o.clientName, orders: 0, total: 0 };
      map[key].orders++;
      map[key].total += Number(o.total) || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [completedOrders]);

  const inactiveClients = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeCpfs = new Set(
      orders
        .filter(o => new Date(o.createdAt) > thirtyDaysAgo)
        .map(o => o.clientCpf)
        .filter(Boolean)
    );
    return clients.filter(c => c.cpf && !activeCpfs.has(c.cpf));
  }, [clients, orders]);

  // ========== ORÇAMENTOS ==========
  const budgetStats = useMemo(() => {
    const budgets = filteredOrders.filter(o => o.type === 'budget');
    const approved = budgets.filter(o =>
      o.status === OrderStatus.COMPLETED || o.status === OrderStatus.DELIVERED
    ).length;
    const pending = budgets.filter(o =>
      o.status === OrderStatus.PENDING || o.status === OrderStatus.IN_PROGRESS
    ).length;
    const total = budgets.length;
    const rate = total > 0 ? (approved / total) * 100 : 0;
    return { total, approved, pending, rate };
  }, [filteredOrders]);

  // ========== AI SUMMARY ==========
  const handleGenerateSummary = async () => {
    if (!canGenerateAISummary) {
      alert('Você não tem permissão para gerar o resumo com IA.');
      return;
    }
    setIsLoadingSummary(true);
    const reportContent = `
      Relatório Completo de Atividades:
      --- Financeiro ---
      Receita Total: ${formatCurrency(totalRevenue)}
      Custos Totais: ${formatCurrency(totalProductCosts)}
      Lucro/Prejuízo: ${formatCurrency(profitLoss)}
      Fluxo de Caixa: ${formatCurrency(cashFlow)}
      Contas a Receber (Pendentes): ${formatCurrency(pendingReceivables)}
      --- Vendas ---
      Vendas Diretas: ${formatCurrency(totalDirectSalesValue)} (${completedDirectSalesCount} pedidos)
      Ordens de Serviço: ${formatCurrency(totalServiceOrdersValue)} (${completedServiceOrdersCount} pedidos)
      Ticket Médio: ${formatCurrency(averageTicket)}
      --- Estoque ---
      Produtos Acabados: ${formatCurrency(totalFinishedProductsCostValue)} | Matéria Prima: ${formatCurrency(totalRawMaterialValue)}
      Produtos com Estoque Baixo: ${lowStockProducts.length}
      Matérias-Primas com Estoque Baixo: ${lowStockMaterials.length}
      --- Produção ---
      Custo Total de Produção: ${formatCurrency(totalProductionCosts)}
      Tempo Médio de Produção: ${averageProductionTime} dias
      --- Clientes ---
      Total de Clientes Ativos: ${clientRanking.length} | Inativos (30 dias): ${inactiveClients.length}
      Top Cliente: ${clientRanking.length > 0 ? `${clientRanking[0].name} (${formatCurrency(clientRanking[0].total)})` : 'N/A'}
      --- Orçamentos ---
      Total: ${budgetStats.total} | Aprovados: ${budgetStats.approvados} | Pendentes: ${budgetStats.pending}
      Taxa de Aprovação: ${budgetStats.rate.toFixed(1)}%
    `;
    try {
      const summary = await summarizeReport(reportContent, companyInfo.geminiApiKey, companyInfo.geminiModelText);
      setReportSummary(summary);
      setIsSummaryModalOpen(true);
    } catch (error) {
      alert('Erro ao gerar resumo com Gemini AI.');
      console.error(error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // ========== EXCEL EXPORT ==========
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Aba 1: Resumo Geral
    const resumoData = [
      { 'Métrica': 'Receita Total', 'Valor': totalRevenue },
      { 'Métrica': 'Custos Totais', 'Valor': totalProductCosts },
      { 'Métrica': 'Lucro/Prejuízo', 'Valor': profitLoss },
      { 'Métrica': 'Fluxo de Caixa', 'Valor': cashFlow },
      { 'Métrica': 'Contas a Receber (Pendentes)', 'Valor': pendingReceivables },
      { 'Métrica': 'Vendas Diretas', 'Valor': totalDirectSalesValue },
      { 'Métrica': 'Ordens de Serviço', 'Valor': totalServiceOrdersValue },
      { 'Métrica': 'Ticket Médio', 'Valor': averageTicket },
      { 'Métrica': 'Custo Total de Produção', 'Valor': totalProductionCosts },
      { 'Métrica': 'Tempo Médio de Produção (dias)', 'Valor': averageProductionTime },
      { 'Métrica': 'Produtos Acabados (Custo)', 'Valor': totalFinishedProductsCostValue },
      { 'Métrica': 'Produtos Acabados (Venda)', 'Valor': totalFinishedProductsSaleValue },
      { 'Métrica': 'Matéria Prima em Estoque', 'Valor': totalRawMaterialValue },
      { 'Métrica': 'Produtos com Estoque Baixo', 'Valor': lowStockProducts.length },
      { 'Métrica': 'Matérias-Primas com Estoque Baixo', 'Valor': lowStockMaterials.length },
      { 'Métrica': 'Total de Clientes Ativos', 'Valor': clientRanking.length },
      { 'Métrica': 'Clientes Inativos (30 dias)', 'Valor': inactiveClients.length },
      { 'Métrica': 'Total de Orçamentos', 'Valor': budgetStats.total },
      { 'Métrica': 'Orçamentos Pendentes', 'Valor': budgetStats.pending },
      { 'Métrica': 'Taxa de Aprovação Orçamentos (%)', 'Valor': budgetStats.rate.toFixed(1) },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Geral');

    // Aba 2: Vendas por Mês
    if (directSalesByMonthData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(directSalesByMonthData.map(d => ({ 'Mês': d.month, 'Valor': d.sales })));
      ws['!cols'] = [{ wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Vendas por Mês');
    }

    // Aba 3: OS por Mês
    if (serviceOrdersByMonthData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(serviceOrdersByMonthData.map(d => ({ 'Mês': d.month, 'Valor': d.total })));
      ws['!cols'] = [{ wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'OS por Mês');
    }

    // Aba 4: Top Produtos
    if (salesByProduct.length > 0) {
      const ws = XLSX.utils.json_to_sheet(salesByProduct.map((d, i) => ({
        'Ranking': i + 1, 'Produto': d.name, 'Quantidade': d.quantity, 'Faturamento': d.revenue
      })));
      ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Vendas por Produto');
    }

    // Aba 5: Vendedores
    if (salesBySeller.length > 0) {
      const ws = XLSX.utils.json_to_sheet(salesBySeller.map(d => ({
        'Vendedor': d.name, 'Pedidos': d.count, 'Faturamento': d.revenue
      })));
      ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Vendedores');
    }

    // Aba 6: Ranking de Clientes
    if (clientRanking.length > 0) {
      const ws = XLSX.utils.json_to_sheet(clientRanking.map((d, i) => ({
        'Ranking': i + 1, 'Cliente': d.name, 'Pedidos': d.orders, 'Total Gasto': d.total
      })));
      ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 12 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Ranking Clientes');
    }

    // Aba 7: Clientes Inativos
    if (inactiveClients.length > 0) {
      const ws = XLSX.utils.json_to_sheet(inactiveClients.map(c => ({
        'Nome': c.name, 'CPF': c.cpf, 'Contato': c.contact, 'Cidade': c.city
      })));
      ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes Inativos');
    }

    // Aba 8: Estoque Baixo
    const lowStockData = [
      ...lowStockProducts.map(p => ({
        'Tipo': 'Produto Acabado', 'Nome': p.name, 'Estoque Atual': p.stock,
        'Estoque Mínimo': p.minStock || 0, 'Status': p.stock === 0 ? 'SEM ESTOQUE' : 'BAIXO'
      })),
      ...lowStockMaterials.map(r => ({
        'Tipo': 'Matéria-Prima', 'Nome': r.name, 'Estoque Atual': r.quantity,
        'Estoque Mínimo': r.minStock || 0, 'Status': r.quantity === 0 ? 'SEM ESTOQUE' : 'BAIXO'
      }))
    ];
    if (lowStockData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(lowStockData);
      ws['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Estoque Baixo');
    }

    // Aba 9: Detalhamento Ordens
    if (filteredOrders.length > 0) {
      const ws = XLSX.utils.json_to_sheet(filteredOrders.map(o => ({
        'ID': o.id,
        'Tipo': o.type === 'sale' ? 'Venda' : o.type === 'service-order' ? 'O.S.' : o.type === 'budget' ? 'Orçamento' : o.type === 'balance_inflow' ? 'Entrada' : 'Saída',
        'Data': new Date(o.createdAt).toLocaleString('pt-BR'),
        'Cliente': o.clientName,
        'Total': o.total,
        'Status': o.status,
        'Vendedor': o.sellerName || 'N/A'
      })));
      ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Detalhamento Ordens');
    }

    const dateFilter = startDate && endDate ? `${startDate}_ate_${endDate}` : 'completo';
    XLSX.writeFile(wb, `relatorio_completo_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Relatórios de Atividade</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleExportExcel} variant="outline" icon={<Download className="h-5 w-5" />}>
            Exportar Excel
          </Button>
          <Button onClick={handleGenerateSummary} isLoading={isLoadingSummary} icon={<Brain className="h-5 w-5" />} disabled={!canGenerateAISummary}>
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
          <Input id="startDate" label="Data Início" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} containerClassName="mb-0 flex-1" />
          <Input id="endDate" label="Data Fim" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} containerClassName="mb-0 flex-1" />
          <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); }} className="mb-4">Limpar Filtro</Button>
        </div>
        {(startDate || endDate) && (
          <p className="text-sm text-gray-500 mt-2">
            Exibindo dados de {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'início'} até {endDate ? new Date(endDate + 'T23:59:59').toLocaleDateString('pt-BR') : 'atual'}
          </p>
        )}
      </div>

      {/* ========== FINANCEIRO ========== */}
      <h3 className="text-xl font-bold text-gray-700 mb-4 mt-8 border-b pb-2">Financeiro</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <ReportCard title="Receita Total" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="h-8 w-8" />} color="green" description="Soma de todas as vendas e O.S. concluídas." />
        <ReportCard title="Custos Totais" value={formatCurrency(totalProductCosts)} icon={<Factory className="h-8 w-8" />} color="red" description="Custo de produtos vendidos + produção." />
        <ReportCard title="Lucro / Prejuízo" value={formatCurrency(profitLoss)} icon={<DollarSign className="h-8 w-8" />} color={profitLoss >= 0 ? 'green' : 'red'} description="Receita menos custos." />
        <ReportCard title="Fluxo de Caixa" value={formatCurrency(cashFlow)} icon={<BarChart3 className="h-8 w-8" />} color="blue" description="Entradas menos saídas." />
        <ReportCard title="Contas a Receber" value={formatCurrency(pendingReceivables)} icon={<Clock className="h-8 w-8" />} color="yellow" description="Valores pendentes de recebimento." />
      </div>

      {/* ========== VENDAS ========== */}
      <h3 className="text-xl font-bold text-gray-700 mb-4 mt-8 border-b pb-2">Vendas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
        <ReportCard title="Vendas Diretas" value={formatCurrency(totalDirectSalesValue)} icon={<ShoppingCart className="h-8 w-8" />} color="green" description={`${completedDirectSalesCount} pedidos concluídos.`} />
        <ReportCard title="Ordens de Serviço" value={formatCurrency(totalServiceOrdersValue)} icon={<ShoppingBag className="h-8 w-8" />} color="blue" description={`${completedServiceOrdersCount} O.S. concluídas.`} />
        <ReportCard title="Ticket Médio" value={formatCurrency(averageTicket)} icon={<DollarSign className="h-8 w-8" />} color="purple" description="Valor médio por pedido." />
        <ReportCard title="Vendas Pendentes" value={pendingDirectSalesCount} icon={<Clock className="h-8 w-8" />} color="yellow" description="Aguardando finalização." />
        <ReportCard title="O.S. Pendentes" value={pendingServiceOrdersCount} icon={<Clock className="h-8 w-8" />} color="orange" description="Aguardando finalização." />
      </div>

      {/* Vendedores */}
      {salesBySeller.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h4 className="font-semibold text-gray-700 mb-3">Vendas por Vendedor</h4>
          <div className="space-y-2">
            {salesBySeller.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-gray-600">{s.count} pedidos - {formatCurrency(s.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== ESTOQUE ========== */}
      <h3 className="text-xl font-bold text-gray-700 mb-4 mt-8 border-b pb-2">Estoque</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <ReportCard title="Produtos Acabados (Custo)" value={formatCurrency(totalFinishedProductsCostValue)} icon={<Package className="h-8 w-8" />} color="red" description={`${products.length} produtos cadastrados.`} />
        <ReportCard title="Produtos Acabados (Venda)" value={formatCurrency(totalFinishedProductsSaleValue)} icon={<Package className="h-8 w-8" />} color="green" description="Valor de venda do estoque." />
        <ReportCard title="Matéria Prima" value={formatCurrency(totalRawMaterialValue)} icon={<Factory className="h-8 w-8" />} color="blue" description={`${rawMaterials.length} itens cadastrados.`} />
        <ReportCard title="Estoque Baixo" value={lowStockProducts.length + lowStockMaterials.length} icon={<AlertTriangle className="h-8 w-8" />} color="yellow" description={`${lowStockProducts.length} produtos + ${lowStockMaterials.length} matérias-primas.`} />
      </div>

      {/* Itens com Estoque Baixo */}
      {lowStockProducts.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <h4 className="font-semibold text-red-600 mb-3">Produtos com Estoque Baixo</h4>
          <div className="space-y-2">
            {lowStockProducts.map(p => (
              <div key={p.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                <span>{p.name}</span>
                <span className={`font-bold ${p.stock === 0 ? 'text-red-700' : 'text-yellow-600'}`}>
                  {p.stock === 0 ? 'SEM ESTOQUE' : `${p.stock} un. (mín: ${p.minStock})`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {lowStockMaterials.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-4">
          <h4 className="font-semibold text-yellow-600 mb-3">Matérias-Primas com Estoque Baixo</h4>
          <div className="space-y-2">
            {lowStockMaterials.map(r => (
              <div key={r.id} className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                <span>{r.name}</span>
                <span className={`font-bold ${r.quantity === 0 ? 'text-red-700' : 'text-yellow-600'}`}>
                  {r.quantity === 0 ? 'SEM ESTOQUE' : `${r.quantity} ${r.unit} (mín: ${r.minStock})`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== PRODUÇÃO ========== */}
      <h3 className="text-xl font-bold text-gray-700 mb-4 mt-8 border-b pb-2">Produção</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ReportCard title="Custo Total de Produção" value={formatCurrency(totalProductionCosts)} icon={<Factory className="h-8 w-8" />} color="red" description="Matéria-prima e mão de obra." />
        <ReportCard title="Tempo Médio de Produção" value={`${averageProductionTime} dias`} icon={<Clock className="h-8 w-8" />} color="blue" description="Média de conclusão das O.S." />
        <ReportCard title="Total de Orçamentos" value={totalBudgetsCount} icon={<ScrollText className="h-8 w-8" />} color="purple" description="Orçamentos registrados no período." />
      </div>

      {/* ========== CLIENTES ========== */}
      <h3 className="text-xl font-bold text-gray-700 mb-4 mt-8 border-b pb-2">Clientes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ReportCard title="Clientes Ativos" value={clientRanking.length} icon={<Users className="h-8 w-8" />} color="green" description="Compras no período selecionado." />
        <ReportCard title="Clientes Inativos" value={inactiveClients.length} icon={<UserCheck className="h-8 w-8" />} color="yellow" description="Sem compras nos últimos 30 dias." />
      </div>

      {/* Ranking de Clientes */}
      {clientRanking.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <h4 className="font-semibold text-gray-700 mb-3">Ranking de Clientes (por valor gasto)</h4>
          <div className="space-y-2">
            {clientRanking.slice(0, 10).map((c, i) => (
              <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-indigo-600 w-6">{i + 1}º</span>
                  <span className="font-medium">{c.name}</span>
                </div>
                <span className="text-sm text-gray-600">{c.orders} pedidos - {formatCurrency(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== ORÇAMENTOS ========== */}
      <h3 className="text-xl font-bold text-gray-700 mb-4 mt-8 border-b pb-2">Orçamentos</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ReportCard title="Total de Orçamentos" value={budgetStats.total} icon={<ScrollText className="h-8 w-8" />} color="blue" description="Registrados no período." />
        <ReportCard title="Orçamentos Pendentes" value={budgetStats.pending} icon={<Clock className="h-8 w-8" />} color="yellow" description="Aguardando aprovação." />
        <ReportCard title="Taxa de Aprovação" value={`${budgetStats.rate.toFixed(1)}%`} icon={<Percent className="h-8 w-8" />} color="green" description={`${budgetStats.approvados} aprovados de ${budgetStats.total}.`} />
      </div>

      {/* ========== GRÁFICOS ========== */}
      <h3 className="text-xl font-bold text-gray-700 mb-4 mt-8 border-b pb-2">Gráficos</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vendas Diretas por Mês</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={directSalesByMonthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Ordens de Serviço por Mês</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceOrdersByMonthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top 5 Produtos por Faturamento</h3>
          <div className="space-y-4">
            {topProductsData.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum dado disponível.</p>
            ) : topProductsData.map((product, index) => {
              const totalRev = topProductsData.reduce((s, p) => s + p.revenue, 0);
              const pct = totalRev > 0 ? ((product.revenue / totalRev) * 100).toFixed(1) : '0.0';
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold rounded-full">{index + 1}</div>
                    <div>
                      <p className="font-medium text-gray-800">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.quantity} unidades vendidas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(product.revenue)}</p>
                    <p className="text-sm font-medium text-indigo-600">{pct}% do total</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal isOpen={isSummaryModalOpen} onClose={() => setIsSummaryModalOpen(false)} title="Resumo do Relatório (Gerado por IA)" size="lg">
        {reportSummary ? (
          <p className="whitespace-pre-wrap text-gray-800">{reportSummary}</p>
        ) : (
          <p className="text-gray-600">Nenhum resumo disponível.</p>
        )}
      </Modal>
    </div>
  );
};
