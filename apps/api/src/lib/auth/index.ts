import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { centralDb } from "../db/central";
import { provisionTenantDb } from "../db/tenant-provisioning";
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
        beforeCreateOrganization: async ({ organization }) => {
          if (!organization.slug) {
            throw new Error("organization.slug is required to provision tenant DB");
          }
          const tenant = await provisionTenantDb(organization.slug);
          return {
            data: {
              ...organization,
              dbName: tenant.dbName,
              dbUrl: tenant.dbUrl,
              dbToken: tenant.dbToken,
            },
          };
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
