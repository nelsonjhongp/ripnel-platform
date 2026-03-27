"use client";

import { useState, useEffect } from 'react';
import { useSupabaseUsers, useSupabaseRoles } from '@/hooks/useSupabase';

export default function AdminCrud() {
  const { usuarios, loading: loadingUsers, error: errorUsers, fetchUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, toggleActivo } = useSupabaseUsers();
  const { roles, loading: loadingRoles, error: errorRoles, fetchRoles, crearRol, actualizarRol, eliminarRol } = useSupabaseRoles();

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [formData, setFormData] = useState({ full_name: '', email: '', role_id: '' });
  const [busqueda, setBusqueda] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);

  const [mostrarFormRol, setMostrarFormRol] = useState(false);
  const [editandoRol, setEditandoRol] = useState<string | null>(null);
  const [formDataRol, setFormDataRol] = useState({ name: '', description: '' });
  const [busquedaRol, setBusquedaRol] = useState('');
  const [loadingFormRol, setLoadingFormRol] = useState(false);

  // Cargar usuarios y roles al montar
  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
  }, [fetchUsuarios, fetchRoles]);

  const usuariosFiltrados = usuarios.filter(u =>
    u.full_name.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  const rolesFiltrados = roles.filter(r =>
    r.name.toLowerCase().includes(busquedaRol.toLowerCase()) ||
    r.description.toLowerCase().includes(busquedaRol.toLowerCase())
  );

  // CRUD USUARIOS
  const abrirFormulario = (usuario: typeof usuarios[0] | null = null) => {
    if (usuario) {
      setFormData({ full_name: usuario.full_name, email: usuario.email, role_id: usuario.role_id });
      setEditando(usuario.user_id);
    } else {
      setFormData({ full_name: '', email: '', role_id: '' });
      setEditando(null);
    }
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setFormData({ full_name: '', email: '', role_id: '' });
    setEditando(null);
  };

  const guardarUsuario = async () => {
    if (!formData.full_name || !formData.email || !formData.role_id) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoadingForm(true);
    try {
      if (editando) {
        await actualizarUsuario(editando, {
          full_name: formData.full_name,
          email: formData.email,
          role_id: formData.role_id
        });
        alert('Usuario actualizado exitosamente');
      } else {
        await crearUsuario({
          full_name: formData.full_name,
          email: formData.email,
          role_id: formData.role_id
        });
        alert('Usuario creado exitosamente');
      }
      cerrarFormulario();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoadingForm(false);
    }
  };

  const handleEliminarUsuario = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        await eliminarUsuario(id);
        alert('Usuario eliminado exitosamente');
      } catch (err) {
        alert(`Error al eliminar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }
    }
  };

  const handleToggleActivo = async (id: string, nuevoEstado: boolean) => {
    try {
      await toggleActivo(id, nuevoEstado);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  };

  // CRUD ROLES
  const abrirFormularioRol = (rol: typeof roles[0] | null = null) => {
    if (rol) {
      setFormDataRol({ name: rol.name, description: rol.description });
      setEditandoRol(rol.role_id);
    } else {
      setFormDataRol({ name: '', description: '' });
      setEditandoRol(null);
    }
    setMostrarFormRol(true);
  };

  const cerrarFormularioRol = () => {
    setMostrarFormRol(false);
    setFormDataRol({ name: '', description: '' });
    setEditandoRol(null);
  };

  const guardarRol = async () => {
    if (!formDataRol.name || !formDataRol.description) {
      alert('Por favor completa todos los campos');
      return;
    }

    setLoadingFormRol(true);
    try {
      if (editandoRol) {
        await actualizarRol(editandoRol, {
          name: formDataRol.name,
          description: formDataRol.description
        });
        alert('Rol actualizado exitosamente');
      } else {
        await crearRol({
          name: formDataRol.name,
          description: formDataRol.description
        });
        alert('Rol creado exitosamente');
      }
      cerrarFormularioRol();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setLoadingFormRol(false);
    }
  };

  const handleEliminarRol = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este rol?')) {
      try {
        await eliminarRol(id);
        alert('Rol eliminado exitosamente');
      } catch (err) {
        alert(`Error al eliminar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }
    }
  };

  return (
    <div className="p-8">
      {/* SECCIÓN USUARIOS */}
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Gestión de Usuarios</h2>

      {/* Mensajes de error */}
      {errorUsers && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          Error: {errorUsers}
        </div>
      )}

      {/* Búsqueda y botón agregar */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Buscar usuario..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
        />
        <button
          onClick={() => abrirFormulario()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition cursor-pointer disabled:opacity-50"
          disabled={loadingUsers}
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* Modal Formulario Usuarios */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editando ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="correo@ripnel.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar rol...</option>
                  {roles.map(r => (
                    <option key={r.role_id} value={r.role_id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={guardarUsuario}
                disabled={loadingForm}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {loadingForm ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={cerrarFormulario}
                disabled={loadingForm}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loadingUsers ? (
          <div className="p-6 text-center text-gray-600">Cargando usuarios...</div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="p-6 text-center text-gray-600">No hay usuarios registrados</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Rol</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map(usuario => (
                <tr key={usuario.user_id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm text-gray-900">{usuario.full_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{usuario.email}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-semibold">
                      {roles.find(r => r.role_id === usuario.role_id)?.name || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <button
                      onClick={() => handleToggleActivo(usuario.user_id, !usuario.active)}
                      className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                        usuario.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {usuario.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => abrirFormulario(usuario)}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm mr-3 cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminarUsuario(usuario.user_id)}
                      className="text-red-600 hover:text-red-800 font-semibold text-sm cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* SECCIÓN ROLES */}
      <h2 className="text-3xl font-bold text-gray-800 mb-6 mt-12">Gestión de Roles</h2>

      {/* Mensajes de error */}
      {errorRoles && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          Error: {errorRoles}
        </div>
      )}

      {/* Búsqueda y botón agregar roles */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Buscar rol..."
          value={busquedaRol}
          onChange={(e) => setBusquedaRol(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
        />
        <button
          onClick={() => abrirFormularioRol()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold transition cursor-pointer disabled:opacity-50"
          disabled={loadingRoles}
        >
          + Nuevo Rol
        </button>
      </div>

      {/* Modal Formulario Rol */}
      {mostrarFormRol && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editandoRol ? 'Editar Rol' : 'Nuevo Rol'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formDataRol.name}
                  onChange={(e) => setFormDataRol({ ...formDataRol, name: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nombre del rol"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formDataRol.description}
                  onChange={(e) => setFormDataRol({ ...formDataRol, description: e.target.value })}
                  className="w-full px-3 py-2 border text-gray-900 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Descripción del rol"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={guardarRol}
                disabled={loadingFormRol}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {loadingFormRol ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={cerrarFormularioRol}
                disabled={loadingFormRol}
                className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Roles */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loadingRoles ? (
          <div className="p-6 text-center text-gray-600">Cargando roles...</div>
        ) : rolesFiltrados.length === 0 ? (
          <div className="p-6 text-center text-gray-600">No hay roles registrados</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Descripción</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rolesFiltrados.map(rol => (
                <tr key={rol.role_id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-3 text-sm text-gray-900">
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-semibold">
                      {rol.name}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{rol.description}</td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => abrirFormularioRol(rol)}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm mr-3 cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminarRol(rol.role_id)}
                      className="text-red-600 hover:text-red-800 font-semibold text-sm cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{usuarios.length}</div>
          <div className="text-gray-600 text-sm">Total de Usuarios</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{usuarios.filter(u => u.active).length}</div>
          <div className="text-gray-600 text-sm">Usuarios Activos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{roles.length}</div>
          <div className="text-gray-600 text-sm">Roles Disponibles</div>
        </div>
      </div>
    </div>
  );
}