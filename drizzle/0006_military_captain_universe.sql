PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_service_links` (
	`service_id` text NOT NULL,
	`provider_id` text NOT NULL,
	PRIMARY KEY(`service_id`, `provider_id`),
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_service_links`("service_id", "provider_id") SELECT "service_id", "provider_id" FROM `service_links`;--> statement-breakpoint
DROP TABLE `service_links`;--> statement-breakpoint
ALTER TABLE `__new_service_links` RENAME TO `service_links`;--> statement-breakpoint
PRAGMA foreign_keys=ON;