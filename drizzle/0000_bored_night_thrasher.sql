CREATE TABLE `build_images` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `build_image_created_at_index` ON `build_images` (`created_at`);--> statement-breakpoint
CREATE TABLE `environment_variables` (
	`service_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`service_id`, `key`),
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `global_variables` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`repo` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`image_id` text,
	`container_id` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_created_at_index` ON `services` (`created_at`);--> statement-breakpoint
CREATE TABLE `ports` (
	`service_id` text NOT NULL,
	`external` integer NOT NULL,
	`internal` integer NOT NULL,
	PRIMARY KEY(`service_id`, `external`),
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `volumes` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`container_path` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `networks` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `service_links` (
	`client_id` text NOT NULL,
	`provider_id` text NOT NULL,
	PRIMARY KEY(`client_id`, `provider_id`),
	FOREIGN KEY (`client_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
