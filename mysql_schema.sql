-- Script para criar todas as tabelas necessárias no MySQL (phpMyAdmin)
-- Para rodar: Abra o phpMyAdmin, clique no banco de dados 'mae_filho',
-- vá na aba "SQL", cole o código abaixo e clique em "Executar".

-- 1. company_info
CREATE TABLE IF NOT EXISTS company_info (
  `key` VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo LONGTEXT,
  gemini_api_key TEXT,
  gemini_model_text VARCHAR(100),
  gemini_model_image VARCHAR(100),
  primary_color VARCHAR(50) DEFAULT '#4f46e5'
);

-- 2. user_permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  `key` VARCHAR(50) PRIMARY KEY,
  can_add_product BOOLEAN DEFAULT FALSE,
  can_edit_product BOOLEAN DEFAULT FALSE,
  can_delete_product BOOLEAN DEFAULT FALSE,
  can_view_product_cost_price BOOLEAN DEFAULT FALSE,
  can_finalize_sale BOOLEAN DEFAULT FALSE,
  can_generate_budget BOOLEAN DEFAULT FALSE,
  can_create_service_order BOOLEAN DEFAULT FALSE,
  can_edit_order_items BOOLEAN DEFAULT FALSE,
  can_edit_service_order BOOLEAN DEFAULT FALSE,
  can_edit_order_status BOOLEAN DEFAULT FALSE,
  can_edit_production_details BOOLEAN DEFAULT FALSE,
  can_edit_budget BOOLEAN DEFAULT FALSE,
  can_edit_budget_status BOOLEAN DEFAULT FALSE,
  can_add_raw_material BOOLEAN DEFAULT FALSE,
  can_edit_raw_material BOOLEAN DEFAULT FALSE,
  can_delete_raw_material BOOLEAN DEFAULT FALSE,
  can_add_client BOOLEAN DEFAULT FALSE,
  can_edit_client BOOLEAN DEFAULT FALSE,
  can_delete_client BOOLEAN DEFAULT FALSE,
  can_view_reports BOOLEAN DEFAULT FALSE,
  can_generate_ai_summary BOOLEAN DEFAULT FALSE,
  can_edit_company_settings BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  can_use_ai BOOLEAN DEFAULT FALSE,
  can_print_or_send_order BOOLEAN DEFAULT FALSE
);

-- 3. users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  full_name VARCHAR(255)
);

-- 4. products
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  image_url TEXT,
  barcode VARCHAR(255) UNIQUE,
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

-- 5. raw_materials
CREATE TABLE IF NOT EXISTS raw_materials (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  supplier VARCHAR(255),
  min_stock DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

-- 6. clients
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  contact VARCHAR(255),
  cpf VARCHAR(20),
  zip_code VARCHAR(20),
  street VARCHAR(255),
  number VARCHAR(50),
  neighborhood VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(50)
);

-- 7. services
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

-- 8. sections
CREATE TABLE IF NOT EXISTS sections (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL
);

-- 9. orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_contact VARCHAR(255),
  client_cpf VARCHAR(20),
  client_zip_code VARCHAR(20),
  client_street VARCHAR(255),
  client_number VARCHAR(50),
  client_neighborhood VARCHAR(255),
  client_city VARCHAR(255),
  client_state VARCHAR(50),
  items JSON,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  production_details JSON,
  payment_method VARCHAR(100),
  payments JSON,
  status VARCHAR(100) NOT NULL,
  seller_name VARCHAR(255),
  section_id VARCHAR(36),
  observation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- --- DADOS DE INICIALIZAÇÃO ---

-- Inserir informações da empresa (necessário para o carregamento inicial)
INSERT IGNORE INTO company_info (`key`, name, logo)
VALUES ('singleton', 'MÃE & FILHO CONFECÇÃO', NULL);

-- Inserir permissões padrão (necessário para o carregamento inicial)
INSERT IGNORE INTO user_permissions (`key`, can_add_product, can_edit_product, can_delete_product, can_finalize_sale, can_manage_users, can_use_ai)
VALUES ('singleton', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

-- Inserir usuário administrador inicial
-- Usuário: admin / Senha: admin123
INSERT IGNORE INTO users (username, password, role)
VALUES ('admin', 'admin123', 'admin');
