-- Script SQL para inserir o histórico completo de vendas diretamente no TiDB Cloud
-- Copie TODO este código e cole na aba "SQL Editor" do seu painel do TiDB Cloud e clique em Run.

INSERT IGNORE INTO orders (
  id, type, client_name, client_contact, client_cpf, client_zip_code, client_street,
  client_number, client_neighborhood, client_city, client_state, items, total,
  payment_method, payments, status, seller_name, created_at, updated_at
) VALUES 
('20260417-0003', 'sale', 'Gláucio', 'Não informado', 'Não informado', 'Não informado', 'Não informado', 'S/N', 'Não informado', 'Não informado', 'Não informado', '[{"name": "Produto (Histórico)", "price": 1434.50, "quantity": 1}]', 1434.50, 'N/A', '[]', 'Concluída', 'N/A', '2026-04-17 23:03:00', '2026-04-17 23:03:00'),
('20260417-0002', 'sale', 'Gláucio', 'Não informado', 'Não informado', 'Não informado', 'Não informado', 'S/N', 'Não informado', 'Não informado', 'Não informado', '[{"name": "Produto (Histórico)", "price": 260.00, "quantity": 1}]', 260.00, 'N/A', '[]', 'Concluída', 'N/A', '2026-04-17 20:56:00', '2026-04-17 20:56:00'),
('20260417-0001', 'sale', 'Gláucio', 'Não informado', 'Não informado', 'Não informado', 'Não informado', 'S/N', 'Não informado', 'Não informado', 'Não informado', '[{"name": "Produto (Histórico)", "price": 130.00, "quantity": 1}]', 130.00, 'N/A', '[]', 'Concluída', 'N/A', '2026-04-17 20:21:00', '2026-04-17 20:21:00'),
('20260416-0001', 'sale', 'Gláucio', 'Não informado', 'Não informado', 'Não informado', 'Não informado', 'S/N', 'Não informado', 'Não informado', 'Não informado', '[{"name": "Produto (Histórico)", "price": 26.00, "quantity": 1}]', 26.00, 'N/A', '[]', 'Concluída', 'N/A', '2026-04-16 08:40:00', '2026-04-16 08:40:00'),
('20260414-0003', 'sale', 'Gláucio', 'Não informado', 'Não informado', 'Não informado', 'Não informado', 'S/N', 'Não informado', 'Não informado', 'Não informado', '[{"name": "Produto (Histórico)", "price": 109.60, "quantity": 1}]', 109.60, 'N/A', '[]', 'Concluída', 'N/A', '2026-04-14 08:38:00', '2026-04-14 08:38:00'),
('20260414-0002', 'sale', 'Gláucio', 'Não informado', 'Não informado', 'Não informado', 'Não informado', 'S/N', 'Não informado', 'Não informado', 'Não informado', '[{"name": "Produto (Histórico)", "price": 109.60, "quantity": 1}]', 109.60, 'N/A', '[]', 'Concluída', 'N/A', '2026-04-14 08:02:00', '2026-04-14 08:02:00'),
('20260412-0001', 'sale', 'ANA PAULA DUARTE GUIMARÃES', 'Não informado', 'Não informado', 'Não informado', 'Não informado', 'S/N', 'Não informado', 'Não informado', 'Não informado', '[{"name": "Produto (Histórico)", "price": 300.20, "quantity": 1}]', 300.20, 'N/A', '[]', 'Concluída', 'N/A', '2026-04-12 12:39:00', '2026-04-12 12:39:00'),
('20260410-0001', 'sale', 'Gláucio', 'Não informado', 'Não informado', 'Não informado', 'Não informado', 'S/N', 'Não informado', 'Não informado', 'Não informado', '[{"name": "Produto (Histórico)", "price": 90.00, "quantity": 1}]', 90.00, 'N/A', '[]', 'Concluída', 'N/A', '2026-04-10 12:24:00', '2026-04-10 12:24:00');
