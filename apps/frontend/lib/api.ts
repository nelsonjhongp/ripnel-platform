const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3001";

export function buildApiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export { apiBaseUrl };
