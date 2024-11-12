PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ports` (
	`service_id` text NOT NULL,
	`external` integer NOT NULL,
	`internal` integer NOT NULL,
	PRIMARY KEY(`service_id`, `external`),
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ports`("service_id", "external", "internal") SELECT "service_id", "external", "internal" FROM `ports`;--> statement-breakpoint
DROP TABLE `ports`;--> statement-breakpoint
ALTER TABLE `__new_ports` RENAME TO `ports`;--> statement-breakpoint
PRAGMA foreign_keys=ON;