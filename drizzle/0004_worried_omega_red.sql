CREATE TABLE `networks` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_volumes` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`container_path` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_volumes`("id", "service_id", "container_path") SELECT "id", "service_id", "container_path" FROM `volumes`;--> statement-breakpoint
DROP TABLE `volumes`;--> statement-breakpoint
ALTER TABLE `__new_volumes` RENAME TO `volumes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;