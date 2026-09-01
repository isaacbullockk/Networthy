ALTER TABLE `users` ADD COLUMN `email_verified_at` timestamp;
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `verify_hash_idx` ON `email_verifications` (`token_hash`);
--> statement-breakpoint
-- Only platform-owned demo inboxes (launch content, no real mailbox) are
-- grandfathered. Every human user must verify their own inbox via the
-- resend flow — the guest preview borrows the showcase recruiter's view.
UPDATE `users` SET `email_verified_at` = NOW() WHERE `email` IN ('lisa@picnic.nl', 'mark@bol.com');
