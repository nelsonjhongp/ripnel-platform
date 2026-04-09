import { useCallback, useState } from "react"
import { type Rol, type Usuario } from "@/lib/supabase"

const LEGACY_SUPABASE_MESSAGE =
  "Legacy Supabase hooks are disabled. Use backend APIs instead of direct table access."

function buildLegacySupabaseError() {
  return new Error(LEGACY_SUPABASE_MESSAGE)
}

export function useSupabaseUsers() {
  const [usuarios] = useState<Usuario[]>([])
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(LEGACY_SUPABASE_MESSAGE)

  const fail = useCallback(async () => {
    const nextError = buildLegacySupabaseError()
    setError(nextError.message)
    throw nextError
  }, [])

  return {
    usuarios,
    loading,
    error,
    fetchUsuarios: fail,
    crearUsuario: fail,
    actualizarUsuario: fail,
    eliminarUsuario: fail,
    toggleActivo: fail,
  }
}

export function useSupabaseRoles() {
  const [roles] = useState<Rol[]>([])
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(LEGACY_SUPABASE_MESSAGE)

  const fail = useCallback(async () => {
    const nextError = buildLegacySupabaseError()
    setError(nextError.message)
    throw nextError
  }, [])

  return {
    roles,
    loading,
    error,
    fetchRoles: fail,
    crearRol: fail,
    actualizarRol: fail,
    eliminarRol: fail,
  }
}
