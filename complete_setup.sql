-- ==========================================
-- VOLLEDIGE SETUP VOOR MAALTAFELS APP
-- Voer dit script uit in de Supabase SQL Editor
-- ==========================================

-- 0. Benodigde extensie aanzetten voor wachtwoord hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Verwijder bestaande tabellen (indien aanwezig) voor een schone start
DROP TABLE IF EXISTS vraag_resultaten CASCADE;
DROP TABLE IF EXISTS oefeningen CASCADE;
DROP TABLE IF EXISTS leraar_klassen CASCADE;
DROP TABLE IF EXISTS gebruikers CASCADE;
DROP TABLE IF EXISTS klassen CASCADE;
DROP TYPE IF EXISTS gebruiker_rol CASCADE;

-- 2. Rollen type aanmaken
CREATE TYPE gebruiker_rol AS ENUM ('student', 'leraar', 'admin');

-- 3. Klassen tabel
CREATE TABLE klassen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL UNIQUE
);

-- 4. Gebruikers tabel
CREATE TABLE gebruikers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE, -- Koppeling met Supabase Auth
  rol gebruiker_rol NOT NULL DEFAULT 'student',
  voornaam TEXT NOT NULL,
  naam TEXT NOT NULL,
  klas_id UUID REFERENCES klassen(id),
  klasnummer INTEGER,
  wachtwoord_plain TEXT -- Voor studenten
);

-- 5. Koppeling leraar -> meerdere klassen
CREATE TABLE leraar_klassen (
  leraar_id UUID REFERENCES gebruikers(id) ON DELETE CASCADE,
  klas_id UUID REFERENCES klassen(id) ON DELETE CASCADE,
  PRIMARY KEY (leraar_id, klas_id)
);

-- 6. Oefeningen tabel
CREATE TABLE oefeningen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES gebruikers(id) NOT NULL,
  datum TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  score INTEGER NOT NULL,
  totaal_tijd INTEGER NOT NULL,
  instellingen JSONB NOT NULL
);

-- 7. Vraag Resultaten tabel
CREATE TABLE vraag_resultaten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oefening_id UUID REFERENCES oefeningen(id) ON DELETE CASCADE NOT NULL,
  vraag TEXT NOT NULL,
  antwoord_gegeven TEXT,
  pogingen INTEGER DEFAULT 1,
  tijd_ms INTEGER,
  is_correct BOOLEAN NOT NULL
);

-- 8. Maak de admin gebruiker aan (wachtwoord: welkom123)
-- We doen dit via een function of DO block om conflicten te vermijden
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Controleer of de gebruiker al bestaat
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@maaltafels.be') THEN
    -- Maak de gebruiker aan in Supabase Auth
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, 
      email_confirmed_at, recovery_sent_at, last_sign_in_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
      confirmation_token, email_change, email_change_token_new, recovery_token
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
      '', '', '', ''
    )
    RETURNING id INTO new_user_id;

    -- Voeg toe aan onze gebruikers tabel
    INSERT INTO public.gebruikers (auth_id, voornaam, naam, rol)
    VALUES (new_user_id, 'Admin', 'Beheerder', 'admin');
  END IF;
END $$;

-- 9. RLS (Row Level Security) Basis setup
ALTER TABLE klassen ENABLE ROW LEVEL SECURITY;
ALTER TABLE gebruikers ENABLE ROW LEVEL SECURITY;
ALTER TABLE oefeningen ENABLE ROW LEVEL SECURITY;
ALTER TABLE vraag_resultaten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON klassen FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON gebruikers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON oefeningen FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON vraag_resultaten FOR ALL USING (true);
