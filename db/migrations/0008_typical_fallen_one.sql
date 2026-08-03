CREATE TABLE `password_resets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_resets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `reset_hash_idx` ON `password_resets` (`token_hash`);