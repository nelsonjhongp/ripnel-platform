"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import FormField from "./ui/FormField";
import CustomButton from "./ui/CustomButton";
import { useAuth } from "./auth/AuthProvider";
import { useState } from "react";

const REASON_MESSAGES = {
  "session-expired": "Tu sesión expiró. Inicia sesión nuevamente para continuar.",
  "auth-required": "Debes iniciar sesión para acceder al módulo solicitado.",
  forbidden: "Tu usuario no tiene permisos suficientes para la operación solicitada.",
};

export default function LoginRipnel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, authMessage, clearAuthNotice } = useAuth();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams.get("next") || "/inicio";
  const nextHref = nextPath.startsWith("/") ? nextPath : "/inicio";
  const reason = searchParams.get("reason") || "";
  const reasonMessage = REASON_MESSAGES[reason] || authMessage;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");

    setError(null);
    clearAuthNotice();
    setSubmitting(true);
    try {
      await login({ username, password });
      router.push(nextHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  };

    return (
      <div className="w-3xs mx-auto flex flex-col items-center justify-center min-h-screen py-2">
      <Image
        src="/login_user.png"
        alt="Usuario Ripnel"
        width={64}
        height={64}
        className="h-16 w-auto"
      />

      <h2 className="text-4xl text-center font-bold mt-4">Inicio de sesión</h2>

      <form className="mt-4" onSubmit={handleSubmit}>
        {reasonMessage && !error && (
          <div className="mb-3 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {reasonMessage}
          </div>
        )}
        {error && (
          <div className="mb-3 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <FormField
          label="Usuario"
          type="text"
          id="username"
          placeholder="Ingrese su usuario"
          required
        />

        <FormField
          label="Contraseña"
          type="password"
          id="password"
          placeholder="Ingrese su contraseña"
          required
        />

        <CustomButton type="submit" disabled={submitting}>
          {submitting ? "Ingresando..." : "Iniciar sesión"}
        </CustomButton>

      </form>
    </div>
  )
}
