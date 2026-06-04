CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `categories_sort_order_idx` ON `categories` (`sort_order`);--> statement-breakpoint
CREATE TABLE `expense_events` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `expense_events_expense_id_idx` ON `expense_events` (`expense_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`amount` integer NOT NULL,
	`spent_at` integer NOT NULL,
	`category_id` text,
	`description` text,
	`receipt_key` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `expenses_user_id_idx` ON `expenses` (`user_id`);--> statement-breakpoint
CREATE INDEX `expenses_status_idx` ON `expenses` (`status`);--> statement-breakpoint
CREATE INDEX `expenses_spent_at_idx` ON `expenses` (`spent_at`);