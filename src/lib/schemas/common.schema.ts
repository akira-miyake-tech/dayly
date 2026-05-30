import { z } from "zod";

export const ErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(ErrorDetailSchema).optional(),
  }),
});

export const PaginationSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  per_page: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
});

export const RoleSchema = z.enum(["sales", "manager"]);

export function apiResponse<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({ data: dataSchema });
}

export function validationError(details: { field: string; message: string }[]) {
  return {
    error: {
      code: "VALIDATION_ERROR" as const,
      message: "入力内容に誤りがあります",
      details,
    },
  };
}

export type ApiError = z.infer<typeof ApiErrorSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type Role = z.infer<typeof RoleSchema>;
