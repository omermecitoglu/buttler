CREATE TABLE `ports` (
	`service_id` text NOT NULL,
	`key` integer NOT NULL,
	`value` integer NOT NULL,
	PRIMARY KEY(`service_id`, `key`),
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
