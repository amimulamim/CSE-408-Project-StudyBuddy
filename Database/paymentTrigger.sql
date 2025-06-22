-- 1) Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trg_sync_current_plan ON subscriptions;
DROP FUNCTION IF EXISTS sync_current_plan();

-- 2) Create the corrected trigger function
CREATE OR REPLACE FUNCTION sync_current_plan()
RETURNS trigger AS $$
DECLARE
  u_id      TEXT;  -- Changed from UUID to TEXT to match users.uid
  latest_id TEXT;
BEGIN
  -- pick the right user_id depending on INSERT/UPDATE vs DELETE
  IF TG_OP = 'DELETE' THEN
    u_id := OLD.user_id;
  ELSE
    u_id := NEW.user_id;
  END IF;

  -- find their most recent active subscription
  -- Note: end_date is NULL for ongoing active subscriptions
  SELECT plan_id
    INTO latest_id
    FROM subscriptions
   WHERE user_id = u_id
     AND status = 'active'
     AND (end_date IS NULL OR end_date > now())  -- NULL means ongoing, or future end date
   ORDER BY start_date DESC
   LIMIT 1;

  -- if they have none, default to 'free'
  IF latest_id IS NULL THEN
    latest_id := 'free';
  END IF;

  -- update the users table
  UPDATE users
     SET current_plan = latest_id
   WHERE uid = u_id;

  -- Log for debugging (optional - remove in production)
  RAISE NOTICE 'Updated user % current_plan to %', u_id, latest_id;

  RETURN NULL;  -- AFTER trigger doesn't need to return a row
END;
$$ LANGUAGE plpgsql;

-- 3) attach it as an AFTER trigger on subscriptions
CREATE TRIGGER trg_sync_current_plan
AFTER INSERT OR UPDATE OR DELETE
  ON subscriptions
  FOR EACH ROW
EXECUTE FUNCTION sync_current_plan();
