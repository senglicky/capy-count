-- Voeg de kolom 'eerste_antwoord' toe aan de 'vraag_resultaten' tabel
ALTER TABLE vraag_resultaten ADD COLUMN IF NOT EXISTS eerste_antwoord TEXT;

COMMENT ON COLUMN vraag_resultaten.eerste_antwoord IS 'Het eerste (foutieve) antwoord gegeven bij een tweede kans scenario.';
