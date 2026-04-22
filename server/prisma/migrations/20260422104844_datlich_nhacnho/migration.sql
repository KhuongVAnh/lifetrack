-- AlterTable
ALTER TABLE `medical_visits` ADD COLUMN `advice` TEXT NULL;

-- AlterTable
ALTER TABLE `notifications` MODIFY `type` ENUM('ALERT', 'ACCESS_REQUEST', 'ACCESS_RESPONSE', 'ACCESS_REVOKE', 'DIRECT_MESSAGE', 'MEDICATION_REMINDER', 'APPOINTMENT_UPDATE') NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `consultation_fee` INTEGER NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `appointments` (
    `appointment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `patient_id` INTEGER NOT NULL,
    `doctor_id` INTEGER NOT NULL,
    `appointment_date` DATETIME(3) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `type` ENUM('ONLINE', 'OFFLINE') NOT NULL,
    `reason` TEXT NOT NULL,
    `meeting_url` VARCHAR(500) NULL,
    `fee` INTEGER NOT NULL DEFAULT 0,
    `payment_status` ENUM('FREE', 'PENDING', 'PAID') NOT NULL DEFAULT 'FREE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`appointment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medication_plans` (
    `plan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `doctor_id` INTEGER NULL,
    `title` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medications` (
    `medication_id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `dosage` VARCHAR(191) NOT NULL,
    `times` JSON NOT NULL,

    PRIMARY KEY (`medication_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `medication_logs` (
    `log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `medication_id` INTEGER NOT NULL,
    `scheduled_time` DATETIME(3) NOT NULL,
    `taken_at` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'TAKEN', 'MISSED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',

    UNIQUE INDEX `medication_logs_medication_id_scheduled_time_key`(`medication_id`, `scheduled_time`),
    PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_plans` ADD CONSTRAINT `medication_plans_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medications` ADD CONSTRAINT `medications_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `medication_plans`(`plan_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_logs` ADD CONSTRAINT `medication_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `medication_logs` ADD CONSTRAINT `medication_logs_medication_id_fkey` FOREIGN KEY (`medication_id`) REFERENCES `medications`(`medication_id`) ON DELETE CASCADE ON UPDATE CASCADE;
