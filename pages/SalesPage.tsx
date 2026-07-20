import React, { useState, useMemo } from 'react';
import { useAuth } from '../App';
import { Order, OrderStatus } from '../types';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { formatCurrency } from '../utils/currencyFormatter';
import { formatDateTime } from '../utils/dateFormatter';
import { ORDER_STATUS_COLORS, ORDER_STATUS_OPTIONS } from '../constants';
import { Eye, XCircle, Download, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import * as XLSX from 'xlsx';

export const SalesPage: React.FC = () => {
  const { orders, updateOrder, deleteOrder, products, updateProduct, checkPermission } = useAuth();
  
  // Use order editing permission for cancellation/status change
  const canEditOrderStatus = checkPermission('canEditOrderStatus');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredSales = useMemo(() => {
    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);

    return orders.filter((order) => {
      if (order.type !== 'sale') return false;

      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      if (!matchesStatus) return false;

      if (searchWords.length === 0) return true;

      const searchableText = [
        order.clientName,
        order.clientCpf,
        order.id,
        order.sellerName || '',
        order.paymentMethod || '',
        ...(order.payments || []).map(p => p.method),
        ...order.items.map(i => i.name),
      ].join(' ').toLowerCase();

      return searchWords.every(word => searchableText.includes(word));
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchTerm, filterStatus]);

  const openViewModal = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedOrder(null);
  };

  const handleCancelSale = (order: Order) => {
    if (!canEditOrderStatus) {
      alert('Você não tem permissão para cancelar vendas.');
      return;
    }
    
    if (order.status === OrderStatus.CANCELLED) {
      alert('Esta venda já foi cancelada.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja cancelar a venda #${order.id}? Os produtos serão estornados no estoque.`)) {
      // 1. Update order status (App.tsx centralized logic will handle stock return)
      updateOrder({
        ...order,
        status: OrderStatus.CANCELLED,
        updatedAt: new Date().toISOString()
      });
      
      alert('Venda cancelada e estoque estornado com sucesso.');
      if (selectedOrder && selectedOrder.id === order.id) {
          closeViewModal();
      }
    }
  };

  const handleDeleteSale = async (order: Order) => {
    if (!canEditOrderStatus) {
      alert('Você não tem permissão para excluir vendas.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja EXCLUIR a venda #${order.id}? Essa ação não afeta o estoque e remove o registro permanentemente.`)) {
      await deleteOrder(order.id);
      alert('Venda excluída com sucesso.');
      if (selectedOrder && selectedOrder.id === order.id) {
          closeViewModal();
      }
    }
  };

  const handleExportExcel = () => {
    if (filteredSales.length === 0) {
      alert('Não há vendas para exportar.');
      return;
    }

    const dataToExport = filteredSales.map(order => ({
      'ID Venda': order.id,
      'Data': new Date(order.createdAt).toLocaleString('pt-BR'),
      'Cliente': order.clientName,
      'CPF Cliente': order.clientCpf,
      'Contato Cliente': order.clientContact,
      'CEP': order.clientZipCode,
      'Rua': order.clientStreet,
      'Número': order.clientNumber,
      'Bairro': order.clientNeighborhood,
      'Cidade': order.clientCity,
      'Estado': order.clientState,
      'Produtos': order.items.map(item => `${item.name} (${item.quantity})`).join(', '),
      'Total': order.total,
      'Pagamento': order.payments 
        ? order.payments.map(p => `${p.method}${p.installments ? ` ${p.installments}x` : ''} - ${formatCurrency(p.amount)}`).join(' | ')
        : order.paymentMethod || 'N/A',
      'Vendedor': order.sellerName || 'N/A',
      'Status': order.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendas');

    // Adjust column widths
    const maxWidths = [
      { wch: 15 }, // ID Venda
      { wch: 20 }, // Data
      { wch: 25 }, // Cliente
      { wch: 15 }, // CPF
      { wch: 15 }, // Contato
      { wch: 10 }, // CEP
      { wch: 30 }, // Rua
      { wch: 10 }, // Número
      { wch: 20 }, // Bairro
      { wch: 20 }, // Cidade
      { wch: 10 }, // Estado
      { wch: 50 }, // Produtos
      { wch: 15 }, // Total
      { wch: 40 }, // Pagamento
      { wch: 20 }, // Vendedor
      { wch: 15 }, // Status
    ];
    worksheet['!cols'] = maxWidths;

    XLSX.writeFile(workbook, `vendas_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Histórico de Vendas</h2>
        <Button
          onClick={handleExportExcel}
          variant="primary"
          icon={<Download className="h-5 w-5" />}
          className="bg-green-600 hover:bg-green-700"
        >
          Exportar Excel
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          id="saleSearch"
          placeholder="Buscar por cliente, ID, CPF, produto, vendedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sm:flex-1"
        />
        <Select
          id="filterStatus"
          label=""
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
          options={[{ value: 'all', label: 'Todos os Status' }, ...ORDER_STATUS_OPTIONS.map(s => ({ value: s, label: s }))]}
          containerClassName="sm:w-auto"
        />
      </div>

      {filteredSales.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg shadow-md">
          <p className="text-gray-600 text-lg">Nenhuma venda encontrada.</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID da Venda
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ORDER_STATUS_COLORS[sale.status]}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.sellerName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewModal(sale)}
                        className="text-indigo-600 hover:text-indigo-900 mr-2"
                        icon={<Eye className="h-4 w-4" />}
                      >
                        Ver Detalhes
                      </Button>
                      
                      {sale.status !== OrderStatus.CANCELLED && (
                          <Button
                            variant="danger"
                            size="sm"
                            ghost
                            onClick={() => handleCancelSale(sale)}
                            icon={<XCircle className="h-4 w-4" />}
                            disabled={!canEditOrderStatus}
                          >
                            Cancelar
                          </Button>
                      )}
                      
                      <Button
                        variant="danger"
                        size="sm"
                        ghost
                        onClick={() => handleDeleteSale(sale)}
                        icon={<Trash2 className="h-4 w-4" />}
                        disabled={!canEditOrderStatus}
                        className="text-red-600 hover:text-red-800"
                      >
                        Excluir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedOrder && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={closeViewModal}
          title={`Detalhes da Venda #${selectedOrder.id}`}
          size="lg"
          hideFooter={true}
        >
          <div className="space-y-4 text-gray-700">
            <p><strong>Cliente:</strong> {selectedOrder.clientName}</p>
            <p><strong>Contato:</strong> {selectedOrder.clientContact}</p>
            <p><strong>CPF:</strong> {selectedOrder.clientCpf}</p>
            <p><strong>Status:</strong> <span className={`px-2 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${ORDER_STATUS_COLORS[selectedOrder.status]}`}>{selectedOrder.status}</span></p>
            <p><strong>Vendedor:</strong> {selectedOrder.sellerName || 'N/A'}</p>
            
            {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
               <div className="mt-2 bg-gray-50 p-3 rounded border border-gray-100 mb-2">
                 <p className="font-semibold text-gray-700 mb-1">Pagamentos:</p>
                 {selectedOrder.payments.map((p, i) => (
                    <div key={i} className="text-sm text-gray-600 flex justify-between border-b border-gray-200 last:border-0 pb-1 pt-1">
                       <span>{p.method} {p.installments ? `(${p.installments}x)`:''}</span>
                       <span>{formatCurrency(p.amount)}</span>
                    </div>
                 ))}
               </div>
            ) : (
               selectedOrder.paymentMethod && <p><strong>Forma de Pagamento:</strong> {selectedOrder.paymentMethod}</p>
            )}
            <p><strong>Criado em:</strong> {formatDateTime(selectedOrder.createdAt)}</p>

            <h3 className="text-lg font-semibold mt-6 mb-2">Itens da Venda:</h3>
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Preço Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qtd.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {selectedOrder.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">{item.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-bold text-right mt-6">Total: {formatCurrency(selectedOrder.total)}</h3>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                {selectedOrder.status !== OrderStatus.CANCELLED && (
                    <Button
                        variant="danger"
                        onClick={() => handleCancelSale(selectedOrder)}
                        icon={<XCircle className="h-5 w-5" />}
                        disabled={!canEditOrderStatus}
                    >
                        Cancelar Venda e Estornar Estoque
                    </Button>
                )}
                <Button
                    variant="danger"
                    onClick={() => handleDeleteSale(selectedOrder)}
                    icon={<Trash2 className="h-5 w-5" />}
                    disabled={!canEditOrderStatus}
                >
                    Excluir Venda
                </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
