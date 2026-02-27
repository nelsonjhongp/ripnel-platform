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

El sistema está diseñado para resolver el desorden operativo mediante los siguientes módulos clave:
- **Gestión de Stock:** Registro de movimientos con saldos resultantes (`quantity_new`).
- **Catálogo Dinámico:** Manejo de variantes por talla, color y marca.
- **Ventas & Clientes:** Registro transaccional vinculado a vendedores y clientes (DNI/RUC).
- **Logística:** Traslados documentados entre ubicaciones de la empresa.

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