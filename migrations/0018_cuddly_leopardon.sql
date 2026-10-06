DROP INDEX `post_view_events_unique_daily`;--> statement-breakpoint
ALTER TABLE `post_view_events` ADD `view_count` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `post_view_events_unique_daily` ON `post_view_events` (`post_id`,`ip_hash`,`user_agent_hash`,`view_date`,`lang`);--> statement-breakpoint
CREATE UNIQUE INDEX `post_tags_unique` ON `post_tags` (`post_id`,`tag_id`);