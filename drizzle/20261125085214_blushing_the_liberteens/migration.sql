CREATE TABLE `dns_records` (
	`hostname` text PRIMARY KEY,
	`zone_id` text,
	`record_id` text,
	`tunnel_id` text,
	`failure` text,
	`failure_details` text
);
