CREATE TABLE `service_links` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`provider_id` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
