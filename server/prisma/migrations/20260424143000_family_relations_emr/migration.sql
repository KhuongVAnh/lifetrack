CREATE TABLE `family_relations` (
  `relation_id` INTEGER NOT NULL AUTO_INCREMENT,
  `owner_user_id` INTEGER NOT NULL,
  `member_user_id` INTEGER NOT NULL,
  `relation_label` VARCHAR(100) NULL,
  `display_order` INTEGER NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `family_relations_owner_user_id_member_user_id_key`(`owner_user_id`, `member_user_id`),
  INDEX `family_relations_owner_user_id_display_order_idx`(`owner_user_id`, `display_order`),
  INDEX `family_relations_member_user_id_idx`(`member_user_id`),
  PRIMARY KEY (`relation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `family_relations`
  ADD CONSTRAINT `family_relations_owner_user_id_fkey`
  FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`user_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `family_relations`
  ADD CONSTRAINT `family_relations_member_user_id_fkey`
  FOREIGN KEY (`member_user_id`) REFERENCES `users`(`user_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
