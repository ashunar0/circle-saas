import { z } from "zod";
import { accountKinds } from "./db";

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(50),
  kind: z.enum(accountKinds),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
