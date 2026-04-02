CREATE TABLE `rate_limits` (
	`ip` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_lookup_idx` ON `rate_limits` (`ip`,`action`,`created_at`);