CREATE INDEX `posts_created_at_idx` ON `posts` (`created_at`);--> statement-breakpoint
CREATE INDEX `posts_public_list_idx` ON `posts` (`status`,`hidden`,`pinned`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_feed_idx` ON `posts` (`status`,`hidden`,`published_at`);