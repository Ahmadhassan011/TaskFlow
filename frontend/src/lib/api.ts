import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error || !token) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

interface ApiRequestInit extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export function extractErrorMessage(body: unknown, fallback = "Something went wrong"): string {
  if (!body || typeof body !== "object") return fallback;
  const obj = body as Record<string, unknown>;
  if (Array.isArray(obj.details) && obj.details.length > 0) {
    const first = obj.details[0] as Record<string, unknown>;
    return (first.message as string) || (obj.error as string) || fallback;
  }
  return (obj.error as string) || (obj.message as string) || fallback;
}

export async function api<T = unknown>(
  endpoint: string,
  options: ApiRequestInit = {}
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 201 || res.status === 204) {
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  if (res.status === 401 && getRefreshToken()) {
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => api<T>(endpoint, options));
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      });

      if (!refreshRes.ok) {
        clearTokens();
        processQueue(new Error("Refresh failed"), null);
        window.location.href = "/login";
        throw new Error("Session expired");
      }

      const data = await refreshRes.json();
      setTokens(data.accessToken, data.refreshToken);
      processQueue(null, data.accessToken);

      headers["Authorization"] = `Bearer ${data.accessToken}`;
      const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
        ...rest,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!retryRes.ok) {
        const error = await retryRes.json().catch(() => ({}));
        throw new Error(extractErrorMessage(error, `Request failed: ${retryRes.status}`));
      }

      if (retryRes.status === 204) return undefined as T;
      return retryRes.json();
    } catch (err) {
      clearTokens();
      window.location.href = "/login";
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(error, `Request failed: ${res.status}`));
  }

  return res.json();
}

export const apiClient = {
  get: <T = unknown>(endpoint: string) =>
    api<T>(endpoint, { method: "GET" }),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    api<T>(endpoint, { method: "POST", body }),

  put: <T = unknown>(endpoint: string, body?: unknown) =>
    api<T>(endpoint, { method: "PUT", body }),

  patch: <T = unknown>(endpoint: string, body?: unknown) =>
    api<T>(endpoint, { method: "PATCH", body }),

  delete: <T = unknown>(endpoint: string, options?: { body?: unknown }) =>
    api<T>(endpoint, { method: "DELETE", body: options?.body }),

  upload: async <T = unknown>(endpoint: string, formData: FormData): Promise<T> => {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(extractErrorMessage(error, `Upload failed: ${res.status}`));
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  },
};
