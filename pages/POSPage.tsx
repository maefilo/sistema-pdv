import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../App';
import { Product, CartItem, Order, OrderStatus, Client, UserRole, PaymentEntry } from '../types';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { formatCurrency } from '../utils/currencyFormatter';
import { generateWhatsAppInvoiceLink } from '../utils/whatsappLinkGenerator';
import { PlusCircle, MinusCircle, Trash2, Printer, MessageSquareText, DollarSign, ScrollText, CheckCircle, Loader2, Barcode } from 'lucide-react';
import { ORDER_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from '../constants';
import { Modal } from '../components/Modal';
import { fetchAddressByCep } from '../utils/cepService';

export const POSPage: React.FC = () => {
  const { products, addOrder, companyInfo, clients, addClient, updateClient, checkPermission, updateProduct, currentUser } = useAuth(); // Use checkPermission

  const canFinalizeSale = checkPermission('canFinalizeSale');
  const canGenerateBudget = checkPermission('canGenerateBudget');
  const canEditOrderItems = checkPermission('canEditOrderItems');
  const canPrintOrSendOrder = checkPermission('canPrintOrSendOrder');

  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [isDirectSale, setIsDirectSale] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientZipCode, setClientZipCode] = useState('');
  const [clientStreet, setClientStreet] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [clientNeighborhood, setClientNeighborhood] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [isClientFound, setIsClientFound] = useState(false);

  const [orderType, setOrderType] = useState<'sale' | 'service-order' | 'budget'>('sale');
  const [customDate, setCustomDate] = useState('');
  const [observation, setObservation] = useState('');
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentInstallments, setNewPaymentInstallments] = useState(1);
  const [newPaymentInterestRate, setNewPaymentInterestRate] = useState('');
  const [newPaymentDiscountRate, setNewPaymentDiscountRate] = useState('');
  const [servicePrice, setServicePrice] = useState('0.00');
  const [isCheckoutSuccessModalOpen, setIsCheckoutSuccessModalOpen] = useState(false);
  const [checkoutSuccessOrder, setCheckoutSuccessOrder] = useState<Order | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  const printAreaRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    if (searchWords.length === 0) {
      return products.filter((product) => product.stock > 0);
    }
    return products.filter((product) => {
      if (product.stock <= 0) return false;
      const name = product.name.toLowerCase();
      const description = (product.description || '').toLowerCase();
      const barcode = (product.barcode || '').toLowerCase();
      return searchWords.every((word) =>
        name.includes(word) ||
        description.includes(word) ||
        barcode.includes(word)
      );
    });
  }, [products, searchTerm]);

  const handleBarcodeSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = barcodeSearch.trim();
      if (!code) return;

      const product = products.find(p => p.barcode === code);
      if (product) {
        if (product.stock > 0) {
          addToCart(product);
          setBarcodeSearch('');
        } else {
          alert('Produto sem estoque!');
        }
      } else {
        alert('Produto não encontrado!');
        setBarcodeSearch('');
      }
    }
  };

  const addToCart = (product: Product) => {
    if (!canEditOrderItems) {
      alert('Você não tem permissão para adicionar itens ao carrinho.');
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id && item.quantity < product.stock
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (!canEditOrderItems) {
      alert('Você não tem permissão para alterar a quantidade de itens no carrinho.');
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId) {
          const productInStock = products.find(p => p.id === itemId);
          const maxQuantity = productInStock ? productInStock.stock : item.quantity;
          const quantity = Math.max(1, Math.min(newQuantity, maxQuantity));
          return { ...item, quantity };
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    if (!canEditOrderItems) {
      alert('Você não tem permissão para remover itens do carrinho.');
      return;
    }
    setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
  };

  const calculatedSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const baseOrderTotal = orderType === 'service-order' ? (parseFloat(servicePrice) || 0) : calculatedSubtotal;

  const remainingToPay = useMemo(() => {
    const paidBaseAmount = payments.reduce((sum, p) => {
      const interest = p.interestRate || 0;
      const discount = p.discountRate || 0;
      let base = p.amount;
      if (interest > 0) {
         base = p.amount / (1 + interest / 100);
      } else if (discount > 0) {
         base = p.amount / (1 - discount / 100);
      }
      return sum + base;
    }, 0);
    return Math.max(0, baseOrderTotal - paidBaseAmount);
  }, [baseOrderTotal, payments]);

  const totalInterest = useMemo(() => {
    return payments.reduce((sum, p) => {
      const interest = p.interestRate || 0;
      if (interest > 0) {
         const baseAmount = p.amount / (1 + interest / 100);
         return sum + (p.amount - baseAmount);
      }
      return sum;
    }, 0);
  }, [payments]);

  const totalDiscount = useMemo(() => {
    return payments.reduce((sum, p) => {
      const discount = p.discountRate || 0;
      if (discount > 0) {
         const baseAmount = p.amount / (1 - discount / 100);
         return sum + (baseAmount - p.amount);
      }
      return sum;
    }, 0);
  }, [payments]);

  const finalOrderTotal = baseOrderTotal + totalInterest - totalDiscount;

  const handleAddPayment = () => {
    if (!newPaymentMethod) return alert('Selecione uma forma de pagamento.');
    let baseAmt = parseFloat(newPaymentAmount);
    if (isNaN(baseAmt) || baseAmt <= 0) return alert('Insira um valor válido positivo.');
    
    if (baseAmt > (remainingToPay + 0.05)) {
      if (newPaymentMethod === 'Dinheiro') {
        const troco = baseAmt - remainingToPay;
        alert(`Troco a ser devolvido: ${formatCurrency(troco)}`);
        baseAmt = remainingToPay;
      } else {
        return alert('O valor excede o restante a pagar.');
      }
    }
    
    const interest = parseFloat(newPaymentInterestRate) || 0;
    const discount = parseFloat(newPaymentDiscountRate) || 0;

    if (interest > 0 && discount > 0) return alert('Não é possível aplicar juros e desconto no mesmo pagamento.');
    
    let finalAmt = baseAmt;
    if (interest > 0) {
       finalAmt = baseAmt * (1 + interest / 100);
    } else if (discount > 0) {
       finalAmt = baseAmt * (1 - discount / 100);
    }
    
    setPayments([...payments, {
      id: Date.now().toString(),
      method: newPaymentMethod,
      amount: finalAmt,
      installments: newPaymentMethod === 'Crédito Parcelado' ? newPaymentInstallments : undefined,
      interestRate: interest,
      discountRate: discount
    }]);
    
    setNewPaymentMethod('');
    setNewPaymentAmount('');
    setNewPaymentInstallments(1);
    setNewPaymentInterestRate('');
    setNewPaymentDiscountRate('');
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setClientZipCode(value);

    if (value.length === 8) {
      setCepLoading(true);
      setCepError(null);
      try {
        const address = await fetchAddressByCep(value);
        setClientStreet(address.street);
        setClientNeighborhood(address.neighborhood);
        setClientCity(address.city);
        setClientState(address.state);
      } catch (error: any) {
        setCepError(error.message);
        setClientStreet('');
        setClientNeighborhood('');
        setClientCity('');
        setClientState('');
      } finally {
        setCepLoading(false);
      }
    } else {
      setCepError(null);
    }
  };

  // --- Client Search by CPF ---
  React.useEffect(() => {
    const cleanCpf = clientCpf.replace(/\D/g, '');
    if (cleanCpf.length === 11) {
      const foundClient = clients.find(c => c.cpf.replace(/\D/g, '') === cleanCpf);
      if (foundClient) {
        setClientName(foundClient.name);
        setClientContact(foundClient.contact);
        setClientZipCode(foundClient.zipCode);
        setClientStreet(foundClient.street);
        setClientNumber(foundClient.number);
        setClientNeighborhood(foundClient.neighborhood);
        setClientCity(foundClient.city);
        setClientState(foundClient.state);
        setIsClientFound(true);
      } else {
        setIsClientFound(false);
      }
    } else {
      setIsClientFound(false);
    }
  }, [clientCpf, clients]);

  // --- Global Barcode Listener ---
  React.useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.metaKey) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      
      // Se demorar mais de 50ms entre teclas, consideramos que é digitação humana e resetamos o buffer
      if (timeDiff > 50) {
         barcodeBuffer = '';
      }
      
      lastKeyTime = currentTime;

      if (e.key.length === 1) {
         barcodeBuffer += e.key;
      }

      // Se der Enter e tiver capturado rapidamente uma string (código de barras)
      if (e.key === 'Enter' && barcodeBuffer.length >= 3) {
         e.preventDefault();
         e.stopPropagation();
         
         const code = barcodeBuffer.trim();
         barcodeBuffer = ''; 
         
         // Mostra visualmente o código no input
         setBarcodeSearch(code);
         
         const product = products.find(p => p.barcode === code);
         if (product) {
            if (product.stock > 0) {
               if (!canEditOrderItems) {
                   alert('Você não tem permissão para adicionar itens ao carrinho.');
               } else {
                   setCart((prevCart) => {
                     const existingItem = prevCart.find((item) => item.id === product.id);
                     if (existingItem) {
                       return prevCart.map((item) =>
                         item.id === product.id && item.quantity < product.stock
                           ? { ...item, quantity: item.quantity + 1 }
                           : item
                       );
                     } else {
                       return [...prevCart, { ...product, quantity: 1 }];
                     }
                   });
               }
            } else {
               alert('Produto sem estoque!');
            }
         } else {
            alert('Produto não encontrado!');
         }
         
         // Limpa o input visual após 1 segundo
         setTimeout(() => setBarcodeSearch(''), 1000);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [products, canEditOrderItems]);

  const handleCheckout = () => {
    if (orderType === 'sale' && !canFinalizeSale) {
      alert('Você não tem permissão para finalizar vendas.');
      return;
    }
    if (orderType === 'budget' && !canGenerateBudget) {
      alert('Você não tem permissão para gerar orçamentos.');
      return;
    }
    if (orderType === 'service-order' && !checkPermission('canCreateServiceOrder')) { // Assuming a specific permission for creating service orders from POS
      alert('Você não tem permissão para criar ordens de serviço.');
      return;
    }

    if (cart.length === 0) {
      alert('O carrinho está vazio.');
      return;
    }
    let finalPaymentsList = [...payments];
    if (orderType !== 'budget') {
      if (finalPaymentsList.length === 0) {
        if (newPaymentMethod) {
          let baseAmt = parseFloat(newPaymentAmount) || remainingToPay;
          if (baseAmt > (remainingToPay + 0.05)) {
            if (newPaymentMethod === 'Dinheiro') {
              const troco = baseAmt - remainingToPay;
              alert(`Troco a ser devolvido: ${formatCurrency(troco)}`);
              baseAmt = remainingToPay;
            } else {
              alert('O valor excede o restante a pagar.');
              return;
            }
          }
          const interest = parseFloat(newPaymentInterestRate) || 0;
          const discount = parseFloat(newPaymentDiscountRate) || 0;
          let finalAmt = baseAmt;
          if (interest > 0) {
             finalAmt = baseAmt * (1 + interest / 100);
          } else if (discount > 0) {
             finalAmt = baseAmt * (1 - discount / 100);
          }
          finalPaymentsList = [{
            id: Date.now().toString(),
            method: newPaymentMethod,
            amount: finalAmt,
            installments: newPaymentMethod === 'Crédito Parcelado' ? newPaymentInstallments : undefined,
            interestRate: interest,
            discountRate: discount
          }];
        } else {
          alert('Por favor, adicione formas de pagamento suficientes para quitar o total.');
          return;
        }
      } else if (remainingToPay > 0.01) {
        alert('Por favor, adicione formas de pagamento suficientes para quitar o total.');
        return;
      }
    }
    if (!isDirectSale) {
      if (clientZipCode.trim() && clientZipCode.trim().replace(/\D/g, '').length !== 8) {
        alert('CEP inválido. O CEP deve conter 8 dígitos.');
        return;
      }
    }

    let orderFinalTotalToSave = orderType === 'budget' ? baseOrderTotal : finalOrderTotal;

    let status: OrderStatus;
    if (orderType === 'budget') {
      status = OrderStatus.BUDGET;
    } else {
      status = OrderStatus.COMPLETED;
    }

    if (!isDirectSale && clientName.trim()) {
      const existingClient = clients.find(
        (c) => (clientCpf.trim() && c.cpf === clientCpf.trim()) || (clientContact.trim() && c.contact === clientContact.trim())
      );

      if (existingClient) {
        if (
          existingClient.name !== clientName.trim() ||
          existingClient.contact !== clientContact.trim() ||
          existingClient.cpf !== clientCpf.trim() ||
          existingClient.zipCode !== clientZipCode.trim() ||
          existingClient.street !== clientStreet.trim() ||
          existingClient.number !== clientNumber.trim() ||
          existingClient.neighborhood !== clientNeighborhood.trim() ||
          existingClient.city !== clientCity.trim() ||
          existingClient.state !== clientState.trim()
        ) {
          updateClient({
            ...existingClient,
            name: clientName.trim(),
            contact: clientContact.trim(),
            cpf: clientCpf.trim(),
            zipCode: clientZipCode.trim(),
            street: clientStreet.trim(),
            number: clientNumber.trim(),
            neighborhood: clientNeighborhood.trim(),
            city: clientCity.trim(),
            state: clientState.trim(),
          });
        }
      } else {
        addClient({
          id: '',
          name: clientName.trim(),
          contact: clientContact.trim(),
          cpf: clientCpf.trim(),
          zipCode: clientZipCode.trim(),
          street: clientStreet.trim(),
          number: clientNumber.trim(),
          neighborhood: clientNeighborhood.trim(),
          city: clientCity.trim(),
          state: clientState.trim(),
        });
      }
    }

    const newOrderData: Order = {
      id: '',
      type: orderType,
      clientName: isDirectSale ? 'Consumidor Final' : clientName.trim() || 'Consumidor Final',
      clientContact: isDirectSale ? 'N/A' : clientContact.trim() || 'N/A',
      clientCpf: isDirectSale ? 'N/A' : clientCpf.trim() || 'N/A',
      clientZipCode: isDirectSale ? 'N/A' : clientZipCode.trim() || 'N/A',
      clientStreet: isDirectSale ? 'N/A' : clientStreet.trim() || 'N/A',
      clientNumber: isDirectSale ? 'N/A' : clientNumber.trim() || 'N/A',
      clientNeighborhood: isDirectSale ? 'N/A' : clientNeighborhood.trim() || 'N/A',
      clientCity: isDirectSale ? 'N/A' : clientCity.trim() || 'N/A',
      clientState: isDirectSale ? 'N/A' : clientState.trim() || 'N/A',
      items: cart,
      total: orderFinalTotalToSave,
      paymentMethod: orderType === 'budget' ? 'N/A' : (finalPaymentsList.length > 0 ? 'Múltiplos' : 'N/A'),
      payments: orderType === 'budget' ? [] : finalPaymentsList,
      status,
      sellerName: currentUser?.fullName || currentUser?.username || 'Sistema',
      observation: observation.trim() || undefined,
      createdAt: customDate ? new Date(customDate).toISOString() : new Date().toISOString(),
      updatedAt: customDate ? new Date(customDate).toISOString() : new Date().toISOString(),
      productionDetails: orderType === 'service-order' ? [] : undefined,
    };

    const addedOrder = addOrder(newOrderData);

    setCheckoutSuccessOrder(addedOrder);
    setIsCheckoutSuccessModalOpen(true);

    resetPOS();
  };

  const resetPOS = () => {
    setIsDirectSale(false);
    setSearchTerm('');
    setCart([]);
    setClientName('');
    setClientContact('');
    setClientCpf('');
    setClientZipCode('');
    setClientStreet('');
    setClientNumber('');
    setClientNeighborhood('');
    setClientCity('');
    setClientState('');
    setCepError(null);
    setCepLoading(false);
    setOrderType('sale');
    setCustomDate('');
    setObservation('');
    setPayments([]);
    setNewPaymentMethod('');
    setNewPaymentAmount('');
    setNewPaymentInterestRate('');
    setNewPaymentDiscountRate('');
    setServicePrice('0.00');
  };

  const handlePrint = (order: Order) => {
    if (!canPrintOrSendOrder) {
      alert('Você não tem permissão para imprimir ordens/orçamentos.');
      return;
    }
    if (!order) {
      alert('Nenhuma ordem para imprimir.');
      return;
    }

    const docTitle = order.type === 'budget' ? 'Imprimir Orçamento' : 'Imprimir Nota de Venda';
    const documentTypeLabel = order.type === 'budget' ? 'Orçamento' : 'Nota de Venda/Serviço';

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
        printWindow.document.write('<html><head><title>');
        printWindow.document.write(docTitle);
        printWindow.document.write('</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            @media print {
                body { font-family: sans-serif; margin: 20px; }
                h1, h2, h3 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .text-right { text-align: right; }
                .hidden-print { display: none; }
                .header-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .header-info img { height: 80px; margin-right: 20px; }
                .header-info h2 { margin: 0; flex-grow: 1; }
                .order-summary { margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px; }
                .address-info { margin-bottom: 15px; font-size: 0.9em; }
                .production-details-section { margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 15px; }
                .production-details-section h3 { margin-bottom: 10px; }
                .production-details-section ul { list-style: none; padding: 0; }
                .production-details-section li { margin-bottom: 5px; font-size: 0.85em; }
            }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(`
            <div class="header-info">
                ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Logo da Empresa" />` : ''}
                <h2>${companyInfo.name}</h2>
            </div>
            <h1 class="text-2xl font-bold mb-4">
                ${documentTypeLabel}
            </h1>
            <p><strong>ID do Pedido:</strong> ${order.id}</p>
            <p><strong>Cliente:</strong> ${order.clientName}</p>
            <p><strong>Contato:</strong> ${order.clientContact}</p>
            <p><strong>CPF:</strong> ${order.clientCpf}</p>
            <div class="address-info">
                <p><strong>Endereço:</strong> ${order.clientStreet}, ${order.clientNumber} - ${order.clientNeighborhood}</p>
                <p>${order.clientCity}/${order.clientState} - CEP: ${order.clientZipCode}</p>
            </div>
            <p><strong>Data:</strong> ${new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
            <p><strong>Tipo:</strong> ${order.type === 'sale' ? 'Venda Direta' : order.type === 'service-order' ? 'Ordem de Serviço' : 'Orçamento'}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            ${order.observation ? `<p><strong>Observação:</strong> ${order.observation}</p>` : ''}
            ${order.payments && order.payments.length > 0 && order.type !== 'budget' ? `
                <div class="mt-4 mb-4 pb-2 border-b border-gray-200">
                   <strong>Forma de Pagto:</strong><br/>
                   ${order.payments.map((p: any) => 
                     `- ${p.method} ${p.installments ? `(${p.installments}x)` : ''} ${p.interestRate ? `(Juros: ${p.interestRate}%)` : ''} ${p.discountRate ? `(Desc: ${p.discountRate}%)` : ''}: ${formatCurrency(p.amount)}<br/>`
                   ).join('')}
                </div>
            ` : ''}

            <h3 class="text-xl font-semibold mt-6 mb-3">${order.type === 'service-order' ? 'Produtos a serem confeccionados:' : 'Itens'}:</h3>
            <table>
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th class="text-right">Quantidade</th>
                        <th class="text-right">Preço Unit.</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${order.items.map((item) => `
                        <tr>
                            <td>${item.name}</td>
                            <td class="text-right">${item.quantity}</td>
                            <td class="text-right">${formatCurrency(item.price)}</td>
                            <td class="text-right">${formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            ${order.type === 'service-order' && order.productionDetails && order.productionDetails.length > 0 ? `
                <div class="production-details-section">
                    <h3 class="text-xl font-semibold mb-3">Detalhes de Produção:</h3>
                    <ul>
                        ${order.productionDetails.map(prodItem => `
                            <li>- ${prodItem.name} (${prodItem.type === 'raw_material' ? 'Matéria Prima' : 'Mão de Obra'}): ${prodItem.quantityUsed} ${prodItem.unit} @ ${formatCurrency(prodItem.costPerUnit)} cada</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="order-summary text-right mt-6">
                <h3 class="text-2xl font-bold">Total ${order.type === 'service-order' ? '(Preço do Serviço)' : ''}: ${formatCurrency(order.total)}</h3>
            </div>
            <p class="mt-8 text-center text-sm text-gray-500">
                Obrigado pela preferência!
            </p>
        `);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
    } else {
        alert('Erro ao abrir janela de impressão.');
    }
  };

  const handleWhatsAppInvoice = (order: Order) => {
    if (!canPrintOrSendOrder) {
      alert('Você não tem permissão para enviar ordens/orçamentos via WhatsApp.');
      return;
    }
    if (!order) {
      alert('Nenhuma ordem para enviar via WhatsApp.');
      return;
    }
    const whatsappLink = generateWhatsAppInvoiceLink(order, companyInfo.name);
    window.open(whatsappLink, '_blank');
  };

  const closeCheckoutSuccessModal = () => {
    setIsCheckoutSuccessModalOpen(false);
    setCheckoutSuccessOrder(null);
  };

  const currentPrintTitle = checkoutSuccessOrder?.type === 'budget' ? 'Imprimir Orçamento' : 'Imprimir Nota de Venda';
  const currentWhatsAppTitle = checkoutSuccessOrder?.type === 'budget' ? 'Enviar Orçamento via WhatsApp' : 'Enviar Nota de Venda via WhatsApp';

  // Determine if checkout button should be enabled
  const isCheckoutDisabled = useMemo(() => {
    const baseConditions = cart.length === 0;
    if (baseConditions) return true;

    if (orderType !== 'budget') {
      const isSinglePaymentValid = payments.length === 0 && newPaymentMethod && parseFloat(newPaymentAmount) > 0;
      const isMultiPaymentValid = payments.length > 0 && remainingToPay <= 0.01;
      if (!isSinglePaymentValid && !isMultiPaymentValid) return true;
    }

    if (orderType === 'sale' && !canFinalizeSale) return true;
    if (orderType === 'budget' && !canGenerateBudget) return true;
    if (orderType === 'service-order' && !checkPermission('canCreateServiceOrder')) return true;

    if (orderType === 'service-order' && (parseFloat(servicePrice) <= 0 || isNaN(parseFloat(servicePrice)))) return true;

    return false;
  }, [cart, orderType, servicePrice, remainingToPay, payments, newPaymentMethod, newPaymentAmount, canFinalizeSale, canGenerateBudget, checkPermission, isDirectSale]);


  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 h-full">
      {/* Product Search & List */}
      <div className="w-full md:w-1/2 bg-white shadow-md rounded-lg p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Produtos Disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            id="productSearch"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<PlusCircle className="h-5 w-5 text-gray-400" />}
          />
          <Input
            id="barcodeSearch"
            ref={barcodeInputRef}
            placeholder="Modo Código de Barras [Escaneie aqui]"
            value={barcodeSearch}
            onChange={(e) => setBarcodeSearch(e.target.value)}
            onKeyDown={handleBarcodeSearch}
            autoFocus
            className="border-2 border-indigo-300 focus:border-indigo-500"
            icon={<Barcode className="h-5 w-5 text-indigo-500" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`border border-gray-200 rounded-lg p-3 flex flex-col items-center text-center cursor-pointer transition-shadow ${canEditOrderItems ? 'hover:shadow-lg' : 'opacity-70 cursor-not-allowed'}`}
              onClick={() => {
                 if (canEditOrderItems) setPreviewProduct(product);
              }}
              onDoubleClick={() => {
                 if (canEditOrderItems) addToCart(product);
              }}
              title="Clique 1x para detalhes, 2x para adicionar"
            >
              <img src={product.imageUrl} alt={product.name} className="h-20 w-20 object-cover rounded-md mb-2" />
              <h3 className="font-medium text-gray-800 text-sm truncate w-full">{product.name}</h3>
              <p className="text-gray-600 text-xs">{formatCurrency(product.price)}</p>
              <p className="text-gray-500 text-xs">Estoque: {product.stock}</p>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <p className="col-span-full text-center text-gray-500 py-4">Nenhum produto encontrado ou em estoque.</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!previewProduct}
        onClose={() => setPreviewProduct(null)}
        title="Detalhes do Produto"
      >
        {previewProduct && (
          <div className="flex flex-col items-center p-4">
            {previewProduct.imageUrl ? (
              <img src={previewProduct.imageUrl} alt={previewProduct.name} className="h-48 w-48 object-cover rounded-md mb-4 shadow-sm" />
            ) : (
              <div className="h-48 w-48 bg-gray-100 rounded-md flex items-center justify-center text-gray-400 mb-4 shadow-sm border border-gray-200">
                <span>Sem imagem</span>
              </div>
            )}
            <h3 className="text-2xl font-bold text-gray-800 mb-2">{previewProduct.name}</h3>
            {previewProduct.barcode && (
              <p className="text-xs text-gray-400 mb-2 font-mono">{previewProduct.barcode}</p>
            )}
            <p className="text-gray-600 mb-6 text-center max-w-sm">{previewProduct.description || 'Nenhuma descrição fornecida para este produto.'}</p>
            
            <div className="w-full bg-gray-50 p-4 rounded-lg flex justify-between items-center mb-6 border border-gray-100">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase font-semibold">Preço</span>
                <span className="text-2xl font-bold text-indigo-700">{formatCurrency(previewProduct.price)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-500 uppercase font-semibold">Em Estoque</span>
                <span className={`text-lg font-bold ${previewProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {previewProduct.stock} un
                </span>
              </div>
            </div>

            <div className="flex gap-3 w-full">
               <Button
                 variant="outline"
                 className="flex-1"
                 onClick={() => setPreviewProduct(null)}
               >
                 Fechar
               </Button>
               <Button
                 className="flex-1"
                 onClick={() => {
                   addToCart(previewProduct);
                   setPreviewProduct(null);
                 }}
                 icon={<PlusCircle className="h-5 w-5" />}
                 disabled={previewProduct.stock <= 0}
               >
                 Adicionar
               </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cart and Checkout */}
      <div className="w-full md:w-1/2 bg-white shadow-md rounded-lg p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Carrinho / Checkout</h2>

        <div className="mb-4">
            <Select
                id="orderType"
                label="Tipo de Transação"
                value={orderType}
                onChange={(e) => {
                    setOrderType(e.target.value as 'sale' | 'service-order' | 'budget');
                    setServicePrice('0.00');
                }}
                options={[
                    { value: 'sale', label: 'Venda Direta' },
                    { value: 'budget', label: 'Orçamento' },
                    { value: 'service-order', label: 'Ordem de Serviço' },
                ]}
                containerClassName="mb-4"
            />
            {orderType === 'service-order' && (
                <Input
                    id="servicePrice"
                    label="Preço do Serviço (R$)"
                    type="number"
                    step="0.01"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="0.00"
                    className="mb-4"
                    required
                />
            )}
            <Input
                id="customDate"
                label="Data da Venda (Opcional - Retroativa)"
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="mb-4"
            />
            <Input
                id="observation"
                label="Observação (Opcional)"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Entrega na parte da tarde"
                className="mb-4"
            />
            <div className="flex items-center gap-2 mb-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <input
                type="checkbox"
                id="directSaleCheckbox"
                className="h-5 w-5 text-indigo-600 border-indigo-300 rounded focus:ring-indigo-500 cursor-pointer"
                checked={isDirectSale}
                onChange={(e) => {
                  setIsDirectSale(e.target.checked);
                  if (e.target.checked) {
                    setClientName('');
                    setClientContact('');
                    setClientCpf('');
                    setClientZipCode('');
                    setClientStreet('');
                    setClientNumber('');
                    setClientNeighborhood('');
                    setClientCity('');
                    setClientState('');
                  }
                }}
              />
              <label htmlFor="directSaleCheckbox" className="text-sm font-semibold text-indigo-900 cursor-pointer select-none">
                Venda Avulsa (Consumidor Final / Sem cadastro)
              </label>
            </div>

            {!isDirectSale && (
              <>
                <Input
                  id="clientName"
                  label="Nome do Cliente (Opcional)"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="mb-2"
                />
                <Input
                  id="clientContact"
                  label="Contato do Cliente (WhatsApp) (Opcional)"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  placeholder="Ex: 5511987654321"
                  type="tel"
                  className="mb-2"
                />
                <Input
                  id="clientCpf"
                  label="CPF do Cliente (Opcional)"
                  value={clientCpf}
                  onChange={(e) => setClientCpf(e.target.value)}
                  placeholder="Ex: 123.456.789-00"
                  maxLength={14}
                  className="mb-1"
                  icon={isClientFound ? <CheckCircle className="h-5 w-5 text-green-500" /> : undefined}
                />
                {isClientFound && (
                  <p className="text-xs text-green-600 mb-4 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Cliente cadastrado encontrado! Dados preenchidos.
                  </p>
                )}
                {!isClientFound && <div className="mb-4" />}

                <h3 className="text-lg font-semibold text-gray-800 mb-3 pt-4 border-t border-gray-100">Endereço do Cliente</h3>
                <Input
                  id="clientZipCode"
                  label="CEP (Opcional)"
                  value={clientZipCode}
                  onChange={handleCepChange}
                  error={cepError}
                  placeholder="Ex: 12345-678"
                  maxLength={9}
                  icon={cepLoading ? <Loader2 className="h-5 w-5 animate-spin text-gray-400" /> : undefined}
                  className="mb-2"
                />
                <Input
                  id="clientStreet"
                  label="Rua (Opcional)"
                  value={clientStreet}
                  onChange={(e) => setClientStreet(e.target.value)}
                  placeholder="Ex: Rua das Flores"
                  className="mb-2"
                  disabled={cepLoading}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <Input
                    id="clientNumber"
                    label="Número (Opcional)"
                    value={clientNumber}
                    onChange={(e) => setClientNumber(e.target.value)}
                    placeholder="Ex: 123"
                    />
                    <Input
                    id="clientNeighborhood"
                    label="Bairro (Opcional)"
                    value={clientNeighborhood}
                    onChange={(e) => setClientNeighborhood(e.target.value)}
                    placeholder="Ex: Centro"
                    disabled={cepLoading}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input
                    id="clientCity"
                    label="Cidade (Opcional)"
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    placeholder="Ex: São Paulo"
                    disabled={cepLoading}
                    />
                    <Input
                    id="clientState"
                    label="Estado (UF) (Opcional)"
                    value={clientState}
                    onChange={(e) => setClientState(e.target.value)}
                    placeholder="Ex: SP"
                    maxLength={2}
                    disabled={cepLoading}
                    />
                </div>
              </>
            )}
        </div>


        <div className="border-t border-b border-gray-200 py-4 mb-4">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500">Carrinho vazio.</p>
          ) : (
            <div className="max-h-60 overflow-y-auto pr-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <img src={item.imageUrl} alt={item.name} className="h-10 w-10 object-cover rounded-md mr-3" />
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                      <p className="text-gray-600 text-xs">{formatCurrency(item.price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || !canEditOrderItems} // Disabled if no permission
                      icon={<MinusCircle className="h-4 w-4" />}
                    />
                    <span className="mx-2 text-gray-700">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock || !canEditOrderItems} // Disabled if no permission
                      icon={<PlusCircle className="h-4 w-4" />}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="ml-3"
                      icon={<Trash2 className="h-4 w-4" />}
                      disabled={!canEditOrderItems} // Disabled if no permission
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {orderType !== 'budget' && (
            <div className="bg-indigo-50 p-4 rounded-lg mb-4 border border-indigo-100">
                <h3 className="font-semibold text-lg mb-2 text-indigo-900 border-b border-indigo-200 pb-2">Pagamento</h3>
                
                {payments.map(p => (
                  <div key={p.id} className="flex flex-wrap justify-between items-center bg-white p-2 rounded shadow-sm mb-2 text-sm border border-gray-100">
                     <div>
                        <span className="font-semibold text-gray-800">{p.method}</span>
                        {p.installments ? ` (${p.installments}x)` : ''}
                        {p.interestRate ? <span className="text-red-600 text-xs ml-1">(+${p.interestRate}% de juros)</span> : ''}
                        {p.discountRate ? <span className="text-green-600 text-xs ml-1">(-${p.discountRate}% de desconto)</span> : ''}
                     </div>
                     <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-700">{formatCurrency(p.amount)}</span>
                        <Button size="sm" variant="danger" ghost icon={<Trash2 className="w-4 h-4"/>} onClick={() => setPayments(payments.filter(x => x.id !== p.id))} />
                     </div>
                  </div>
                ))}

                {remainingToPay > 0.01 && (
                    <div className="mt-4">
                       <p className="text-sm font-medium text-gray-700 mb-2">Adicionar Pagamento:</p>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                         <Select
                            id="newPaymentMethod"
                            label="Forma"
                            value={newPaymentMethod}
                            onChange={(e) => {
                              const method = e.target.value;
                              setNewPaymentMethod(method);
                              if (method) {
                                setNewPaymentAmount(remainingToPay.toFixed(2));
                              } else {
                                setNewPaymentAmount('');
                              }
                            }}
                            options={[{ value: '', label: 'Selecione a forma...' }, ...PAYMENT_METHOD_OPTIONS]}
                         />
                         <div className="relative">
                            <Input
                                id="newPaymentAmount"
                                type="number"
                                step="0.01"
                                label={`Valor (Faltam ${formatCurrency(remainingToPay)})`}
                                value={newPaymentAmount}
                                onChange={(e) => setNewPaymentAmount(e.target.value)}
                                placeholder={remainingToPay.toFixed(2)}
                            />
                            <button
                               type="button"
                               onClick={() => setNewPaymentAmount(remainingToPay.toFixed(2))}
                               className="absolute right-2 top-8 text-xs bg-indigo-100 text-indigo-700 px-2 rounded-full cursor-pointer hover:bg-indigo-200 transition"
                            >Integra</button>
                         </div>
                       </div>
                       
                       {newPaymentMethod === 'Crédito Parcelado' && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 bg-white p-3 border border-indigo-50 rounded">
                              <Input
                                 id="newPaymentInstallments"
                                 type="number"
                                 label="Número de Parcelas"
                                 min="1" max="12"
                                 value={newPaymentInstallments.toString()}
                                 onChange={(e) => setNewPaymentInstallments(parseInt(e.target.value) || 1)}
                              />
                              <Input
                                 id="newPaymentInterestRate"
                                 type="number"
                                 step="0.01"
                                 label="Taxa de Juros (%)"
                                 placeholder="Opcional. Ex: 5.5"
                                 value={newPaymentInterestRate}
                                 onChange={(e) => setNewPaymentInterestRate(e.target.value)}
                              />
                              {newPaymentInstallments > 0 && parseFloat(newPaymentAmount || '0') > 0 && (
                                  <div className="col-span-full text-xs text-indigo-700 mt-1">
                                      Valor das parcelas: {newPaymentInstallments}x de {formatCurrency(((parseFloat(newPaymentAmount) * (1 + (parseFloat(newPaymentInterestRate)||0)/100)) / newPaymentInstallments))} (Total Cobrado na Maquininha: {formatCurrency(parseFloat(newPaymentAmount) * (1 + (parseFloat(newPaymentInterestRate)||0)/100))})
                                  </div>
                              )}
                           </div>
                       )}

                       {(newPaymentMethod === 'Dinheiro' || newPaymentMethod === 'PIX' || newPaymentMethod === 'Débito') && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 bg-white p-3 border border-indigo-50 rounded">
                              <Input
                                 id="newPaymentDiscountRate"
                                 type="number"
                                 step="0.01"
                                 label="Desconto (%)"
                                 placeholder="Opcional. Ex: 5"
                                 value={newPaymentDiscountRate}
                                 onChange={(e) => setNewPaymentDiscountRate(e.target.value)}
                              />
                              {parseFloat(newPaymentAmount || '0') > 0 && (
                                  <div className="col-span-full text-xs text-green-700 mt-1">
                                      Valor com desconto: {formatCurrency(parseFloat(newPaymentAmount) * (1 - (parseFloat(newPaymentDiscountRate)||0)/100))}
                                  </div>
                              )}
                              {newPaymentMethod === 'Dinheiro' && parseFloat(newPaymentAmount || '0') > remainingToPay && (
                                  <div className="col-span-full text-xs text-green-700 mt-1 font-semibold">
                                      Troco a devolver: {formatCurrency(parseFloat(newPaymentAmount) - remainingToPay)}
                                  </div>
                              )}
                           </div>
                       )}

                       <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAddPayment}
                          className="w-full text-sm py-1.5"
                          disabled={!newPaymentMethod || !newPaymentAmount}
                       >
                          + Adicionar Pagamento ({formatCurrency(parseFloat(newPaymentAmount || '0') * (newPaymentMethod === 'Crédito Parcelado' ? (1 + (parseFloat(newPaymentInterestRate)||0)/100) : (1 - (parseFloat(newPaymentDiscountRate)||0)/100)))})
                       </Button>
                    </div>
                )}
                {remainingToPay <= 0.01 && payments.length > 0 && (
                    <div className="mt-3 flex items-center justify-center text-green-700 font-semibold text-sm">
                        <CheckCircle className="w-5 h-5 mr-1" /> Total atingido. Pronto para finalizar.
                    </div>
                )}
            </div>
        )}

        <div className="flex justify-between items-center text-lg text-gray-600 mb-1 pt-2 border-t border-gray-100">
          <span>Subtotal {orderType === 'service-order' ? '(Preço do Serviço)' : ''}:</span>
          <span>{formatCurrency(baseOrderTotal)}</span>
        </div>
        {totalInterest > 0 && (
            <div className="flex justify-between items-center text-sm text-red-500 mb-1">
               <span>Acrescimo Juros Maquininha:</span>
               <span>{formatCurrency(totalInterest)}</span>
            </div>
        )}
        {totalDiscount > 0 && (
            <div className="flex justify-between items-center text-sm text-green-500 mb-1">
               <span>Desconto Aplicado:</span>
               <span>-{formatCurrency(totalDiscount)}</span>
            </div>
        )}
        <div className="flex justify-between items-center text-2xl font-bold text-gray-800 mb-6 mt-2">
          <span>Total Final:</span>
          <span>{orderType === 'budget' ? formatCurrency(baseOrderTotal) : formatCurrency(finalOrderTotal)}</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button
            variant="primary"
            onClick={handleCheckout}
            disabled={isCheckoutDisabled} // Use memoized disabled state
            icon={orderType === 'budget' ? <ScrollText className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
          >
            {orderType === 'budget' ? 'Gerar Orçamento' : 'Finalizar Venda'}
          </Button>
        </div>
      </div>

      <div ref={printAreaRef} className="absolute -left-[9999px] top-0 p-8 hidden-print">
      </div>

      {checkoutSuccessOrder && (
        <Modal
          isOpen={isCheckoutSuccessModalOpen}
          onClose={closeCheckoutSuccessModal}
          title={checkoutSuccessOrder.type === 'budget' ? 'Orçamento Gerado com Sucesso!' : 'Venda Finalizada!'}
          size="lg"
          autoPrint={checkoutSuccessOrder.type !== 'budget'}
        >
          <div className="text-center py-4">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <p className="text-xl font-semibold text-gray-800 mb-2">
              Pedido <span className="text-indigo-600">#{checkoutSuccessOrder.id}</span> foi {checkoutSuccessOrder.type === 'budget' ? 'gerado' : 'finalizado'}!
            </p>
            <p className="text-gray-600 mb-1 text-sm">Subtotal: {formatCurrency(checkoutSuccessOrder.total - (checkoutSuccessOrder.payments?.reduce((s,p)=>p.interestRate ? s+(p.amount-(p.amount/(1+p.interestRate/100))) : s, 0)||0) + (checkoutSuccessOrder.payments?.reduce((s,p)=>p.discountRate ? s+((p.amount/(1-p.discountRate/100))-p.amount) : s, 0)||0))}</p>
            {checkoutSuccessOrder.payments && checkoutSuccessOrder.payments.length > 0 && (
                <div className="text-sm bg-gray-50 border border-gray-200 rounded p-2 mb-6 mt-3 max-w-sm mx-auto text-left">
                   <p className="font-semibold text-gray-700 mb-1">Forma(s) de Pagto:</p>
                   {checkoutSuccessOrder.payments.map((p, i) => (
                      <div key={i} className="text-gray-600 flex justify-between border-b border-gray-100 last:border-0 pb-1 pt-1">
                         <span>{p.method} {p.installments ? `(${p.installments}x)`:''}</span>
                         <span>{formatCurrency(p.amount)}</span>
                      </div>
                   ))}
                </div>
            )}
            {checkoutSuccessOrder.type === 'budget' && <div className="mb-6"></div>}

            {checkoutSuccessOrder.type !== 'budget' ? (
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => handlePrint(checkoutSuccessOrder)}
                  icon={<Printer className="h-5 w-5" />}
                  disabled={!canPrintOrSendOrder}
                >
                  {currentPrintTitle}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleWhatsAppInvoice(checkoutSuccessOrder)}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  icon={<MessageSquareText className="h-5 w-5" />}
                  disabled={!canPrintOrSendOrder}
                >
                  {currentWhatsAppTitle}
                </Button>
              </div>
            ) : (
              <p className="text-gray-500">
                Você pode gerenciar este orçamento na seção "Orçamentos".
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};