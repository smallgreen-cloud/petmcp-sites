CREATE TABLE `attachments` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`record_id` text NOT NULL,
	`operation` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `records` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`pet_id` text,
	`data` text NOT NULL,
	`revision` integer NOT NULL,
	`idempotency_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner`, `id`),
	FOREIGN KEY (`owner`,`pet_id`) REFERENCES `records`(`owner`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `records_idempotency` ON `records` (`owner`,`idempotency_key`);