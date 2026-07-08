#!/usr/bin/env bash
#
# Aplica las migraciones de supabase/migrations/ en orden, contra la
# base de datos apuntada por la variable de entorno DATABASE_URL.
#
# ADVERTENCIA: este script NO define ni contiene ninguna cadena de
# conexion. Lee DATABASE_URL del entorno del usuario. Antes de
# ejecutarlo, confirma explicitamente a que base apunta esa variable:
# un error aqui puede significar aplicar migraciones contra Supabase
# remoto, staging o produccion sin querer. Este script NO aplica
# seeds — solo migraciones de esquema.
#
# Uso:
#   DATABASE_URL="postgresql://usuario:password@host:puerto/bd?sslmode=require" \
#     ./scripts/deploy/apply-migrations.sh
#
# Requiere: psql instalado y accesible en PATH.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: la variable de entorno DATABASE_URL no esta definida." >&2
  echo "Este script no aplica ninguna migracion sin ella. Abortando." >&2
  exit 1
fi

# Detecta la raiz del repo a partir de la ubicacion de este script,
# para poder ejecutarse desde cualquier directorio.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "ERROR: no se encontro el directorio de migraciones en $MIGRATIONS_DIR" >&2
  exit 1
fi

echo "Aplicando migraciones desde: $MIGRATIONS_DIR"
echo "IMPORTANTE: confirma que DATABASE_URL apunta al entorno correcto antes de continuar."
echo ""

cd "$MIGRATIONS_DIR"

for f in $(ls | sort); do
  echo "=== Aplicando: $f ==="
  if ! psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; then
    echo "!!! FALLÓ: $f — deteniendo, no se aplican mas migraciones. !!!" >&2
    exit 1
  fi
  echo "OK: $f"
done

echo ""
echo "Todas las migraciones se aplicaron sin error."
