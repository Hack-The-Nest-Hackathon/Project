const forwardedRequestHeaders = [
  "accept", "accept-language", "content-type", "cookie", "origin", "range",
  "if-match", "if-none-match", "if-modified-since", "if-unmodified-since", "if-range", "x-account-id",
];

const transportHeaders = [
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade",
];

async function proxy(request: Request) {
  const source = new URL(request.url);
  const backendUrl = process.env.BACKEND_URL?.trim();
  let target: URL;
  try {
    target = new URL(backendUrl || "http://127.0.0.1:3001");
    if (!["http:", "https:"].includes(target.protocol) || target.username || target.password || target.search || target.hash) {
      throw new Error("Invalid backend URL");
    }
    target.pathname = target.pathname.replace(/\/+$/, "") + source.pathname;
    target.search = source.search;
    if (target.href === source.href) throw new Error("Backend URL points to this API proxy");
  } catch {
    console.error("Invalid BACKEND_URL for the API proxy", { configured: Boolean(backendUrl) });
    return Response.json({ message: "The backend URL is misconfigured." }, { status: 500 });
  }

  const headers = new Headers({ "accept-encoding": "identity" });
  for (const name of forwardedRequestHeaders) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.any([request.signal, AbortSignal.timeout(100_000)]),
  };
  if (request.body) {
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const response = await fetch(target, init);
    const responseHeaders = new Headers(response.headers);
    for (const name of (responseHeaders.get("connection") ?? "").split(",")) {
      if (name.trim()) responseHeaders.delete(name.trim());
    }
    for (const name of transportHeaders) responseHeaders.delete(name);
    if (responseHeaders.has("content-encoding")) {
      // Fetch exposes a decoded stream even if the upstream ignored Accept-Encoding.
      responseHeaders.delete("content-encoding");
      responseHeaders.delete("content-length");
    }
    responseHeaders.delete("set-cookie");
    for (const cookie of response.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    const code = cause && typeof cause === "object" && "code" in cause ? cause.code : undefined;
    console.error("API proxy failed to reach the backend", {
      backend: target.origin,
      usingLocalDefault: !backendUrl,
      reason: typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : error instanceof Error ? error.name : "Unknown",
    });
    return Response.json({ message: "The game server is unavailable." }, { status: 502 });
  }
}

export { proxy as GET, proxy as HEAD, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
