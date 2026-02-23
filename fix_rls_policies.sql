-- 1. leraar_klassen
ALTER TABLE leraar_klassen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select for all" ON leraar_klassen;
CREATE POLICY "Allow select for all" ON leraar_klassen FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated" ON leraar_klassen;
CREATE POLICY "Allow all for authenticated" ON leraar_klassen FOR ALL TO authenticated USING (true);

-- 2. gebruikers
ALTER TABLE gebruikers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for all" ON gebruikers;
DROP POLICY IF EXISTS "Allow select for all" ON gebruikers;
CREATE POLICY "Allow select for all" ON gebruikers FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Allow update for all" ON gebruikers;
CREATE POLICY "Allow update for all" ON gebruikers FOR UPDATE TO public USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated" ON gebruikers;
CREATE POLICY "Allow all for authenticated" ON gebruikers FOR ALL TO authenticated USING (true);

-- 3. klassen
ALTER TABLE klassen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for all" ON klassen;
DROP POLICY IF EXISTS "Allow select for all" ON klassen;
CREATE POLICY "Allow select for all" ON klassen FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated" ON klassen;
CREATE POLICY "Allow all for authenticated" ON klassen FOR ALL TO authenticated USING (true);

-- 4. taken
ALTER TABLE taken ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for all" ON taken;
CREATE POLICY "Allow all for all" ON taken FOR ALL TO public USING (true);

-- 5. oefeningen
ALTER TABLE oefeningen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for all" ON oefeningen;
CREATE POLICY "Allow all for all" ON oefeningen FOR ALL TO public USING (true);

-- 6. vraag_resultaten
ALTER TABLE vraag_resultaten ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for all" ON vraag_resultaten;
CREATE POLICY "Allow all for all" ON vraag_resultaten FOR ALL TO public USING (true);
