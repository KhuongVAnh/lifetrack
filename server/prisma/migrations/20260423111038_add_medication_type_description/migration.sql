-- AlterTable
ALTER TABLE `doctor_profile_educations` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `doctor_profile_experiences` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `doctor_profile_researches` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `doctor_reviews` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `medications` ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NULL;
