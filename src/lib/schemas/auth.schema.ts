import { z } from "zod";
import { RoleSchema, apiResponse } from "./common.schema";

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AuthUserSchema = z.object({
  user_id: z.number().int().positive(),
  name: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  department: z.string(),
});

export const LoginResponseSchema = apiResponse(
  z.object({
    token: z.string(),
    expires_at: z.string().datetime(),
    user: AuthUserSchema,
  })
);

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
