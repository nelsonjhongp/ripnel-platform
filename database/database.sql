CREATE DATABASE DB_RIPNEL;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT uuid_generate_v4() as generated_uuid;

// ==========================================
// 1. SEGURIDAD Y ACCESO
// ==========================================


CREATE TABLE ROLES(
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name VARCHAR(20) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
)

CREATE TABLE USERS(
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name BOOLEAN NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id UUID REFERENCES ROLES(role_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
);

CREATE TABLE USERS_ROLES(
    user_id UUID REFERENCES USERS(user_id),
    role_id UUID REFERENCES ROLES(role_id),
    PRIMARY KEY (user_id, role_id)
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

