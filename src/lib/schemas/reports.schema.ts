import { z } from "zod";
import { PaginationSchema, apiResponse } from "./common.schema";

const VisitRecordRequestSchema = z.object({
  customer_id: z.number().int().positive(),
  content: z.string().min(1).max(1000),
  visit_order: z.number().int().positive(),
});

export const CreateReportRequestSchema = z.object({
  report_date: z.string().date(),
  visit_records: z.array(VisitRecordRequestSchema).min(1),
  problem: z.string().max(2000).optional(),
  plan: z.string().max(2000).optional(),
});

export const UpdateReportRequestSchema = z.object({
  visit_records: z.array(VisitRecordRequestSchema).min(1),
  problem: z.string().max(2000).optional(),
  plan: z.string().max(2000).optional(),
});

export const GetReportsQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  user_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
});

const CustomerSummarySchema = z.object({
  customer_id: z.number().int().positive(),
  name: z.string(),
  company_name: z.string(),
});

const UserSummarySchema = z.object({
  user_id: z.number().int().positive(),
  name: z.string(),
});

const VisitRecordResponseSchema = z.object({
  visit_id: z.number().int().positive(),
  customer: CustomerSummarySchema,
  content: z.string(),
  visit_order: z.number().int().positive(),
});

const CommentSummarySchema = z.object({
  comment_id: z.number().int().positive(),
  user: UserSummarySchema,
  content: z.string(),
  created_at: z.string().datetime(),
});

export const ReportDetailSchema = z.object({
  report_id: z.number().int().positive(),
  report_date: z.string().date(),
  user: UserSummarySchema.extend({ department: z.string() }),
  visit_records: z.array(VisitRecordResponseSchema),
  problem: z.string().nullable().optional(),
  plan: z.string().nullable().optional(),
  comments: z.array(CommentSummarySchema),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const ReportSummarySchema = z.object({
  report_id: z.number().int().positive(),
  report_date: z.string().date(),
  user: UserSummarySchema,
  visit_count: z.number().int().nonnegative(),
  comment_count: z.number().int().nonnegative(),
  unread_comment_count: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});

export const GetReportsResponseSchema = apiResponse(
  z.object({
    reports: z.array(ReportSummarySchema),
    pagination: PaginationSchema,
  })
);

export const ReportDetailResponseSchema = apiResponse(ReportDetailSchema);

export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;
export type UpdateReportRequest = z.infer<typeof UpdateReportRequestSchema>;
export type GetReportsQuery = z.infer<typeof GetReportsQuerySchema>;
export type ReportDetail = z.infer<typeof ReportDetailSchema>;
export type GetReportsResponse = z.infer<typeof GetReportsResponseSchema>;
export type ReportDetailResponse = z.infer<typeof ReportDetailResponseSchema>;
