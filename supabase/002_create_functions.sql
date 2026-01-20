-- Increment Publish Count RPC Function
-- This function increments the publish count for a user

CREATE OR REPLACE FUNCTION increment_publish_count(
  user_uuid_input UUID,
  count_type TEXT
)
RETURNS void AS $$
BEGIN
  IF count_type = 'public_count' THEN
    UPDATE sf_user_profiles SET public_count = public_count + 1 WHERE user_uuid = user_uuid_input;
  ELSIF count_type = 'private_count' THEN
    UPDATE sf_user_profiles SET private_count = private_count + 1 WHERE user_uuid = user_uuid_input;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Make function public
GRANT EXECUTE ON FUNCTION increment_publish_count(UUID, TEXT) TO anon, authenticated, service_role;
