-- AlterTable: mở rộng profile bác sĩ với số năm kinh nghiệm và email liên hệ public.
ALTER TABLE `doctor_profiles`
  ADD COLUMN `experience_years` INTEGER NULL,
  ADD COLUMN `public_contact_email` VARCHAR(255) NULL;

-- DropIndex: thay index is_listed đơn bằng composite index phục vụ catalog.
DROP INDEX `doctor_profiles_is_listed_idx` ON `doctor_profiles`;

-- CreateIndex: tối ưu lọc catalog theo trạng thái public/chuyên khoa và join doctor.
CREATE INDEX `doctor_profiles_is_listed_specialty_doctor_id_idx`
  ON `doctor_profiles`(`is_listed`, `specialty`, `doctor_id`);

-- CreateTable: học vấn/bằng cấp của hồ sơ bác sĩ.
CREATE TABLE `doctor_profile_educations` (
  `education_id` INTEGER NOT NULL AUTO_INCREMENT,
  `profile_id` INTEGER NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `organization` VARCHAR(255) NOT NULL,
  `year_label` VARCHAR(100) NULL,
  `display_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `doctor_profile_educations_profile_id_display_order_idx`(`profile_id`, `display_order`),
  PRIMARY KEY (`education_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: nghiên cứu nổi bật của bác sĩ.
CREATE TABLE `doctor_profile_researches` (
  `research_id` INTEGER NOT NULL AUTO_INCREMENT,
  `profile_id` INTEGER NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `source` VARCHAR(255) NOT NULL,
  `published_year` INTEGER NULL,
  `display_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `doctor_profile_researches_profile_id_display_order_idx`(`profile_id`, `display_order`),
  PRIMARY KEY (`research_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: lộ trình kinh nghiệm/career timeline của bác sĩ.
CREATE TABLE `doctor_profile_experiences` (
  `experience_id` INTEGER NOT NULL AUTO_INCREMENT,
  `profile_id` INTEGER NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `organization` VARCHAR(255) NOT NULL,
  `time_label` VARCHAR(100) NULL,
  `display_order` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `doctor_profile_experiences_profile_id_display_order_idx`(`profile_id`, `display_order`),
  PRIMARY KEY (`experience_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: review bác sĩ do bệnh nhân để lại.
CREATE TABLE `doctor_reviews` (
  `review_id` INTEGER NOT NULL AUTO_INCREMENT,
  `doctor_id` INTEGER NOT NULL,
  `patient_id` INTEGER NOT NULL,
  `source_hire_id` INTEGER NULL,
  `source_appointment_id` INTEGER NULL,
  `rating` INTEGER NOT NULL,
  `comment` TEXT NULL,
  `is_visible` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `doctor_reviews_doctor_id_patient_id_key`(`doctor_id`, `patient_id`),
  INDEX `doctor_reviews_doctor_id_is_visible_created_at_review_id_idx`(`doctor_id`, `is_visible`, `created_at`, `review_id`),
  INDEX `doctor_reviews_patient_id_doctor_id_idx`(`patient_id`, `doctor_id`),
  PRIMARY KEY (`review_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex: tối ưu access check và aggregate phía doctor/patient.
CREATE INDEX `doctor_hires_doctor_id_patient_id_status_idx`
  ON `doctor_hires`(`doctor_id`, `patient_id`, `status`);

-- CreateIndex: tối ưu check bệnh nhân đã từng khám với bác sĩ hay chưa.
CREATE INDEX `appointments_doctor_id_patient_id_status_start_time_idx`
  ON `appointments`(`doctor_id`, `patient_id`, `status`, `start_time`);

-- AddForeignKey: liên kết section profile tới doctor_profiles.
ALTER TABLE `doctor_profile_educations`
  ADD CONSTRAINT `doctor_profile_educations_profile_id_fkey`
  FOREIGN KEY (`profile_id`) REFERENCES `doctor_profiles`(`profile_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `doctor_profile_researches`
  ADD CONSTRAINT `doctor_profile_researches_profile_id_fkey`
  FOREIGN KEY (`profile_id`) REFERENCES `doctor_profiles`(`profile_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `doctor_profile_experiences`
  ADD CONSTRAINT `doctor_profile_experiences_profile_id_fkey`
  FOREIGN KEY (`profile_id`) REFERENCES `doctor_profiles`(`profile_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: liên kết review tới tài khoản bác sĩ và bệnh nhân.
ALTER TABLE `doctor_reviews`
  ADD CONSTRAINT `doctor_reviews_doctor_id_fkey`
  FOREIGN KEY (`doctor_id`) REFERENCES `users`(`user_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `doctor_reviews`
  ADD CONSTRAINT `doctor_reviews_patient_id_fkey`
  FOREIGN KEY (`patient_id`) REFERENCES `users`(`user_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
