export class LoginRateLimitError extends Error {
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(`Demasiados intentos. Intenta de nuevo en ${retryAfter} segundos.`);
    this.name = "LoginRateLimitError";
    this.retryAfter = retryAfter;
  }
}

type RateLimitEntry = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
};

export type LoginRateLimiter = {
  check: (key: string) => { allowed: true } | { allowed: false; retryAfter: number };
  record: (key: string) => void;
  reset: (key: string) => void;
};

export function createLoginRateLimiter(options?: {
  maxAttempts?: number;
  blockDurationMs?: number;
  windowMs?: number;
}): LoginRateLimiter {
  const {
    maxAttempts = 3,
    blockDurationMs = 30000,
    windowMs = 60000,
  } = options ?? {};

  const store = new Map<string, RateLimitEntry>();

  function cleanup() {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.firstAttemptAt > windowMs && (!entry.blockedUntil || now > entry.blockedUntil)) {
        store.delete(key);
      }
    }
  }

  return {
    check(key: string) {
      cleanup();
      const entry = store.get(key);
      if (!entry) return { allowed: true };

      const now = Date.now();

      if (entry.blockedUntil && now < entry.blockedUntil) {
        const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
        return { allowed: false, retryAfter };
      }

      if (now - entry.firstAttemptAt > windowMs) {
        store.delete(key);
        return { allowed: true };
      }

      if (entry.count >= maxAttempts) {
        entry.blockedUntil = now + blockDurationMs;
        const retryAfter = Math.ceil(blockDurationMs / 1000);
        return { allowed: false, retryAfter };
      }

      return { allowed: true };
    },

    record(key: string) {
      cleanup();
      const now = Date.now();
      const entry = store.get(key);

      if (entry) {
        if (now - entry.firstAttemptAt > windowMs) {
          store.set(key, { count: 1, firstAttemptAt: now, blockedUntil: null });
        } else {
          entry.count += 1;
        }
      } else {
        store.set(key, { count: 1, firstAttemptAt: now, blockedUntil: null });
      }
    },

    reset(key: string) {
      store.delete(key);
    },
  };
}

export function deriveLoginKey(username: string, password: string): string {
  return `${username.toLowerCase()}:${password}`;
}
