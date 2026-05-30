import { z } from "zod";
import { apiResponse } from "./common.schema";

export const CreateCommentRequestSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const CommentResponseSchema = apiResponse(
  z.object({
    comment_id: z.number().int().positive(),
    report_id: z.number().int().positive(),
    user: z.object({
      user_id: z.number().int().positive(),
      name: z.string(),
    }),
    content: z.string(),
    created_at: z.string().datetime(),
  })
);

export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;
export type CommentResponse = z.infer<typeof CommentResponseSchema>;
