CREATE TABLE `email_otps` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `email_otps_email_idx` ON `email_otps` (`email`);--> statement-breakpoint
CREATE INDEX `email_otps_expires_idx` ON `email_otps` (`expires_at`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`user_agent` text,
	`ip_hash` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `refresh_tokens_user_id_idx` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_token_hash_idx` ON `refresh_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`email_verified_at` text,
	`last_login_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);--> statement-breakpoint
ALTER TABLE `comments` ADD `user_id` text;--> statement-breakpoint
CREATE INDEX `comments_user_id_idx` ON `comments` (`user_id`);--> statement-breakpoint
--> Data migration: create user accounts from unique comment author emails
INSERT INTO `users` (`id`, `email`, `name`, `role`, `status`, `created_at`, `updated_at`)
SELECT
  lower(hex(randomblob(16))),
  lower(`author_email`),
  `author_name`,
  'user',
  'active',
  datetime('now'),
  datetime('now')
FROM `comments`
WHERE `author_email` IS NOT NULL AND `author_email` != ''
GROUP BY lower(`author_email`)
HAVING MIN(rowid);--> statement-breakpoint
--> Link existing comments to newly created users
UPDATE `comments`
SET `user_id` = (
  SELECT `u`.`id` FROM `users` `u`
  WHERE lower(`u`.`email`) = lower(`comments`.`author_email`)
)
WHERE `author_email` IS NOT NULL AND `author_email` != '';--> statement-breakpoint
--> Migrate config: split comment_auto_approve into anonymous/registered variants
INSERT INTO `site_config` (`key`, `value`, `updated_at`)
SELECT 'comment_anonymous_auto_approve', 'false', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM `site_config` WHERE `key` = 'comment_anonymous_auto_approve');--> statement-breakpoint
INSERT INTO `site_config` (`key`, `value`, `updated_at`)
SELECT 'comment_registered_auto_approve', 'true', datetime('now')
WHERE NOT EXISTS (SELECT 1 FROM `site_config` WHERE `key` = 'comment_registered_auto_approve');--> statement-breakpoint
INSERT INTO `users` (`id`, `email`, `name`, `created_at`, `updated_at`)
SELECT
  lower(hex(randomblob(16))),
  `author_email`,
  COALESCE(
    (SELECT `author_name` FROM `comments` c2
     WHERE c2.`author_email` = `comments`.`author_email`
     ORDER BY `created_at` DESC LIMIT 1),
    'user'
  ),
  datetime('now'),
  datetime('now')
FROM `comments`
WHERE `author_email` IS NOT NULL AND `author_email` != ''
GROUP BY `author_email`;--> statement-breakpoint
UPDATE `comments`
SET `user_id` = (
  SELECT `u`.`id` FROM `users` `u` WHERE `u`.`email` = `comments`.`author_email`
)
WHERE `author_email` IS NOT NULL AND `author_email` != '';