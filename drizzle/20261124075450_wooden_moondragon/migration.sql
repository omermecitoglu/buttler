CREATE TABLE `users` (
	`id` integer PRIMARY KEY,
	`login` text NOT NULL,
	`avatar` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_single_admin` ON `users` (`role`) WHERE role = 'admin';