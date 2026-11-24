ALTER TABLE `environment_variables` ADD `scope` text DEFAULT 'runtime' NOT NULL;--> statement-breakpoint
ALTER TABLE `environment_variables` ADD `is_secret` integer DEFAULT false NOT NULL;