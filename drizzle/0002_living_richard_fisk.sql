CREATE TABLE `environment_variables` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`service_id` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `env_created_at_index` ON `environment_variables` (`created_at`);