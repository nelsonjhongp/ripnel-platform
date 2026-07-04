# RIPNEL Platform — MVP

RIPNEL es un ERP interno para inventario, ventas, precios, caja, postventa y transferencias de una operación textil. La plataforma separa interfaz, reglas de negocio y base de datos para mantener el sistema portable y verificable.

## Arquitectura

```text
ripnel-platform/
├── apps/
│   ├── frontend/   Next.js App Router, TypeScript, Tailwind y shadcn/ui
│   └── backend/    Node.js + Express, SQL explícito con pg
├── database/       snapshots y scripts SQL de referencia
├── supabase/       migraciones y configuración de PostgreSQL administrado
└── docs/           decisiones, flujos y estándares activos
```

Reglas centrales:

- El frontend usa la API del backend para operaciones ERP.
- El backend conserva validación, autorización, stock, precios, caja y transacciones.
- Supabase se usa como PostgreSQL administrado; el backend trabaja con `pg` y SQL explícito.
- Las migraciones y módulos backend prevalecen sobre documentación histórica.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| UI | shadcn/ui, Radix UI, lucide-react |
| Datos visuales | TanStack Table, Recharts, date-fns, react-day-picker |
| Estado y feedback | Zustand, next-themes, Sonner, Zod |
| Backend | Node.js, Express, CommonJS |
| Base de datos | PostgreSQL mediante `pg`, alojado en Supabase |
| Pruebas frontend | Playwright |

## Inicio rápido

```bash
npm install

# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

Por defecto, frontend y backend se ejecutan en los puertos configurados en sus archivos de entorno. No subir archivos `.env` ni secretos.

### Variables de entorno

**Backend** — `apps/backend/.env`

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del API |
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Secreto JWT |
| `FRONTEND_URL` | Origen permitido para CORS |
| `GEMINI_API_KEY` | Clave del chatbot, si ese módulo está habilitado |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Configuración SMTP, si se usa correo |

**Frontend** — `apps/frontend/.env.local`

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL base del API backend |

## Rutas operativas actuales

Las rutas legacy pueden existir como redirects, pero no se documentan como rutas canónicas.

| Área | Rutas principales |
|---|---|
| Inicio y panel | `/inicio`, `/panel`, `/notificaciones` |
| Ventas | `/ventas/nueva`, `/ventas/historial`, `/ventas/[saleId]` |
| Postventa | `/postventa`, `/postventa/[saleId]` |
| Caja | `/caja`, `/caja/control`, `/caja/historial`, `/caja/historial/[id]` |
| Inventario | `/inventario`, `/inventario/[styleId]`, `/inventario/ajustes`, `/inventario/ajustes/nuevo`, `/inventario/movimientos`, `/kardex` |
| Transferencias | `/transferencias`, `/transferencias/solicitar`, `/transferencias/recepciones`, `/transferencias/historial`, `/transferencias/[transferId]` |
| Productos y catálogos | `/productos`, `/productos/nuevo`, `/productos/[productId]`, `/catalogos`, `/catalogos/[catalogId]` |
| Comercial | `/precios`, `/precios/crear`, `/precios/reglas`, `/clientes`, `/bi` |
| Administración | `/administracion/usuarios`, `/administracion/roles`, `/administracion/ubicaciones` |
| Cuenta | `/cuenta`, `/cuenta/seguridad`, `/contrasena` |

## Flujos críticos

- **Venta:** caja abierta → productos/cliente/comprobante → pago → confirmación → stock y movimiento.
- **Caja:** apertura → ventas y movimientos → arqueo/cierre → historial y control.
- **Inventario:** consulta por sede/variante → ajuste o transferencia → kardex trazable.
- **Transferencia:** solicitud → aprobación/despacho → recepción → actualización de stock.
- **Administración:** usuarios, roles, permisos y sedes deben coincidir en backend, sidebar y guards de ruta.

## Verificación

```bash
# Frontend
npm exec --workspace @ripnel/frontend tsc -- --noEmit
npm run lint --workspace @ripnel/frontend
npm run test --workspace @ripnel/frontend
```

La verificación funcional debe ser proporcional al cambio: probar permisos y transacciones cuando se toque backend, y revisar la pantalla afectada a 1366×768 cuando se cambie UI operativa.

## Documentación activa

### Base del proyecto

- [Guía del proyecto](./AGENTS.md)
- [Sistema de diseño](./DESIGN.md)
- [Arquitectura frontend](./docs/frontend-architecture-standard.md)
- [Estándar de páginas frontend](./docs/frontend-page-standard.md)
- [Criterios UI/UX operativos](./docs/frontend-ui-ux-operativo.md)
- [Componentes operativos](./docs/frontend-operational-components.md)
- [Inventario de componentes](./docs/frontend-component-inventory.md)

### Dominio y operación

- [Workflow Backend + Supabase](./docs/backend-supabase-workflow.md)
- [Seguridad backend](./docs/seguridad-backend.md)
- [Permisos, roles y sidebar](./docs/permisos-roles-sidebar.md)
- [Flujo de producto](./docs/product-flow.md)
- [Roadmap de normalización de productos](./docs/product-normalization-roadmap.md)
- [Especificación funcional de caja](./docs/cash-functional-spec.md)
- [Especificación de base de datos de caja](./docs/cash-database-spec.md)
- [Arquitectura frontend del POS](./docs/frontend-pos-architecture.md)
- [Plan de pruebas de stock](./docs/testing-stock-plan.md)
- [Plan de pruebas de permisos](./docs/testing-permisos.md)

Los documentos en `docs/archive/` son historial y contexto de decisiones anteriores. Consultarlos solo cuando una tarea los cite explícitamente.

## Historial

El historial técnico se conserva en Git. Para cambios recientes:

```bash
git log --oneline --decorate -20
git status --short
```
