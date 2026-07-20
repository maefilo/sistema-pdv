import React, { useState } from 'react';
import { useAuth } from '../App';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Section, UserRole } from '../types';

export const SectionsPage: React.FC = () => {
  const { sections, addSection, updateSection, deleteSection, currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [name, setName] = useState('');

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const handleOpenModal = (section?: Section) => {
    if (section) {
      setEditingSection(section);
      setName(section.name);
    } else {
      setEditingSection(null);
      setName('');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingSection) {
      updateSection({ ...editingSection, name });
    } else {
      addSection({ name });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja realmente excluir esta seção?')) {
      deleteSection(id);
    }
  };

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gerenciar Seções</h2>
        {isAdmin && (
          <Button onClick={() => handleOpenModal()} icon={<Plus className="h-5 w-5" />}>
            Nova Seção
          </Button>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              {isAdmin && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sections.map((section) => (
              <tr key={section.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{section.name}</td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(section)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                      icon={<Edit className="h-4 w-4" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(section.id)}
                      className="text-red-600 hover:text-red-900"
                      icon={<Trash2 className="h-4 w-4" />}
                    />
                  </td>
                )}
              </tr>
            ))}
            {sections.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-gray-500">Nenhuma seção cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSection ? 'Editar Seção' : 'Nova Seção'}
        hideFooter={true}
      >
        <div className="space-y-4">
          <Input
            id="section-name"
            label="Nome da Seção"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Seção de Corte"
            autoFocus
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
