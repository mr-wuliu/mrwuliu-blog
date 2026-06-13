CREATE TABLE IF NOT EXISTS `email_otps` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_otps_email_idx` ON `email_otps` (`email`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `email_otps_expires_idx` ON `email_otps` (`expires_at`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`user_agent` text,
	`ip_hash` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `refresh_tokens_user_id_idx` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `refresh_tokens_token_hash_idx` ON `refresh_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`email_verified_at` text,
	`last_login_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `users_status_idx` ON `users` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `comments_user_id_idx` ON `comments` (`user_id`);--> statement-breakpoint
INSERT OR IGNORE INTO `users` (`id`, `email`, `name`, `created_at`, `updated_at`)
SELECT
  lower(hex(randomblob(16))),
  lower(`author_email`),
  (SELECT `author_name` FROM `comments` c2
   WHERE lower(c2.`author_email`) = lower(`comments`.`author_email`)
   ORDER BY `created_at` DESC LIMIT 1),
  datetime('now'),
  datetime('now')
FROM `comments`
WHERE `author_email` IS NOT NULL AND `author_email` != ''
GROUP BY lower(`author_email`);--> statement-breakpoint
UPDATE `comments`
SET `user_id` = (
  SELECT `u`.`id` FROM `users` `u` WHERE lower(`u`.`email`) = lower(`comments`.`author_email`)
)
WHERE `author_email` IS NOT NULL AND `author_email` != ''
  AND `user_id` IS NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `site_config` (`key`, `value`, `updated_at`)
VALUES ('comment_anonymous_auto_approve', 'false', datetime('now'));--> statement-breakpoint
INSERT OR IGNORE INTO `site_config` (`key`, `value`, `updated_at`)
VALUES ('comment_registered_auto_approve', 'true', datetime('now'));
