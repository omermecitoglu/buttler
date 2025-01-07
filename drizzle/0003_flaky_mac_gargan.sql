PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_networks` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`service_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_networks`("id", "kind", "service_id") SELECT "id", "kind", "service_id" FROM `networks`;--> statement-breakpoint
DROP TABLE `networks`;--> statement-breakpoint
ALTER TABLE `__new_networks` RENAME TO `networks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;