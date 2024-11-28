PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_services` (
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
INSERT INTO `__new_services`("id", "kind", "name", "repo", "status", "image_id", "container_id", "created_at", "updated_at") SELECT "id", "kind", "name", "repo", "status", "image_id", "container_id", "created_at", "updated_at" FROM `services`;--> statement-breakpoint
DROP TABLE `services`;--> statement-breakpoint
ALTER TABLE `__new_services` RENAME TO `services`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `service_created_at_index` ON `services` (`created_at`);