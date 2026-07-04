export const LOGIN = {
  actions: {
    back: "Volver",
  },
  card: {
    title: "Inicio de sesion",
    footer: "Creaciones Ripnel - Sistema ERP",
  },
  form: {
    usernameLabel: "Usuario",
    usernamePlaceholder: "Ingresa tu usuario",
    passwordLabel: "Contrasena",
    passwordPlaceholder: "Ingresa tu contrasena",
    submit: "Iniciar sesion",
    submitting: "Ingresando...",
    redirecting: "Redirigiendo...",
    showPassword: "Mostrar contrasena",
    hidePassword: "Ocultar contrasena",
  },
  guard: {
    validatingSession: "Validando sesion",
    validatingDesc: "Estamos confirmando tu acceso antes de abrir el modulo.",
  },
  locations: {
    loadFailed: "No se pudo cargar sedes",
    sessionValidationFailed: "No se pudo validar la sesion para cargar sedes. Reingresa y usa el mismo host en frontend y backend (localhost o 127.0.0.1).",
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
    missingUsername: "Ingresa tu usuario",
    missingPassword: "Ingresa tu contrasena",
    invalidSession: "La sesion ya no es valida. Inicia sesion otra vez para continuar.",
    sessionValidationFailed: "No se pudo validar la sesion actual.",
    contextLoadFailed: "No se pudo completar el acceso. Intenta iniciar sesion nuevamente.",
    loginContextFailed: "No se pudo completar el acceso actual.",
    noActiveSession: "No hay sesion activa",
    locationNotAssigned: "La sede seleccionada no pertenece al usuario",
  },
} as const

export type LoginReason = "session-expired" | "auth-required" | "forbidden"
