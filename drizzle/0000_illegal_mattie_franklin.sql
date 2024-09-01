CREATE TABLE `build_images` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `environment_variables` (
	`service_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`service_id`, `key`),
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`repo` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`image_id` text,
	`container_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ports` (
	`service_id` text NOT NULL,
	`key` integer NOT NULL,
	`value` integer NOT NULL,
	PRIMARY KEY(`service_id`, `key`),
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `build_image_created_at_index` ON `build_images` (`created_at`);--> statement-breakpoint
CREATE INDEX `service_created_at_index` ON `services` (`created_at`);