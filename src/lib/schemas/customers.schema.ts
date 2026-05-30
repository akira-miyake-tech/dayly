import { z } from "zod";
import { PaginationSchema, apiResponse } from "./common.schema";

export const CustomerRequestSchema = z.object({
  name: z.string().min(1).max(255),
  company_name: z.string().min(1).max(255),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
});

export const GetCustomersQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

export const CustomerDetailSchema = z.object({
  customer_id: z.number().int().positive(),
  name: z.string(),
  company_name: z.string(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const GetCustomersResponseSchema = apiResponse(
  z.object({
    customers: z.array(
      CustomerDetailSchema.omit({ created_at: true, updated_at: true })
    ),
    pagination: PaginationSchema,
  })
);

export const CustomerDetailResponseSchema = apiResponse(CustomerDetailSchema);

export type CustomerRequest = z.infer<typeof CustomerRequestSchema>;
export type GetCustomersQuery = z.infer<typeof GetCustomersQuerySchema>;
export type CustomerDetail = z.infer<typeof CustomerDetailSchema>;
export type GetCustomersResponse = z.infer<typeof GetCustomersResponseSchema>;
export type CustomerDetailResponse = z.infer<typeof CustomerDetailResponseSchema>;
