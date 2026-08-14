-- Date of birth on user profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date;
