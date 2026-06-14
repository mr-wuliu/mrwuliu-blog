ALTER TABLE `users` ADD `avatar_type` text DEFAULT 'identicon' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_r2_key` text DEFAULT '' NOT NULL;