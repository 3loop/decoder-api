CREATE TABLE `apiKeys` (
	`apiKey` text PRIMARY KEY NOT NULL,
	`organisationId` text,
	FOREIGN KEY (`organisationId`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organisations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text
);
