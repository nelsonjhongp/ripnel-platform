const ERRORS = {
  AUTH_REQUIRED: "Not authenticated",
  FORBIDDEN: "Forbidden",
  FORBIDDEN_LOCATION: "Forbidden",
  INVALID_RANGE: "Invalid range value",
  INVALID_STATUS: "Invalid status value",
  INVALID_CASH_CLOSING_ID: "cash_closing_id is required",
  DEFAULT_LOCATION_REQUIRED:
    "Authenticated user has no default location assigned",
  DEFAULT_LOCATION_INACTIVE: "Default location is inactive",
  LOCATION_NOT_FOUND: "Location not found",
  CASH_CLOSING_NOT_FOUND: "Caja no encontrada",
  CASH_ALREADY_CLOSED_FOR_DATE:
    "La caja operativa de la sede ya fue cerrada para esa fecha.",
  CASH_ALREADY_CLOSED:
    "La caja operativa de la sede ya fue cerrada.",
  CASH_NOT_CLOSED: "La caja no esta cerrada.",
  UNCONFIRMED_SALES_EXIST:
    "No se puede cerrar caja: existen ventas sin confirmar.",
}

module.exports = { ERRORS }
