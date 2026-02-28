CREATE DATABASE DB_RIPNEL;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT uuid_generate_v4() as generated_uuid;

-- ==========================================
-- 1. SEGURIDAD Y ACCESO
-- ==========================================


CREATE TABLE ROLES(
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name VARCHAR(20) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE USERS(
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name BOOLEAN DEFAULT TRUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id UUID REFERENCES ROLES(role_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_ats TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE USERS_ROLES(
    user_id UUID REFERENCES USERS(user_id),
    role_id UUID REFERENCES ROLES(role_id),
    PRIMARY KEY (user_id, role_id)
);

-- ==========================================
-- 2. UBICACIONES
-- ==========================================

CREATE TABLE LOCATIONS(
    location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CUSTOMERS(
    customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dni VARCHAR(20) UNIQUE,
    full_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE Table COMUNISTAS (
    comunista_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table lenguages (
    lenguage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL
);

CREATE TABLE SIZES(
    size_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(30) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. PRODUCTOS Y VARIANTES
-- ==========================================

CREATE TABLE PRODUCTS(
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES CATEGORIES(category_id),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PRODUCTS_VARIANTS(
    variant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES PRODUCTS(product_id),
    color_id UUID REFERENCES COLORS(color_id),
    size_id UUID REFERENCES SIZES(size_id),
    price DECIMAL(10, 2) NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    stock INT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. PRECIOS
-- ==========================================

CREATE TABLE PRICES(
    price_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES PRODUCTS_VARIANTS(variant_id),
    price DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE VARIANT_PRICES(
    variant_price_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES PRODUCTS_VARIANTS(variant_id),
    price DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. TRANSACCIONES Y MOVIMIENTOS
-- ==========================================

CREATE TABLE SALES(
    sale_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES USERS(user_id),
    customer_id UUID REFERENCES CUSTOMERS(customer_id),
    product_id UUID REFERENCES PRODUCTS(product_id),
    location_id UUID REFERENCES LOCATIONS(location_id),
    total_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE SALES_DETAILS(
    sale_detail_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES PRODUCTS_VARIANTS(variant_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE STOCK_MOVEMENTS(
    movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES PRODUCTS(product_id),
    variant_id UUID REFERENCES PRODUCTS_VARIANTS(variant_id),
    quantity INT NOT NULL,
    sku VARCHAR(50) NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    movement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- ==========================================
-- FUNCIONES Y TRIGGERS
-- ==========================================
-- ==========================================

-- Trigger para actualizar el campo updated_at en la tabla USERS
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- Table to store audit logs
CREATE TABLE audit_log (
  audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT,
  operation CHAR(1), -- I/U/D
  changed_by UUID,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  row_data JSONB
);

-- Function to audit changes
CREATE OR REPLACE FUNCTION audit_if_changes()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log(table_name, operation, changed_by, row_data)
    VALUES (TG_TABLE_NAME, 'D', current_setting('app.current_user', true)::UUID, row_to_json(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log(table_name, operation, changed_by, row_data)
    VALUES (TG_TABLE_NAME, 'U', current_setting('app.current_user', true)::UUID, row_to_json(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO audit_log(table_name, operation, changed_by, row_data)
    VALUES (TG_TABLE_NAME, 'I', current_setting('app.current_user', true)::UUID, row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Audit function that redacts sensitive fields (e.g. password_hash)
CREATE OR REPLACE FUNCTION audit_if_changes_redact()
RETURNS trigger AS $$
DECLARE
  v_row jsonb;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_row := to_jsonb(OLD) - 'password_hash';
    INSERT INTO audit_log(table_name, operation, changed_by, row_data)
    VALUES (TG_TABLE_NAME, 'D', current_setting('app.current_user', true)::UUID, v_row);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_row := to_jsonb(NEW) - 'password_hash';
    INSERT INTO audit_log(table_name, operation, changed_by, row_data)
    VALUES (TG_TABLE_NAME, 'U', current_setting('app.current_user', true)::UUID, v_row);
    RETURN NEW;
  ELSE
    v_row := to_jsonb(NEW) - 'password_hash';
    INSERT INTO audit_log(table_name, operation, changed_by, row_data)
    VALUES (TG_TABLE_NAME, 'I', current_setting('app.current_user', true)::UUID, v_row);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach redact trigger to `users` so password hashes are never stored in audit_log
CREATE TRIGGER trg_audit_users_redact
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_if_changes_redact();

-- Ensure `pgcrypto` exists for optional DB-side password hashing


-- Optional: trigger to hash plaintext passwords on INSERT/UPDATE using bcrypt (pgcrypto)
-- Note: it's recommended to hash passwords in the application layer. Use this only if
-- your app cannot hash before sending to the DB.
CREATE OR REPLACE FUNCTION hash_password()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.password_hash IS NOT NULL THEN
      IF (NEW.password_hash NOT LIKE '$2a$%' AND NEW.password_hash NOT LIKE '$2b$%' AND NEW.password_hash NOT LIKE '$2y$%') THEN
        NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf', 12));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hash_password
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION hash_password();

-- Function to get current price
CREATE OR REPLACE FUNCTION get_current_price(p_variant_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10,2) AS $$
  SELECT price FROM variant_prices
  WHERE variant_id = p_variant_id
    AND start_date <= p_date
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY start_date DESC
  LIMIT 1;
$$ LANGUAGE sql;

-- Function to create a sale
CREATE OR REPLACE FUNCTION create_sale(p_user UUID, p_customer UUID, p_location UUID, p_details JSONB)
RETURNS UUID AS $$
DECLARE
  v_sale UUID := uuid_generate_v4();
  item JSONB;
  v_variant UUID;
  v_qty INT;
BEGIN
  INSERT INTO sales(sale_id, user_id, customer_id, location_id, total_amount, tax_amount)
  VALUES (v_sale, p_user, p_customer, p_location, 0, 0);

  FOR item IN SELECT * FROM jsonb_array_elements(p_details) LOOP
    v_variant := (item->>'variant_id')::UUID;
    v_qty := (item->>'quantity')::INT;
    -- insertar detalle, actualizar stock, validar stock >= 0, insertar stock_movement...
  END LOOP;

  -- calcular totales y actualizar sale
  RETURN v_sale;
END;
$$ LANGUAGE plpgsql;