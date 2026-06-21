import Cookies from "js-cookie";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export type AuthUser = {
  user_id: number;
  name: string;
  email: string;
  role: "sales" | "manager";
  department?: string;
};

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function setToken(token: string, expiresAt: string): void {
  const expires = new Date(expiresAt);
  Cookies.set(TOKEN_KEY, token, { expires, secure: true, sameSite: "strict" });
}

export function removeToken(): void {
  Cookies.remove(TOKEN_KEY);
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = Cookies.get(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthUser(user: AuthUser): void {
  Cookies.set(USER_KEY, JSON.stringify(user), { secure: true, sameSite: "strict" });
}

export function removeAuthUser(): void {
  Cookies.remove(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function clearAuth(): void {
  removeToken();
  removeAuthUser();
}
