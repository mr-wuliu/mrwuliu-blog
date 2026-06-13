ALTER TABLE `comments` ADD `notify_on_reply` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `comments` ADD `reply_notified` integer DEFAULT false NOT NULL;