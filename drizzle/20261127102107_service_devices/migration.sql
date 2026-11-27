CREATE TABLE `devices` (
	`service_id` text NOT NULL,
	`kind` text NOT NULL,
	CONSTRAINT `devices_pk` PRIMARY KEY(`service_id`, `kind`),
	CONSTRAINT `fk_devices_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE RESTRICT ON DELETE CASCADE
);
