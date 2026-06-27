CREATE TABLE `write_off_request` (
	`id` text PRIMARY KEY NOT NULL,
	`submitter_id` text NOT NULL,
	`location_id` text NOT NULL,
	`product_type` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`deduction_type` text NOT NULL,
	`charged_employee_id` text,
	`comment` text NOT NULL,
	`photo_data_url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewer_id` text,
	`review_comment` text,
	`reviewed_at` integer,
	`iiko_sync_status` text DEFAULT 'not_started' NOT NULL,
	`iiko_document_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`submitter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`charged_employee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `write_off_request_submitter_idx` ON `write_off_request` (`submitter_id`);--> statement-breakpoint
CREATE INDEX `write_off_request_location_idx` ON `write_off_request` (`location_id`);--> statement-breakpoint
CREATE INDEX `write_off_request_status_idx` ON `write_off_request` (`status`);--> statement-breakpoint
CREATE INDEX `write_off_request_created_at_idx` ON `write_off_request` (`created_at`);