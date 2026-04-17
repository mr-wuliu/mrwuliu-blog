ALTER TABLE `posts` ADD `title_en` text;--> statement-breakpoint
ALTER TABLE `posts` ADD `content_en` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `posts` ADD `excerpt_en` text DEFAULT '';