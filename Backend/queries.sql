ALTER TABLE schedules ADD COLUMN IF NOT EXISTS branch_id INTEGER;

ALTER TABLE locker DROP CONSTRAINT locker_locker_number_key;

ALTER TABLE locker ADD CONSTRAINT unique_locker_number_per_branch UNIQUE (locker_number, branch_id);