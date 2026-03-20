"use client";

import { useState } from "react";

export default function Cuenta() {
    const [showData, setShowData] = useState(false);

    const toggleData = () => {
        setShowData(!showData);
    };

    return (
        <section className="flex flex-1 items-center justify-center bg-linear-to-br from-indigo-50 via-white to-slate-50 p-6">
            <div className="w-full rounded-3xl border border-indigo-100 bg-white p-8 shadow-sm">
                <h2 className="text-4xl text-center font-bold text-slate-900">Datos del usuario</h2>
                <div className="mt-6">
                    <button
                        onClick={toggleData}
                        className="w-full py-2 px-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mb-4"
                    >
                        {showData ? "Ocultar Datos" : "Mostrar Datos"}
                    </button>

                    {showData && (
                        <div className="space-y-4">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                <input
                                    type="text"
                                    value="Juan Pérez"
                                    readOnly
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-2xl shadow-sm bg-gray-100 sm:text-sm"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                                <input
                                    type="email"
                                    value="juan.perez@example.com"
                                    readOnly
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-2xl shadow-sm bg-gray-100 sm:text-sm"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                <input
                                    type="tel"
                                    value="+1234567890"
                                    readOnly
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-2xl shadow-sm bg-gray-100 sm:text-sm"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                <input
                                    type="text"
                                    value="Calle Falsa 123, Ciudad"
                                    readOnly
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-2xl shadow-sm bg-gray-100 sm:text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}