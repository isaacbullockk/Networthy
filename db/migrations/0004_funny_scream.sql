ALTER TABLE `users` MODIFY COLUMN `role` enum('talent','recruiter','assessor','admin') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `approved_at` timestamp;