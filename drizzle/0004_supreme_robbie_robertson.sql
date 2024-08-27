CREATE TABLE `build_images` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `build_image_created_at_index` ON `build_images` (`created_at`);