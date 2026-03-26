"use client";

import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Clock3,
  FileCheck,
  KeyRound,
  LayoutGrid,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

const accessModules = [
  { name: "Ventas", description: "Caja rapida, checkout y pagos.", status: "Activo" },
  { name: "Inventario", description: "Consulta stock y movimientos.", status: "Activo" },
  { name: "Transferencias", description: "Solo puede recibir y confirmar.", status: "Limitado" },
  { name: "Administracion", description: "Lectura de usuarios y roles.", status: "Lectura" },
];

const assignedLocations = [
  { name: "Tienda Centro", type: "Punto principal", shift: "07:00 - 15:00", state: "En turno" },
  { name: "Almacen Norte", type: "Apoyo logistica", shift: "Cobertura sabados", state: "Programado" },
];

const activityFeed = [
  { title: "Cierre de caja enviado", detail: "Turno manana - S/. 2,840 conciliados.", time: "Hace 18 min" },
  { title: "Transferencia recibida", detail: "12 unidades confirmadas desde Almacen Norte.", time: "Hace 1 h" },
  { title: "Cambio de clave pendiente", detail: "El usuario debe actualizar credenciales este mes.", time: "Hoy" },
];

const quickStats = [
  { label: "Rol operativo", value: "Caja senior", hint: "Con acceso a ventas y cierres", icon: BriefcaseBusiness },
  { label: "Sede actual", value: "Tienda Centro", hint: "Sesion activa", icon: Store },
  { label: "Documentos", value: "18 revisados", hint: "Guias, cierres y reportes", icon: FileCheck },
  { label: "Alertas", value: "2 pendientes", hint: "1 cierre, 1 clave", icon: Bell },
];

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export default function AccountMockupPage() {
  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f7f7ff_52%,#eef2ff_100%)] p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_24px_80px_-48px_rgba(79,70,229,0.45)] backdrop-blur md:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f46e5,#7c3aed)] text-white shadow-lg shadow-violet-200">
                <UserRound className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">
                    Vista alternativa
                  </p>
                  <StatusPill tone="success">Disponible para revision</StatusPill>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                    Cuenta operativa del colaborador
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-slate-500">
                    Mockup para probar una vista mas ERP: perfil, accesos, sedes, alertas y actividad
                    en una sola pantalla.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Ver permisos
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4f46e5,#6366f1)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:opacity-95">
                Cambiar sede activa
                <MapPin className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {quickStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8faff)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {stat.label}
                    </p>
                    <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-xl font-semibold text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{stat.hint}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
          <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.4)] md:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Perfil
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">Resumen de cuenta</h2>
              </div>
              <StatusPill tone="success">Activo</StatusPill>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Colaborador</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Juan Perez Torres</p>
                <p className="mt-1 text-sm text-slate-500">juan.perez@ripnel.com</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rol principal</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Caja senior</p>
                <p className="mt-1 text-sm text-slate-500">Cierres diarios y asistencia en ventas.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Clock3 className="h-4 w-4 text-violet-500" />
                  Horario
                </div>
                <p className="mt-2 text-sm text-slate-600">Lunes a sabado / 07:00 - 15:00</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <KeyRound className="h-4 w-4 text-violet-500" />
                  Seguridad
                </div>
                <p className="mt-2 text-sm text-slate-600">Ultimo cambio de clave hace 41 dias.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Accesos por modulo</h3>
                </div>

                <div className="mt-4 space-y-3">
                  {accessModules.map((module) => (
                    <div
                      key={module.name}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{module.name}</p>
                        <p className="text-sm text-slate-500">{module.description}</p>
                      </div>
                      <StatusPill
                        tone={
                          module.status === "Activo"
                            ? "success"
                            : module.status === "Limitado"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {module.status}
                      </StatusPill>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Indicadores del turno</h3>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Ventas validadas
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-900">S/. 3,420</p>
                    <p className="mt-1 text-sm text-emerald-700">9 comprobantes emitidos en el turno.</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Tareas pendientes
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-amber-900">02</p>
                    <p className="mt-1 text-sm text-amber-700">Un cierre parcial y una verificacion de caja.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-900 p-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Ultima accion
                    </p>
                    <p className="mt-2 text-base font-semibold">Recepcion de transferencia confirmada</p>
                    <p className="mt-1 text-sm text-slate-300">Documento TR-00018 validado desde almacen.</p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-5">
            <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.4)] md:p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Ubicaciones
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Sedes asignadas</h2>
                </div>
                <MapPin className="h-5 w-5 text-violet-500" />
              </div>

              <div className="mt-4 space-y-3">
                {assignedLocations.map((location) => (
                  <div key={location.name} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{location.name}</p>
                        <p className="text-sm text-slate-500">{location.type}</p>
                      </div>
                      <StatusPill tone={location.state === "En turno" ? "success" : "neutral"}>
                        {location.state}
                      </StatusPill>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <Clock3 className="h-4 w-4" />
                      {location.shift}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.4)] md:p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Seguimiento
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">Actividad reciente</h2>
                </div>
                <ReceiptText className="h-5 w-5 text-violet-500" />
              </div>

              <div className="mt-4 space-y-4">
                {activityFeed.map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                      <BadgeCheck className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <span className="text-xs text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-sm text-slate-500">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
