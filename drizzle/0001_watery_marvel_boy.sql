CREATE TABLE `course` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`difficulty` text NOT NULL,
	`estimated_hours` integer,
	`thumbnail_url` text,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_by_id` text,
	`updated_by_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_slug_unique` ON `course` (`slug`);--> statement-breakpoint
CREATE INDEX `course_difficulty_idx` ON `course` (`difficulty`);--> statement-breakpoint
CREATE INDEX `course_published_idx` ON `course` (`is_published`);--> statement-breakpoint
CREATE TABLE `course_enrollment` (
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`current_lesson_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`started_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `course_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`current_lesson_id`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `course_enrollment_course_idx` ON `course_enrollment` (`course_id`);--> statement-breakpoint
CREATE INDEX `course_enrollment_status_idx` ON `course_enrollment` (`status`);--> statement-breakpoint
CREATE INDEX `course_enrollment_current_lesson_idx` ON `course_enrollment` (`current_lesson_id`);--> statement-breakpoint
CREATE TABLE `course_tag` (
	`course_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`course_id`, `tag_id`),
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `course_tag_tag_idx` ON `course_tag` (`tag_id`);--> statement-breakpoint
CREATE TABLE `lesson` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content` text,
	`video_url` text,
	`materials` text DEFAULT '[]' NOT NULL,
	`assignment_prompt` text,
	`duration_minutes` integer,
	`position` integer NOT NULL,
	`is_preview` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_course_slug_unique` ON `lesson` (`course_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `lesson_course_position_unique` ON `lesson` (`course_id`,`position`);--> statement-breakpoint
CREATE INDEX `lesson_course_idx` ON `lesson` (`course_id`);--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`user_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`course_id` text NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`assignment_answer` text,
	`quiz_score_percent` integer,
	`last_viewed_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `lesson_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lesson_progress_course_idx` ON `lesson_progress` (`course_id`);--> statement-breakpoint
CREATE INDEX `lesson_progress_status_idx` ON `lesson_progress` (`status`);--> statement-breakpoint
CREATE TABLE `opportunity` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`format` text NOT NULL,
	`provider_name` text NOT NULL,
	`location` text,
	`country` text,
	`city` text,
	`min_grade` integer,
	`max_grade` integer,
	`min_age` integer,
	`max_age` integer,
	`deadline_at` integer NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`apply_url` text NOT NULL,
	`requirements` text DEFAULT '[]' NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_published` integer DEFAULT false NOT NULL,
	`created_by_id` text,
	`updated_by_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`updated_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opportunity_slug_unique` ON `opportunity` (`slug`);--> statement-breakpoint
CREATE INDEX `opportunity_category_idx` ON `opportunity` (`category`);--> statement-breakpoint
CREATE INDEX `opportunity_format_idx` ON `opportunity` (`format`);--> statement-breakpoint
CREATE INDEX `opportunity_deadline_idx` ON `opportunity` (`deadline_at`);--> statement-breakpoint
CREATE INDEX `opportunity_grade_range_idx` ON `opportunity` (`min_grade`,`max_grade`);--> statement-breakpoint
CREATE INDEX `opportunity_published_idx` ON `opportunity` (`is_published`);--> statement-breakpoint
CREATE TABLE `opportunity_tag` (
	`opportunity_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`opportunity_id`, `tag_id`),
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunity`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `opportunity_tag_tag_idx` ON `opportunity_tag` (`tag_id`);--> statement-breakpoint
CREATE TABLE `quiz_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`score_percent` integer NOT NULL,
	`correct_answers` integer NOT NULL,
	`total_questions` integer NOT NULL,
	`answers` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quiz_attempt_user_idx` ON `quiz_attempt` (`user_id`);--> statement-breakpoint
CREATE INDEX `quiz_attempt_lesson_idx` ON `quiz_attempt` (`lesson_id`);--> statement-breakpoint
CREATE TABLE `quiz_option` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`label` text NOT NULL,
	`is_correct` integer DEFAULT false NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `quiz_question`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quiz_option_question_position_unique` ON `quiz_option` (`question_id`,`position`);--> statement-breakpoint
CREATE INDEX `quiz_option_question_idx` ON `quiz_option` (`question_id`);--> statement-breakpoint
CREATE TABLE `quiz_question` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`type` text NOT NULL,
	`prompt` text NOT NULL,
	`explanation` text,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lesson`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quiz_question_lesson_position_unique` ON `quiz_question` (`lesson_id`,`position`);--> statement-breakpoint
CREATE INDEX `quiz_question_lesson_idx` ON `quiz_question` (`lesson_id`);--> statement-breakpoint
CREATE TABLE `saved_opportunity` (
	`user_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`status` text DEFAULT 'saved' NOT NULL,
	`reminder_at` integer,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `opportunity_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `opportunity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_opportunity_opportunity_idx` ON `saved_opportunity` (`opportunity_id`);--> statement-breakpoint
CREATE INDEX `saved_opportunity_status_idx` ON `saved_opportunity` (`status`);--> statement-breakpoint
CREATE INDEX `saved_opportunity_reminder_idx` ON `saved_opportunity` (`reminder_at`);--> statement-breakpoint
CREATE TABLE `student_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'student' NOT NULL,
	`grade` integer,
	`country` text DEFAULT 'Kazakhstan' NOT NULL,
	`city` text,
	`locale` text DEFAULT 'en' NOT NULL,
	`timezone` text DEFAULT 'Asia/Almaty' NOT NULL,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `student_profile_role_idx` ON `student_profile` (`role`);--> statement-breakpoint
CREATE INDEX `student_profile_grade_idx` ON `student_profile` (`grade`);--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`color` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_slug_unique` ON `tag` (`slug`);--> statement-breakpoint
CREATE INDEX `tag_kind_idx` ON `tag` (`kind`);--> statement-breakpoint
CREATE TABLE `user_tag_preference` (
	`user_id` text NOT NULL,
	`tag_id` text NOT NULL,
	`preference_type` text NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `tag_id`, `preference_type`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_tag_preference_tag_idx` ON `user_tag_preference` (`tag_id`);