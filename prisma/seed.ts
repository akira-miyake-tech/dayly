import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ユーザーを作成
  const passwordHash = await bcrypt.hash("password123", 10);

  const yamada = await prisma.user.upsert({
    where: { email: "yamada@test.com" },
    update: {},
    create: {
      userId: 1,
      name: "山田 太郎",
      email: "yamada@test.com",
      passwordHash,
      role: "sales",
      department: "東日本営業部",
    },
  });

  const suzuki = await prisma.user.upsert({
    where: { email: "suzuki@test.com" },
    update: {},
    create: {
      userId: 2,
      name: "鈴木 一郎",
      email: "suzuki@test.com",
      passwordHash,
      role: "sales",
      department: "西日本営業部",
    },
  });

  const sato = await prisma.user.upsert({
    where: { email: "sato@test.com" },
    update: {},
    create: {
      userId: 3,
      name: "佐藤 部長",
      email: "sato@test.com",
      passwordHash,
      role: "manager",
      department: "営業本部",
    },
  });

  // 顧客を作成
  const customerAlpha = await prisma.customer.upsert({
    where: { customerId: 1 },
    update: {},
    create: {
      customerId: 1,
      name: "田中 様",
      companyName: "株式会社アルファ",
      phone: "03-0000-0001",
      address: "東京都千代田区...",
    },
  });

  const customerBeta = await prisma.customer.upsert({
    where: { customerId: 2 },
    update: {},
    create: {
      customerId: 2,
      name: "伊藤 様",
      companyName: "ベータ商事",
      phone: "03-0000-0002",
      address: "東京都港区...",
    },
  });

  // 日報を作成 (過去日・編集削除不可)
  const report1 = await prisma.dailyReport.upsert({
    where: { reportId: 1 },
    update: {},
    create: {
      reportId: 1,
      userId: yamada.userId,
      reportDate: new Date("2026-05-20"),
      problem: "テスト用課題",
      plan: "テスト用プラン",
    },
  });

  await prisma.visitRecord.createMany({
    data: [
      {
        reportId: report1.reportId,
        customerId: customerAlpha.customerId,
        content: "テスト訪問内容1",
        visitOrder: 1,
      },
    ],
    skipDuplicates: true,
  });

  // 山田以外のユーザー（鈴木）の日報
  const report2 = await prisma.dailyReport.upsert({
    where: { reportId: 2 },
    update: {},
    create: {
      reportId: 2,
      userId: suzuki.userId,
      reportDate: new Date("2026-05-20"),
      problem: "テスト用課題2",
      plan: "テスト用プラン2",
    },
  });

  await prisma.visitRecord.createMany({
    data: [
      {
        reportId: report2.reportId,
        customerId: customerBeta.customerId,
        content: "テスト訪問内容2",
        visitOrder: 1,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seeded users:", { yamada, suzuki, sato });
  console.log("Seeded customers:", { customerAlpha, customerBeta });
  console.log("Seeded reports:", { report1, report2 });
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
