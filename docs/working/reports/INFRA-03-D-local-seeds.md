# INFRA-03-D: Aplicación de seeds mínimos en PostgreSQL local

> Fecha: 2026-07-08 | Depende de: `docs/working/reports/INFRA-03-B-local-migrations.md` (24/24 migraciones OK), `docs/working/reports/INFRA-03-C3-local-dev-users.md` (`database/seed_local_dev_users.sql` creado, no aplicado)
>
> Estado: **Resuelto — 8 de 8 seeds aplicados correctamente** tras corregir `supabase/seed_styles_legacy.sql` y `supabase/seed.sql` (ver sección 9). No se tocó Supabase remoto ni DigitalOcean. No se modificó código, migraciones ni `seed_operational_mvp.sql`. No se hizo `git add` ni commit.
>
> Las secciones 1-8 documentan el primer intento (bloqueado en el paso 4) tal como ocurrió, como registro de auditoría. La sección 9 documenta las correcciones aplicadas y el reintento completo (exitoso).

## 1. Estado del contenedor

```
docker compose -f docker-compose.local.yml ps
NAME                    IMAGE                    STATUS                    PORTS
ripnel-postgres-local   pgvector/pgvector:pg17   Up (healthy)              0.0.0.0:5433->5432/tcp
```

No fue necesario resetear: el esquema ya estaba completo desde INFRA-03-B (**43 tablas**, confirmado antes de empezar) y la tabla `users` estaba vacía (0 filas) — es decir, migraciones aplicadas, ningún seed aplicado todavía. Se procedió directo a sembrar sin tocar el volumen.

## 2. Seeds aplicados

Comando usado por archivo (mismo patrón que INFRA-03-B):
```bash
docker exec -i ripnel-postgres-local psql -U ripnel_local_dev -d ripnel_local -v ON_ERROR_STOP=1 -f - < "<archivo>.sql"
```

| # | Archivo | Resultado |
|---|---|---|
| 1 | `database/seed_access_control.sql` | **OK** — 3 roles, 24 permisos, 50 asignaciones rol↔permiso |
| 2 | `database/seed_operational_mvp.sql` | **OK** — 4 ubicaciones, 5 usuarios (`admin`, `almacen`, `caja`, `tienda`, `ventas`) con sede por defecto |
| 3 | `supabase/seed.sql` | **OK** — catálogos maestros (tallas, colores, tipos de prenda, telas, detalles, targets) |
| 4 | `supabase/seed_styles_legacy.sql` | **FALLÓ** — ejecución detenida aquí |
| 5-8 | `database/seed_variants_inventory.sql`, `database/seed_style_size_prices.sql`, `database/seed_sales_mvp.sql`, `database/seed_local_dev_users.sql` | **No intentados** — todos dependen de estilos que el paso 4 no llegó a crear |

## 3. Error encontrado

**Archivo:** `supabase/seed_styles_legacy.sql`

**Statement:** el `INSERT INTO product_styles (...)` de la sección "1) BASE STYLES FROM LEGACY SHEET", líneas 12-50 — específicamente las columnas `fabric_id` (línea 14), `fabric_detail_id` (línea 15) y `target_id` (línea 16), repetidas en el `ON CONFLICT ... DO UPDATE SET` (líneas 44-46).

**Error exacto:**
```
BEGIN
psql:<stdin>:50: ERROR:  column "fabric_id" of relation "product_styles" does not exist
LINE 3:   fabric_id,
          ^
```

**Causa confirmada (no es un problema de Supabase, es drift de esquema puro):** la tabla `product_styles` real en el esquema actual **no tiene** las columnas `fabric_id`, `fabric_detail_id` ni `target_id` (verificado con `\d product_styles`: solo tiene `style_id`, `garment_type_id`, `style_code`, `name`, `description`, `active`, `created_at`, `updated_at`). La migración `supabase/migrations/202606280001_product_technical_profiles.sql` movió `fabric_id`/`fabric_detail_id` a una tabla nueva `product_technical_profiles` (migrando los datos existentes primero) y **eliminó las tres columnas de `product_styles`** con `ALTER TABLE product_styles DROP COLUMN IF EXISTS fabric_id, DROP COLUMN IF EXISTS fabric_detail_id, DROP COLUMN IF EXISTS target_id;`. `supabase/seed_styles_legacy.sql` nunca se actualizó después de ese refactor de esquema (fechado 2026-06-28) — sigue asumiendo la estructura anterior.

**Alcance del hallazgo:** es un problema del propio repo (seed desalineado de una migración de esquema posterior), no una dependencia de plataforma Supabase — a diferencia del hallazgo de INFRA-03-B (roles `anon`/`authenticated`), este bloquearía la aplicación de este seed **en cualquier entorno**, incluido el Supabase remoto de dev online, si se intentara re-ejecutar hoy contra un esquema ya migrado a `202606280001` o posterior.

**Opciones de corrección (ninguna aplicada — pendiente de autorización):**

1. **Quitar `fabric_id`, `fabric_detail_id`, `target_id` del `INSERT`/`UPDATE` sobre `product_styles`**, y agregar un `INSERT INTO product_technical_profiles (style_id, fabric_id, fabric_detail_id, ...)` posterior, replicando el patrón que ya usa la migración `202606280001` para poblar esa tabla nueva.
2. **Quitar solo `fabric_id`/`fabric_detail_id` de `product_styles`** (moverlos a `product_technical_profiles`) y **eliminar `target_id` por completo** del seed, dado que la migración lo dropeó sin tabla de reemplazo visible — habría que confirmar si `target_id` sigue siendo un dato de negocio relevante en algún otro lugar del esquema actual antes de decidir dónde debería vivir.
3. **Retirar la asignación de tela/target del seed legacy por completo**, dejando que `product_styles` se cree solo con `garment_type_id`/`style_code`/`name`/`description`/`active`, y que la asociación de tela se agregue manualmente o vía otro seed si hace falta para pruebas.

No se aplicó ninguna de estas opciones. `supabase/seed_styles_legacy.sql` permanece exactamente como estaba. Como el fallo ocurrió dentro de un bloque `begin;`/`commit;` explícito y `psql` se detuvo por `ON_ERROR_STOP=1` sin llegar al `commit;`, la conexión se cerró con la transacción abortada — **no quedó ninguna fila parcial escrita** por este archivo.

## 4. Validaciones ejecutadas (sobre el estado parcial: 3 de 8 seeds aplicados)

### 4.1 Usuarios `admin`, `almacen`, `vendedor` — existen y activos

```
select u.username, u.active as user_active, r.name as role_name, r.active as role_active
from users u left join roles r on r.role_id = u.role_id order by u.username;
```
```
 username | user_active | role_name | role_active
----------+-------------+-----------+-------------
 admin    | t           | ADMIN     | t
 almacen  | t           | ALMACEN   | t
 caja     | t           | CAJA      | t
 tienda   | t           | TIENDA    | t
 ventas   | t           | VENTAS    | t
```

- `admin` (→ `ADMIN`) y `almacen` (→ `ALMACEN`) **existen y activos, con el rol vigente correcto** — punto 1 y 2 satisfechos para estos dos.
- `vendedor` **no existe todavía** — depende de `database/seed_local_dev_users.sql` (paso 8), bloqueado por el fallo del paso 4. Punto 1/2 **no verificable** para `vendedor` en esta corrida.

### 4.2 Esos roles tienen permisos asignados

```
select r.name, r.active, count(rp.permission_id) as permission_count
from roles r left join role_permissions rp on rp.role_id = r.role_id
group by r.name, r.active order by r.name;
```
```
    name    | active | permission_count
------------+--------+------------------
 ADMIN      | t      |               24
 ALMACEN    | t      |                7
 CAJA       | t      |                0
 TIENDA     | t      |                0
 VENDEDOR/A | t      |               19
 VENTAS     | t      |                0
```

`ADMIN` (24), `ALMACEN` (7) y `VENDEDOR/A` (19) tienen permisos asignados — coincide exactamente con lo que asigna `supabase/migrations/202607020001_role_redesign_vendedora.sql` en sus Fases 5-7 (19+7+24 = 50, mismo número que reportó el `INSERT 0 50` del paso 1). Punto 3 **confirmado**.

### 4.3 `caja`, `tienda`, `ventas` como legacy/inutilizables — confirmado, pero con un hallazgo adicional no anticipado

Los tres tienen **0 permisos** (`role_permissions` vacío desde la Fase 4 de la migración de redesign) — en ese sentido son inutilizables, tal como predijo INFRA-03-C2.

**Hallazgo nuevo, confirmado empíricamente en esta fase:** los tres roles aparecen con **`role_active = true`**, no `false`. La migración sí los desactiva (`UPDATE roles SET active = false WHERE name IN ('TIENDA','CAJA','VENTAS')`), pero **`supabase/seed.sql` (paso 3 de este pipeline) los reactiva sin querer**: su bloque de roles hace `INSERT INTO roles (...) VALUES ('TIENDA', ..., true), ('CAJA', ..., true), ('VENTAS', ..., true), ... ON CONFLICT (name) DO UPDATE SET ..., active = excluded.active, ...` — como `supabase/seed.sql` tampoco se actualizó después del redesign de roles, su upsert fuerza `active = true` de vuelta sobre los tres roles legacy cada vez que se aplica después de la migración.

**Consecuencia:** el criterio "identificar como legacy por `roles.active = false`" **no es fiable** en el pipeline documentado tal como está hoy — el propio orden de seeds (`seed_access_control.sql` → `seed_operational_mvp.sql` → `supabase/seed.sql`) reactiva lo que la migración había desactivado. El único indicador confiable hoy es **el conteo de `role_permissions = 0`**, no el flag `active`. Punto 4 se da por **parcialmente confirmado**: los roles son inutilizables en la práctica (0 permisos), pero no se pueden identificar como "legacy" por su estado `active`, que es lo que originalmente se esperaba poder usar como señal.

**Esto es un segundo hallazgo de corrección pendiente, independiente del bloqueo de la sección 3, no aplicado en esta fase** (fuera del alcance permitido — solo reportar).

### 4.4 `almacen` → sede por defecto `ALM-CENT`

```
select u.username, l.code from users u
join user_locations ul on ul.user_id = u.user_id and ul.is_default = true
join locations l on l.location_id = ul.location_id order by u.username;
```
```
 username | default_location_code
----------+-----------------------
 almacen  | ALM-CENT
 caja     | TD-CENT
 tienda   | TD-CENT
 ventas   | TD-CENT
```

`almacen` → `ALM-CENT` **confirmado**. Punto 5 satisfecho.

### 4.5 `vendedor` → sede por defecto `TD-CENT`

**No verificable** — `vendedor` no existe todavía (bloqueado en el paso 8, como en 4.1). Punto 6 pendiente.

### 4.6 Catálogos, estilos, variantes, stock, precios, clientes mínimos

```
sizes=6  colors=6  garment_types=12  fabrics=19  fabric_details=8  targets=3   (del paso 3, OK)
product_styles=0  product_variants=0  inventory=0  style_size_prices=0  customers=0   (bloqueados en el paso 4+)
locations=4  roles=6  permissions=24  users=5
```

Catálogos maestros **completos** (paso 3). Estilos, variantes, stock, precios y clientes **en cero** — bloqueados por el fallo del paso 4. Punto 7 **parcialmente satisfecho** (solo la parte de catálogos).

### 4.7 No se cargan ventas reales ni datos productivos

Confirmado trivialmente: la tabla `sales` tiene 0 filas, y ningún seed de ventas (`seed_sales_mvp.sql`, `seed_sales_confirmed_demo.sql`, `seed_operational_30_days.sql`) se aplicó ni estaba en el alcance permitido para esta corrida. Punto 8 **confirmado**.

## 5. Conteos relevantes (estado final de esta corrida)

| Tabla | Conteo |
|---|---|
| `roles` | 6 |
| `permissions` | 24 |
| `locations` | 4 |
| `users` | 5 (`admin`, `almacen`, `caja`, `tienda`, `ventas`) |
| `sizes` | 6 |
| `colors` | 6 |
| `garment_types` | 12 |
| `fabrics` | 19 |
| `fabric_details` | 8 |
| `targets` | 3 |
| `product_styles` | 0 |
| `product_variants` | 0 |
| `inventory` | 0 |
| `style_size_prices` | 0 |
| `customers` | 0 |
| `sales` | 0 |

## 6. Recomendaciones

1. **No aplicar `database/seed_variants_inventory.sql`, `database/seed_style_size_prices.sql`, `database/seed_sales_mvp.sql` ni `database/seed_local_dev_users.sql` todavía** — los cuatro dependen de que existan filas en `product_styles`/`product_variants`, y hoy están en cero por el bloqueo de la sección 3.
2. **Decidir una de las 3 opciones de corrección de `supabase/seed_styles_legacy.sql`** (sección 3) antes de reintentar — es un bloqueo real de esquema, no evitable reordenando seeds.
3. **Decidir por separado si corresponde corregir `supabase/seed.sql`** para que no reactive `TIENDA`/`CAJA`/`VENTAS` (sección 4.3) — no bloquea el resto del pipeline, pero dejarlo así perpetúa una inconsistencia entre lo que la migración de redesign de roles pretende y lo que el seed de catálogos hace al aplicarse después. Es independiente del punto 1 y puede decidirse por separado.
4. Una vez resuelto el punto 2 (mínimo indispensable), resetear el volumen local y reintentar el pipeline completo de 8 seeds desde cero, incluyendo `database/seed_local_dev_users.sql` al final.

## 7. Riesgos

| Riesgo | Estado |
|---|---|
| Confundir el estado actual (3/8 seeds) con una base lista para pruebas | Mitigado por este reporte — queda explícito que faltan estilos/variantes/stock/precios/clientes |
| Que alguien interprete `roles.active = true` en `CAJA`/`TIENDA`/`VENTAS` como señal de que siguen vigentes | Documentado explícitamente en 4.3 — el criterio confiable es `role_permissions = 0`, no `active` |
| Reintentar sin resolver la sección 3 y volver a fallar en el mismo punto | Mitigado — este reporte deja el diagnóstico completo antes de cualquier reintento |
| Ninguno de los datos de esta corrida es real — mismo riesgo ya cubierto en INFRA-03-C3 | Reconfirmado: 0 ventas, 0 clientes, 0 stock; todo lo aplicado es catálogo maestro y usuarios de prueba |

## 8. `git status --short` final

```
?? database/seed_local_dev_users.sql
?? docs/working/reports/INFRA-03-C3-local-dev-users.md
?? docs/working/reports/INFRA-03-D-local-seeds.md
```

No se ejecutó `git add` ni commit. `supabase/seed_styles_legacy.sql` y `supabase/seed.sql` no aparecen como modificados porque no fueron tocados en esta corrida — solo se documentaron sus fallos/hallazgos. **Ver sección 9 para las correcciones aplicadas después.**

---

## 9. Corrección aplicada y reintento completo

**Decisión tomada (por el usuario):** corregir directamente `supabase/seed_styles_legacy.sql` y `supabase/seed.sql`, en vez de crear seeds locales nuevos que parcheen por encima. Justificación (de la auditoría solo lectura previa): ambos son bugs objetivos de los archivos frente al esquema/modelo de roles vigente, no decisiones de alcance — dejarlos rotos habría dejado permanentemente inutilizable el pipeline documentado en `docs/seed-operational-30-days.md` para cualquiera que lo siguiera tal cual.

### 9.1 Corrección en `supabase/seed_styles_legacy.sql`

- Se quitaron `fabric_id`, `fabric_detail_id`, `target_id` del `INSERT INTO product_styles` y de su `ON CONFLICT ... DO UPDATE` — se mantiene el upsert por `style_code`.
- Se agregó un segundo bloque `INSERT INTO product_technical_profiles (style_id, fabric_id, fabric_detail_id, active) ... ON CONFLICT (style_id) DO UPDATE ...`, resolviendo `style_id` desde `product_styles` recién sembrado y `fabric_id` desde `fabrics` por código, con `fabric_detail_id = null` (el seed nunca tuvo un valor real para ese campo, antes ni después del cambio).
- `target_id` se retiró sin reemplazo: no tiene columna destino vigente en el esquema actual y en este seed siempre fue `NULL` — no hay pérdida de dato real.

### 9.2 Corrección en `supabase/seed.sql`

- Se quitaron `TIENDA`, `CAJA`, `VENTAS` de la lista de `VALUES` del `INSERT INTO roles`. El bloque ahora solo asegura `ADMIN` y `ALMACEN`.
- Se agregó un comentario explicando por qué esos tres roles quedan fuera a propósito, y que `VENDEDOR/A` lo gestiona `202607020001_role_redesign_vendedora.sql`, no este archivo.
- No se tocó ni se creó `VENDEDOR/A` en este archivo, tal como se pidió.

### 9.3 Reset y reintento completo

```bash
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml up -d
```

Contenedor confirmado `healthy`. Se reaplicaron las **24 migraciones** en orden (mismo comando de INFRA-03-B) — **24/24 OK**, sin fallos. Luego se reaplicaron los **8 seeds** en el mismo orden documentado:

| # | Archivo | Resultado |
|---|---|---|
| 1 | `database/seed_access_control.sql` | OK |
| 2 | `database/seed_operational_mvp.sql` | OK |
| 3 | `supabase/seed.sql` (corregido) | OK |
| 4 | `supabase/seed_styles_legacy.sql` (corregido) | OK |
| 5 | `database/seed_variants_inventory.sql` | OK |
| 6 | `database/seed_style_size_prices.sql` | OK |
| 7 | `database/seed_sales_mvp.sql` | OK |
| 8 | `database/seed_local_dev_users.sql` | OK |

**Resultado final: 8 de 8 seeds aplicados sin error.** No aparecieron fallos adicionales.

### 9.4 Validaciones mínimas — todas satisfechas

**Usuarios, roles y permisos:**
```
 username | user_active | role_name  | role_active
----------+-------------+------------+-------------
 admin    | t           | ADMIN      | t
 almacen  | t           | ALMACEN    | t
 caja     | t           | CAJA       | f
 tienda   | t           | TIENDA     | f
 vendedor | t           | VENDEDOR/A | t
 ventas   | t           | VENTAS     | f
```
```
    name    | active | permission_count
------------+--------+------------------
 ADMIN      | t      |               24
 ALMACEN    | t      |                7
 CAJA       | f      |                0
 TIENDA     | f      |                0
 VENDEDOR/A | t      |               19
 VENTAS     | f      |                0
```

- Punto 1-2: `admin`→`ADMIN`, `almacen`→`ALMACEN`, `vendedor`→`VENDEDOR/A`, los tres activos con rol vigente. **Confirmado.**
- Punto 3: los tres roles vigentes tienen permisos asignados (24/7/19). **Confirmado.**
- Punto 4: `caja`/`tienda`/`ventas` ahora sí quedan correctamente identificados como legacy — **`role_active = false` de verdad esta vez** (el bug de `supabase/seed.sql` que los reactivaba ya no existe) y con 0 permisos. **Confirmado, y ya no requiere la salvedad documentada en la sección 4.3 del intento anterior.**

**Sedes por defecto:**
```
 username | default_location_code
----------+-----------------------
 almacen  | ALM-CENT
 vendedor | TD-CENT
```
- Punto 5: `almacen` → `ALM-CENT`. **Confirmado.**
- Punto 6: `vendedor` → `TD-CENT`. **Confirmado.**

**Catálogos, estilos, variantes, stock, precios, clientes:**
```
product_styles=5  product_technical_profiles=5  product_variants=12
inventory=36  style_size_prices=28  customers=3
```
`product_technical_profiles` quedó correctamente poblado (5 filas, una por estilo, con `fabric_id` resuelto y `fabric_detail_id` en `NULL` como se esperaba). Punto 7 **confirmado**.

**Sin datos productivos:**
`sales = 0` — punto 8 **confirmado**. Ningún seed de ventas confirmadas ni histórico de 30 días se aplicó.

## 10. Conteos finales (tras la corrección, 8/8 seeds)

| Tabla | Conteo |
|---|---|
| `roles` | 6 (3 activos: `ADMIN`, `ALMACEN`, `VENDEDOR/A`; 3 legacy inactivos: `TIENDA`, `CAJA`, `VENTAS`) |
| `permissions` | 24 |
| `locations` | 4 |
| `users` | 6 (`admin`, `almacen`, `caja`, `tienda`, `ventas`, `vendedor`) |
| `sizes` / `colors` / `garment_types` / `fabrics` / `fabric_details` / `targets` | 6 / 6 / 12 / 19 / 8 / 3 |
| `product_styles` | 5 |
| `product_technical_profiles` | 5 |
| `product_variants` | 12 |
| `inventory` | 36 |
| `style_size_prices` | 28 |
| `customers` | 3 |
| `sales` | 0 |

## 11. Advertencia — datos exclusivamente de desarrollo/demo, no reales

Todo lo aplicado en esta fase (24 migraciones + 8 seeds) es exclusivamente para `ripnel-postgres-local`, un contenedor Docker descartable de desarrollo. **Ninguno de estos datos representa inventario real, ventas reales, caja real ni usuarios reales de producción de Ripnel.** Los 6 usuarios sembrados incluyen contraseñas dev-only documentadas en texto plano en sus respectivos archivos (`supabase/seed.sql`, `database/seed_operational_mvp.sql`, `database/seed_local_dev_users.sql`) — ninguna debe reutilizarse en Supabase remoto, staging o producción de DigitalOcean. Los 3 clientes y 5 estilos/12 variantes con stock son datos ficticios de la hoja de referencia legacy, no operación real.

## 12. `git status --short` final (tras la corrección y el reintento)

```
 M supabase/seed.sql
 M supabase/seed_styles_legacy.sql
?? database/seed_local_dev_users.sql
?? docs/working/reports/INFRA-03-C3-local-dev-users.md
?? docs/working/reports/INFRA-03-D-local-seeds.md
```

No se ejecutó `git add` ni commit.
