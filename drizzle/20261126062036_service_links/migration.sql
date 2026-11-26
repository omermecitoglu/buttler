CREATE TABLE `service_links` (
	`id` text PRIMARY KEY,
	`service_a_id` text NOT NULL,
	`service_b_id` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT `fk_service_links_service_a_id_services_id_fk` FOREIGN KEY (`service_a_id`) REFERENCES `services`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
	CONSTRAINT `fk_service_links_service_b_id_services_id_fk` FOREIGN KEY (`service_b_id`) REFERENCES `services`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE,
	CONSTRAINT "service_links_ordered_pair" CHECK("service_a_id" < "service_b_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_links_pair_unique` ON `service_links` (`service_a_id`,`service_b_id`);