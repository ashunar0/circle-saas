import { z } from "zod";

export const createOrgInput = z.object({
  name: z.string().min(1, "サークル名は必須"),
  slug: z
    .string()
    .min(1, "slug は必須")
    .regex(/^[a-z0-9-]+$/, "英小文字・数字・ハイフンのみ"),
});

export type CreateOrgInput = z.infer<typeof createOrgInput>;
