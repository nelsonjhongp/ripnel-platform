# RIPNEL Platform - MVP Inventario y Ventas

![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3EC988?style=for-the-badge&logo=supabase&logoColor=white)
![Figma](https://img.shields.io/badge/figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white)

Sistema centralizado de gestion para RIPNEL, orientado a trazabilidad de inventario, ventas con reglas comerciales y operacion entre tiendas y almacen.

## Descripcion Corta del Repositorio

Plataforma MVP para retail textil con control de catalogo, variantes SKU, precios por vigencia, inventario con kardex, transferencias, ventas con pagos mixtos y cambios/reposiciones trazables.

## Alcance Funcional del MVP

- Users / Roles / Permisos (RBAC).
- Catalogos: prenda, tela, detalle, talla, color y target.
- Producto: `Style -> Variants` (SKU = style + talla + color) con barcode.
- Precios por `Style + Talla` con valores retail / wholesale y vigencia.
- Regla configurable: minimo mayorista por style (ejemplo: docena). Estado: opcional, pero listo.
- Ubicaciones, inventario y kardex (`stock_movements`).
- Transferencias con ticket, lineas y estados de proceso.
- Ventas (cabecera + lineas) con precio final por linea y pagos mixtos.
- Cambios/reposiciones (`exchange`) con movimientos IN/OUT trazables.

## Tecnologias Usadas

- Frontend: [React](https://reactjs.org/)
- Backend y DB: [Supabase](https://supabase.com/) (PostgreSQL)
- Despliegue: [Vercel](https://vercel.com/)
- Diseno: [Figma](https://www.figma.com/)
- Modelado: [dbdiagram.io](https://dbdiagram.io/)

## Guia Rapida para Desarrolladores

### Configuracion inicial

1. Clonar el repositorio: `git clone https://github.com/nelsonjhongp/ripnel-platform.git`
2. Instalar dependencias: `npm install`
3. Iniciar entorno local: `npm run dev`

### Flujo de Git

Para mantener estabilidad en `develop`, hacer `pull` antes de trabajar:

```bash
git pull origin develop
# ... tus cambios ...
git add .
git commit -m "feat: descripcion de tu cambio"
git push origin develop
```
