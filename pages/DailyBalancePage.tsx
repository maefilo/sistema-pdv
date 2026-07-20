import React, { useState, useMemo } from 'react';
import { useAuth } from '../App';
import { OrderStatus, Order, PaymentEntry } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input, Select, Textarea } from '../components/Input';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  ReceiptText,
  Printer,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Trash2,
} from 'lucide-react';

// --- Helpers ---
const toDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateBR = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
};

const PAYMENT_COLORS: Record<string, string> = {
  Dinheiro:          'bg-green-100 text-green-800 border-green-200',
  PIX:               'bg-sky-100 text-sky-800 border-sky-200',
  Débito:            'bg-blue-100 text-blue-800 border-blue-200',
  Crédito:           'bg-purple-100 text-purple-800 border-purple-200',
  'Crédito Parcelado':'bg-indigo-100 text-indigo-800 border-indigo-200',
  Pendente:          'bg-yellow-100 text-yellow-800 border-yellow-200',
};

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue' | 'indigo' | 'yellow';
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const COLOR_MAP = {
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'bg-green-100 text-green-600',  text: 'text-green-700'  },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'bg-red-100 text-red-600',      text: 'text-red-700'    },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-100 text-blue-600',    text: 'text-blue-700'   },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600',text: 'text-indigo-700' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-600',text: 'text-yellow-700' },
};

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, color, sub, trend }) => {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} p-5 flex items-start gap-4 shadow-sm`}>
      <div className={`rounded-full p-3 ${c.icon} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-0.5">{title}</p>
        <p className={`text-xl font-bold ${c.text} leading-tight`}>{value}</p>
        {sub && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
};

export const DailyBalancePage: React.FC = () => {
  const { orders, products, addOrder, deleteOrder } = useAuth();

  const today = toDateString(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'balance_inflow' | 'balance_outflow'>('balance_inflow');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [entryDate, setEntryDate] = useState(today);
  const [observation, setObservation] = useState('');

  // Navigate by single day
  const shiftDay = (direction: -1 | 1) => {
    const base = new Date(startDate + 'T12:00:00');
    base.setDate(base.getDate() + direction);
    const ds = toDateString(base);
    setStartDate(ds);
    setEndDate(ds);
  };

  const isSingleDay = startDate === endDate;

  // --- Filter: only COMPLETED/DELIVERED direct sales in date range ---
  const periodSales: Order[] = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T23:59:59');

    return orders.filter(o => {
      if (o.type !== 'sale') return false;
      if (o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.DELIVERED) return false;
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, startDate, endDate]);

  // --- Filter: manual inflows in date range ---
  const periodInflows: Order[] = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T23:59:59');

    return orders.filter(o => {
      if (o.type !== 'balance_inflow') return false;
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, startDate, endDate]);

  // --- Filter: manual outflows in date range ---
  const periodOutflows: Order[] = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T23:59:59');

    return orders.filter(o => {
      if (o.type !== 'balance_outflow') return false;
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, startDate, endDate]);

  // --- Sales Revenue ---
  const grossRevenue = useMemo(() =>
    periodSales.reduce((s, o) => s + (Number(o.total) || 0), 0),
  [periodSales]);

  // --- Other Inflows ---
  const otherInflows = useMemo(() =>
    periodInflows.reduce((s, o) => s + (Number(o.total) || 0), 0),
  [periodInflows]);

  // --- Expenses / Outflows ---
  const totalOutflows = useMemo(() =>
    periodOutflows.reduce((s, o) => s + (Number(o.total) || 0), 0),
  [periodOutflows]);

  // --- CMV (Custo das Mercadorias Vendidas) ---
  const cmv = useMemo(() => {
    const costMap: Record<string, number> = {};
    products.forEach(p => { costMap[p.id] = p.costPrice || 0; });
    return periodSales.reduce((sum, order) => {
      return sum + order.items.reduce((s, item) => {
        const cost = costMap[item.id] ?? item.costPrice ?? 0;
        return s + cost * item.quantity;
      }, 0);
    }, 0);
  }, [periodSales, products]);

  const grossProfit  = grossRevenue - cmv;
  const netResult    = grossProfit + otherInflows - totalOutflows;
  const profitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

  // --- Payments by method ---
  const paymentBreakdown = useMemo(() => {
    const acc: Record<string, number> = {};
    
    // POS Sales payments
    periodSales.forEach(o => {
      if (o.payments && o.payments.length > 0) {
        o.payments.forEach((p: PaymentEntry) => {
          acc[p.method] = (acc[p.method] || 0) + (Number(p.amount) || 0);
        });
      } else if (o.paymentMethod) {
        acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + (Number(o.total) || 0);
      }
    });

    // Manual Inflows payments
    periodInflows.forEach(o => {
      const method = o.paymentMethod || 'Dinheiro';
      acc[method] = (acc[method] || 0) + (Number(o.total) || 0);
    });

    return Object.entries(acc)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodSales, periodInflows]);

  const totalReceived = useMemo(() => 
    paymentBreakdown.reduce((s, p) => s + p.amount, 0),
  [paymentBreakdown]);

  // --- Chronological Unified Transactions List ---
  const allTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      time: string;
      createdAt: string;
      type: 'sale' | 'balance_inflow' | 'balance_outflow';
      description: string;
      paymentMethod: string;
      amount: number;
    }> = [];

    periodSales.forEach(o => {
      const methods = o.payments && o.payments.length > 0
        ? [...new Set(o.payments.map(p => p.method))].join(' + ')
        : (o.paymentMethod || '—');

      list.push({
        id: o.id,
        time: new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        createdAt: o.createdAt,
        type: 'sale',
        description: o.clientName || 'Consumidor Final',
        paymentMethod: methods,
        amount: o.total,
      });
    });

    periodInflows.forEach(o => {
      list.push({
        id: o.id,
        time: new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        createdAt: o.createdAt,
        type: 'balance_inflow',
        description: o.clientName, // Store entry description in clientName
        paymentMethod: o.paymentMethod || 'Dinheiro',
        amount: o.total,
      });
    });

    periodOutflows.forEach(o => {
      list.push({
        id: o.id,
        time: new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        createdAt: o.createdAt,
        type: 'balance_outflow',
        description: o.clientName, // Store entry description in clientName
        paymentMethod: o.paymentMethod || 'Dinheiro',
        amount: o.total,
      });
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [periodSales, periodInflows, periodOutflows]);

  // --- Action handlers ---
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amountStr.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      alert('Por favor, insira um valor válido maior que zero.');
      return;
    }
    if (!description.trim()) {
      alert('Por favor, insira uma descrição para o lançamento.');
      return;
    }

    let createdAtIso = new Date().toISOString();
    if (entryDate !== today) {
      createdAtIso = new Date(entryDate + 'T12:00:00').toISOString();
    }

    const newEntry: Order = {
      id: '', // Will be set in App.tsx addOrder
      type: entryType,
      clientName: description,
      clientContact: '',
      clientCpf: '',
      clientZipCode: '',
      clientStreet: '',
      clientNumber: '',
      clientNeighborhood: '',
      clientCity: '',
      clientState: '',
      items: [],
      total: value,
      paymentMethod: paymentMethod,
      payments: [
        {
          id: '1',
          method: paymentMethod,
          amount: value
        }
      ],
      status: OrderStatus.COMPLETED,
      observation: observation,
      createdAt: createdAtIso,
      updatedAt: createdAtIso
    };

    try {
      addOrder(newEntry);
      setIsModalOpen(false);
      // Reset Form
      setDescription('');
      setAmountStr('');
      setPaymentMethod('Dinheiro');
      setObservation('');
    } catch (err: any) {
      alert('Erro ao salvar lançamento: ' + err.message);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm('Tem certeza de que deseja excluir este lançamento?')) {
      try {
        await deleteOrder(id);
      } catch (err: any) {
        alert('Erro ao excluir lançamento: ' + err.message);
      }
    }
  };

  // --- Print ---
  const handlePrint = () => {
    const dateLabel = isSingleDay
      ? formatDateBR(startDate)
      : `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`;

    const paymentRows = paymentBreakdown
      .map(p => `<tr><td>${p.method}</td><td style="text-align:right">${formatCurrency(p.amount)}</td><td style="text-align:right">${totalReceived > 0 ? ((p.amount / totalReceived) * 100).toFixed(1) : '0.0'}%</td></tr>`)
      .join('');

    const txRows = allTransactions
      .map(t => {
        let typeLabel = '';
        let amountStyle = '';
        if (t.type === 'sale') {
          typeLabel = 'Venda';
        } else if (t.type === 'balance_inflow') {
          typeLabel = 'Entrada Manual';
        } else {
          typeLabel = 'Saída / Despesa';
          amountStyle = 'color: #dc2626; font-weight: bold;';
        }

        const displayAmount = t.type === 'balance_outflow' ? `-${formatCurrency(t.amount)}` : formatCurrency(t.amount);

        return `<tr>
          <td>${t.time}</td>
          <td>${t.id}</td>
          <td>[${typeLabel}] ${t.description}</td>
          <td style="text-align:right; ${amountStyle}">${displayAmount}</td>
          <td>${t.paymentMethod}</td>
        </tr>`;
      }).join('');

    const w = window.open('', '', 'width=900,height=700');
    if (!w) return;
    w.document.write(`
      <html><head><title>Balancete ${dateLabel}</title>
      <style>
        body { font-family: sans-serif; margin: 24px; color: #111; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; }
        .card .label { font-size: 11px; color: #666; text-transform: uppercase; }
        .card .val { font-size: 18px; font-weight: bold; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
        th { background: #f5f5f5; }
        .footer { margin-top: 32px; font-size: 11px; color: #888; text-align: center; }
        @media print { button { display: none; } }
      </style>
      </head><body>
      <h1>Balancete — ${dateLabel}</h1>
      <p style="color:#666; font-size:13px">Resumo Diário (Vendas Diretas + Lançamentos Manuais)</p>
      <div class="cards">
        <div class="card"><div class="label">Faturamento Vendas</div><div class="val">${formatCurrency(grossRevenue)}</div></div>
        <div class="card"><div class="label">Outras Entradas</div><div class="val">${formatCurrency(otherInflows)}</div></div>
        <div class="card"><div class="label">Custo (CMV)</div><div class="val">${formatCurrency(cmv)}</div></div>
        <div class="card"><div class="label">Despesas / Saídas</div><div class="val">${formatCurrency(totalOutflows)}</div></div>
        <div class="card"><div class="label">Resultado Líquido</div><div class="val">${formatCurrency(netResult)}</div></div>
        <div class="card"><div class="label">Total Recebido</div><div class="val">${formatCurrency(totalReceived)}</div></div>
      </div>
      <h2>Recebimentos por Forma de Pagamento (Vendas + Outras Entradas)</h2>
      <table><thead><tr><th>Forma</th><th style="text-align:right">Valor</th><th style="text-align:right">% Recebido</th></tr></thead>
      <tbody>${paymentRows || '<tr><td colspan="3" style="text-align:center">Sem dados</td></tr>'}</tbody></table>
      <h2>Transações do Período</h2>
      <table><thead><tr><th>Hora</th><th>ID</th><th>Lançamento / Cliente</th><th style="text-align:right">Valor</th><th>Pagamento</th></tr></thead>
      <tbody>${txRows || '<tr><td colspan="5" style="text-align:center">Nenhum registro no período</td></tr>'}</tbody></table>
      <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const dateLabel = isSingleDay
    ? (startDate === today ? 'Hoje' : formatDateBR(startDate))
    : `${formatDateBR(startDate)} → ${formatDateBR(endDate)}`;

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Balancete Diário</h2>
          <p className="text-gray-500 text-sm mt-1">Resumo das vendas diretas concluídas e lançamentos de caixa</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="primary"
            onClick={() => {
              setEntryDate(startDate);
              setIsModalOpen(true);
            }}
            icon={<PlusCircle className="h-4 w-4" />}
          >
            Novo Lançamento
          </Button>
          <Button
            variant="secondary"
            onClick={handlePrint}
            icon={<Printer className="h-4 w-4" />}
            disabled={allTransactions.length === 0}
          >
            Imprimir Balancete
          </Button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          {/* Single-day quick nav */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDay(-1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              title="Dia anterior"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5">
              <CalendarDays className="h-4 w-4 text-indigo-600" />
              <span className="font-semibold text-indigo-800 text-sm">{dateLabel}</span>
            </div>
            <button
              onClick={() => shiftDay(1)}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              disabled={startDate === today}
              title="Próximo dia"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Date range inputs */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Data Início</label>
              <input
                type="date"
                value={startDate}
                max={today}
                onChange={e => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Data Fim</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={e => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <button
              onClick={() => { setStartDate(today); setEndDate(today); }}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium pb-2"
            >
              Ir para hoje
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard
          title="Vendas (Receita)"
          value={formatCurrency(grossRevenue)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
          sub={`${periodSales.length} venda${periodSales.length !== 1 ? 's' : ''}`}
        />
        <SummaryCard
          title="Outras Entradas"
          value={formatCurrency(otherInflows)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
          sub={`${periodInflows.length} lançamento${periodInflows.length !== 1 ? 's' : ''}`}
        />
        <SummaryCard
          title="CMV (Custos)"
          value={formatCurrency(cmv)}
          icon={<TrendingDown className="h-6 w-6" />}
          color="red"
          sub="Custo prod. das vendas"
        />
        <SummaryCard
          title="Despesas / Saídas"
          value={formatCurrency(totalOutflows)}
          icon={<TrendingDown className="h-6 w-6" />}
          color="red"
          sub={`${periodOutflows.length} despesa${periodOutflows.length !== 1 ? 's' : ''}`}
        />
        <SummaryCard
          title="Resultado Líquido"
          value={formatCurrency(netResult)}
          icon={<DollarSign className="h-6 w-6" />}
          color={netResult >= 0 ? 'indigo' : 'red'}
          sub={`Margem Vendas: ${profitMargin.toFixed(1)}%`}
          trend={netResult >= 0 ? 'up' : 'down'}
        />
        <SummaryCard
          title="Total Recebido"
          value={formatCurrency(totalReceived)}
          icon={<DollarSign className="h-6 w-6" />}
          color="blue"
          sub="Vendas + Entradas"
        />
      </div>

      {/* Two column layout: payments + transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Payment Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-indigo-500" />
            Recebimentos por Forma
          </h3>
          {paymentBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nenhum recebimento no período.</p>
          ) : (
            <div className="space-y-3">
              {paymentBreakdown.map(({ method, amount }) => {
                const pct = totalReceived > 0 ? (amount / totalReceived) * 100 : 0;
                const colorClass = PAYMENT_COLORS[method] || 'bg-gray-100 text-gray-700 border-gray-200';
                return (
                  <div key={method} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
                        {method}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-gray-800">{formatCurrency(amount)}</span>
                        <span className="text-xs text-gray-400 ml-2">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600">Total</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(totalReceived)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Transactions List */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-indigo-500" />
            Transações do Período
            <span className="ml-auto text-xs font-normal text-gray-400">
              {allTransactions.length} registro{allTransactions.length !== 1 ? 's' : ''}
            </span>
          </h3>

          {allTransactions.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nenhum lançamento ou venda direta concluída neste período.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[420px] pr-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Hora</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Lançamento / Cliente</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Pagamento</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allTransactions.map(tx => {
                    const isManual = tx.type === 'balance_inflow' || tx.type === 'balance_outflow';
                    const isOutflow = tx.type === 'balance_outflow';
                    
                    let typeBadge = '';
                    if (tx.type === 'sale') {
                      typeBadge = 'Venda';
                    } else if (tx.type === 'balance_inflow') {
                      typeBadge = 'Entrada';
                    } else {
                      typeBadge = 'Saída';
                    }

                    const badgeColor = tx.type === 'sale'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : tx.type === 'balance_inflow'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                      : 'bg-rose-50 text-rose-800 border-rose-200 font-semibold';

                    return (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                          {tx.time}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-800 max-w-[180px] truncate">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border mr-2 uppercase ${badgeColor}`}>
                            {typeBadge}
                          </span>
                          {tx.description}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PAYMENT_COLORS[tx.paymentMethod] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${isOutflow ? 'text-red-600' : 'text-gray-900'}`}>
                          {isOutflow ? `- ${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isManual ? (
                            <button
                              onClick={() => handleDeleteEntry(tx.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Excluir lançamento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 bg-white border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 font-semibold text-gray-700">Resultado Líquido do Período</td>
                    <td className={`py-2.5 px-3 text-right font-bold text-xl ${netResult >= 0 ? 'text-indigo-700' : 'text-red-600'}`}>
                      {formatCurrency(netResult)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CMV Detail note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-3">
        <span className="text-lg">💡</span>
        <div>
          <strong>Sobre o CMV (Custo das Mercadorias Vendidas):</strong> O valor é calculated com base no
          <em> preço de custo atual</em> dos produtos. Para histórico exato, recomenda-se salvar o custo no momento
          da venda — uma melhoria futura possível.
        </div>
      </div>

      {/* Add Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Adicionar Lançamento Manual"
        hideFooter
      >
        <form onSubmit={handleAddEntry} className="space-y-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setEntryType('balance_inflow')}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg border text-center transition-all ${
                entryType === 'balance_inflow'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              📈 Entrada (Receita)
            </button>
            <button
              type="button"
              onClick={() => setEntryType('balance_outflow')}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg border text-center transition-all ${
                entryType === 'balance_outflow'
                  ? 'bg-rose-50 text-rose-800 border-rose-400 ring-2 ring-rose-200'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              📉 Saída (Despesa)
            </button>
          </div>

          <Input
            id="entry-desc"
            label="Descrição / Categoria"
            placeholder="Ex: Conta de Luz, Ajuste de Caixa, Compra de Tecidos"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="entry-amount"
              label="Valor (R$)"
              placeholder="0,00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              required
            />

            <Select
              id="entry-payment-method"
              label="Forma de Pagamento"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              options={[
                { value: 'Dinheiro', label: 'Dinheiro' },
                { value: 'PIX', label: 'PIX' },
                { value: 'Débito', label: 'Débito' },
                { value: 'Crédito', label: 'Crédito' },
                { value: 'Crédito Parcelado', label: 'Crédito Parcelado' },
              ]}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data do Lançamento
            </label>
            <input
              type="date"
              max={today}
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>

          <Textarea
            id="entry-obs"
            label="Observação (Opcional)"
            placeholder="Detalhes adicionais sobre o lançamento..."
            value={observation}
            onChange={e => setObservation(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Salvar Lançamento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
