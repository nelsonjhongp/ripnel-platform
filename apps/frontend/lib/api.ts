function isLocalDevHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export const AUTH_ERROR_EVENT = "ripnel:auth-error";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options: { code?: string; details?: unknown } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code;
    this.details = options.details;
  }
}

type ApiErrorPayload = {
  message?: string;
  code?: string;
  details?: unknown;
};

type ApiFetchInit = RequestInit & {
  suppressAuthEvent?: boolean;
};

function resolveConfiguredApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return "http://127.0.0.1:3001";
}

export function getApiBaseUrl() {
  const configuredBaseUrl = resolveConfiguredApiBaseUrl();

  if (typeof window === "undefined") {
    return configuredBaseUrl;
  }

  try {
    const url = new URL(configuredBaseUrl);

    if (
      isLocalDevHost(url.hostname) &&
      isLocalDevHost(window.location.hostname) &&
      url.hostname !== window.location.hostname
    ) {
      url.hostname = window.location.hostname;
    }

    return url.origin;
  } catch {
    return configuredBaseUrl;
  }
}

export type ApiEnvelope<T> = {
  ok: boolean;
  data: T;
};

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`;
  const { suppressAuthEvent, ...requestInit } = init;

  const res = await fetch(url, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      ...(requestInit.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    let payload: ApiErrorPayload | null = null;
    let message = `HTTP ${res.status}`;

    try {
      payload = (await res.json()) as ApiErrorPayload;
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // ignore
    }

    if (
      typeof window !== "undefined" &&
      res.status === 401 &&
      !suppressAuthEvent
    ) {
      window.dispatchEvent(
        new CustomEvent(AUTH_ERROR_EVENT, {
          detail: {
            status: res.status,
            code: payload?.code,
            message,
          },
        })
      );
    }

    throw new ApiError(message, res.status, {
      code: payload?.code,
      details: payload?.details,
    });
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function unwrapApiData<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload &&
    typeof payload === "object" &&
    "ok" in payload &&
    "data" in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

const apiBaseUrl = getApiBaseUrl();

export function buildApiUrl(path: string) {
  return `${getApiBaseUrl()}${path}`;
}

export { apiBaseUrl };
