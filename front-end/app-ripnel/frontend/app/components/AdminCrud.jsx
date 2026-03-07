'use client';

import { useState } from 'react';

export default function AdminCrud() {
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: 'Administrador Ripnel', email: 'admin@ripnel.com', rol: 'ADMIN', activo: true },
    { id: 2, nombre: 'Vendedor', email: 'vendedor@ripnel.com', rol: 'TIENDA', activo: true },
    { id: 3, nombre: 'Operador Almacén', email: 'almacen@ripnel.com', rol: 'ALMACEN', activo: true },
  ]);

  const [roles] = useState([
    { id: 'ADMIN', nombre: 'ADMIN', descripcion: 'Acceso total' },
    { id: 'TIENDA', nombre: 'TIENDA', descripcion: 'Operación tienda' },
    { id: 'ALMACEN', nombre: 'ALMACEN', descripcion: 'Operación almacén' },
    { id: 'CAJA', nombre: 'CAJA', descripcion: 'Caja y pagos' },
  ]);

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', email: '', rol: '', password: '' });
  const [busqueda, setBusqueda] = useState('');

  const [mostrarFormRol, setMostrarFormRol] = useState(false);
  const [editandoRol, setEditandoRol] = useState(null);
  const [formDataRol, setFormDataRol] = useState({ nombre: '', descripcion: '' });
  const [busquedaRol, setBusquedaRol] = useState('');
  const [rolesEditable, setRolesEditable] = useState([
    { id: 'ADMIN', nombre: 'ADMIN', descripcion: 'Acceso total' },
    { id: 'TIENDA', nombre: 'TIENDA', descripcion: 'Operación tienda' },
    { id: 'ALMACEN', nombre: 'ALMACEN', descripcion: 'Operación almacén' },
    { id: 'CAJA', nombre: 'CAJA', descripcion: 'Caja y pagos' },
  ]);

  const usuariosFiltrados = usuarios.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  const rolesFiltrados = rolesEditable.filter(r =>
    r.nombre.toLowerCase().includes(busquedaRol.toLowerCase()) ||
    r.descripcion.toLowerCase().includes(busquedaRol.toLowerCase())
  );

  const abrirFormulario = (usuario = null) => {
    if (usuario) {
      setFormData({ nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, password: '' });
      setEditando(usuario.id);
    } else {
      setFormData({ nombre: '', email: '', rol: '', password: '' });
      setEditando(null);
    }
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setFormData({ nombre: '', email: '', rol: '', password: '' });
  };

  const guardarUsuario = () => {
    if (!formData.nombre || !formData.email || !formData.rol) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (editando) {
      setUsuarios(usuarios.map(u =>
        u.id === editando
          ? { ...u, nombre: formData.nombre, email: formData.email, rol: formData.rol }
          : u
      ));
    } else {
      setUsuarios([...usuarios, {
        id: Math.max(...usuarios.map(u => u.id), 0) + 1,
        nombre: formData.nombre,
        email: formData.email,
        rol: formData.rol,
        activo: true
      }]);
    }
    cerrarFormulario();
  };

  const eliminarUsuario = (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      setUsuarios(usuarios.filter(u => u.id !== id));
    }
  };

  const toggleActivo = (id) => {
    setUsuarios(usuarios.map(u =>
      u.id === id ? { ...u, activo: !u.activo } : u
    ));
  };

  const abrirFormularioRol = (rol = null) => {
    if (rol) {
      setFormDataRol({ nombre: rol.nombre, descripcion: rol.descripcion });
      setEditandoRol(rol.id);
    } else {
      setFormDataRol({ nombre: '', descripcion: '' });
      setEditandoRol(null);
    }
    setMostrarFormRol(true);
  };

  const cerrarFormularioRol = () => {
    setMostrarFormRol(false);
    setFormDataRol({ nombre: '', descripcion: '' });
  };

  const guardarRol = () => {
    if (!formDataRol.nombre || !formDataRol.descripcion) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (editandoRol) {
      setRolesEditable(rolesEditable.map(r =>
        r.id === editandoRol
          ? { ...r, nombre: formDataRol.nombre, descripcion: formDataRol.descripcion }
          : r
      ));
    } else {
      setRolesEditable([...rolesEditable, {
        id: formDataRol.nombre.toUpperCase().replace(/\s+/g, '_'),
        nombre: formDataRol.nombre,
        descripcion: formDataRol.descripcion
      }]);
    }
    cerrarFormularioRol();
  };

  const eliminarRol = (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este rol?')) {
      setRolesEditable(rolesEditable.filter(r => r.id !== id));
    }
  };

  const handleLogout = () => {
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-violet-700 to-violet-900 text-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-8">RIPNEL</h1>
          <div className="bg-violet-500 p-4 rounded-lg mb-8">
            <p className="text-sm text-violet-200">Sección</p>
            <p className="text-xl font-bold">Usuarios y Roles</p>
          </div>
        </div>

        {/* Botón Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-violet-800 border-t border-white w-64">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Gestión de Usuarios</h2>

          {/* Búsqueda y botón agregar */}
          <div className="mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={() => abrirFormulario()}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg font-semibold transition cursor-pointer"
            >
              + Nuevo Usuario
            </button>
          </div>

          {/* Modal Formulario */}
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
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 border text-gray-700 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border text-gray-700 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="correo@ripnel.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      value={formData.rol}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                      className="w-full px-3 py-2 border text-gray-700 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="">Seleccionar rol...</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña {editando && '(opcional)'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border text-gray-700 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={guardarUsuario}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg font-semibold transition cursor-pointer"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={cerrarFormulario}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Usuarios */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  <tr key={usuario.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm text-gray-900">{usuario.nombre}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{usuario.email}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="bg-violet-100 text-violet-800 px-2 py-1 rounded text-xs font-semibold">
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <button
                        onClick={() => toggleActivo(usuario.id)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                          usuario.activo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {usuario.activo ? 'Activo' : 'Inactivo'}
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
                        onClick={() => eliminarUsuario(usuario.id)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CRUD DE ROLES */}
          <h2 className="text-3xl font-bold text-gray-800 mb-6 mt-12">Gestión de Roles</h2>

          {/* Búsqueda y botón agregar roles */}
          <div className="mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Buscar rol..."
              value={busquedaRol}
              onChange={(e) => setBusquedaRol(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={() => abrirFormularioRol()}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg font-semibold transition cursor-pointer"
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
                      value={formDataRol.nombre}
                      onChange={(e) => setFormDataRol({ ...formDataRol, nombre: e.target.value })}
                      className="w-full px-3 py-2 border text-gray-700 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Nombre del rol"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={formDataRol.descripcion}
                      onChange={(e) => setFormDataRol({ ...formDataRol, descripcion: e.target.value })}
                      className="w-full px-3 py-2 border text-gray-700 border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Descripción del rol"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={guardarRol}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg font-semibold transition cursor-pointer"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={cerrarFormularioRol}
                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Roles */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  <tr key={rol.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                        {rol.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{rol.descripcion}</td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => abrirFormularioRol(rol)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm mr-3 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarRol(rol.id)}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{usuarios.length}</div>
              <div className="text-gray-600 text-sm">Total de Usuarios</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">{usuarios.filter(u => u.activo).length}</div>
              <div className="text-gray-600 text-sm">Usuarios Activos</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">{roles.length}</div>
              <div className="text-gray-600 text-sm">Roles Disponibles</div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
