import { useState, useCallback, useEffect } from 'react';
import { supabase, Usuario, Rol } from '@/lib/supabase';

export function useSupabaseUsers() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch: Obtener todos los usuarios
  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setUsuarios(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar usuarios';
      setError(message);
      console.error('Error fetching usuarios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Insert: Crear nuevo usuario
  const crearUsuario = useCallback(async (userData: {
    full_name: string;
    email: string;
    role_id: string;
  }) => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('users')
        .insert([{
          full_name: userData.full_name,
          email: userData.email,
          role_id: userData.role_id,
          active: true,
          password_hash: 'temp_hash', // En producción usar bcrypt o Supabase Auth
        }])
        .select()
        .single();

      if (err) throw err;
      setUsuarios([data, ...usuarios]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario';
      setError(message);
      throw err;
    }
  }, [usuarios]);

  // Update: Editar usuario existente
  const actualizarUsuario = useCallback(async (userId: string, userData: {
    full_name?: string;
    email?: string;
    role_id?: string;
    active?: boolean;
  }) => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('users')
        .update(userData)
        .eq('user_id', userId)
        .select()
        .single();

      if (err) throw err;
      setUsuarios(usuarios.map(u => u.user_id === userId ? data : u));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar usuario';
      setError(message);
      throw err;
    }
  }, [usuarios]);

  // Delete: Eliminar usuario
  const eliminarUsuario = useCallback(async (userId: string) => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userId);

      if (err) throw err;
      setUsuarios(usuarios.filter(u => u.user_id !== userId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar usuario';
      setError(message);
      throw err;
    }
  }, [usuarios]);

  // Toggle: Cambiar estado activo/inactivo
  const toggleActivo = useCallback(async (userId: string, nuevoEstado: boolean) => {
    return actualizarUsuario(userId, { active: nuevoEstado });
  }, [actualizarUsuario]);

  return {
    usuarios,
    loading,
    error,
    fetchUsuarios,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    toggleActivo,
  };
}

export function useSupabaseRoles() {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch: Obtener todos los roles
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: true });

      if (err) throw err;
      setRoles(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar roles';
      setError(message);
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Insert: Crear nuevo rol
  const crearRol = useCallback(async (rolData: {
    name: string;
    description: string;
  }) => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('roles')
        .insert([{
          name: rolData.name,
          description: rolData.description,
          active: true,
        }])
        .select()
        .single();

      if (err) throw err;
      setRoles([...roles, data]);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear rol';
      setError(message);
      throw err;
    }
  }, [roles]);

  // Update: Editar rol existente
  const actualizarRol = useCallback(async (roleId: string, rolData: {
    name?: string;
    description?: string;
    active?: boolean;
  }) => {
    try {
      setError(null);
      const { data, error: err } = await supabase
        .from('roles')
        .update(rolData)
        .eq('role_id', roleId)
        .select()
        .single();

      if (err) throw err;
      setRoles(roles.map(r => r.role_id === roleId ? data : r));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar rol';
      setError(message);
      throw err;
    }
  }, [roles]);

  // Delete: Eliminar rol
  const eliminarRol = useCallback(async (roleId: string) => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('roles')
        .delete()
        .eq('role_id', roleId);

      if (err) throw err;
      setRoles(roles.filter(r => r.role_id !== roleId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar rol';
      setError(message);
      throw err;
    }
  }, [roles]);

  return {
    roles,
    loading,
    error,
    fetchRoles,
    crearRol,
    actualizarRol,
    eliminarRol,
  };
}
