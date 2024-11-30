PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_global_variables` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_global_variables`("key", "value") SELECT "key", "value" FROM `global_variables`;--> statement-breakpoint
DROP TABLE `global_variables`;--> statement-breakpoint
ALTER TABLE `__new_global_variables` RENAME TO `global_variables`;--> statement-breakpoint
PRAGMA foreign_keys=ON;