-- 1. Zorg dat de kolommen bestaan en de juiste eigenschappen hebben
DO $$ BEGIN
    -- Kolom 'cappies' toevoegen aan gebruikers indien deze ontbreekt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gebruikers' AND column_name='cappies') THEN
        ALTER TABLE gebruikers ADD COLUMN cappies INTEGER DEFAULT 0;
    ELSE
        ALTER TABLE gebruikers ALTER COLUMN cappies SET DEFAULT 0;
    END IF;

    -- Kolom 'verdiende_cappies' toevoegen aan oefeningen indien deze ontbreekt
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='oefeningen' AND column_name='verdiende_cappies') THEN
        ALTER TABLE oefeningen ADD COLUMN verdiende_cappies INTEGER DEFAULT 0;
    ELSE
        ALTER TABLE oefeningen ALTER COLUMN verdiende_cappies SET DEFAULT 0;
    END IF;
END $$;

-- 2. Update bestaande rijen die NULL hebben naar 0
UPDATE gebruikers SET cappies = 0 WHERE cappies IS NULL;
UPDATE oefeningen SET verdiende_cappies = 0 WHERE verdiende_cappies IS NULL;

-- 3. RLS Policies versterken voor 'public' toegang (nodig voor studenten zonder auth)
-- Gebruikers tabel (studenten moeten hun eigen cappies kunnen updaten)
DROP POLICY IF EXISTS "Allow all for all" ON gebruikers;
CREATE POLICY "Allow all for all" ON gebruikers FOR ALL TO public USING (true);

-- Oefeningen tabel
DROP POLICY IF EXISTS "Allow all for all" ON oefeningen;
CREATE POLICY "Allow all for all" ON oefeningen FOR ALL TO public USING (true);

-- Vraag resultaten tabel
DROP POLICY IF EXISTS "Allow all for all" ON vraag_resultaten;
CREATE POLICY "Allow all for all" ON vraag_resultaten FOR ALL TO public USING (true);
