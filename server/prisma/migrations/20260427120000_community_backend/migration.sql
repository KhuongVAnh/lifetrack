-- AlterEnum: add community notification types.
ALTER TABLE `notifications`
  MODIFY `type` ENUM(
    'ALERT',
    'ACCESS_REQUEST',
    'ACCESS_RESPONSE',
    'ACCESS_REVOKE',
    'DIRECT_MESSAGE',
    'MEDICATION_REMINDER',
    'APPOINTMENT_UPDATE',
    'COMMUNITY_ANSWER',
    'COMMUNITY_COMMENT'
  ) NOT NULL;

-- CreateTable: public health knowledge articles.
CREATE TABLE `community_articles` (
  `article_id` INTEGER NOT NULL AUTO_INCREMENT,
  `author_id` INTEGER NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `excerpt` TEXT NOT NULL,
  `content` TEXT NOT NULL,
  `cover_image_url` VARCHAR(500) NULL,
  `read_time` VARCHAR(50) NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'HIDDEN') NOT NULL DEFAULT 'PUBLISHED',
  `published_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `community_articles_slug_key`(`slug`),
  INDEX `community_articles_status_published_at_article_id_idx`(`status`, `published_at`, `article_id`),
  INDEX `community_articles_category_status_published_at_idx`(`category`, `status`, `published_at`),
  INDEX `community_articles_author_id_status_idx`(`author_id`, `status`),
  PRIMARY KEY (`article_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: patient/family community questions.
CREATE TABLE `community_questions` (
  `question_id` INTEGER NOT NULL AUTO_INCREMENT,
  `author_id` INTEGER NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NOT NULL,
  `tags` JSON NULL,
  `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
  `status` ENUM('OPEN', 'ANSWERED', 'HIDDEN') NOT NULL DEFAULT 'OPEN',
  `share_count` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `community_questions_status_created_at_question_id_idx`(`status`, `created_at`, `question_id`),
  INDEX `community_questions_author_id_status_created_at_idx`(`author_id`, `status`, `created_at`),
  PRIMARY KEY (`question_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: doctor/admin answers on questions.
CREATE TABLE `community_answers` (
  `answer_id` INTEGER NOT NULL AUTO_INCREMENT,
  `question_id` INTEGER NOT NULL,
  `author_id` INTEGER NOT NULL,
  `body` TEXT NOT NULL,
  `is_preferred` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `community_answers_question_id_is_preferred_created_at_idx`(`question_id`, `is_preferred`, `created_at`),
  INDEX `community_answers_author_id_created_at_idx`(`author_id`, `created_at`),
  PRIMARY KEY (`answer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: user comments under questions.
CREATE TABLE `community_comments` (
  `comment_id` INTEGER NOT NULL AUTO_INCREMENT,
  `question_id` INTEGER NOT NULL,
  `author_id` INTEGER NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `community_comments_question_id_created_at_comment_id_idx`(`question_id`, `created_at`, `comment_id`),
  INDEX `community_comments_author_id_created_at_idx`(`author_id`, `created_at`),
  PRIMARY KEY (`comment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: one reaction per user per question.
CREATE TABLE `community_question_reactions` (
  `reaction_id` INTEGER NOT NULL AUTO_INCREMENT,
  `question_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `type` ENUM('LIKE', 'DISLIKE') NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `community_question_reactions_question_id_user_id_key`(`question_id`, `user_id`),
  INDEX `community_question_reactions_question_id_type_idx`(`question_id`, `type`),
  INDEX `community_question_reactions_user_id_created_at_idx`(`user_id`, `created_at`),
  PRIMARY KEY (`reaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: Cloudinary metadata for question attachments.
CREATE TABLE `community_attachments` (
  `attachment_id` INTEGER NOT NULL AUTO_INCREMENT,
  `question_id` INTEGER NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `secure_url` VARCHAR(500) NULL,
  `public_id` VARCHAR(255) NULL,
  `resource_type` VARCHAR(50) NULL,
  `format` VARCHAR(50) NULL,
  `bytes` INTEGER NULL,
  `original_name` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `community_attachments_question_id_idx`(`question_id`),
  PRIMARY KEY (`attachment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `community_articles`
  ADD CONSTRAINT `community_articles_author_id_fkey`
  FOREIGN KEY (`author_id`) REFERENCES `users`(`user_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_questions`
  ADD CONSTRAINT `community_questions_author_id_fkey`
  FOREIGN KEY (`author_id`) REFERENCES `users`(`user_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_answers`
  ADD CONSTRAINT `community_answers_question_id_fkey`
  FOREIGN KEY (`question_id`) REFERENCES `community_questions`(`question_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_answers`
  ADD CONSTRAINT `community_answers_author_id_fkey`
  FOREIGN KEY (`author_id`) REFERENCES `users`(`user_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_comments`
  ADD CONSTRAINT `community_comments_question_id_fkey`
  FOREIGN KEY (`question_id`) REFERENCES `community_questions`(`question_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_comments`
  ADD CONSTRAINT `community_comments_author_id_fkey`
  FOREIGN KEY (`author_id`) REFERENCES `users`(`user_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_question_reactions`
  ADD CONSTRAINT `community_question_reactions_question_id_fkey`
  FOREIGN KEY (`question_id`) REFERENCES `community_questions`(`question_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_question_reactions`
  ADD CONSTRAINT `community_question_reactions_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `community_attachments`
  ADD CONSTRAINT `community_attachments_question_id_fkey`
  FOREIGN KEY (`question_id`) REFERENCES `community_questions`(`question_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
