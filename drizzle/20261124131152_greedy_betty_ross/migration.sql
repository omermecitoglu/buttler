CREATE TABLE `domains` (
	`hostname` text PRIMARY KEY,
	`service_id` text NOT NULL,
	`port` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	CONSTRAINT `fk_domains_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
);
