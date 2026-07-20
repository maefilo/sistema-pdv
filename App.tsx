import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { POSPage } from './pages/POSPage';
import { ServiceOrdersPage } from './pages/ServiceOrdersPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { ReportsPage } from './pages/ReportsPage';
import { CompanyInfo, Product, Order, RawMaterial, Client, User, UserRole, AuthContextType, UserPermissions, Service, Section, OrderStatus } from './types';
import { COMPANY_NAME_DEFAULT, DEFAULT_USER_PERMISSIONS } from './constants';
import { StockPage } from './pages/StockPage';
import { SettingsPage } from './pages/SettingsPage';
import { ClientsPage } from './pages/ClientsPage';
import { SalesPage } from './pages/SalesPage';
import { DailyBalancePage } from './pages/DailyBalancePage';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// --- Color Helpers ---
const blendColors = (color1: string, color2: string, percentage: number) => {
  color1 = color1.length === 7 ? color1.substring(1) : color1;
  color2 = color2.length === 7 ? color2.substring(1) : color2;
  const r1 = parseInt(color1.substring(0,2),16);
  const g1 = parseInt(color1.substring(2,4),16);
  const b1 = parseInt(color1.substring(4,6),16);
  const r2 = parseInt(color2.substring(0,2),16);
  const g2 = parseInt(color2.substring(2,4),16);
  const b2 = parseInt(color2.substring(4,6),16);
  
  const r = Math.round(r1 * (1 - percentage) + r2 * percentage);
  const g = Math.round(g1 * (1 - percentage) + g2 * percentage);
  const b = Math.round(b1 * (1 - percentage) + b2 * percentage);
  
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
};


const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // State to track if initial data loading/migration is complete
  const [dataLoaded, setDataLoaded] = useState(false);

  // All application data states
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: COMPANY_NAME_DEFAULT, logo: null, primaryColor: '#4f46e5' });
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]); // New
  const [sections, setSections] = useState<Section[]>([]); // New
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions>(DEFAULT_USER_PERMISSIONS);
  const [isInitialSetup, setIsInitialSetup] = useState<boolean>(true); // Assume true until users are loaded

  // --- Data Loading Effect ---
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Iniciando carregamento de dados da API Local...');
        
        // Load all data parallelly
        const [
          companyRes, permRes, usersRes, prodRes, rawRes, orderRes, clientsRes, servicesRes, sectionsRes
        ] = await Promise.all([
          fetch(`${API_URL}/company_info`),
          fetch(`${API_URL}/user_permissions`),
          fetch(`${API_URL}/users`),
          fetch(`${API_URL}/products`),
          fetch(`${API_URL}/raw_materials`),
          fetch(`${API_URL}/orders`),
          fetch(`${API_URL}/clients`),
          fetch(`${API_URL}/services`),
          fetch(`${API_URL}/sections`)
        ]);

        const companyDataRows = await companyRes.json();
        const permDataRows = await permRes.json();
        const loadedUsers = await usersRes.json();
        const prodData = await prodRes.json();
        const rawData = await rawRes.json();
        const orderData = await orderRes.json();
        const clientsData = await clientsRes.json();
        const servicesData = await servicesRes.json();
        const sectionsData = await sectionsRes.json();

        // Hydrate singleton company_info
        const companyData = companyDataRows.find((r: any) => r.key === 'singleton');
        if (companyData) setCompanyInfo({ 
          name: companyData.name, 
          logo: companyData.logo, 
          geminiApiKey: companyData.gemini_api_key,
          geminiModelText: companyData.gemini_model_text,
          geminiModelImage: companyData.gemini_model_image,
          primaryColor: companyData.primary_color || '#4f46e5',
          key: 'singleton' 
        });

        // Hydrate singleton permissions
        const permData = permDataRows.find((r: any) => r.key === 'singleton');
        if (permData) {
          setUserPermissions({
            key: 'singleton',
            canAddProduct: permData.can_add_product,
            canEditProduct: permData.can_edit_product,
            canDeleteProduct: permData.can_delete_product,
            canViewProductCostPrice: permData.can_view_product_cost_price,
            canFinalizeSale: permData.can_finalize_sale,
            canGenerateBudget: permData.can_generate_budget,
            canCreateServiceOrder: permData.can_create_service_order,
            canEditOrderItems: permData.can_edit_order_items,
            canEditServiceOrder: permData.can_edit_service_order,
            canEditOrderStatus: permData.can_edit_order_status,
            canEditProductionDetails: permData.can_edit_production_details,
            canEditBudget: permData.can_edit_budget,
            canEditBudgetStatus: permData.can_edit_budget_status,
            canAddRawMaterial: permData.can_add_raw_material,
            canEditRawMaterial: permData.can_edit_raw_material,
            canDeleteRawMaterial: permData.can_delete_raw_material,
            canAddClient: permData.can_add_client,
            canEditClient: permData.can_edit_client,
            canDeleteClient: permData.can_delete_client,
            canViewReports: permData.can_view_reports,
            canGenerateAISummary: permData.can_generate_ai_summary,
            canEditCompanySettings: permData.can_edit_company_settings,
            canManageUsers: permData.can_manage_users,
            canUseAI: permData.can_use_ai,
            canPrintOrSendOrder: permData.can_print_or_send_order,
          });
        }

        if (loadedUsers && !loadedUsers.error) {
          setUsers(loadedUsers);
          setIsInitialSetup(loadedUsers.length === 0);
        }

        // Restore Auth User from localStorage since we don't have magic auth anymore
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
           setCurrentUser(JSON.parse(savedUser));
        } else {
           setCurrentUser(null);
        }

        if (prodData && !prodData.error) {
          setProducts(prodData.map((p: any) => ({
            id: p.id, 
            name: p.name, 
            description: p.description, 
            price: Number(p.price) || 0,
            costPrice: Number(p.cost_price) || 0, 
            stock: Number(p.stock) || 0, 
            imageUrl: p.image_url,
            barcode: p.barcode,
            minStock: Number(p.min_stock) || 0
          })));
        }

        if (rawData && !rawData.error) {
           setRawMaterials(rawData.map((r: any) => ({
             id: r.id, 
             name: r.name, 
             description: r.description, 
             unit: r.unit,
             quantity: Number(r.quantity) || 0, 
             costPerUnit: Number(r.cost_per_unit) || 0, 
             minStock: Number(r.min_stock) || 0,
             supplier: r.supplier
           })));
        }

        if (orderData && !orderData.error) {
          setOrders(orderData.map((o: any) => ({
            id: o.id, type: o.type, clientName: o.client_name, clientContact: o.client_contact,
            clientCpf: o.client_cpf, clientZipCode: o.client_zip_code, clientStreet: o.client_street,
            clientNumber: o.client_number, clientNeighborhood: o.client_neighborhood, 
            clientCity: o.client_city, clientState: o.client_state, items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items, total: Number(o.total) || 0,
            productionDetails: typeof o.production_details === 'string' ? JSON.parse(o.production_details) : o.production_details, paymentMethod: o.payment_method, payments: typeof o.payments === 'string' ? JSON.parse(o.payments) : o.payments, status: o.status, 
            sellerName: o.seller_name,
            observation: o.observation,
            createdAt: o.created_at, updatedAt: o.updated_at,
            sectionId: o.section_id
          })));
        }

        if (servicesData && !servicesData.error) {
          setServices(servicesData.map((s: any) => ({
            id: s.id, name: s.name, price: Number(s.price) || 0
          })));
        }

        if (sectionsData && !sectionsData.error) {
          setSections(sectionsData.map((s: any) => ({
            id: s.id, name: s.name
          })));
        }

        if (clientsData && !clientsData.error) {
           setClients(clientsData.map((c: any) => ({
             id: c.id, name: c.name, contact: c.contact, cpf: c.cpf, zipCode: c.zip_code,
             street: c.street, number: c.number, neighborhood: c.neighborhood, city: c.city, state: c.state
           })));
        }

        setDataLoaded(true);
        console.log('Todos os dados foram carregados da API Local com sucesso.');
      } catch (err) {
        console.error('Erro crítico ao carregar dados da API Local:', err);
        setDataLoaded(true);
      }
    };

    loadData();
  }, []);

  // --- Theme Color Effect ---
  useEffect(() => {
    const hex = companyInfo.primaryColor || '#4f46e5';
    const root = document.documentElement;
    root.style.setProperty('--color-primary-50', blendColors(hex, '#ffffff', 0.9));
    root.style.setProperty('--color-primary-100', blendColors(hex, '#ffffff', 0.8));
    root.style.setProperty('--color-primary-200', blendColors(hex, '#ffffff', 0.6));
    root.style.setProperty('--color-primary-300', blendColors(hex, '#ffffff', 0.4));
    root.style.setProperty('--color-primary-400', blendColors(hex, '#ffffff', 0.2));
    root.style.setProperty('--color-primary-500', hex); // Make 500 the base sometimes
    root.style.setProperty('--color-primary-600', blendColors(hex, '#000000', 0.1)); // Slightly darker for 600
    root.style.setProperty('--color-primary-700', blendColors(hex, '#000000', 0.2));
    root.style.setProperty('--color-primary-800', blendColors(hex, '#000000', 0.35));
    root.style.setProperty('--color-primary-900', blendColors(hex, '#000000', 0.5));
    root.style.setProperty('--color-primary-950', blendColors(hex, '#000000', 0.7));
  }, [companyInfo.primaryColor]);


  // isAuthenticated is true if currentUser exists
  const isAuthenticated = !!currentUser;

  // Login function
  const login = async (emailInput: string, passwordInput: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error?.message || 'Erro de login');
        return false;
      }
      
      const userObj: User = {
        id: data.user.id,
        username: data.user.username,
        fullName: data.user.full_name || '',
        role: data.user.role || UserRole.USER,
        password: '' // Don't store password in state
      };
      
      setCurrentUser(userObj);
      localStorage.setItem('currentUser', JSON.stringify(userObj));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    navigate('/login', { replace: true });
  };

  const updateCompanyInfo = async (name: string, logo: string | null, geminiApiKey?: string, geminiModelText?: string, geminiModelImage?: string, primaryColor?: string) => {
    try {
      const res = await fetch(`${API_URL}/company_info/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          key: 'singleton', 
          name, 
          logo,
          gemini_api_key: geminiApiKey,
          gemini_model_text: geminiModelText,
          gemini_model_image: geminiModelImage,
          primary_color: primaryColor
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Erro ao salvar informações da empresa.');
      }

      setCompanyInfo({ ...companyInfo, name, logo, geminiApiKey, geminiModelText, geminiModelImage, primaryColor });
      return data;
    } catch (error: any) {
      console.error('Error in updateCompanyInfo:', error);
      throw error;
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const res = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name, description: product.description, price: product.price, 
          cost_price: product.costPrice, stock: product.stock, min_stock: product.minStock || 0, image_url: product.imageUrl,
          barcode: product.barcode
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao adicionar produto');
      
      setProducts((prev) => {
        const newProducts = [...prev, {
          id: data.id, name: data.name, description: data.description, price: data.price,
          costPrice: data.cost_price, stock: data.stock, minStock: data.min_stock, imageUrl: data.image_url,
          barcode: data.barcode
        }];
        return newProducts.sort((a, b) => a.name.localeCompare(b.name));
      });
    } catch (error: any) {
      console.error('Error adding product:', error);
      alert('Erro ao adicionar produto: ' + error.message);
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
    setProducts((prev) => {
      const newProducts = prev.map((prod) => (prod.id === updatedProduct.id ? updatedProduct : prod));
      return newProducts.sort((a, b) => a.name.localeCompare(b.name));
    });
    try {
      const res = await fetch(`${API_URL}/products/${updatedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           name: updatedProduct.name, description: updatedProduct.description, price: updatedProduct.price, 
           cost_price: updatedProduct.costPrice, stock: updatedProduct.stock, min_stock: updatedProduct.minStock || 0, image_url: updatedProduct.imageUrl,
           barcode: updatedProduct.barcode
        })
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (error: any) {
      console.error('Error updating product:', error);
      alert('Erro ao atualizar produto: ' + error.message);
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((prod) => prod.id !== id));
    try {
      const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
    } catch (error: any) {
       console.error('Erro ao excluir produto:', error);
       alert('Erro ao excluir produto: ' + error.message);
    }
  };

  const addRawMaterial = async (rawMaterial: Omit<RawMaterial, 'id'>) => {
    try {
      const res = await fetch(`${API_URL}/raw_materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rawMaterial.name, description: rawMaterial.description, unit: rawMaterial.unit,
          quantity: rawMaterial.quantity, min_stock: rawMaterial.minStock || 0, cost_per_unit: rawMaterial.costPerUnit, supplier: rawMaterial.supplier
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      
      setRawMaterials((prev) => [...prev, {
        id: data.id, name: data.name, description: data.description, unit: data.unit,
        quantity: data.quantity, minStock: data.min_stock, costPerUnit: data.cost_per_unit, supplier: data.supplier
      }]);
    } catch (error: any) {
      console.error('Error adding raw material:', error);
      alert('Erro ao adicionar matéria-prima: ' + error.message);
    }
  };

  const updateRawMaterial = async (updatedRawMaterial: RawMaterial) => {
    setRawMaterials((prev) =>
      prev.map((rm) => (rm.id === updatedRawMaterial.id ? updatedRawMaterial : rm))
    );
    try {
      const res = await fetch(`${API_URL}/raw_materials/${updatedRawMaterial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           name: updatedRawMaterial.name, description: updatedRawMaterial.description, unit: updatedRawMaterial.unit,
           quantity: updatedRawMaterial.quantity, min_stock: updatedRawMaterial.minStock || 0, cost_per_unit: updatedRawMaterial.costPerUnit, supplier: updatedRawMaterial.supplier
        })
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch (error: any) {
      console.error('Error updating raw material:', error);
      alert('Erro ao atualizar matéria-prima: ' + error.message);
    }
  };

  const deleteRawMaterial = async (id: string) => {
    setRawMaterials((prev) => prev.filter((rm) => rm.id !== id));
    try {
      const res = await fetch(`${API_URL}/raw_materials/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
    } catch (error: any) {
      console.error('Erro ao excluir matéria-prima:', error);
      alert('Erro ao excluir matéria-prima: ' + error.message);
    }
  };

  const addOrder = (orderToSave: Order): Order => {
     // Usa a data fornecida no pedido (útil para vendas retroativas) ou a data atual
     const orderDate = new Date(orderToSave.createdAt || Date.now());
     const dateStr = orderDate.getFullYear().toString() + 
                     (orderDate.getMonth() + 1).toString().padStart(2, '0') + 
                     orderDate.getDate().toString().padStart(2, '0');
     
     const todaysOrders = orders.filter(o => o.id.startsWith(dateStr));
     let nextNum = 1;
     if (todaysOrders.length > 0) {
       const suffixes = todaysOrders.map(o => {
         const parts = o.id.split('-');
         return parts.length > 1 ? parseInt(parts[1], 10) : 0;
       });
       nextNum = Math.max(...suffixes, 0) + 1;
     }

      const newId = `${dateStr}-${nextNum.toString().padStart(4, '0')}`;
      const newOrder = { ...orderToSave, id: newId };
      setOrders((prev) => [...prev, newOrder]);
      
      // --- Centralized Inventory Deduction (Production Item vs Finished Product) ---
      if (newOrder.type === 'sale' && newOrder.status !== OrderStatus.CANCELLED && newOrder.status !== OrderStatus.BUDGET) {
        newOrder.items.forEach(item => {
          const product = products.find(p => p.id === item.id);
          if (product) {
            updateProduct({ ...product, stock: Math.max(0, product.stock - item.quantity) });
          }
        });
      } else if (newOrder.type === 'service-order' && newOrder.status !== OrderStatus.CANCELLED && newOrder.status !== OrderStatus.BUDGET) {
        newOrder.productionDetails?.forEach(detail => {
          if (detail.type === 'raw_material' && detail.rawMaterialId) {
             const rm = rawMaterials.find(r => r.id === detail.rawMaterialId);
             if (rm) {
               updateRawMaterial({ ...rm, quantity: Math.max(0, rm.quantity - detail.quantityUsed) });
             }
          }
        });
      }

      fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newOrder.id,
          type: newOrder.type, client_name: newOrder.clientName, client_contact: newOrder.clientContact,
          client_cpf: newOrder.clientCpf, client_zip_code: newOrder.clientZipCode, client_street: newOrder.clientStreet,
          client_number: newOrder.clientNumber, client_neighborhood: newOrder.clientNeighborhood, 
          client_city: newOrder.clientCity, client_state: newOrder.clientState, items: newOrder.items,
          total: newOrder.total, production_details: newOrder.productionDetails, payment_method: newOrder.paymentMethod, payments: newOrder.payments, status: newOrder.status,
          seller_name: newOrder.sellerName,
          observation: newOrder.observation,
          created_at: newOrder.createdAt, updated_at: newOrder.updatedAt,
          section_id: newOrder.sectionId
        })
     }).catch(err => {
         console.error('Erro ao adicionar pedido:', err);
         alert('Erro ao salvar pedido: ' + err.message);
     });

     return newOrder;
  };

  const updateOrder = async (updatedOrder: Order) => {
    const oldOrder = orders.find(ord => ord.id === updatedOrder.id);
    
    setOrders((prev) =>
      prev.map((ord) => (ord.id === updatedOrder.id ? updatedOrder : ord))
    );

    // --- Centralized Inventory Reversal/Deduction on Status Change ---
    if (oldOrder) {
      const isBecomingCancelled = oldOrder.status !== OrderStatus.CANCELLED && updatedOrder.status === OrderStatus.CANCELLED;
      const isBecomingActive = oldOrder.status === OrderStatus.CANCELLED && updatedOrder.status !== OrderStatus.CANCELLED && updatedOrder.status !== OrderStatus.BUDGET;

      if (isBecomingCancelled) {
        // Return to stock
        if (updatedOrder.type === 'sale') {
          updatedOrder.items.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product) updateProduct({ ...product, stock: product.stock + item.quantity });
          });
        } else if (updatedOrder.type === 'service-order') {
          updatedOrder.productionDetails?.forEach(detail => {
            if (detail.type === 'raw_material' && detail.rawMaterialId) {
               const rm = rawMaterials.find(r => r.id === detail.rawMaterialId);
               if (rm) updateRawMaterial({ ...rm, quantity: rm.quantity + detail.quantityUsed });
            }
          });
        }
      } else if (isBecomingActive) {
        // Deduct from stock
        if (updatedOrder.type === 'sale') {
          updatedOrder.items.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product) updateProduct({ ...product, stock: Math.max(0, product.stock - item.quantity) });
          });
        } else if (updatedOrder.type === 'service-order') {
          updatedOrder.productionDetails?.forEach(detail => {
            if (detail.type === 'raw_material' && detail.rawMaterialId) {
               const rm = rawMaterials.find(r => r.id === detail.rawMaterialId);
               if (rm) updateRawMaterial({ ...rm, quantity: Math.max(0, rm.quantity - detail.quantityUsed) });
            }
          });
        }
      }
    }

    try {
      const res = await fetch(`${API_URL}/orders/${updatedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: updatedOrder.type, client_name: updatedOrder.clientName, client_contact: updatedOrder.clientContact,
          client_cpf: updatedOrder.clientCpf, client_zip_code: updatedOrder.clientZipCode, client_street: updatedOrder.clientStreet,
          client_number: updatedOrder.clientNumber, client_neighborhood: updatedOrder.clientNeighborhood, 
          client_city: updatedOrder.clientCity, client_state: updatedOrder.clientState, items: updatedOrder.items,
          total: updatedOrder.total, production_details: updatedOrder.productionDetails, payment_method: updatedOrder.paymentMethod, payments: updatedOrder.payments, status: updatedOrder.status,
          seller_name: updatedOrder.sellerName,
          observation: updatedOrder.observation,
          updated_at: updatedOrder.updatedAt,
          section_id: updatedOrder.sectionId
        })
      });
      if (!res.ok) throw new Error('Falha ao atualizar pedido');
    } catch (error: any) {
      console.error('Erro ao atualizar pedido:', error);
      alert('Erro ao atualizar pedido: ' + error.message);
    }
  };

  const deleteOrder = async (id: string) => {
    setOrders((prev) => prev.filter((ord) => ord.id !== id));
    try {
      const res = await fetch(`${API_URL}/orders/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      alert('Erro ao excluir pedido: ' + error.message);
    }
  };

  const addService = async (service: Omit<Service, 'id'>) => {
    try {
      const res = await fetch(`${API_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: service.name, price: service.price })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      setServices((prev) => [...prev, { id: data.id, name: data.name, price: Number(data.price) }]);
    } catch (error: any) {
      console.error('Erro ao adicionar serviço:', error);
      alert('Erro ao adicionar serviço: ' + error.message);
    }
  };

  const updateService = async (updatedService: Service) => {
    setServices((prev) => prev.map((s) => (s.id === updatedService.id ? updatedService : s)));
    try {
      const res = await fetch(`${API_URL}/services/${updatedService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updatedService.name, price: updatedService.price })
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
    } catch (error: any) {
      console.error('Erro ao atualizar serviço:', error);
      alert('Erro ao atualizar serviço: ' + error.message);
    }
  };

  const deleteService = async (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    try {
      const res = await fetch(`${API_URL}/services/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
    } catch (error: any) {
      console.error('Erro ao excluir serviço:', error);
      alert('Erro ao excluir serviço: ' + error.message);
    }
  };

  const addSection = async (section: Omit<Section, 'id'>) => {
    try {
      const res = await fetch(`${API_URL}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: section.name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);
      setSections((prev) => [...prev, { id: data.id, name: data.name }]);
    } catch (error: any) {
      console.error('Erro ao adicionar seção:', error);
      alert('Erro ao adicionar seção: ' + error.message);
    }
  };

  const updateSection = async (updatedSection: Section) => {
    setSections((prev) => prev.map((s) => (s.id === updatedSection.id ? updatedSection : s)));
    try {
      const res = await fetch(`${API_URL}/sections/${updatedSection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updatedSection.name })
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
    } catch (error: any) {
      console.error('Erro ao atualizar seção:', error);
      alert('Erro ao atualizar seção: ' + error.message);
    }
  };

  const deleteSection = async (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    try {
      const res = await fetch(`${API_URL}/sections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
    } catch (error: any) {
      console.error('Erro ao excluir seção:', error);
      alert('Erro ao excluir seção: ' + error.message);
    }
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    try {
      const res = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: client.name, contact: client.contact, cpf: client.cpf, zip_code: client.zipCode,
          street: client.street, number: client.number, neighborhood: client.neighborhood, 
          city: client.city, state: client.state
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message);

      setClients((prev) => [...prev, {
        id: data.id, name: data.name, contact: data.contact, cpf: data.cpf, zipCode: data.zip_code,
        street: data.street, number: data.number, neighborhood: data.neighborhood, city: data.city, state: data.state
      }]);
    } catch (error: any) {
      console.error('Erro ao adicionar cliente:', error);
      alert('Erro ao adicionar cliente: ' + error.message);
    }
  };

  const updateClient = async (updatedClient: Client) => {
    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
    );
    try {
      const res = await fetch(`${API_URL}/clients/${updatedClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedClient.name, contact: updatedClient.contact, cpf: updatedClient.cpf, zip_code: updatedClient.zipCode,
          street: updatedClient.street, number: updatedClient.number, neighborhood: updatedClient.neighborhood, 
          city: updatedClient.city, state: updatedClient.state
        })
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
    } catch (error: any) {
       console.error('Erro ao atualizar cliente:', error);
       alert('Erro ao atualizar cliente: ' + error.message);
    }
  };

  const deleteClient = async (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`${API_URL}/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');
    } catch (error: any) {
       console.error('Erro ao excluir cliente:', error);
       alert('Erro ao excluir cliente: ' + error.message);
    }
  };

  // User management functions
  const registerUser = async (email: string, password: string, role: UserRole, fullName: string = '') => {
    console.log('Registrando usuário localmente:', { email, role, fullName });
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email,
          password: password,
          role: role,
          full_name: fullName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Erro ao registrar');

      setUsers((prev) => [...prev, {
        id: data.id,
        username: email,
        fullName,
        role,
        password: ''
      }]);
      setIsInitialSetup(false);
    } catch (error: any) {
      console.error('Erro ao registrar usuário:', error);
      alert('Erro ao registrar usuário: ' + error.message);
      throw error;
    }
  };

  const sendOtp = async (email: string) => {
    console.log('Login por OTP está desativado no modo local. Por favor, faça login com senha.');
    alert('Login por link/OTP está desativado no modo offline/local. Use usuário e senha.');
  };

  const verifyOtp = async (email: string, token: string): Promise<boolean> => {
    return false;
  };

  const updateUser = async (updatedUser: User) => {
    console.log('Atualizando usuário:', updatedUser);
    try {
      const res = await fetch(`${API_URL}/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: updatedUser.username, 
          role: updatedUser.role,
          full_name: updatedUser.fullName
        })
      });
      if (!res.ok) throw new Error('Falha ao atualizar');

      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
    } catch (error: any) {
      console.error('Erro ao atualizar tabela de usuários:', error);
      alert('Erro ao atualizar usuário: ' + error.message);
      throw error;
    }
  };
  
  const deleteUser = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir');

      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (currentUser?.id === id) {
        logout();
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('Erro ao excluir usuário: ' + error.message);
      throw error;
    }
  };

  // Function to update configurable permissions
  const updateUserPermissions = async (permissions: UserPermissions) => {
    try {
      const res = await fetch(`${API_URL}/user_permissions/upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           key: 'singleton',
           can_add_product: permissions.canAddProduct,
           can_edit_product: permissions.canEditProduct,
           can_delete_product: permissions.canDeleteProduct,
           can_view_product_cost_price: permissions.canViewProductCostPrice,
           can_finalize_sale: permissions.canFinalizeSale,
           can_generate_budget: permissions.canGenerateBudget,
           can_create_service_order: permissions.canCreateServiceOrder,
           can_edit_order_items: permissions.canEditOrderItems,
           can_edit_service_order: permissions.canEditServiceOrder,
           can_edit_order_status: permissions.canEditOrderStatus,
           can_edit_production_details: permissions.canEditProductionDetails,
           can_edit_budget: permissions.canEditBudget,
           can_edit_budget_status: permissions.canEditBudgetStatus,
           can_add_raw_material: permissions.canAddRawMaterial,
           can_edit_raw_material: permissions.canEditRawMaterial,
           can_delete_raw_material: permissions.canDeleteRawMaterial,
           can_add_client: permissions.canAddClient,
           can_edit_client: permissions.canEditClient,
           can_delete_client: permissions.canDeleteClient,
           can_view_reports: permissions.canViewReports,
           can_generate_ai_summary: permissions.canGenerateAISummary,
           can_edit_company_settings: permissions.canEditCompanySettings,
           can_manage_users: permissions.canManageUsers,
           can_use_ai: permissions.canUseAI,
           can_print_or_send_order: permissions.canPrintOrSendOrder,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Erro ao atualizar permissões.');
      }

      setUserPermissions(permissions);
      return data;
    } catch (err: any) {
       console.error('Error updating user permissions:', err);
       throw err;
    }
  };

  // Helper function to check permissions based on user role and configuration
  const checkPermission = (permissionName: keyof UserPermissions): boolean => {
    if (currentUser?.role === UserRole.ADMIN) {
      return true; // Admins always have all permissions
    }
    if (currentUser?.role === UserRole.USER) {
      return userPermissions[permissionName] || false; // Check specific permission for standard users
    }
    return false; // Not authenticated
  };

  const value: AuthContextType = {
    isAuthenticated,
    isInitialSetup,
    companyInfo,
    products,
    services,
    sections,
    rawMaterials,
    orders,
    clients,
    users,
    currentUser,
    userPermissions,
    login,
    logout,
    updateCompanyInfo,
    addProduct,
    updateProduct,
    deleteProduct,
    addService,
    updateService,
    deleteService,
    addSection,
    updateSection,
    deleteSection,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    addOrder,
    updateOrder,
    deleteOrder,
    addClient,
    updateClient,
    deleteClient,
    registerUser,
    updateUser,
    deleteUser,
    updateUserPermissions,
    checkPermission,
    sendOtp,
    verifyOtp,
  };

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen text-indigo-600 text-xl font-semibold">
        Carregando dados...
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="daily-balance" element={<DailyBalancePage />} />
            <Route path="service-orders" element={<ServiceOrdersPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;