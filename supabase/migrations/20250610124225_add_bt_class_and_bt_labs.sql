-- BT sınıfı var mı alanı
ALTER TABLE institutions ADD COLUMN has_bt_class BOOLEAN DEFAULT FALSE;

-- BT laboratuvarları tablosu
CREATE TABLE bt_labs (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
  pc_count INTEGER,
  lab_status VARCHAR(20),
  lab_source VARCHAR(30),
  has_board VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);









