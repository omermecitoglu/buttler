ALTER TABLE `services` ADD `repo` text NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `status` text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `image_id` text;--> statement-breakpoint
ALTER TABLE `services` ADD `container_id` text;