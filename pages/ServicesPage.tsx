import React, { useState } from 'react';
import { useAuth } from '../App';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { Service, UserRole } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';

export const ServicesPage: React.FC = () => {
  const { services, addService, updateService, deleteService, currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
      setPrice(service.price.toString());
    } else {
      setEditingService(null);
      setName('');
      setPrice('0');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const numPrice = parseFloat(price) || 0;
    if (editingService) {
      updateService({ ...editingService, name, price: numPrice });
    } else {
      addService({ name, price: numPrice });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja realmente excluir este serviço?')) {
      deleteService(id);
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Serviços</h2>
        {isAdmin && (
          <Button onClick={() => handleOpenModal()} icon={<Plus className="h-5 w-5" />}>
            Novo Serviço
          </Button>
        )}
      </div>

      <div className="mb-6 relative">
        <Input
          id="search-services"
          placeholder="Buscar serviços..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome do Serviço</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preço</th>
              {isAdmin && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredServices.map((service) => (
              <tr key={service.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(service.price)}</td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(service)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      icon={<Edit className="h-4 w-4" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600 hover:text-red-900"
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </td>
                )}
              </tr>
            ))}
            {filteredServices.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 3 : 2} className="px-6 py-4 text-center text-gray-500">Nenhum serviço encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        hideFooter={true}
      >
        <div className="space-y-4">
          <Input
            id="service-name"
            label="Nome do Serviço"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Corte de Camiseta"
            autoFocus
          />
          <Input
            id="service-price"
            label="Preço Base (R$)"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
