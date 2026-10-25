-- Altyapı sahibi (infra_owner) alanı için 'yok' seçeneği açıklaması
ALTER TABLE kurum_kayit
ADD COLUMN IF NOT EXISTS infra_owner VARCHAR(20);
 
COMMENT ON COLUMN kurum_kayit.infra_owner IS 'Altyapı sahibi: ev_sahibi, misafir veya yok'; 