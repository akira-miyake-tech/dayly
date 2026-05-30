import { z } from "zod";
import { RoleSchema, PaginationSchema, apiResponse } from "./common.schema";

export const CreateUserRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  role: RoleSchema,
  department: z.string().max(100).optional(),
  password: z.string().min(8),
});

export const UpdateUserRequestSchema = CreateUserRequestSchema.extend({
  password: z.string().min(8).optional(),
});

export const GetUsersQuerySchema = z.object({
  role: RoleSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

export const UserDetailSchema = z.object({
  user_id: z.number().int().positive(),
  name: z.string(),
  email: z.string().email(),
  role: RoleSchema,
  department: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const GetUsersResponseSchema = apiResponse(
  z.object({
    users: z.array(UserDetailSchema),
    pagination: PaginationSchema,
  })
);

export const UserDetailResponseSchema = apiResponse(UserDetailSchema);

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
export type UserDetail = z.infer<typeof UserDetailSchema>;
export type GetUsersResponse = z.infer<typeof GetUsersResponseSchema>;
export type UserDetailResponse = z.infer<typeof UserDetailResponseSchema>;
