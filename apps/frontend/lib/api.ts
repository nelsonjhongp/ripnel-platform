function isLocalDevHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

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
  init: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
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
