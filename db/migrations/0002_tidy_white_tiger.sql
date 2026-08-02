CREATE TABLE `connection_contracts` (
	`match_id` bigint unsigned NOT NULL,
	`expectations` text NOT NULL,
	`commitments` text NOT NULL,
	`talent_confirmed_at` timestamp,
	`recruiter_confirmed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `connection_contracts_match_id` PRIMARY KEY(`match_id`)
);
--> statement-breakpoint
CREATE TABLE `retention_pulses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`match_id` bigint unsigned NOT NULL,
	`day_point` int NOT NULL,
	`respondent` enum('talent','recruiter') NOT NULL,
	`expectations` int NOT NULL,
	`belonging` int NOT NULL,
	`momentum` int NOT NULL,
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `retention_pulses_id` PRIMARY KEY(`id`),
	CONSTRAINT `pulse_unique` UNIQUE(`match_id`,`day_point`,`respondent`)
);
--> statement-breakpoint
ALTER TABLE `matches` ADD `hired_at` timestamp;--> statement-breakpoint
ALTER TABLE `matches` ADD `buddy_talent_id` bigint unsigned;--> statement-breakpoint
CREATE INDEX `pulse_match_idx` ON `retention_pulses` (`match_id`);