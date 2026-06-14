ALTER TABLE `users` ADD `avatar_seed` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_on_reply` integer DEFAULT true NOT NULL;