export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  path: string,
  { json, timeout = 6_000, ...options }: RequestInit & { json?: unknown; timeout?: number } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (json !== undefined) headers.set("Content-Type", "application/json");
  const deadline = AbortSignal.timeout(timeout);
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers,
    body: json === undefined ? options.body : JSON.stringify(json),
    signal: options.signal ? AbortSignal.any([options.signal, deadline]) : deadline,
  });
  if (!response.ok) {
    throw new ApiError(response.status, response.status >= 500
      ? "The game server is unavailable."
      : "The game server rejected the request.");
  }
  return response.status === 204 ? undefined as T : response.json();
}
