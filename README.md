# 👕 RIPNEL Platform - MVP Inventario & Ventas

![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3EC988?style=for-the-badge&logo=supabase&logoColor=white)
![Figma](https://img.shields.io/badge/figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white)

Sistema centralizado de gestión para **RIPNEL**, enfocado en la trazabilidad de inventario, control de ventas y conexión logística entre tiendas físicas y almacén. Este proyecto se desarrolla bajo una metodología de 8 semanas para entregar un MVP funcional y estable.

## 🚀 Tecnologías Usadas

* **Frontend:** [React](https://reactjs.org/) para una interfaz dinámica y responsiva.
* **Backend & DB:** [Supabase](https://supabase.com/) (PostgreSQL) para la gestión de datos en tiempo real.
* **Despliegue:** [Vercel](https://vercel.com/) para hosting y CI/CD.
* **Diseño:** [Figma](https://www.figma.com/) para prototipado UI/UX.
* **Modelado:** [dbdiagram.io](https://dbdiagram.io/) para el esquema DBML.

## 🛠️ Estructura del Proyecto

El MVP está organizado en módulos operativos conectados a un esquema PostgreSQL transaccional:

- **Seguridad y Accesos:** `roles`, `users`, `permissions`, `role_permissions`.
- **Catálogos Maestros:** `garment_types`, `fabrics`, `fabric_details`, `colors`, `sizes`, `targets`.
- **Núcleo de Producto:** `product_styles`, `style_sizes`, `style_colors`, `product_variants` (SKU + barcode).
- **Precios y Reglas Comerciales:** `style_size_prices` (retail/wholesale por vigencia) y `pricing_rules` (mínimos mayoristas por modelo).
- **Inventario y Trazabilidad:** `inventory` (stock por ubicación) y `stock_movements` (kardex IN/OUT/ADJUST con referencias).
- **Logística Interna:** `stock_transfers` y `stock_transfer_lines` con ciclo de estados (`draft`, `shipped`, `received`, `cancelled`).
- **Ventas y Cobros:** `sales`, `sales_details`, `sales_payments` con soporte de proforma/boleta/factura, cliente snapshot e impuestos internos.
- **Operación de Caja:** `cash_closings` para cierre diario por tienda y control de totales por método de pago.
- **Postventa:** `exchanges` y `exchange_lines` para cambios/reposiciones sin devolución.

Además, el script SQL incluye índices operativos, restricciones de consistencia y triggers de `updated_at` en tablas clave para auditoría y mantenimiento.

## 📖 Guía Rápida para Desarrolladores

### Configuración inicial
1. Clonar el repositorio: `git clone https://github.com/nelsonjhongp/ripnel-platform.git`
2. Instalar dependencias: `npm install`
3. Iniciar entorno local: `npm run dev`

### Flujo de Git (Regla de Oro)
Para mantener la estabilidad, siempre realiza un `pull` antes de trabajar:
```bash
git pull origin develop
# ... tus cambios ...
git add .
git commit -m "feat: descripción de tu cambio"
git push origin develop
```