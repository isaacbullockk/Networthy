ALTER TABLE `matches` ADD COLUMN `talent_consent` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending';
--> statement-breakpoint
-- Grandfather existing matches: they were created under the old semantics where
-- a connect was mutual by action. Only NEW requests start as pending.
UPDATE `matches` SET `talent_consent` = 'accepted';
