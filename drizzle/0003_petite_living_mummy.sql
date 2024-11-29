CREATE TABLE `volumes` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`container_path` text,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE restrict ON DELETE cascade
);
