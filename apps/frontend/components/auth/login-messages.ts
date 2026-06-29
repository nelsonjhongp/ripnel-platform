export const LOGIN = {
  card: {
    title: "Inicio de sesion",
    footer: "Creaciones Ripnel - Sistema ERP",
  },
  form: {
    usernameLabel: "Usuario o correo",
    usernamePlaceholder: "Ingresa tu usuario o correo",
    passwordLabel: "Contrasena",
    passwordPlaceholder: "Ingresa tu contrasena",
    submit: "Iniciar sesion",
    submitting: "Ingresando...",
    showPassword: "Mostrar contrasena",
    hidePassword: "Ocultar contrasena",
  },
  reason: {
    sessionExpired: "Tu sesion expiro. Inicia sesion nuevamente para continuar.",
    authRequired: "Debes iniciar sesion para acceder al modulo solicitado.",
    forbidden: "Tu usuario no tiene permisos suficientes para la operacion solicitada.",
  },
  error: {
    fallback: "No se pudo iniciar sesion",
    invalidCredentials: "Usuario o contrasena incorrectos",
    missingCredentials: "Ingresa tu usuario y contrasena para continuar",
    missingUsername: "Ingresa tu usuario o correo",
    missingPassword: "Ingresa tu contrasena",
    invalidSession: "La sesion ya no es valida. Inicia sesion otra vez para continuar.",
    contextLoadFailed: "No se pudo completar el acceso. Intenta iniciar sesion nuevamente.",
  },
} as const

export type LoginReason = "session-expired" | "auth-required" | "forbidden"
