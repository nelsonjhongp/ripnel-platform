import type { Location } from "@/types/shared";

export type MovementType = "IN" | "OUT" | "ADJUST";
export type MovementDirection = "entry" | "exit" | "adjustment";
export type DocumentFamily = "sale" | "transfer" | "exchange" | "adjustment" | "none";
export type SemanticOrigin =
  | "sale_confirmed"
  | "sale_cancelled"
  | "transfer_shipped"
  | "transfer_received"
  | "exchange_received"
  | "exchange_delivered"
  | "opening_confirmed"
  | "adjustment_confirmed"
  | "unclassified";
export type MovementOperationFilter = "ALL" | "IN" | "OUT" | "ADJUST" | "TRANSFER";
export type MovementOriginFilter =
  | "ALL"
  | "sale"
  | "transfer"
  | "exchange"
  | "adjustment"
  | "opening";

export type KardexMovement = {
  movement_id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  variant_id: string;
  sku: string;
  style_code: string;
  style_name: string;
  movement_type: MovementType;
  quantity: number;
  quantity_effect: number;
  balance_qty: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  reference_line_id: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  movement_direction?: MovementDirection | null;
  document_family?: DocumentFamily | null;
  semantic_origin?: SemanticOrigin | null;
};

export type KardexResponse = {
  rows: KardexMovement[];
  meta: {
    available_locations: Location[];
    selected_location_id: string | null;
    can_view_all_locations: boolean;
  };
};

export function isOpeningMovement(movement: KardexMovement) {
  return (
    movement.reference_type === "adjustment" &&
    /apertura|inicial/i.test(movement.reason || "")
  );
}

export function resolveDocumentFamily(movement: KardexMovement): DocumentFamily {
  if (
    movement.document_family === "sale" ||
    movement.document_family === "transfer" ||
    movement.document_family === "exchange" ||
    movement.document_family === "adjustment" ||
    movement.document_family === "none"
  ) {
    return movement.document_family;
  }

  if (movement.reference_type === "sale") return "sale";
  if (movement.reference_type === "transfer") return "transfer";
  if (movement.reference_type === "exchange") return "exchange";
  if (movement.reference_type === "adjustment" || movement.movement_type === "ADJUST") {
    return "adjustment";
  }

  return "none";
}

export function resolveMovementDirection(movement: KardexMovement): MovementDirection {
  if (
    movement.movement_direction === "entry" ||
    movement.movement_direction === "exit" ||
    movement.movement_direction === "adjustment"
  ) {
    return movement.movement_direction;
  }

  if (movement.movement_type === "IN") return "entry";
  if (movement.movement_type === "OUT") return "exit";
  return "adjustment";
}

export function resolveSemanticOrigin(movement: KardexMovement): SemanticOrigin {
  if (
    movement.semantic_origin === "sale_confirmed" ||
    movement.semantic_origin === "sale_cancelled" ||
    movement.semantic_origin === "transfer_shipped" ||
    movement.semantic_origin === "transfer_received" ||
    movement.semantic_origin === "exchange_received" ||
    movement.semantic_origin === "exchange_delivered" ||
    movement.semantic_origin === "opening_confirmed" ||
    movement.semantic_origin === "adjustment_confirmed" ||
    movement.semantic_origin === "unclassified"
  ) {
    return movement.semantic_origin;
  }

  const documentFamily = resolveDocumentFamily(movement);
  const movementDirection = resolveMovementDirection(movement);

  if (documentFamily === "transfer") {
    return movementDirection === "exit" ? "transfer_shipped" : "transfer_received";
  }

  if (documentFamily === "sale") {
    return movementDirection === "entry" ? "sale_cancelled" : "sale_confirmed";
  }

  if (documentFamily === "exchange") {
    return movementDirection === "entry" ? "exchange_received" : "exchange_delivered";
  }

  if (documentFamily === "adjustment") {
    return isOpeningMovement(movement) ? "opening_confirmed" : "adjustment_confirmed";
  }

  return "unclassified";
}

export function formatMovementOperationLabel(movement: KardexMovement) {
  switch (resolveSemanticOrigin(movement)) {
    case "transfer_shipped":
      return "Salida por transferencia";
    case "transfer_received":
      return "Entrada por transferencia";
    case "sale_confirmed":
      return "Salida por venta";
    case "sale_cancelled":
      return "Entrada por anulacion";
    case "exchange_received":
      return "Entrada por cambio";
    case "exchange_delivered":
      return "Salida por cambio";
    case "opening_confirmed":
      return "Apertura inicial";
    case "adjustment_confirmed":
      return "Ajuste";
    default:
      if (resolveMovementDirection(movement) === "entry") return "Entrada";
      if (resolveMovementDirection(movement) === "exit") return "Salida";
      return "Ajuste";
  }
}

export function formatMovementOriginLabel(movement: KardexMovement) {
  switch (resolveSemanticOrigin(movement)) {
    case "transfer_shipped":
      return "Transferencia despachada";
    case "transfer_received":
      return "Transferencia recibida";
    case "sale_confirmed":
      return "Venta confirmada";
    case "sale_cancelled":
      return "Venta anulada";
    case "exchange_received":
      return "Cambio recibido";
    case "exchange_delivered":
      return "Cambio entregado";
    case "opening_confirmed":
      return "Apertura inicial";
    case "adjustment_confirmed":
      return "Ajuste de inventario";
    default:
      return "Movimiento sin documento";
  }
}

export function formatReference(movement: KardexMovement) {
  if (movement.reference_type && movement.reference_id) {
    const referenceLabel =
      resolveDocumentFamily(movement) === "transfer"
        ? "Transferencia"
        : resolveDocumentFamily(movement) === "sale"
          ? "Venta"
          : resolveDocumentFamily(movement) === "exchange"
            ? "Postventa"
        : resolveDocumentFamily(movement) === "adjustment"
          ? resolveSemanticOrigin(movement) === "opening_confirmed"
            ? "Apertura"
            : "Ajuste"
          : movement.reference_type;
    return `${referenceLabel} ${movement.reference_id.slice(0, 8)}`;
  }
  if (movement.reference_type) return movement.reference_type;
  return movement.reason || "Sin referencia";
}

export function resolveMovementTypeFromParams(
  movementTypeParam: string | null,
  referenceTypeParam: string | null
): MovementOperationFilter {
  if (movementTypeParam === "IN" || movementTypeParam === "OUT" || movementTypeParam === "ADJUST") {
    return movementTypeParam;
  }

  if (referenceTypeParam === "transfer") {
    return "TRANSFER";
  }

  return "ALL";
}

export function resolveOriginFilterFromParams(referenceTypeParam: string | null): MovementOriginFilter {
  if (
    referenceTypeParam === "sale" ||
    referenceTypeParam === "transfer" ||
    referenceTypeParam === "exchange" ||
    referenceTypeParam === "adjustment"
  ) {
    return referenceTypeParam;
  }

  return "ALL";
}

export function resolveBackendReferenceType(
  movementType: MovementOperationFilter,
  originFilter: MovementOriginFilter,
  referenceTypeParam: string | null
) {
  if (
    referenceTypeParam === "sale" ||
    referenceTypeParam === "transfer" ||
    referenceTypeParam === "exchange" ||
    referenceTypeParam === "adjustment"
  ) {
    return referenceTypeParam;
  }

  if (
    originFilter === "sale" ||
    originFilter === "transfer" ||
    originFilter === "exchange" ||
    originFilter === "adjustment"
  ) {
    return originFilter;
  }

  if (movementType === "TRANSFER") {
    return "transfer";
  }

  return null;
}
