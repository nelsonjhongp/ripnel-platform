"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
    return (
      <div className="w-3xs mx-auto flex flex-col items-center justify-center min-h-screen py-2">
      <img
        src="/login_user.png"
        alt="Vercel Logo"
        className="h-16 w-auto"
      />

      <h2 className="text-4xl text-center font-bold mt-4">Inicio de sesión</h2>

      <form className="mt-4">
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            type="email"
            id="email"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Ingrese su correo electrónico"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <input
            type="password"
            id="password"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Ingrese su contraseña"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="sede" className="block text-sm font-medium text-gray-700">
            Sede
          </label>
          <select
            id="sede"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            required
            defaultValue=""
          >
            <option value="">Selecciona una sede</option>
            <option value="Almacen">Almacén</option>
            <option value="Tienda 1">Tienda 1</option>
            <option value="Tienda 2">Tienda 2</option>
          </select>
        </div>

        <button type="submit" className="w-full py-2 px-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          <Link href="/dashboard">Iniciar sesión</Link>
        </button>

      </form>
    </div>
  )
}