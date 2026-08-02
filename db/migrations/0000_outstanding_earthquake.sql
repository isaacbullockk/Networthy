CREATE TABLE `exchanges` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`match_id` bigint unsigned NOT NULL,
	`talent_id` bigint unsigned NOT NULL,
	`recruiter_id` bigint unsigned NOT NULL,
	`talent_teaches` varchar(500) NOT NULL,
	`recruiter_teaches` varchar(500) NOT NULL,
	`proposed_by` enum('talent','recruiter') NOT NULL,
	`status` enum('proposed','accepted','completed') NOT NULL DEFAULT 'proposed',
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exchanges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`talent_id` bigint unsigned NOT NULL,
	`recruiter_id` bigint unsigned NOT NULL,
	`company` varchar(255) NOT NULL,
	`role` varchar(255) NOT NULL,
	`stage` enum('connected','video_chat','questionnaire','in_house','hired','retained') NOT NULL DEFAULT 'connected',
	`connection_rating` int NOT NULL DEFAULT 0,
	`notes` text,
	`last_activity` varchar(10) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`talent_id` bigint unsigned NOT NULL,
	`recruiter_id` bigint unsigned NOT NULL,
	`date` varchar(10) NOT NULL,
	`time` varchar(5) NOT NULL,
	`location` varchar(500) NOT NULL,
	`agenda` text NOT NULL,
	`attendees` json NOT NULL,
	`status` enum('upcoming','done') NOT NULL DEFAULT 'upcoming',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `questionnaires` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`talent_id` bigint unsigned NOT NULL,
	`recruiter_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`purpose` varchar(500) NOT NULL,
	`status` enum('draft','sent','completed') NOT NULL DEFAULT 'draft',
	`questions` json NOT NULL,
	`answers` json,
	`sent_at` varchar(10),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `questionnaires_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `talents` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(255) NOT NULL,
	`origin` varchar(255) NOT NULL,
	`years_in_nl` int NOT NULL,
	`languages` json NOT NULL,
	`tagline` text NOT NULL,
	`story` text NOT NULL,
	`traits` json NOT NULL,
	`skills` json NOT NULL,
	`dimensions` json NOT NULL,
	`looking_for` text NOT NULL,
	`availability` varchar(255) NOT NULL,
	`video_intro_sec` int NOT NULL DEFAULT 60,
	`gradient` varchar(100) NOT NULL,
	`match_score` int NOT NULL DEFAULT 80,
	`match_reasons` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `talents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_hash` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` enum('talent','recruiter') NOT NULL,
	`company` varchar(255),
	`talent_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `ex_match_idx` ON `exchanges` (`match_id`);--> statement-breakpoint
CREATE INDEX `ex_talent_idx` ON `exchanges` (`talent_id`);--> statement-breakpoint
CREATE INDEX `ex_recruiter_idx` ON `exchanges` (`recruiter_id`);--> statement-breakpoint
CREATE INDEX `recruiter_idx` ON `matches` (`recruiter_id`);--> statement-breakpoint
CREATE INDEX `talent_idx` ON `matches` (`talent_id`);--> statement-breakpoint
CREATE INDEX `meet_talent_idx` ON `meetings` (`talent_id`);--> statement-breakpoint
CREATE INDEX `meet_recruiter_idx` ON `meetings` (`recruiter_id`);--> statement-breakpoint
CREATE INDEX `quest_talent_idx` ON `questionnaires` (`talent_id`);--> statement-breakpoint
CREATE INDEX `quest_recruiter_idx` ON `questionnaires` (`recruiter_id`);--> statement-breakpoint
CREATE INDEX `token_idx` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);