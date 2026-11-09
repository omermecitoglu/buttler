CREATE TABLE `environment_variables` (
	`service_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	CONSTRAINT `environment_variables_pk` PRIMARY KEY(`service_id`, `key`),
	CONSTRAINT `fk_environment_variables_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `ports` (
	`service_id` text NOT NULL,
	`external` integer NOT NULL,
	`internal` integer NOT NULL,
	CONSTRAINT `ports_pk` PRIMARY KEY(`service_id`, `external`),
	CONSTRAINT `fk_ports_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `volumes` (
	`id` text PRIMARY KEY,
	`service_id` text NOT NULL,
	`name` text NOT NULL,
	`container_path` text NOT NULL,
	CONSTRAINT `fk_volumes_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `services` ADD `type` text NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `repository` text;--> statement-breakpoint
ALTER TABLE `services` ADD `branch` text;