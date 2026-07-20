import React, { useState, useEffect } from 'react';
import { Client, UserRole } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loader2, Search } from 'lucide-react';
import { fetchAddressByCep } from '../utils/cepService';
import { useAuth } from '../App';

interface NewClientModalProps {
  client: Client | null;
  onSave: (client: Client) => void;
  onCancel: () => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({ client, onSave, onCancel }) => {
  const { checkPermission } = useAuth();
  const canAddClient = checkPermission('canAddClient');
  const canEditClient = checkPermission('canEditClient');

  const isEditing = !!client;
  const canSave = isEditing ? canEditClient : canAddClient;

  const [name, setName] = useState(client?.name || '');
  const [contact, setContact] = useState(client?.contact || '');
  const [cpf, setCpf] = useState(client?.cpf || '');
  const [zipCode, setZipCode] = useState(client?.zipCode || '');
  const [street, setStreet] = useState(client?.street || '');
  const [number, setNumber] = useState(client?.number || '');
  const [neighborhood, setNeighborhood] = useState(client?.neighborhood || '');
  const [city, setCity] = useState(client?.city || '');
  const [state, setState] = useState(client?.state || '');

  const [saveLoading, setSaveLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (client) {
      setName(client.name);
      setContact(client.contact);
      setCpf(client.cpf);
      setZipCode(client.zipCode);
      setStreet(client.street);
      setNumber(client.number);
      setNeighborhood(client.neighborhood);
      setCity(client.city);
      setState(client.state);
    } else {
      setName('');
      setContact('');
      setCpf('');
      setZipCode('');
      setStreet('');
      setNumber('');
      setNeighborhood('');
      setCity('');
      setState('');
    }
    setFormErrors({});
  }, [client]);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setZipCode(value);

    if (value.length === 8) {
      setCepLoading(true);
      try {
        const address = await fetchAddressByCep(value);
        setStreet(address.street);
        setNeighborhood(address.neighborhood);
        setCity(address.city);
        setState(address.state);
        setFormErrors((prev) => ({ ...prev, zipCode: undefined }));
      } catch (error: any) {
        setFormErrors((prev) => ({ ...prev, zipCode: error.message }));
        setStreet('');
        setNeighborhood('');
        setCity('');
        setState('');
      } finally {
        setCepLoading(false);
      }
    } else {
      setFormErrors((prev) => ({ ...prev, zipCode: undefined }));
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!name.trim()) errors.name = 'Nome é obrigatório.';
    if (cpf.trim() && cpf.trim().length !== 11 && cpf.trim().length !== 14) {
      errors.cpf = 'CPF inválido (use 11 ou 14 dígitos).';
    }
    if (zipCode.trim() && zipCode.trim().replace(/\D/g, '').length !== 8) {
      errors.zipCode = 'CEP inválido.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) {
      alert('Você não tem permissão para salvar clientes.');
      return;
    }
    if (!validateForm()) {
      return;
    }

    setSaveLoading(true);

    const newClient: Client = {
      id: client?.id || '',
      name: name.trim(),
      contact: contact.trim(),
      cpf: cpf.trim(),
      zipCode: zipCode.trim(),
      street: street.trim(),
      number: number.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim(),
    };
    onSave(newClient);
    setSaveLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="clientName"
        label="Nome do Cliente"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={formErrors.name}
        required
        disabled={!canEditClient} // Disabled if no permission
      />

      <Input
        id="clientContact"
        label="Contato do Cliente (WhatsApp) (Opcional)"
        type="tel"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        error={formErrors.contact}
        placeholder="Ex: 5511987654321"
        disabled={!canEditClient} // Disabled if no permission
      />

      <Input
        id="clientCpf"
        label="CPF do Cliente (Opcional)"
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
        error={formErrors.cpf}
        placeholder="Ex: 123.456.789-00"
        maxLength={14}
        disabled={!canEditClient} // Disabled if no permission
      />

      <h3 className="text-lg font-semibold text-gray-800 pt-4 border-t border-gray-100">Endereço</h3>

      <Input
        id="clientZipCode"
        label="CEP (Opcional)"
        value={zipCode}
        onChange={handleCepChange}
        error={formErrors.zipCode}
        placeholder="Ex: 12345-678"
        maxLength={9}
        icon={cepLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : <Search className="h-5 w-5 text-gray-400" />}
        disabled={!canEditClient} // Disabled if no permission
      />

      <Input
        id="clientStreet"
        label="Rua (Opcional)"
        value={street}
        onChange={(e) => setStreet(e.target.value)}
        error={formErrors.street}
        placeholder="Ex: Rua das Flores"
        disabled={cepLoading || !canEditClient} // Disabled if no permission
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="clientNumber"
          label="Número (Opcional)"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          error={formErrors.number}
          placeholder="Ex: 123"
          disabled={!canEditClient} // Disabled if no permission
        />
        <Input
          id="clientNeighborhood"
          label="Bairro (Opcional)"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          error={formErrors.neighborhood}
          placeholder="Ex: Centro"
          disabled={cepLoading || !canEditClient} // Disabled if no permission
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="clientCity"
          label="Cidade (Opcional)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          error={formErrors.city}
          placeholder="Ex: São Paulo"
          disabled={cepLoading || !canEditClient} // Disabled if no permission
        />
        <Input
          id="clientState"
          label="Estado (UF) (Opcional)"
          value={state}
          onChange={(e) => setState(e.target.value)}
          error={formErrors.state}
          placeholder="Ex: SP"
          maxLength={2}
          disabled={cepLoading || !canEditClient} // Disabled if no permission
        />
      </div>


      <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={saveLoading} disabled={!canSave || saveLoading}> {/* Disabled if no permission or if loading */}
          Salvar Cliente
        </Button>
      </div>
    </form>
  );
};