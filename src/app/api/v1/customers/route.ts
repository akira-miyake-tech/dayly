import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { checkTokenRevoked } from "@/lib/checkRevoked";
import { GetCustomersQuerySchema, CustomerRequestSchema } from "@/lib/schemas/customers.schema";
import {
  successResponse,
  forbiddenResponse,
  validationErrorResponse,
  internalServerErrorResponse,
} from "@/lib/response";

/**
 * GET /api/v1/customers — 顧客一覧取得（全ロール）
 * Issue #16
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    getAuthUser(req); // 認証確認のみ（ロール不問）

    const searchParams = req.nextUrl.searchParams;
    const rawQuery = {
      q: searchParams.get("q") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      per_page: searchParams.get("per_page") ?? undefined,
    };

    const queryResult = GetCustomersQuerySchema.safeParse(rawQuery);
    if (!queryResult.success) {
      const details = queryResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return validationErrorResponse(details);
    }

    const { q, page, per_page } = queryResult.data;

    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { companyName: { contains: q } },
          ],
        }
      : {};

    const total = await prisma.customer.count({ where });
    const totalPages = Math.ceil(total / per_page);

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { companyName: "asc" },
      skip: (page - 1) * per_page,
      take: per_page,
    });

    return successResponse({
      customers: customers.map((c) => ({
        customer_id: c.customerId,
        name: c.name,
        company_name: c.companyName,
        phone: c.phone ?? null,
        address: c.address ?? null,
      })),
      pagination: {
        total,
        page,
        per_page,
        total_pages: totalPages,
      },
    });
  } catch (error) {
    console.error("GET /customers error:", error);
    return internalServerErrorResponse();
  }
}

/**
 * POST /api/v1/customers — 顧客登録（上長のみ）
 * Issue #17
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const revokedCheck = await checkTokenRevoked(req);
    if (revokedCheck) return revokedCheck;

    const user = getAuthUser(req);

    // 上長のみ登録可能
    if (user.role !== "manager") {
      return forbiddenResponse("顧客の登録は上長のみ可能です");
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

    const customer = await prisma.customer.create({
      data: {
        name,
        companyName: company_name,
        phone: phone ?? null,
        address: address ?? null,
      },
    });

    return successResponse(formatCustomer(customer), 201);
  } catch (error) {
    console.error("POST /customers error:", error);
    return internalServerErrorResponse();
  }
}

export function formatCustomer(c: {
  customerId: number;
  name: string;
  companyName: string;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    customer_id: c.customerId,
    name: c.name,
    company_name: c.companyName,
    phone: c.phone ?? null,
    address: c.address ?? null,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}
