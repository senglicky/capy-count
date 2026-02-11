-- Tabel voor taken die door leraren zijn aangemaakt
CREATE TABLE IF NOT EXISTS taken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leraar_id UUID REFERENCES gebruikers(id) ON DELETE CASCADE NOT NULL,
  klas_id UUID REFERENCES klassen(id) ON DELETE CASCADE NOT NULL,
  titel TEXT NOT NULL,
  instellingen JSONB NOT NULL,
  vragen JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Kolom 'vragen' toevoegen als de tabel al bestond zonder deze kolom
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='taken' AND column_name='vragen') THEN
        ALTER TABLE taken ADD COLUMN vragen JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Kolom toevoegen aan oefeningen om te tracken welke taak is gemaakt
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='oefeningen' AND column_name='taak_id') THEN
        ALTER TABLE oefeningen ADD COLUMN taak_id UUID REFERENCES taken(id) ON DELETE SET NULL;
    END IF;
END $$;

-- RLS inschakelen
ALTER TABLE taken ENABLE ROW LEVEL SECURITY;

-- Tijdelijke 'allow all' policies voor ontwikkeling
-- We gebruiken TO public om ook niet-ingelogde gebruikers toegang te geven
DROP POLICY IF EXISTS "Allow all for all" ON taken;
CREATE POLICY "Allow all for all" ON taken FOR ALL TO public USING (true);

DROP POLICY IF EXISTS "Leraren kunnen eigen taken beheren" ON taken;
DROP POLICY IF EXISTS "Iedereen kan taken bekijken" ON taken;
