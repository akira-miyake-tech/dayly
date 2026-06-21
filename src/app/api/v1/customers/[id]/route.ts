import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { checkTokenRevoked } from "@/lib/checkRevoked";
import { CustomerRequestSchema } from "@/lib/schemas/customers.schema";
import {
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  validationErrorResponse,
  internalServerErrorResponse,
} from "@/lib/response";
import { formatCustomer } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/customers/:id — 顧客詳細取得（全ロール）
 * Issue #18
 */
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    getAuthUser(req); // 認証確認のみ（ロール不問）

    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return notFoundResponse("顧客が見つかりません");
    }

    const customer = await prisma.customer.findUnique({ where: { customerId } });
    if (!customer) {
      return notFoundResponse("顧客が見つかりません");
    }

    return successResponse(formatCustomer(customer));
  } catch (error) {
    console.error("GET /customers/:id error:", error);
    return internalServerErrorResponse();
  }
}

/**
 * PUT /api/v1/customers/:id — 顧客更新（上長のみ）
 * Issue #19
 */
export async function PUT(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長のみ更新可能
    if (user.role !== "manager") {
      return forbiddenResponse("顧客の更新は上長のみ可能です");
    }

    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return notFoundResponse("顧客が見つかりません");
    }

    const existing = await prisma.customer.findUnique({ where: { customerId } });
    if (!existing) {
      return notFoundResponse("顧客が見つかりません");
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return validationErrorResponse([{ field: "body", message: "リクエストボディが必要です" }]);
    }

    const parseResult = CustomerRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { name, company_name, phone, address } = parseResult.data;

    const updated = await prisma.customer.update({
      where: { customerId },
      data: {
        name,
        companyName: company_name,
        phone: phone ?? null,
        address: address ?? null,
      },
    });

    return successResponse(formatCustomer(updated));
  } catch (error) {
    console.error("PUT /customers/:id error:", error);
    return internalServerErrorResponse();
  }
}

/**
 * DELETE /api/v1/customers/:id — 顧客削除（上長のみ、訪問記録ありは409）
 * Issue #20
 */
export async function DELETE(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長のみ削除可能
    if (user.role !== "manager") {
      return forbiddenResponse("顧客の削除は上長のみ可能です");
    }

    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return notFoundResponse("顧客が見つかりません");
    }

    const existing = await prisma.customer.findUnique({ where: { customerId } });
    if (!existing) {
      return notFoundResponse("顧客が見つかりません");
    }

    // 訪問記録が紐づいている場合は409
    const visitCount = await prisma.visitRecord.count({ where: { customerId } });
    if (visitCount > 0) {
      return conflictResponse("この顧客には訪問記録が紐づいているため削除できません");
    }

    await prisma.customer.delete({ where: { customerId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /customers/:id error:", error);
    return internalServerErrorResponse();
  }
}
