-- Stap 1: Maak de gebruiker aan in Supabase Auth (wachtwoord: welkom123)
-- Dit moet in de SQL Editor van Supabase uitgevoerd worden.
-- We maken een gebruiker met e-mail 'admin@maaltafels.be'

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@maaltafels.be',
  extensions.crypt('welkom123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
RETURNING id;

-- STAP 2: Voeg de admin rol toe in onze gebruikers tabel
-- Gebruik het ID dat hierboven is aangemaakt. 
-- In de SQL editor kun je dit in één keer doen met een subquery:

INSERT INTO public.gebruikers (auth_id, voornaam, naam, rol)
SELECT id, 'Admin', 'Beheerder', 'admin'
FROM auth.users
WHERE email = 'admin@maaltafels.be'
ON CONFLICT (auth_id) DO NOTHING;
