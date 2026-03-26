"use client";

import { useState } from "react";

const colaborador = {
    nombre: "Juan Pérez",
    iniciales: "JP",
    correo: "juan.perez@ripnel.com",
    telefono: "+1 (234) 567-890",
    direccion: "Calle Falsa 123, Ciudad",
    rol: "Cajero",
    turno: "Matutino  07:00 – 15:00",
    sucursal: "Sucursal Centro",
    diasLaborados: 22,
    estado: "Activo",
    ingreso: "15 ene 2025",
};

function ReadonlyField({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
    return (
        <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                readOnly
                className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-none"
            />
        </div>
    );
}

function SectionToggle({
    label,
    open,
    onToggle,
}: {
    label: string;
    open: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
            <span className={`inline-block transition-transform duration-200 ${open ? "rotate-90" : "rotate-0"}`}>▶</span>
            {open ? `Ocultar ${label}` : `Mostrar ${label}`}
        </button>
    );
}

export default function Cuenta() {
    const [showPersonal, setShowPersonal] = useState(false);
    const [showSeguridad, setShowSeguridad] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    return (
        <section className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* Header de perfil */}
                <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-sm flex items-center gap-5">
                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold select-none">
                        {colaborador.iniciales}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-slate-900 truncate">{colaborador.nombre}</h1>
                        <p className="text-sm text-slate-500">{colaborador.rol} · {colaborador.sucursal}</p>
                    </div>
                    <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {colaborador.estado}
                    </span>
                </div>

                {/* Tarjetas de resumen */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Rol</p>
                        <p className="text-base font-bold text-slate-800">{colaborador.rol}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Días laborados</p>
                        <p className="text-base font-bold text-indigo-600">{colaborador.diasLaborados}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm text-center">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Ingreso</p>
                        <p className="text-base font-bold text-slate-800">{colaborador.ingreso}</p>
                    </div>
                </div>

                {/* Turno actual */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg">
                        🕐
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">Turno actual</p>
                        <p className="text-sm font-semibold text-indigo-800">{colaborador.turno}</p>
                    </div>
                </div>

                {/* Datos personales (togglable) */}
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-800">Datos personales</h2>
                        <SectionToggle label="datos" open={showPersonal} onToggle={() => setShowPersonal(!showPersonal)} />
                    </div>

                    {showPersonal ? (
                        <div className="space-y-4 pt-2">
                            <ReadonlyField label="Nombre completo" value={colaborador.nombre} />
                            <ReadonlyField label="Correo electrónico" value={colaborador.correo} type="email" />
                            <ReadonlyField label="Teléfono" value={colaborador.telefono} type="tel" />
                            <ReadonlyField label="Dirección" value={colaborador.direccion} />
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">Información personal oculta.</p>
                    )}
                </div>

                {/* Seguridad (togglable) */}
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold text-slate-800">Seguridad</h2>
                        <SectionToggle label="contraseña" open={showSeguridad} onToggle={() => setShowSeguridad(!showSeguridad)} />
                    </div>

                    {showSeguridad ? (
                        <div className="space-y-3 pt-2">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Contraseña actual</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value="contraseña123"
                                        readOnly
                                        className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 text-sm focus:outline-none pr-20"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
                                    >
                                        {showPassword ? "Ocultar" : "Ver"}
                                    </button>
                                </div>
                            </div>
                            <button className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors">
                                Solicitar cambio de contraseña
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">Credenciales ocultas.</p>
                    )}
                </div>

            </div>
        </section>
    );
}