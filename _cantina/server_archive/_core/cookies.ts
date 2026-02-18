import type { CookieOptions } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

export function isSecureRequest(req: any) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some((proto: string) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(req: any): Partial<CookieOptions> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);

  return {
    domain: undefined,
    httpOnly: true,
    path: "/",
    // Cross-domain (Vercel frontend → Hetzner backend) richiede SameSite=None + Secure.
    // SameSite=None è sicuro qui perché CORS restrittivo limita le origini.
    sameSite: secure ? "none" : "lax",
    secure,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 anno
  };
}
