CREATE TABLE `post_stats` (
	`post_id` text PRIMARY KEY NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`unique_view_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_stats_view_count_idx` ON `post_stats` (`view_count`);--> statement-breakpoint
CREATE TABLE `post_view_events` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`ip_hash` text NOT NULL,
	`user_agent_hash` text NOT NULL,
	`country` text,
	`referrer_host` text,
	`view_date` text DEFAULT (date('now')) NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_view_events_post_id_idx` ON `post_view_events` (`post_id`);--> statement-breakpoint
CREATE INDEX `post_view_events_view_date_idx` ON `post_view_events` (`view_date`);--> statement-breakpoint
CREATE INDEX `post_view_events_ip_hash_idx` ON `post_view_events` (`ip_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `post_view_events_unique_daily` ON `post_view_events` (`post_id`,`ip_hash`,`user_agent_hash`,`view_date`);--> statement-breakpoint
ALTER TABLE `comments` ADD `ip_hash` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `ip_masked` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `country` text;--> statement-breakpoint
ALTER TABLE `comments` ADD `user_agent` text;--> statement-breakpoint
CREATE INDEX `comments_ip_hash_idx` ON `comments` (`ip_hash`);