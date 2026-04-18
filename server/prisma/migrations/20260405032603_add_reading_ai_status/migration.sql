-- AlterTable
ALTER TABLE `readings` ADD COLUMN `ai_completed_at` DATETIME(3) NULL,
    ADD COLUMN `ai_error` TEXT NULL,
    ADD COLUMN `ai_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';
