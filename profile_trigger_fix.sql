-- Create a trigger function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Aspirant ' || substr(NEW.id::text, 1, 5))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- For existing users who might have been orphaned and missing profiles:
INSERT INTO public.profiles (id, name)
SELECT id, COALESCE(raw_user_meta_data->>'name', 'Aspirant ' || substr(id::text, 1, 5))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
