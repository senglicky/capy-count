-- Voeg is_actief kolom toe aan avatars tabel
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='avatars' AND column_name='is_actief') THEN
        ALTER TABLE avatars ADD COLUMN is_actief BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
