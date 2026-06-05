import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { createClient } from "@libsql/client";
import { centralDb } from "../db/central";
import { deleteTenantDb, provisionTenantDb } from "../db/tenant-provisioning";
import { applyTenantMigrations } from "../db/tenant-migrate";
import { seedDefaultAccounts } from "../../features/accounts/seed";
import { seedDefaultCategories } from "../../features/categories/seed";
import * as schema from "../db/schema";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is required");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  secret,
  database: drizzleAdapter(centralDb, {
    provider: "sqlite",
    schema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    organization({
      schema: {
        organization: {
          additionalFields: {
            dbName: { type: "string", required: false, input: false },
            dbUrl: { type: "string", required: false, input: false },
            dbToken: { type: "string", required: false, input: false },
            schemaVersion: { type: "number", required: false, input: false },
            lastMigratedAt: { type: "date", required: false, input: false },
          },
        },
      },
      organizationHooks: {
        beforeDeleteOrganization: async ({ organization }) => {
          // provision と symmetric に、central row を消す前に Turso DB を破棄。
          // 既に存在しない (404) 場合は黙って吸収して central row 削除を続行させる。
          const dbName = (organization as { dbName?: string }).dbName;
          if (!dbName) return;
          try {
            await deleteTenantDb(dbName);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (/not found|404/i.test(msg)) {
              console.warn(`tenant DB ${dbName} already absent on delete`);
              return;
            }
            throw err;
          }
        },
        beforeCreateOrganization: async ({ organization }) => {
          if (!organization.slug) {
            throw new Error("organization.slug is required to provision tenant DB");
          }
          const tenant = await provisionTenantDb(organization.slug);
          try {
            const { appliedVersion } = await applyTenantMigrations({
              dbUrl: tenant.dbUrl,
              authToken: tenant.dbToken,
            });
            const seedClient = createClient({
              url: tenant.dbUrl,
              authToken: tenant.dbToken,
            });
            try {
              await seedDefaultAccounts(seedClient);
              await seedDefaultCategories(seedClient);
            } finally {
              seedClient.close();
            }
            return {
              data: {
                ...organization,
                dbName: tenant.dbName,
                dbUrl: tenant.dbUrl,
                dbToken: tenant.dbToken,
                schemaVersion: appliedVersion,
                lastMigratedAt: new Date(),
              },
            };
          } catch (err) {
            await deleteTenantDb(tenant.dbName).catch((cleanupErr) => {
              console.error(
                `failed to clean up tenant DB ${tenant.dbName} after migration/seed error:`,
                cleanupErr,
              );
            });
            throw err;
          }
        },
      },
    }),
  ],
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
});
