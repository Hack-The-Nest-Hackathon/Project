import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createAccountSession, deleteAccountSession, findAccountSession, type Account, type LoginIdentity,
} from "../database/index.js";
import * as oidc from "openid-client";

declare module "fastify" {
  interface FastifyRequest {
    account: Account | null;
  }
}

const sessionSeconds = 7 * 24 * 60 * 60;
const flowSeconds = 10 * 60;
const sessionCookie = "voices-session";
const flowCookie = "voices-login";

function readOrigins() {
  return new Set((process.env.SSOJET_PUBLIC_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",").map((entry) => {
      const value = entry.trim().replace(/\/$/, "");
      const url = new URL(value);
      const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (url.origin !== value || (url.protocol !== "https:" && !(loopback && url.protocol === "http:"))) {
        throw new Error("SSOJET_PUBLIC_ORIGINS must contain HTTPS origins or loopback HTTP origins");
      }
      return url.origin;
    }));
}

const origins = readOrigins();
const allowLoopbackCookies = [...origins].some((origin) => origin.startsWith("http:"));
const issuer = process.env.SSOJET_ISSUER?.trim() || process.env.SSOJET_AUTHORITY?.trim();
const clientId = process.env.SSOJET_CLIENT_ID?.trim();
const clientSecret = process.env.SSOJET_CLIENT_SECRET?.trim();
const tokenAuth = process.env.SSOJET_TOKEN_AUTH_METHOD?.trim() || "client_secret_post";
if (!["client_secret_basic", "client_secret_post"].includes(tokenAuth)) {
  throw new Error("Invalid SSOJET_TOKEN_AUTH_METHOD");
}
if (issuer) {
  const url = new URL(issuer);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("SSOJET_ISSUER must be an HTTPS issuer URL");
  }
}

let configuration: Promise<oidc.Configuration> | undefined;
function provider() {
  if (!issuer || !clientId || !clientSecret || !process.env.DATABASE_URL) {
    throw new Error("SSOJet login is not configured");
  }
  configuration ??= oidc.discovery(
    new URL(issuer), clientId, { client_secret: clientSecret },
    tokenAuth === "client_secret_post" ? oidc.ClientSecretPost() : oidc.ClientSecretBasic(),
    { timeout: 8, execute: [oidc.enableNonRepudiationChecks] },
  ).catch((error: unknown) => {
    configuration = undefined;
    throw error;
  });
  return configuration;
}

function readCookie(request: FastifyRequest, name: string) {
  const prefix = `${name}=`;
  return request.headers.cookie?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(prefix))?.slice(prefix.length);
}

function cookieName(name: string, secure: boolean) {
  return secure ? `__Host-${name}` : name;
}

function cookie(name: string, value: string, maxAge: number, origin: string) {
  const secure = new URL(origin).protocol === "https:";
  return `${cookieName(name, secure)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function sessionHash(request: FastifyRequest) {
  const token = readCookie(request, cookieName(sessionCookie, true))
    ?? (allowLoopbackCookies ? readCookie(request, sessionCookie) : undefined);
  return token && /^[\w-]{43}$/.test(token) ? digest(token) : null;
}

function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function callbackUrl(origin: string) {
  return new URL("/api/auth/callback", origin);
}

type LoginFlow = { origin: string; state: string; verifier: string; nonce: string; expiresAt: number };

export async function beginLogin(origin: string) {
  if (!origins.has(origin)) return null;
  const config = await provider();
  const flow: LoginFlow = {
    origin, state: oidc.randomState(), verifier: oidc.randomPKCECodeVerifier(), nonce: oidc.randomNonce(),
    expiresAt: Date.now() + flowSeconds * 1000,
  };
  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl(origin).href,
    response_type: "code", response_mode: "query", scope: "openid email profile", state: flow.state, nonce: flow.nonce,
    code_challenge: await oidc.calculatePKCECodeChallenge(flow.verifier), code_challenge_method: "S256",
    prompt: "login",
  });
  return {
    url: url.href,
    cookie: cookie(`${flowCookie}-${flow.state}`, Buffer.from(JSON.stringify(flow)).toString("base64url"), flowSeconds, origin),
  };
}

function readFlow(request: FastifyRequest, name: string): LoginFlow | null {
  const secureValue = readCookie(request, cookieName(name, true));
  const raw = secureValue ?? (allowLoopbackCookies ? readCookie(request, name) : undefined);
  if (!raw || raw.length > 2048) return null;
  try {
    const flow = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as LoginFlow;
    if (!origins.has(flow.origin) || (new URL(flow.origin).protocol === "https:") !== Boolean(secureValue)
      || !Number.isFinite(flow.expiresAt) || flow.expiresAt <= Date.now()
      || ![flow.state, flow.verifier, flow.nonce].every((part) => typeof part === "string" && /^[\w-]{43}$/.test(part))) return null;
    return flow;
  } catch { return null; }
}

function claimText(value: unknown, max: number) {
  return typeof value === "string" && value.length <= max && value.trim() ? value : null;
}

export async function finishLogin(request: FastifyRequest, reply: FastifyReply) {
  const incoming = new URL(request.url, "http://localhost");
  const state = incoming.searchParams.get("state");
  const providerError = incoming.searchParams.has("error");
  if (!state || !/^[\w-]{43}$/.test(state)) {
    request.log.warn({ providerError }, "Sign-in callback has no valid state");
    return reply.redirect(providerError ? "/?login=provider" : "/?login=expired", 303);
  }

  // Separate cookies keep two tabs from replacing each other's pending sign-in.
  const name = `${flowCookie}-${state}`;
  const currentFlow = readFlow(request, name);
  const flow = currentFlow ?? readFlow(request, flowCookie);
  if (!flow || flow.state !== state) {
    request.log.warn("Sign-in callback has no matching login cookie");
    return reply.redirect("/?login=expired", 303);
  }
  const clearFlow = cookie(currentFlow ? name : flowCookie, "", 0, flow.origin);
  if (providerError) {
    request.log.warn("SSOJet returned an authorization error");
    return reply.header("Set-Cookie", clearFlow).redirect("/?login=provider", 303);
  }

  let identity: LoginIdentity;
  try {
    const config = await provider();
    const url = callbackUrl(flow.origin);
    url.search = incoming.search;
    const tokens = await oidc.authorizationCodeGrant(config, url, {
      expectedState: flow.state, expectedNonce: flow.nonce, pkceCodeVerifier: flow.verifier, idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims || !claimText(claims.sub, 255)) throw new Error("Missing SSOJet subject");
    identity = {
      issuer: claims.iss, subject: claims.sub, email: claimText(claims.email, 320), name: claimText(claims.name, 160),
    };
  } catch (error) {
    const providerResponse = error instanceof oidc.ResponseBodyError ? error : null;
    const providerCode = providerResponse?.cause.error_code;
    const providerError = providerResponse && /^[a-z_]{1,48}$/.test(providerResponse.error)
      ? providerResponse.error : undefined;
    const errorCode = error instanceof oidc.ClientError ? error.code : undefined;
    request.log.warn({
      errorName: error instanceof Error ? error.name : "Unknown",
      errorCode, providerError, providerStatus: providerResponse?.status,
      providerCode: typeof providerCode === "number" || (typeof providerCode === "string" && /^\d{3,5}$/.test(providerCode))
        ? providerCode : undefined,
      callback: callbackUrl(flow.origin).href,
      tokenAuth,
    }, "SSOJet token exchange failed");
    const reason = providerError === "invalid_client" ? "client"
      : providerError === "redirect_uri_mismatch" || String(providerCode) === "1029" ? "callback"
      : String(providerCode) === "1025" ? "pkce"
      : providerError === "invalid_grant" ? "grant" : "provider";
    return reply.header("Set-Cookie", clearFlow).redirect(`/?login=${reason}`, 303);
  }

  const token = randomBytes(32).toString("base64url");
  try {
    await createAccountSession(randomUUID(), identity, digest(token),
      new Date(Date.now() + sessionSeconds * 1000), sessionHash(request));
  } catch (error) {
    request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Game session could not be stored");
    return reply.header("Set-Cookie", clearFlow).redirect("/?login=session", 303);
  }

  reply.header("Set-Cookie", [clearFlow, cookie(sessionCookie, token, sessionSeconds, flow.origin)]);
  return reply.redirect("/", 303);
}

export async function requireAccount(request: FastifyRequest, reply: FastifyReply) {
  const hash = sessionHash(request);
  if (!hash) return reply.code(401).send({ message: "Sign in to continue." });
  if (!process.env.DATABASE_URL) return reply.code(503).send({ message: "Account service unavailable." });
  try {
    request.account = await findAccountSession(hash);
  } catch (error) {
    request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Account lookup failed");
    return reply.code(503).send({ message: "Account service unavailable." });
  }
  if (!request.account) return reply.code(401).send({ message: "Sign in to continue." });
  if (request.headers["x-account-id"] !== undefined && request.headers["x-account-id"] !== request.account.id) {
    return reply.code(409).send({ message: "The active account changed. Reload the game." });
  }
}

export async function signOut(request: FastifyRequest, reply: FastifyReply) {
  const origin = request.headers.origin;
  if (!origin || !origins.has(origin)) return reply.code(403).send({ message: "Invalid sign-out origin." });
  const hash = sessionHash(request);
  if (hash) {
    try {
      const account = await findAccountSession(hash);
      if (account && request.headers["x-account-id"] !== account.id) {
        return reply.code(409).send({ message: "The active account changed. Reload the game." });
      }
      await deleteAccountSession(hash);
    } catch (error) {
      request.log.warn({ errorName: error instanceof Error ? error.name : "Unknown" }, "Session revocation failed");
      return reply.code(503).send({ message: "Account service unavailable." });
    }
  }
  return reply.header("Set-Cookie", cookie(sessionCookie, "", 0, origin)).code(204).send();
}
