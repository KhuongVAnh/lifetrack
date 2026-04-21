-- DropForeignKey
ALTER TABLE `direct_messages` DROP FOREIGN KEY `direct_messages_receiver_id_fkey`;

-- DropIndex
DROP INDEX `direct_messages_conversation_key_created_at_idx` ON `direct_messages`;

-- DropIndex
DROP INDEX `direct_messages_receiver_id_is_read_created_at_idx` ON `direct_messages`;

-- CreateIndex
CREATE INDEX `direct_messages_conversation_key_created_at_message_id_idx` ON `direct_messages`(`conversation_key`, `created_at`, `message_id`);

-- CreateIndex
CREATE INDEX `direct_messages_receiver_id_sender_id_is_read_idx` ON `direct_messages`(`receiver_id`, `sender_id`, `is_read`);