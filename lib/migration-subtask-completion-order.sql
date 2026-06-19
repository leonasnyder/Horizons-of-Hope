-- Add completion_order to track the sequence in which subtasks were checked off.
-- Incomplete subtasks have NULL; completed ones get 1, 2, 3 ... in check-off order.
ALTER TABLE schedule_entry_sub_activities ADD COLUMN IF NOT EXISTS completion_order INTEGER;
