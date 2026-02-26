CREATE DATABASE DB_RIPNEL;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
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
    phone VARCHAR(20)
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
)