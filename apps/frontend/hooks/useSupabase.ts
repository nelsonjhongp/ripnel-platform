import { useState, useCallback } from 'react';
import { supabase, Usuario, Rol } from '@/lib/supabase';

export function useSupabaseUsers() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const crearUsuario = useCallback(async (userData: {
    full_name: string;
    username: string;
    email?: string;
    password: string;
    role_id: string;
  }) => {
    try {
      setError(null);

      if (!userData.full_name.trim()) {
        throw new Error('El nombre es requerido');
      }
      if (!userData.username.trim()) {
        throw new Error('El username es requerido');
      }
      if (!userData.password || userData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      if (!userData.role_id) {
        throw new Error('El rol es requerido');
      }

      // ✅ CAMBIO: Usar función RPC que hashea la contraseña con crypt()
      const { data, error: err } = await supabase
        .rpc('create_user_with_password', {
          p_full_name: userData.full_name.trim(),
          p_username: userData.username.trim(),
          p_email: userData.email?.trim() || null,
          p_password: userData.password,
          p_role_id: userData.role_id,
        });

      if (err) throw err;
      
      // data es un array con un elemento (el usuario creado)
      const newUser = data[0] as Usuario;
      setUsuarios([newUser, ...usuarios]);
      return newUser;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario';
      setError(message);
      console.error('Error en crearUsuario:', message, err);
      throw err;
    }
  }, [usuarios]);

  const actualizarUsuario = useCallback(async (userId: string, userData: {
    full_name?: string;
    username?: string;
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