CREATE TABLE `site_analytics` (
	`date` text NOT NULL,
	`lang` text NOT NULL,
	`page_views` integer DEFAULT 0 NOT NULL,
	`unique_visitors` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`date`, `lang`)
);
--> statement-breakpoint
CREATE INDEX `site_analytics_date_idx` ON `site_analytics` (`date`);--> statement-breakpoint
CREATE TABLE `site_visitor_events` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`lang` text NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_visitor_events_unique` ON `site_visitor_events` (`date`,`lang`,`ip_hash`);--> statement-breakpoint
CREATE INDEX `site_visitor_events_date_idx` ON `site_visitor_events` (`date`);