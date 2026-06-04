import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { centralDb } from "../src/lib/db/central";
import { organization, member } from "../src/lib/auth/schema";

const SAMPLE_EXPENSES = [
  { amount: 3200, description: "新歓コンパ飲食代", catIdx: 0 },
  { amount: 540, description: "コピー用紙", catIdx: 2 },
  { amount: 1200, description: "会場往復交通費", catIdx: 1 },
] as const;

async function main() {
  const orgIdArg = process.argv[2];

  const org = orgIdArg
    ? await centralDb.query.organization.findFirst({
        where: eq(organization.id, orgIdArg),
      })
    : await centralDb.query.organization.findFirst();

  if (!org) {
    throw new Error(
      orgIdArg
        ? `organization not found: ${orgIdArg}`
        : "no organization exists; create one via the app first",
    );
  }
  if (!org.dbUrl || !org.dbToken) {
    throw new Error(`tenant DB not provisioned for ${org.slug}`);
  }

  const seedMember = await centralDb.query.member.findFirst({
    where: eq(member.organizationId, org.id),
  });
  if (!seedMember) {
    throw new Error(`no member found in ${org.slug}`);
  }

  const client = createClient({ url: org.dbUrl, authToken: org.dbToken });
  try {
    const catResult = await client.execute(
      "SELECT id, name FROM categories ORDER BY sort_order LIMIT 5",
    );
    if (catResult.rows.length === 0) {
      throw new Error(
        `categories are empty in ${org.slug}; run db:migrate:tenants first`,
      );
    }

    console.log(`Seeding ${SAMPLE_EXPENSES.length} expenses into ${org.slug}...`);
    for (const sample of SAMPLE_EXPENSES) {
      const cat = catResult.rows[sample.catIdx] ?? catResult.rows[0];
      const expenseId = randomUUID();
      const daysAgo = Math.floor(Math.random() * 14);
      const spentAt = Date.now() - 1000 * 60 * 60 * 24 * daysAgo;

      await client.execute({
        sql: `INSERT INTO expenses
              (id, user_id, amount, spent_at, category_id, description, status)
              VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
        args: [
          expenseId,
          seedMember.userId,
          sample.amount,
          spentAt,
          cat.id as string,
          sample.description,
        ],
      });
      await client.execute({
        sql: `INSERT INTO expense_events
              (id, expense_id, actor_id, action, to_status)
              VALUES (?, ?, ?, 'create', 'submitted')`,
        args: [randomUUID(), expenseId, seedMember.userId],
      });
      console.log(
        `  + ${sample.description} ${sample.amount}円 (${cat.name as string})`,
      );
    }
    console.log(`Done.`);
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
