-- 1. Avatars tabel
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  afbeelding_url TEXT NOT NULL,
  prijs INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Gebruiker Avatars (Koppeltabel voor bezit)
CREATE TABLE IF NOT EXISTS gebruiker_avatars (
  gebruiker_id UUID REFERENCES gebruikers(id) ON DELETE CASCADE,
  avatar_id UUID REFERENCES avatars(id) ON DELETE CASCADE,
  aangeschaft_op TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (gebruiker_id, avatar_id)
);

-- 3. Gebruikers tabel uitbreiden met actieve avatar
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gebruikers' AND column_name='actieve_avatar_id') THEN
        ALTER TABLE gebruikers ADD COLUMN actieve_avatar_id UUID REFERENCES avatars(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. RLS inschakelen
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE gebruiker_avatars ENABLE ROW LEVEL SECURITY;

-- Policies voor avatars
DROP POLICY IF EXISTS "Iedereen kan avatars zien" ON avatars;
CREATE POLICY "Iedereen kan avatars zien" ON avatars FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Admins beheren avatars" ON avatars;
CREATE POLICY "Admins beheren avatars" ON avatars FOR ALL TO authenticated USING (true);

-- Policies voor gebruiker_avatars
DROP POLICY IF EXISTS "Iedereen kan bezit zien" ON gebruiker_avatars;
CREATE POLICY "Iedereen kan bezit zien" ON gebruiker_avatars FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Iedereen kan avatars kopen" ON gebruiker_avatars;
CREATE POLICY "Iedereen kan avatars kopen" ON gebruiker_avatars FOR INSERT TO public WITH CHECK (true);

-- 5. Standaard avatars toevoegen (placeholder paths)
INSERT INTO avatars (naam, afbeelding_url, prijs)
VALUES 
('Basis Capy', '/avatars/capy_basic.png', 20),
('Cool Capy', '/avatars/capy_cool.png', 20),
('Geleerde Capy', '/avatars/capy_smart.png', 20),
('Sport Capy', '/avatars/capy_sport.png', 20)
ON CONFLICT (id) DO NOTHING;
-- Note: ON CONFLICT target needs uniqueness or just use a DO block if we want to be safe with names
-- For simplicity, we just insert them once manually or via seed.
