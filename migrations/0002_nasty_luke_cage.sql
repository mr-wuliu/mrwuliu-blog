CREATE TABLE `post_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_likes_post_id_idx` ON `post_likes` (`post_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `post_likes_unique` ON `post_likes` (`post_id`,`fingerprint`);