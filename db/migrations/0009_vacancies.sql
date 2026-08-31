CREATE TABLE `vacancies` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`recruiter_id` bigint unsigned NOT NULL,
	`title` varchar(255) NOT NULL,
	`required_skills` json NOT NULL,
	`nice_skills` json NOT NULL,
	`languages` json NOT NULL,
	`availability` varchar(255) NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vacancies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `vacancy_recruiter_idx` ON `vacancies` (`recruiter_id`);
