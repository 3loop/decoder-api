CREATE TABLE `contractAbi` (
	`address` text,
	`chain` integer,
	`abi` text,
	PRIMARY KEY(`address`, `chain`)
);
--> statement-breakpoint
CREATE TABLE `contractFragments` (
	`signature` text,
	`fragment` text,
	`type` text
);
--> statement-breakpoint
CREATE TABLE `contractMeta` (
	`address` text,
	`chain` integer,
	`contractName` text,
	`tokenSymbol` text,
	`decimals` integer,
	`type` text,
	PRIMARY KEY(`address`, `chain`)
);
