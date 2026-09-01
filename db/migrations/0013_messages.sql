CREATE TABLE `messages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`match_id` bigint unsigned NOT NULL,
	`sender_id` bigint unsigned NOT NULL,
	`body` varchar(2000) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `messages_match_fk` FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON DELETE cascade,
	CONSTRAINT `messages_sender_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `msg_match_idx` ON `messages` (`match_id`);
