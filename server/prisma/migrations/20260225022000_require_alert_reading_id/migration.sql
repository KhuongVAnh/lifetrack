-- Backfill alerts without reading_id by assigning nearest reading of same patient (if any)
UPDATE `alerts` a
SET a.`reading_id` = (
  SELECT r.`reading_id`
  FROM `readings` r
  INNER JOIN `devices` d ON d.`device_id` = r.`device_id`
  WHERE d.`user_id` = a.`user_id`
  ORDER BY ABS(TIMESTAMPDIFF(SECOND, r.`timestamp`, a.`timestamp`)) ASC, r.`reading_id` DESC
  LIMIT 1
)
WHERE a.`reading_id` IS NULL;

-- Remove unresolved legacy rows that still cannot be mapped to a reading
DELETE FROM `alerts`
WHERE `reading_id` IS NULL;

-- Enforce mandatory reading_id
ALTER TABLE `alerts`
MODIFY `reading_id` INTEGER NOT NULL;
