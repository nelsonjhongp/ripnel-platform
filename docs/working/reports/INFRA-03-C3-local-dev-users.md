# INFRA-03-C3: Seed local dev-only para usuarios con roles vigentes

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-03-B-local-migrations.md` (migraciones locales validadas) y del diagnóstico INFRA-03-C2 (revisado en conversación, sin archivo propio — hallazgos incorporados aquí)
>
> Estado: **Archivo creado, no aplicado.** No se ejecutó SQL mutante, no se tocó Supabase remoto ni DigitalOcean, no se modificó código ni migraciones, no se modificó `seed_operational_mvp.sql`, no se hizo `git add` ni commit.

## 1. Por qué existe este seed

INFRA-03-C2 (diagnóstico previo) confirmó que `supabase/migrations/202607020001_role_redesign_vendedora.sql` desactivó los roles `TIENDA`, `CAJA` y `VENTAS` (`active = false`, sin eliminarlos) y **borró todo su `role_permissions` sin reemplazo** (la migración limpia permisos de los 6 roles en su Fase 4 y solo vuelve a poblar `ADMIN`, `VENDEDOR/A` y `ALMACEN` en las Fases 5-7). Los seeds existentes que crean usuarios de prueba —`database/seed_operational_mvp.sql` (usuarios `caja`, `tienda`, `ventas`) y `database/seed_test_users.sql`— siguen usando esos roles legacy y nunca se actualizaron tras el redesign.

Se creó `database/seed_local_dev_users.sql` como un seed **nuevo, aislado y explícitamente dev-only** que garantiza usuarios mínimos (`admin`, `almacen`, `vendedor`) bajo los tres roles que sí tienen permisos vigentes hoy, sin modificar ni depender de la sección de usuarios de `seed_operational_mvp.sql`. Es idempotente (upsert por `username`), usa contraseñas obviamente dev-only documentadas en texto plano dentro del propio archivo, y deja explícito en comentarios que no es apto para ningún entorno real.

## 2. Por qué `caja`, `tienda` y `ventas` legacy no deben usarse como referencia de permisos vigentes

**[Confirmado por archivo — reconfirmado en esta fase]**

- `roles.active = false` para `TIENDA`, `CAJA`, `VENTAS` desde la migración `202607020001_role_redesign_vendedora.sql`, Fase 3.
- `role_permissions` para esos tres roles quedó en **cero filas** desde la Fase 4 de la misma migración — no fue repoblado en ningún punto posterior del historial de migraciones revisado.
- El login (`apps/backend/src/modules/auth/auth.repo.js:findActiveUserByUsername`) **no filtra por `roles.active`**, solo por `users.active` — un usuario con rol `CAJA`/`TIENDA`/`VENTAS` puede autenticarse sin error.
- `listPermissionsByRoleId` consulta `role_permissions` directo por `role_id`, sin filtrar por si el rol está activo — devuelve `[]` para esos tres roles.
- Efecto neto: un usuario sembrado con esos roles queda **autenticado pero sin ningún permiso**, bloqueado por cada guard de `requirePermission`/`requireAnyPermission` en el backend, y sin secciones visibles en el sidebar del frontend. No es un error visible en el login — es un estado silenciosamente inutilizable para pruebas.
- Adicionalmente, `docs/permisos-roles-sidebar.md` y `docs/testing-permisos.md` documentan el modelo de roles **anterior** al redesign (5 roles, 7 permisos) y no deben usarse como referencia de qué permisos tiene cada rol hoy — están desalineados del `role_permissions` real desde que se aplicó la migración.

**Regla derivada para el resto de las fases INFRA-03:** cualquier usuario de prueba local debe crearse con `ADMIN`, `ALMACEN` o `VENDEDOR/A` — nunca con `TIENDA`, `CAJA` o `VENTAS`.

## 3. Orden futuro propuesto de aplicación para INFRA-03-D

1. `database/seed_access_control.sql`
2. `database/seed_operational_mvp.sql` (se usa completo — su sección de ubicaciones es necesaria; su sección de usuarios legacy simplemente queda sin uso práctico, ver nota abajo)
3. `supabase/seed.sql`
4. `supabase/seed_styles_legacy.sql`
5. `database/seed_variants_inventory.sql`
6. `database/seed_style_size_prices.sql`
7. `database/seed_sales_mvp.sql`
8. **`database/seed_local_dev_users.sql`** (este archivo — al final, porque depende de que ya existan las sedes `ALM-CENT`/`TD-CENT` sembradas en el paso 2)

**Nota sobre el paso 2:** no se modificó `seed_operational_mvp.sql` en esta fase (fuera de alcance, explícitamente indicado por el usuario). Aplicarlo tal cual seguirá creando los usuarios `caja`, `tienda`, `ventas` con roles inactivos — eso no bloquea nada (no hay conflicto de `username` con este seed nuevo, que usa `admin`, `almacen`, `vendedor`), simplemente esos tres usuarios legacy quedarán presentes pero inutilizables para pruebas, tal como ya ocurre hoy. Si se decide más adelante limpiar eso, sería una fase separada y explícitamente autorizada (análoga a como se corrigió la migración en INFRA-03-B).

`database/seed_test_users.sql` sigue **fuera** del orden recomendado — no forma parte del pipeline documentado y duplica `username`s con `seed_operational_mvp.sql`.

## 4. Advertencia — datos no reales, no productivos

Este seed, y toda la cadena de seeds del punto 3, están destinados **exclusivamente** a `ripnel-postgres-local` (el contenedor Docker de INFRA-03-A) o a cualquier otro entorno explícitamente local/descartable. Ninguno de los usuarios, contraseñas, ubicaciones, estilos, variantes, precios o clientes que resultan de esta cadena representa:

- inventario real,
- movimientos de caja reales,
- ventas reales,
- ni usuarios reales de producción.

Las contraseñas de `database/seed_local_dev_users.sql` (`LocalDevAdmin123`, `LocalDevAlmacen123`, `LocalDevVendedor123`) están documentadas en texto plano deliberadamente — no protegen nada real y **nunca deben reutilizarse** en Supabase remoto, staging o producción de DigitalOcean. Los correos usan el dominio `@ripnel.invalid` (reservado por RFC 2606 para pruebas, no resoluble en DNS real) para reforzar visualmente que son datos ficticios.

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Confundir este seed con datos operativos reales | Encabezado del archivo y este reporte lo marcan explícitamente como dev-only; dominio de correo `@ripnel.invalid` no resoluble |
| Aplicarlo antes de que existan las sedes `ALM-CENT`/`TD-CENT` (sección 2 del archivo depende de ellas) | La sección de usuarios (1) es independiente y no fallaría; la sección de sede por defecto (2) usa `INNER JOIN locations` — si las sedes no existen, esas filas simplemente no se insertan (no hay error, pero el usuario quedaría sin sede por defecto). Documentado como dependencia explícita en el propio archivo |
| Aplicarlo antes de que existan los roles `ADMIN`/`ALMACEN`/`VENDEDOR/A` (requiere `seed_access_control.sql` o las migraciones ya aplicadas) | Mismo comportamiento: `INNER JOIN roles` sin match simplemente no inserta esa fila, sin error — pero el usuario correspondiente no se crearía. Documentado como dependencia explícita |
| Reutilizar las contraseñas dev-only fuera de contexto local | Documentado en el propio archivo y en este reporte; son contraseñas obviamente no aptas para producción |
| Username `vendedor` no coincide con ningún username esperado por seeds/documentación antigua (`ventas`) | Evaluado explícitamente en el archivo (sección final) y en este reporte (punto 6 de la conversación previa) — decisión consciente de no duplicar cuentas sin necesidad concreta; documentado cómo revertir esa decisión si hiciera falta |

## 6. Rollback

Completamente reversible y sin efecto fuera del repo local:

- Si el seed nunca se aplica: eliminar `database/seed_local_dev_users.sql` deja el repo exactamente como estaba antes de esta fase.
- Si se aplicó contra `ripnel-postgres-local`: los usuarios `admin`, `almacen`, `vendedor` se pueden eliminar manualmente (`DELETE FROM users WHERE username IN ('admin','almacen','vendedor')`, fuera de esta fase, no ejecutado aquí) o, más simple, resetear el volumen completo del contenedor (`docker compose -f docker-compose.local.yml down -v`), exactamente igual que en INFRA-03-B.
- No hay integración con Supabase remoto ni DigitalOcean que revertir, porque esta fase no los tocó en absoluto.
- No se hizo `git add` ni commit — el archivo queda como cambio local sin trackear hasta que se decida incorporarlo.

## `git status --short` final

```
?? database/seed_local_dev_users.sql
?? docs/working/reports/INFRA-03-C3-local-dev-users.md
```

Nota: los archivos de fases anteriores (`docker-compose.local.yml`, `INFRA-01-do-deployment-plan.md`, `INFRA-02-environments-plan.md`, `INFRA-03-B-local-migrations.md`, `INFRA-03-local-postgres.md`, y la corrección de `supabase/migrations/202604010001_create_user_function.sql`) ya no aparecen como pendientes porque quedaron incluidos en commits previos (`fb49435 fix(db): cerrar funcion legacy de creacion de usuarios` y `c2bd8a0 chore(infra): agregar postgres local y planes de entorno`), realizados fuera de esta fase. En INFRA-03-C3 no se ejecutó `git add` ni commit — los dos archivos nuevos de esta fase quedan sin trackear, tal como exige el alcance.
