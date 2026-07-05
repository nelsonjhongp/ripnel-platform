# Ejemplo — LOC-01-A: Revisión factual de Ubicaciones

> Este archivo demuestra cómo instanciar `01-module-triage.md`.
> Es un ejemplo/piloto; no crea una familia de prompts por cada módulo.
> Para otros módulos, conservar el prompt `01` y cambiar la ficha de tarea,
> baseline y lentes activos; no copiar este archivo como plantilla nueva.

```text
Repositorio:
F:\proyectos\software\ripnel-platform

Módulo / vertical:
LOC-01 — Ubicaciones operativas.

Ruta o rutas objetivo:
- /administracion/ubicaciones

Pregunta operativa:
¿Un administrador puede registrar, editar y desactivar ubicaciones
operativas sin confundir tipos de sede, estado operativo y asignación
de usuarios?

Contexto de baseline:
No requerido: este triage es puntual sobre la pantalla y endpoints de Ubicaciones.

Lentes activos:
- permisos;
- UI/copy/densidad;
- consistencia/reutilización.

Focos específicos de revisión:
- ruta de Ubicaciones;
- módulo frontend de administración;
- endpoints backend de locations;
- relación observable con usuarios/sedes autorizadas;
- pruebas existentes, si hay.

Objetivo operativo:
Revisar cómo un administrador registra y mantiene tiendas, almacenes,
talleres y terceros operativos.

Fuera de alcance:
No analizar ni diseñar enforcement transversal por sedes autorizadas.
Registrar solo relaciones observables entre Ubicaciones y usuarios.

Verificar explícitamente que GET, POST y PATCH de `/api/locations`
tengan autenticación y autorización backend adecuadas.
Identificar los consumidores HTTP reales antes de recomendar el permiso
de lectura para GET.

Validar especialmente:
1. Qué tipos de ubicación maneja el sistema y si se comunican de forma clara.
2. Qué operaciones existen: listar, crear, editar, activar/desactivar,
   asignar a usuarios u otras.
3. Si el arquetipo es CRUD administrativo o tiene una necesidad operativa propia.
4. Si acciones, estados y campos son claros a 1366×768.
5. Si las ubicaciones asignadas a usuarios producen efecto observable o son
   solo configuración. No ampliar el análisis a SCOPE-01.
6. Si hay problemas confirmados de copy, jerarquía, formularios, estados o
   permisos directos por URL.
```
