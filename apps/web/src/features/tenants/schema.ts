import { z } from "zod";

export const createOrgInput = z.object({
  name: z.string().min(1, "サークル名は必須"),
});

export type CreateOrgInput = z.infer<typeof createOrgInput>;
