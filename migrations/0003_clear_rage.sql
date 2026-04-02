ALTER TABLE `posts` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `posts_hidden_idx` ON `posts` (`hidden`);--> statement-breakpoint
CREATE INDEX `posts_pinned_idx` ON `posts` (`pinned`);