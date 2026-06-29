# Cash Module - Improvement Plan

Plan incremental para mejorar caja sin alterar el lenguaje visual general del modulo en esta etapa.

---

## Resumen ejecutivo

| Fase | Alcance | Riesgo | Objetivo |
|---|---|---|---|
| Fase 1 | Correcciones operativas criticas | Bajo | Evitar interpretaciones equivocadas al cerrar |
| Fase 2 | Alineacion funcional y documental | Bajo | Dejar contrato, copy y comportamiento coherentes |
| Fase 3 | Estandarizacion UX amplia | Medio/Alto | Diferida a una siguiente etapa controlada |
| Fase 4 | Hardening minimo | Bajo/Medio | Subir cobertura sobre flujo y reglas reales |

---

## Fase 1 - Correcciones operativas criticas

### 1.1 Semantica de arqueo

- Corregir la lectura de `Sobrante` y `Faltante`
- Usar `closing_balance_declared - total_all` como base de arqueo
- Mantener esta diferencia separada de `ventas - pagos`

### 1.2 Total visible del cierre

- El dialogo de cierre debe mostrar `total pagos a cerrar`
- Ese valor debe salir de pagos registrados, igual que backend
- El total de ventas confirmadas puede seguir visible en la pagina, pero no como referencia principal del cierre

### 1.3 Warning contextual al cerrar

- Si `ventas != pagos`, mostrar warning dentro del modal de cierre
- No bloquear el cierre en esta fase
- Documentar que la advertencia es deliberada y temporal

### 1.4 Estado admin preciso

- `open` => `Pendiente de cierre`
- `closed + is_consistent === true` => `Consistencia OK`
- `closed + is_consistent === false` => diferencia visible
- `closed` sin consistencia evaluada => `Sin evaluacion`

### 1.5 Fecha operativa Lima

- Calcular defaults del historial desde `America/Lima`
- Evitar depender de `toISOString()` del navegador para el rango inicial

---

## Fase 2 - Alineacion funcional y documental

### 2.1 Especificacion funcional

Actualizar `docs/cash-functional-spec.md` para reflejar:

- que `opening_balance` y `closing_balance_declared` ya existen;
- que hay dos diferencias distintas en el modulo;
- que el cierre se consolida con pagos registrados;
- que `closing_balance_declared` sigue siendo opcional.

### 2.2 Plan de caja

Reescribir este plan para:

- marcar resuelto lo ya implementado;
- separar remediaciones inmediatas de mejoras futuras;
- dejar Fase 3 fuera de esta iteracion para no malograr la UI actual.

---

## Fase 3 - Estandarizacion UX amplia

Diferida intencionalmente.

Queda para una siguiente etapa porque incluye decisiones de mayor sensibilidad visual:

- refinamiento de estados y ayudas contextuales;
- posible ajuste fino de composicion;
- estandarizacion transversal con otros modulos operativos.

No entra en la implementacion actual.

---

## Fase 4 - Hardening minimo

### 4.1 Pruebas frontend

- ampliar `__tests__/cash-utils.test.ts`;
- cubrir semantica de diferencia;
- cubrir warning de cierre;
- cubrir estados admin derivados.

### 4.2 Pruebas backend

- reforzar `cash.service.test.js`;
- confirmar que el cierre usa pagos registrados;
- confirmar que la inconsistencia no bloquea el cierre en esta etapa;
- mantener cobertura de serializacion y consistencia.

### 4.3 Verificacion manual focalizada

- abrir caja;
- cerrar caja consistente;
- cerrar caja con inconsistencia visible;
- revisar historial con rango Lima;
- revisar control admin con sesiones abiertas y cerradas.

---

## Checklist de salida

- `Caja del dia` no cambia su estructura general
- El cierre comunica el total correcto
- `Sobrante/Faltante` coincide con la lectura del cajero
- El admin no muestra falsos `OK`
- Los docs de caja coinciden con el comportamiento real
- Las pruebas de caja backend y frontend pasan
