-- CreateTable: lưu hồ sơ bác sĩ do hệ thống quản lý để bệnh nhân chọn thuê.
CREATE TABLE `doctor_profiles` (
    `profile_id` INTEGER NOT NULL AUTO_INCREMENT,
    `doctor_id` INTEGER NOT NULL,
    `specialty` VARCHAR(255) NULL,
    `title` VARCHAR(255) NULL,
    `hospital` VARCHAR(255) NULL,
    `location` VARCHAR(255) NULL,
    `bio` TEXT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `hire_price` INTEGER NOT NULL DEFAULT 0,
    `is_listed` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `doctor_profiles_doctor_id_key`(`doctor_id`),
    INDEX `doctor_profiles_is_listed_idx`(`is_listed`),
    PRIMARY KEY (`profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: lưu quan hệ bệnh nhân thuê bác sĩ, tách khỏi quyền chia sẻ hồ sơ cho gia đình.
CREATE TABLE `doctor_hires` (
    `hire_id` INTEGER NOT NULL AUTO_INCREMENT,
    `patient_id` INTEGER NOT NULL,
    `doctor_id` INTEGER NOT NULL,
    `status` ENUM('PENDING_DOCTOR_APPROVAL', 'ACTIVE', 'REJECTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING_DOCTOR_APPROVAL',
    `price_snapshot` INTEGER NOT NULL DEFAULT 0,
    `can_view_ehr` BOOLEAN NOT NULL DEFAULT false,
    `can_view_medications` BOOLEAN NOT NULL DEFAULT false,
    `can_view_ecg` BOOLEAN NOT NULL DEFAULT false,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_at` DATETIME(3) NULL,
    `rejected_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `doctor_hires_patient_id_doctor_id_key`(`patient_id`, `doctor_id`),
    INDEX `doctor_hires_doctor_id_status_idx`(`doctor_id`, `status`),
    INDEX `doctor_hires_patient_id_status_idx`(`patient_id`, `status`),
    PRIMARY KEY (`hire_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: liên kết hồ sơ bác sĩ và hợp đồng thuê với bảng users.
ALTER TABLE `doctor_profiles` ADD CONSTRAINT `doctor_profiles_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `doctor_hires` ADD CONSTRAINT `doctor_hires_patient_id_fkey` FOREIGN KEY (`patient_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `doctor_hires` ADD CONSTRAINT `doctor_hires_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: đưa các bác sĩ hiện có vào catalog để UI có dữ liệu thật ngay sau migration.
INSERT INTO `doctor_profiles` (`doctor_id`, `specialty`, `title`, `hire_price`, `is_listed`, `created_at`, `updated_at`)
SELECT `user_id`, 'Tim mạch', `name`, COALESCE(`consultation_fee`, 0), true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `users`
WHERE `role` = 'bác sĩ';

-- Backfill: quyền chia sẻ bác sĩ legacy accepted được chuyển thành quan hệ thuê active và bật quyền xem như trước.
INSERT INTO `doctor_hires` (
  `patient_id`,
  `doctor_id`,
  `status`,
  `price_snapshot`,
  `can_view_ehr`,
  `can_view_medications`,
  `can_view_ecg`,
  `requested_at`,
  `approved_at`,
  `created_at`,
  `updated_at`
)
SELECT
  ap.`patient_id`,
  ap.`viewer_id`,
  'ACTIVE',
  COALESCE(u.`consultation_fee`, 0),
  true,
  true,
  true,
  ap.`created_at`,
  ap.`updated_at`,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `access_permissions` ap
JOIN `users` u ON u.`user_id` = ap.`viewer_id`
WHERE ap.`role` = 'bác sĩ'
  AND ap.`status` = 'accepted'
  AND u.`role` = 'bác sĩ'
ON DUPLICATE KEY UPDATE
  `status` = 'ACTIVE',
  `can_view_ehr` = true,
  `can_view_medications` = true,
  `can_view_ecg` = true,
  `updated_at` = CURRENT_TIMESTAMP(3);
