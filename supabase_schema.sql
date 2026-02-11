-- Rollen type aanmaken (idempotent)
DO $$ BEGIN
    CREATE TYPE gebruiker_rol AS ENUM ('student', 'leraar', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Klassen tabel
CREATE TABLE IF NOT EXISTS klassen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL UNIQUE
);

-- Gebruikers tabel
CREATE TABLE IF NOT EXISTS gebruikers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE, -- Koppeling met Supabase Auth (optioneel voor studenten)
  rol gebruiker_rol NOT NULL DEFAULT 'student',
  voornaam TEXT NOT NULL,
  naam TEXT NOT NULL,
  klas_id UUID REFERENCES klassen(id),
  klasnummer INTEGER,
  wachtwoord_plain TEXT -- Voor studenten die geen e-mail hebben
);

-- Kolom migratie (voor bestaande tabellen)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gebruikers' AND column_name='gebruikersnaam') THEN
        ALTER TABLE gebruikers ADD COLUMN gebruikersnaam TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gebruikers' AND column_name='email') THEN
        ALTER TABLE gebruikers ADD COLUMN email TEXT;
    END IF;
END $$;

-- Nieuwe tabel voor koppeling leraar -> meerdere klassen
CREATE TABLE IF NOT EXISTS leraar_klassen (
  leraar_id UUID REFERENCES gebruikers(id) ON DELETE CASCADE,
  klas_id UUID REFERENCES klassen(id) ON DELETE CASCADE,
  PRIMARY KEY (leraar_id, klas_id)
);

-- Oefeningen tabel
CREATE TABLE IF NOT EXISTS oefeningen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES gebruikers(id) NOT NULL,
  datum TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  score INTEGER NOT NULL,
  totaal_tijd INTEGER NOT NULL, -- in seconden
  instellingen JSONB NOT NULL
);

-- Vraag Resultaten tabel
CREATE TABLE IF NOT EXISTS vraag_resultaten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oefening_id UUID REFERENCES oefeningen(id) ON DELETE CASCADE NOT NULL,
  vraag TEXT NOT NULL,
  antwoord_gegeven TEXT,
  pogingen INTEGER DEFAULT 1,
  tijd_ms INTEGER,
  is_correct BOOLEAN NOT NULL
);

-- RLS (Row Level Security) - Basis setup
ALTER TABLE klassen ENABLE ROW LEVEL SECURITY;
ALTER TABLE gebruikers ENABLE ROW LEVEL SECURITY;
ALTER TABLE oefeningen ENABLE ROW LEVEL SECURITY;
ALTER TABLE vraag_resultaten ENABLE ROW LEVEL SECURITY;

-- Tijdelijke 'allow all' policies voor ontwikkeling
-- We gebruiken TO public om ook niet-ingelogde gebruikers (zoals studenten bij login) toegang te geven
DROP POLICY IF EXISTS "Allow all for authenticated users" ON klassen;
CREATE POLICY "Allow all for all" ON klassen FOR ALL TO public USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON gebruikers;
CREATE POLICY "Allow all for all" ON gebruikers FOR ALL TO public USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON oefeningen;
CREATE POLICY "Allow all for all" ON oefeningen FOR ALL TO public USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON vraag_resultaten;
CREATE POLICY "Allow all for all" ON vraag_resultaten FOR ALL TO public USING (true);
