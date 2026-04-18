CREATE TABLE `collection_posts` (
	`collection_id` text NOT NULL,
	`post_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`collection_id`, `post_id`),
	FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cp_collection_idx` ON `collection_posts` (`collection_id`);--> statement-breakpoint
CREATE INDEX `cp_post_idx` ON `collection_posts` (`post_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`description_en` text DEFAULT '',
	`cover_image_key` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_unique` ON `collections` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_idx` ON `collections` (`slug`);--> statement-breakpoint
CREATE INDEX `collections_status_idx` ON `collections` (`status`);--> statement-breakpoint
CREATE INDEX `collections_sort_order_idx` ON `collections` (`sort_order`);