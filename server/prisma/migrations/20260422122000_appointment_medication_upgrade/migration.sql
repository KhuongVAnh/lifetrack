-- AlterTable: bổ sung metadata cho lịch khám để frontend hiển thị rõ trạng thái và tài liệu bệnh nhân gửi kèm.
ALTER TABLE `appointments`
  ADD COLUMN `patient_attachment_url` VARCHAR(500) NULL,
  ADD COLUMN `doctor_note` TEXT NULL,
  ADD COLUMN `status_reason` TEXT NULL;

-- AlterTable: lưu thời điểm đã gửi nhắc để cron không gửi trùng cùng một lượt uống thuốc.
ALTER TABLE `medication_logs`
  ADD COLUMN `reminded_at` DATETIME(3) NULL;

-- CreateTable: lưu lịch rảnh lặp theo thứ trong tuần của từng bác sĩ.
CREATE TABLE `doctor_availabilities` (
    `availability_id` INTEGER NOT NULL AUTO_INCREMENT,
    `doctor_id` INTEGER NOT NULL,
    `day_of_week` INTEGER NOT NULL,
    `start_time` VARCHAR(5) NOT NULL,
    `end_time` VARCHAR(5) NOT NULL,
    `slot_minutes` INTEGER NOT NULL DEFAULT 30,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `doctor_availabilities_doctor_id_day_of_week_is_active_idx`(`doctor_id`, `day_of_week`, `is_active`),
    PRIMARY KEY (`availability_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: lưu các khoảng bác sĩ nghỉ hoặc chặn lịch cụ thể.
CREATE TABLE `doctor_time_offs` (
    `time_off_id` INTEGER NOT NULL AUTO_INCREMENT,
    `doctor_id` INTEGER NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `doctor_time_offs_doctor_id_start_time_end_time_idx`(`doctor_id`, `start_time`, `end_time`),
    PRIMARY KEY (`time_off_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex: tối ưu truy vấn slot và danh sách lịch hẹn theo bác sĩ/bệnh nhân.
CREATE INDEX `appointments_doctor_id_start_time_end_time_idx` ON `appointments`(`doctor_id`, `start_time`, `end_time`);
CREATE INDEX `appointments_patient_id_start_time_idx` ON `appointments`(`patient_id`, `start_time`);
CREATE INDEX `appointments_status_start_time_idx` ON `appointments`(`status`, `start_time`);

-- CreateIndex: tối ưu truy vấn lịch uống thuốc theo ngày và cron quét lượt đến hạn.
CREATE INDEX `medication_plans_user_id_is_active_start_date_idx` ON `medication_plans`(`user_id`, `is_active`, `start_date`);
CREATE INDEX `medication_plans_doctor_id_idx` ON `medication_plans`(`doctor_id`);
CREATE INDEX `medication_logs_user_id_scheduled_time_idx` ON `medication_logs`(`user_id`, `scheduled_time`);
CREATE INDEX `medication_logs_status_scheduled_time_idx` ON `medication_logs`(`status`, `scheduled_time`);

-- AddForeignKey: liên kết lịch rảnh/khoảng nghỉ với bác sĩ.
ALTER TABLE `doctor_availabilities` ADD CONSTRAINT `doctor_availabilities_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `doctor_time_offs` ADD CONSTRAINT `doctor_time_offs_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: liên kết đơn thuốc với bác sĩ kê đơn nếu có.
ALTER TABLE `medication_plans` ADD CONSTRAINT `medication_plans_doctor_id_fkey` FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
