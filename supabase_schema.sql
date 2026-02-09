-- Rollen type aanmaken
CREATE TYPE gebruiker_rol AS ENUM ('student', 'leraar', 'admin');

-- Klassen tabel
CREATE TABLE klassen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL UNIQUE
);

-- Gebruikers tabel
CREATE TABLE gebruikers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE, -- Koppeling met Supabase Auth (optioneel voor studenten)
  rol gebruiker_rol NOT NULL DEFAULT 'student',
  voornaam TEXT NOT NULL,
  naam TEXT NOT NULL,
  klas_id UUID REFERENCES klassen(id),
  klasnummer INTEGER,
  wachtwoord_plain TEXT -- Voor studenten die geen e-mail hebben
);

-- Nieuwe tabel voor koppeling leraar -> meerdere klassen
CREATE TABLE leraar_klassen (
  leraar_id UUID REFERENCES gebruikers(id) ON DELETE CASCADE,
  klas_id UUID REFERENCES klassen(id) ON DELETE CASCADE,
  PRIMARY KEY (leraar_id, klas_id)
);

-- Oefeningen tabel
CREATE TABLE oefeningen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES gebruikers(id) NOT NULL,
  datum TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  score INTEGER NOT NULL,
  totaal_tijd INTEGER NOT NULL, -- in seconden
  instellingen JSONB NOT NULL
);

-- Vraag Resultaten tabel
CREATE TABLE vraag_resultaten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oefening_id UUID REFERENCES oefeningen(id) ON DELETE CASCADE NOT NULL,
  vraag TEXT NOT NULL,
  antwoord_gegeven TEXT,
  pogingen INTEGER DEFAULT 1,
  tijd_ms INTEGER,
  is_correct BOOLEAN NOT NULL
);

-- RLS (Row Level Security) - Basis setup
-- Voorlopig zetten we RLS uit om ontwikkeling te vergemakkelijken, 
-- maar in productie moeten hier strikte regels komen.
ALTER TABLE klassen ENABLE ROW LEVEL SECURITY;
ALTER TABLE gebruikers ENABLE ROW LEVEL SECURITY;
ALTER TABLE oefeningen ENABLE ROW LEVEL SECURITY;
ALTER TABLE vraag_resultaten ENABLE ROW LEVEL SECURITY;

-- Tijdelijke 'allow all' policies voor ontwikkeling
CREATE POLICY "Allow all for authenticated users" ON klassen FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON gebruikers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON oefeningen FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON vraag_resultaten FOR ALL USING (true);
