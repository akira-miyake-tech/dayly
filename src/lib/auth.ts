import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

export type JwtPayload = {
  user_id: number;
  role: "sales" | "manager";
  email: string;
  jti?: string;
};

export type AuthUser = {
  user_id: number;
  role: "sales" | "manager";
  email: string;
};

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JwtPayload): Promise<{ token: string; expiresAt: Date }> {
  const secret = getJwtSecret();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const token = await new SignJWT({
    user_id: payload.user_id,
    role: payload.role,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .setJti(crypto.randomUUID())
    .sign(secret);

  return { token, expiresAt };
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JwtPayload;
}

export function extractBearerToken(req: NextRequest | Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

export function getAuthUser(req: NextRequest | Request): AuthUser {
  const userIdStr = req.headers.get("x-auth-user-id");
  const role = req.headers.get("x-auth-user-role");
  const email = req.headers.get("x-auth-user-email");

  if (!userIdStr || !role || !email) {
    throw new Error("Unauthenticated");
  }

  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) {
    throw new Error("Invalid user_id in header");
  }

  if (role !== "sales" && role !== "manager") {
    throw new Error("Invalid role in header");
  }

  return { user_id: userId, role, email };
}

export function requireRole(
  req: NextRequest | Request,
  requiredRole: "sales" | "manager"
): AuthUser {
  const user = getAuthUser(req);
  if (user.role !== requiredRole) {
    throw new RoleError(
      `Role '${requiredRole}' required, but got '${user.role}'`
    );
  }
  return user;
}

export class RoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
