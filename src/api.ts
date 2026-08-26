export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  token: string;
  apiUrl: string;
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

/**
 * Call the Tolt v2 API and unwrap the { success, message, data } envelope.
 * Throws ApiError on a non-2xx response or a transport failure.
 */
export async function api<T = unknown>(path: string, opts: RequestOptions): Promise<T> {
  const url = new URL(`${opts.apiUrl}${path}`);
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    throw new ApiError(`Could not reach ${url.origin}: ${(err as Error).message}`, 0);
  }

  const payload = (await res.json().catch(() => null)) as
    | { success?: boolean; message?: string; data?: T }
    | null;

  if (!res.ok) {
    throw new ApiError(payload?.message || `${res.status} ${res.statusText}`, res.status);
  }
  return (payload?.data ?? (payload as unknown)) as T;
}
