CREATE TABLE `friend_links` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`url` text NOT NULL,
	`avatar` text,
	`description` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '',
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `friend_links_status_idx` ON `friend_links` (`status`);--> statement-breakpoint
CREATE INDEX `friend_links_sort_order_idx` ON `friend_links` (`sort_order`);