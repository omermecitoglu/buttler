CREATE TABLE `shared_variable_names` (
	`link_id` text NOT NULL,
	`shared_variable_id` text NOT NULL,
	`name` text NOT NULL,
	CONSTRAINT `shared_variable_names_pk` PRIMARY KEY(`link_id`, `shared_variable_id`),
	CONSTRAINT `fk_shared_variable_names_link_id_service_links_id_fk` FOREIGN KEY (`link_id`) REFERENCES `service_links`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
	CONSTRAINT `fk_shared_variable_names_shared_variable_id_shared_variables_id_fk` FOREIGN KEY (`shared_variable_id`) REFERENCES `shared_variables`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `shared_variables` (
	`id` text PRIMARY KEY,
	`service_id` text NOT NULL,
	`key` text NOT NULL,
	`template` text NOT NULL,
	CONSTRAINT `fk_shared_variables_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `service_links` ADD `service_a_inherits` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `service_links` ADD `service_b_inherits` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `shared_variables_service_key_unique` ON `shared_variables` (`service_id`,`key`);