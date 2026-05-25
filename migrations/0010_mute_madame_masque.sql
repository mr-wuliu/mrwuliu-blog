ALTER TABLE `post_view_events` ADD `lang` text;--> statement-breakpoint
ALTER TABLE `post_view_events` ADD `scroll_depth` integer;--> statement-breakpoint
ALTER TABLE `post_view_events` ADD `is_bot` integer DEFAULT false NOT NULL;