import React, { useMemo, useState } from 'react';
import { useAuth } from '../App';
import { formatCurrency } from '../utils/currencyFormatter';
import { ReportCard } from '../components/ReportCard';
import { TrendingUp, Package, ShoppingBag, Truck, DollarSign, AlertTriangle } from 'lucide-react';
import { OrderStatus, Product, RawMaterial } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export const DashboardPage: React.FC = () => {
  const { products, orders, rawMaterials, updateProduct, updateRawMaterial } = useAuth();

  const [selectedProductToUpdate, setSelectedProductToUpdate] = useState<Product | null>(null);
  const [selectedRawMaterialToUpdate, setSelectedRawMaterialToUpdate] = useState<RawMaterial | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState('');

  const handleUpdateProductStock = () => {
    if (selectedProductToUpdate) {
      const newStock = parseFloat(newStockQuantity);
      if (!isNaN(newStock)) {
        updateProduct({ ...selectedProductToUpdate, stock: newStock });
        setSelectedProductToUpdate(null);
      } else {
        alert('Valor inválido para o estoque.');
      }
    }
  };

  const handleUpdateRawMaterialStock = () => {
    if (selectedRawMaterialToUpdate) {
      const newStock = parseFloat(newStockQuantity);
      if (!isNaN(newStock)) {
        updateRawMaterial({ ...selectedRawMaterialToUpdate, quantity: newStock });
        setSelectedRawMaterialToUpdate(null);
      } else {
        alert('Valor inválido para o estoque.');
      }
    }
  };

  // Calculate total sales
  const totalSales = useMemo(() => {
    return orders
      .filter(order => order.type === 'sale' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  // Calculate total value of finished products in stock (based on cost price)
  const totalFinishedProductsCostValue = useMemo(() => {
    return products.reduce((sum, product) => sum + (product.stock * product.costPrice), 0);
  }, [products]);

  // Calculate total value of raw materials in stock
  const totalRawMaterialValue = useMemo(() => {
    return rawMaterials.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);
  }, [rawMaterials]);

  // Calculate number of active orders (only sales and service-orders, not budget or cancelled)
  const activeOrdersCount = useMemo(() => {
    return orders.filter(order =>
      (order.type === 'sale' || order.type === 'service-order') &&
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.CANCELLED
    ).length;
  }, [orders]);

  // Data for sales over time (example: last 7 days)
  const salesData = useMemo(() => {
    const last7DaysSales: { [key: string]: number } = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      last7DaysSales[dateString] = 0;
    }

    orders
      .filter(order => order.type === 'sale' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .forEach(order => {
        const orderDate = new Date(order.createdAt);
        const orderDateString = orderDate.toISOString().split('T')[0];
        if (last7DaysSales.hasOwnProperty(orderDateString)) {
          last7DaysSales[orderDateString] += order.total;
        }
      });

    return Object.keys(last7DaysSales)
      .sort() // Sort dates ascending
      .map(date => {
        const [year, month, day] = date.split('-');
        return {
          date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          sales: last7DaysSales[date],
        };
      });
  }, [orders]);

  // Data for sales by month (12 months)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const salesByMonthData = useMemo(() => {
    const monthlySales: { [key: string]: number } = {};
    const currentYear = selectedYear;
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${currentYear}-${m.toString().padStart(2, '0')}`;
      monthlySales[monthKey] = 0;
    }
    orders
      .filter(order => order.type === 'sale' && (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED))
      .forEach(order => {
        const date = new Date(order.createdAt);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthlySales.hasOwnProperty(monthKey)) {
          monthlySales[monthKey] += Number(order.total) || 0;
        }
      });
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return Object.keys(monthlySales).sort().map((key, i) => ({
      month: months[i],
      sales: monthlySales[key],
    }));
  }, [orders, selectedYear]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    orders.forEach(o => years.add(new Date(o.createdAt).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  // Low stock monitoring
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= (p.minStock || 5));
  }, [products]);

  const lowStockRawMaterials = useMemo(() => {
    return rawMaterials.filter(rm => rm.quantity <= (rm.minStock || 10));
  }, [rawMaterials]);

  const hasLowStock = lowStockProducts.length > 0 || lowStockRawMaterials.length > 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>
      </div>

      {hasLowStock && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800 tracking-tight">Alertas de Estoque Baixo</h3>
              <p className="text-sm text-red-600 opacity-80">Reposição imediata recomendada para os itens abaixo.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lowStockProducts.map(p => (
              <div 
                key={p.id} 
                className="bg-white/60 p-3 rounded-lg flex justify-between items-center border border-red-100 cursor-pointer hover:bg-white hover:shadow-md transition-all"
                onClick={() => {
                  setSelectedProductToUpdate(p);
                  setNewStockQuantity(p.stock.toString());
                }}
                title="Clique para atualizar o estoque"
              >
                <span className="font-medium text-red-900">{p.name} (Produto)</span>
                <span className="text-sm font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                  {p.stock} em estoque <span className="mx-1">•</span> mín: {p.minStock || 5}
                </span>
              </div>
            ))}
            {lowStockRawMaterials.map(rm => (
              <div 
                key={rm.id} 
                className="bg-white/60 p-3 rounded-lg flex justify-between items-center border border-red-100 cursor-pointer hover:bg-white hover:shadow-md transition-all"
                onClick={() => {
                  setSelectedRawMaterialToUpdate(rm);
                  setNewStockQuantity(rm.quantity.toString());
                }}
                title="Clique para atualizar o estoque"
              >
                <span className="font-medium text-red-900">{rm.name} (Matéria Prima)</span>
                <span className="text-sm font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
                  {rm.quantity} {rm.unit} <span className="mx-1">•</span> mín: {rm.minStock || 10}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ReportCard
          title="Vendas Totais"
          value={formatCurrency(totalSales)}
          icon={<TrendingUp className="h-8 w-8" />}
          color="green"
          description="Valor total de vendas concluídas."
        />
        <ReportCard
          title="Produtos Acabados em Estoque (Custo)"
          value={formatCurrency(totalFinishedProductsCostValue)}
          icon={<Package className="h-8 w-8" />}
          color="blue"
          description="Valor total de custo dos produtos prontos para venda."
        />
        <ReportCard
          title="Matéria Prima em Estoque (Valor)"
          value={formatCurrency(totalRawMaterialValue)}
          icon={<DollarSign className="h-8 w-8" />}
          color="yellow"
          description="Valor total da matéria-prima disponível."
        />
        <ReportCard
          title="Pedidos Ativos"
          value={activeOrdersCount}
          icon={<ShoppingBag className="h-8 w-8" />}
          color="purple"
          description="Pedidos em andamento ou pendentes."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vendas nos Últimos 7 Dias</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={salesData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Vendas por Mês</h3>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={salesByMonthData}
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
      </div>

      <Modal
        isOpen={!!selectedProductToUpdate}
        onClose={() => setSelectedProductToUpdate(null)}
        title="Atualizar Estoque"
      >
        <div className="space-y-4 pt-4">
          <p className="text-gray-700">Produto: <strong>{selectedProductToUpdate?.name}</strong></p>
          <Input
            id="productStock"
            label="Nova Quantidade em Estoque"
            type="number"
            step="0.01"
            value={newStockQuantity}
            onChange={(e) => setNewStockQuantity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdateProductStock()}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setSelectedProductToUpdate(null)}>Cancelar</Button>
            <Button onClick={handleUpdateProductStock}>Salvar Estoque</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedRawMaterialToUpdate}
        onClose={() => setSelectedRawMaterialToUpdate(null)}
        title="Atualizar Estoque de Matéria-Prima"
      >
        <div className="space-y-4 pt-4">
          <p className="text-gray-700">Item: <strong>{selectedRawMaterialToUpdate?.name}</strong></p>
          <Input
            id="rawMaterialStock"
            label={`Nova Quantidade (${selectedRawMaterialToUpdate?.unit})`}
            type="number"
            step="0.01"
            value={newStockQuantity}
            onChange={(e) => setNewStockQuantity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUpdateRawMaterialStock()}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setSelectedRawMaterialToUpdate(null)}>Cancelar</Button>
            <Button onClick={handleUpdateRawMaterialStock}>Salvar Estoque</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};