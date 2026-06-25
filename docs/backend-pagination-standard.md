# Backend Pagination Standard

Estandar para implementar paginacion server-side en los endpoints `GET /api/<entidad>`.
La referencia canonica es `apps/backend/src/modules/customers/`.

---

## Query parameters (frontend → backend)

| Param | Tipo | Default | Max | Descripcion |
|-------|------|---------|-----|-------------|
| `page` | number | — | — | Numero de pagina (1-indexed). Si no se envia, se devuelven todos los resultados sin paginar |
| `limit` | number | 20 | 100 | Items por pagina |

**Regla de compatibilidad:** cuando `page` no se envia (ej. desde un search picker o duplicate guard), el endpoint devuelve **todos** los resultados. Esto mantiene compatibilidad con consumidores que no necesitan paginacion (typeahead, chequeos de duplicado).

---

## Controller layer

```js
async function getItems(req, res, next) {
  try {
    const { document_type, sort, q, page, limit } = req.query;
    const result = await listItems({ documentType: document_type, sort, q, page, limit });
    res.json({ ok: true, data: result.rows, total: result.total });
  } catch (error) {
    next(error);
  }
}
```

**Reglas:**
- El controller extrae `page` y `limit` de `req.query` y los pasa al service
- La respuesta siempre incluye `data` (array de filas) y `total` (conteo total sin paginar)

---

## Service layer

```js
async function listItems({ documentType, sort, q, page, limit }) {
  const sortOrder = sort === 'asc' ? 'asc' : 'desc';
  return findAllItems({ documentType, sort: sortOrder, q, page, limit });
}
```

**Reglas:**
- El service valida filtros (tipo de documento, rango de fechas, etc.) y lanza `AppError` 400 si son invalidos
- Pasa `page` y `limit` al repo sin modificarlos

---

## Repo layer

```js
async function findAllItems({ documentType, sort, q, page, limit }) {
  const params = [];
  const conditions = [];

  // 1. Construir WHERE clauses con parametros numerados ($1, $2, ...)
  if (documentType && documentType !== 'all') {
    params.push(documentType);
    conditions.push(`c.document_type = $${params.length}`);
  }

  if (q) {
    params.push(`%${q}%`);
    conditions.push(`(c.field1 ILIKE $${params.length} OR c.field2 ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = sort === 'asc' ? 'ASC' : 'DESC';

  // 2. Solo paginar si page fue enviado explicitamente
  const hasPage = page !== undefined && page !== null;
  let paginationClause = '';
  let total = 0;

  if (hasPage) {
    // 2a. Query de conteo (mismos WHERE params, sin LIMIT/OFFSET)
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM table_name c ${where}`,
      params
    );
    total = parseInt(countResult.rows[0].total, 10);

    // 2b. Sanitizar page y limit
    const safePage = Math.max(1, parseInt(String(page), 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    params.push(safeLimit);
    params.push(offset);
    paginationClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  // 3. Query de datos
  const result = await query(
    `SELECT c.* FROM table_name c ${where} ORDER BY c.created_at ${order} ${paginationClause}`,
    params
  );

  // 4. Si no se pidio paginacion, total es el length del resultado
  if (!hasPage) {
    total = result.rows.length;
  }

  return { rows: result.rows, total };
}
```

**Reglas:**
- `COUNT(*)` y `SELECT` usan los mismos `WHERE` params (mismo array `params`)
- `LIMIT` y `OFFSET` usan parametros numerados (`$N`)
- `page` default = 1, `limit` default = 20, max = 100
- Sin `page` → sin `LIMIT/OFFSET`, `total = rows.length`

---

## Response shape (estandar)

```json
{
  "ok": true,
  "data": [
    { "id": "...", "name": "...", ... }
  ],
  "total": 123
}
```

---

## Frontend consumption (estandar)

```tsx
const [page, setPage] = useState(1)
const pageSize = 20

const { data } = useApiGet(() => {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize), ... })
  return apiFetch<{ ok: boolean; data: T[]; total: number }>(`/api/items?${params}`)
    .then(res => ({ data: res.data, total: res.total }))
}, [debouncedQuery, docFilter, sort, page])

const totalPages = Math.max(1, Math.ceil(total / pageSize))
const safePage = Math.max(1, Math.min(page, totalPages))
```

---

## Anti-patrones

| Anti-patron | Problema | Alternativa |
|-------------|----------|-------------|
| `SELECT *` + paginar en JS (`array.slice()`) | Trae todas las filas a memoria. Con 10k registros colapsa | `LIMIT/OFFSET` en SQL con `COUNT(*)` |
| `total = rows.length` cuando hay `LIMIT` | El total reportado es solo el de la pagina actual | Query `COUNT(*)` separada |
| Sin limite maximo en `limit` | `?limit=999999` trae todas las filas y bypassea la paginacion | `Math.min(100, ...)` |
| Nombres inconsistentes (`pageSize` vs `page_size` vs `limit`) | Cada modulo reinventa los nombres de params | Usar `page` y `limit` en todos los modulos |
| Response sin `total` | El frontend no puede calcular paginas sin el conteo real | `{ data, total }` siempre |
| `offset` 0-indexed en vez de calcular `(page-1)*limit` | Offset incorrecto si no se calcula | `(safePage - 1) * safeLimit` |

---

## Modulos que siguen este estandar

| Modulo | Estado |
|--------|:------:|
| `customers` | ✅ Implementado — referencia canonica |
| `sales` | ⚠️ Usa `{ pagination: { ... } }` como wrapper |
| `cash` | ⚠️ Usa `{ pagination: { ... } }` como wrapper |
| `products` | ⚠️ Usa `{ pagination: { ... } }` como wrapper |

---

## Migracion desde wrappers `{ pagination: {...} }`

Los modulos que usan el wrapper `{ pagination: { page, page_size, total, total_pages } }`
pueden migrarse a este estandar simplificado (`{ data, total }`) porque:

1. El frontend solo necesita `data` (filas) y `total` (conteo). `total_pages` se calcula en frontend.
2. `page` y `page_size` son parametros de request, no de response.
3. `has_next`/`has_prev` son redundantes — el frontend ya sabe si esta en la ultima pagina.

**Breaking change:** los consumidores que lean `response.pagination.total` deben migrar a `response.total`.
Verificar con grep antes de migrar:
```bash
grep -rn "pagination\." apps/frontend/ --include="*.ts" --include="*.tsx"
```
