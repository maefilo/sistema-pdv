/**
 * Script de Inserção de Histórico de Vendas
 * ========================================
 * Executa: node inserir_historico_vendas.js
 *
 * Requisito: O servidor (server.js) deve estar rodando na porta 3001.
 * Para iniciar o servidor: node server.js
 */

const API_URL = 'http://localhost:3001/api/orders';

// Exemplo de histórico de vendas a ser inserido.
// Substitua ou adicione os dados conforme a sua planilha/histórico.
const historicoVendas = [
  {
    id: "20260417-0003",
    type: "sale",
    client_name: "Gláucio",
    client_contact: "Não informado",
    client_cpf: "Não informado",
    client_zip_code: "Não informado",
    client_street: "Não informado",
    client_number: "S/N",
    client_neighborhood: "Não informado",
    client_city: "Não informado",
    client_state: "Não informado",
    items: [
        { name: "Produto Exemplo 1", quantity: 10, price: 143.45 }
    ],
    total: 1434.50,
    payment_method: "N/A",
    payments: [],
    status: "Cancelada",
    seller_name: "N/A",
    created_at: "2026-04-17T23:03:00.000Z",
    updated_at: "2026-04-17T23:03:00.000Z"
  },
  {
    id: "20260417-0002",
    type: "sale",
    client_name: "Gláucio",
    client_contact: "Não informado",
    client_cpf: "Não informado",
    client_zip_code: "Não informado",
    client_street: "Não informado",
    client_number: "S/N",
    client_neighborhood: "Não informado",
    client_city: "Não informado",
    client_state: "Não informado",
    items: [
        { name: "Produto Exemplo 2", quantity: 2, price: 130.00 }
    ],
    total: 260.00,
    payment_method: "N/A",
    payments: [],
    status: "Cancelada",
    seller_name: "N/A",
    created_at: "2026-04-17T20:56:00.000Z",
    updated_at: "2026-04-17T20:56:00.000Z"
  },
  {
    id: "20260417-0001",
    type: "sale",
    client_name: "Gláucio",
    client_contact: "Não informado",
    client_cpf: "Não informado",
    client_zip_code: "Não informado",
    client_street: "Não informado",
    client_number: "S/N",
    client_neighborhood: "Não informado",
    client_city: "Não informado",
    client_state: "Não informado",
    items: [
        { name: "Produto Exemplo 3", quantity: 1, price: 130.00 }
    ],
    total: 130.00,
    payment_method: "N/A",
    payments: [],
    status: "Cancelada",
    seller_name: "N/A",
    created_at: "2026-04-17T20:21:00.000Z",
    updated_at: "2026-04-17T20:21:00.000Z"
  }
];

async function insertOrder(order, index) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`❌ [${index + 1}] ERRO ao inserir venda "${order.id}": ${err}`);
      return false;
    }

    const data = await response.json();
    console.log(`✅ [${index + 1}/${historicoVendas.length}] Venda Inserida: "${order.id}"`);
    return true;
  } catch (err) {
    console.error(`❌ [${index + 1}] Falha de rede ao inserir venda "${order.id}": ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n🚀 Iniciando inserção de ${historicoVendas.length} vendas...\n`);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < historicoVendas.length; i++) {
    const ok = await insertOrder(historicoVendas[i], i);
    if (ok) success++;
    else failed++;
    // Pequena pausa para não sobrecarregar o banco
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n========================================`);
  console.log(`✅ Inseridos com sucesso: ${success}`);
  console.log(`❌ Falhas: ${failed}`);
  console.log(`Total: ${historicoVendas.length}`);
  console.log(`========================================\n`);
}

main();
