CREATE TABLE `assessments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`talent_id` bigint unsigned NOT NULL,
	`assessor_id` bigint unsigned NOT NULL,
	`status` enum('in_progress','pending_approval','published') NOT NULL DEFAULT 'in_progress',
	`skills_verified` json NOT NULL,
	`strengths` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`submitted_at` timestamp,
	`published_at` timestamp,
	CONSTRAINT `assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_intros` (
	`talent_id` bigint unsigned NOT NULL,
	`data` longblob NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`duration_sec` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `video_intros_talent_id` PRIMARY KEY(`talent_id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('talent','recruiter','assessor') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `charter_signed_at` timestamp;--> statement-breakpoint
CREATE INDEX `assess_talent_idx` ON `assessments` (`talent_id`);--> statement-breakpoint
CREATE INDEX `assess_assessor_idx` ON `assessments` (`assessor_id`);