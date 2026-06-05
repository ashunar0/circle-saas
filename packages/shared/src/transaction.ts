export const transactionTypes = ["expense", "direct", "income"] as const;
export type TransactionType = (typeof transactionTypes)[number];

export const transactionStatuses = [
  "pending",
  "approved",
  "paid",
  "rejected",
  "recorded",
] as const;
export type TransactionStatus = (typeof transactionStatuses)[number];

export const expenseStatuses = [
  "pending",
  "approved",
  "paid",
  "rejected",
] as const satisfies readonly TransactionStatus[];
export type ExpenseStatus = (typeof expenseStatuses)[number];

export const transactionActions = [
  "create",
  "approve",
  "reject",
  "pay",
  "resubmit",
] as const;
export type TransactionAction = (typeof transactionActions)[number];
