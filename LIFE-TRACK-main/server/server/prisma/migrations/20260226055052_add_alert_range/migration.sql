-- AlterTable
ALTER TABLE `alerts` ADD COLUMN `segment_end_sample` INTEGER NULL,
    ADD COLUMN `segment_start_sample` INTEGER NULL;
