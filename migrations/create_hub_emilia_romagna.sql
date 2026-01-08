-- ============================================================================
-- MIGRATION: Creazione tabella hub_emilia_romagna
-- Data: 8 Gennaio 2026
-- Versione: 3.26.0
-- ============================================================================

-- Creazione tabella
CREATE TABLE IF NOT EXISTS hub_emilia_romagna (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'urbano' o 'prossimita'
  comune VARCHAR(255) NOT NULL,
  provincia_id INTEGER REFERENCES province(id),
  provincia_sigla VARCHAR(2) NOT NULL,
  regione_id INTEGER DEFAULT 8, -- Emilia-Romagna
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  livello VARCHAR(20) NOT NULL, -- 'capoluogo', 'provincia', 'comune'
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_hub_er_provincia ON hub_emilia_romagna(provincia_id);
CREATE INDEX IF NOT EXISTS idx_hub_er_livello ON hub_emilia_romagna(livello);
CREATE INDEX IF NOT EXISTS idx_hub_er_regione ON hub_emilia_romagna(regione_id);

-- ============================================================================
-- INSERIMENTO DATI HUB EMILIA ROMAGNA
-- ============================================================================

-- BOLOGNA (provincia_id=39)
INSERT INTO hub_emilia_romagna (nome, tipo, comune, provincia_id, provincia_sigla, lat, lng, livello) VALUES
('Hub urbano Bologna', 'urbano', 'Bologna', 39, 'BO', 44.4949, 11.3426, 'capoluogo'),
('Hub urbano Budrio', 'urbano', 'Budrio', 39, 'BO', 44.5374, 11.5351, 'comune'),
('Hub prossimità Vergato', 'prossimita', 'Vergato', 39, 'BO', 44.2819, 11.1122, 'comune'),
('Hub urbano Castel San Pietro Terme', 'urbano', 'Castel San Pietro Terme', 39, 'BO', 44.3989, 11.5878, 'comune'),
('Hub urbano Casalecchio', 'urbano', 'Casalecchio di Reno', 39, 'BO', 44.4733, 11.2756, 'comune'),
('Hub urbano Centro Storico Imola', 'urbano', 'Imola', 39, 'BO', 44.3531, 11.7148, 'comune');

-- MODENA (provincia_id=42)
INSERT INTO hub_emilia_romagna (nome, tipo, comune, provincia_id, provincia_sigla, lat, lng, livello) VALUES
('Hub urbano Modena', 'urbano', 'Modena', 42, 'MO', 44.6471, 10.9252, 'capoluogo'),
('Hub urbano Pievepelago', 'urbano', 'Pievepelago', 42, 'MO', 44.2089, 10.6167, 'comune'),
('Hub urbano Fiorano', 'urbano', 'Fiorano Modenese', 42, 'MO', 44.5389, 10.8156, 'comune'),
('Hub urbano Fiumalbo', 'urbano', 'Fiumalbo', 42, 'MO', 44.1789, 10.6489, 'comune'),
('Hub prossimità SantAnna San Cesario', 'prossimita', 'San Cesario sul Panaro', 42, 'MO', 44.5622, 11.0356, 'comune'),
('Hub prossimità Spezzano Fiorano', 'prossimita', 'Fiorano Modenese', 42, 'MO', 44.5267, 10.8089, 'comune'),
('Hub urbano Vignola Centro', 'urbano', 'Vignola', 42, 'MO', 44.4789, 11.0089, 'comune'),
('Hub urbano Formigine', 'urbano', 'Formigine', 42, 'MO', 44.5722, 10.8478, 'comune'),
('Hub urbano Concordia', 'urbano', 'Concordia sulla Secchia', 42, 'MO', 44.9122, 10.9822, 'comune'),
('Hub urbano Sassuolo', 'urbano', 'Sassuolo', 42, 'MO', 44.5422, 10.7856, 'comune'),
('Hub urbano San Cesario sul Panaro', 'urbano', 'San Cesario sul Panaro', 42, 'MO', 44.5622, 11.0356, 'comune'),
('Hub urbano Centro storico Carpi', 'urbano', 'Carpi', 42, 'MO', 44.7833, 10.8833, 'comune');

-- REGGIO EMILIA (provincia_id=46)
INSERT INTO hub_emilia_romagna (nome, tipo, comune, provincia_id, provincia_sigla, lat, lng, livello) VALUES
('Hub urbano Reggio Emilia', 'urbano', 'Reggio Emilia', 46, 'RE', 44.6989, 10.6297, 'capoluogo'),
('Hub prossimità Correggio', 'prossimita', 'Correggio', 46, 'RE', 44.7722, 10.7822, 'comune'),
('Hub prossimità Arceto Scandiano', 'prossimita', 'Scandiano', 46, 'RE', 44.5956, 10.6889, 'comune'),
('Hub prossimità Villanova Reggiolo', 'prossimita', 'Reggiolo', 46, 'RE', 44.9167, 10.8167, 'comune'),
('Hub prossimità Brugneto Reggiolo', 'prossimita', 'Reggiolo', 46, 'RE', 44.9089, 10.8089, 'comune'),
('Hub prossimità Novellara', 'prossimita', 'Novellara', 46, 'RE', 44.8456, 10.7289, 'comune'),
('Hub prossimità Guastalla', 'prossimita', 'Guastalla', 46, 'RE', 44.9222, 10.6556, 'comune'),
('Hub urbano Scandiano', 'urbano', 'Scandiano', 46, 'RE', 44.5956, 10.6889, 'comune'),
('Hub urbano Campagnola', 'urbano', 'Campagnola Emilia', 46, 'RE', 44.8389, 10.7556, 'comune'),
('Hub urbano Reggiolo', 'urbano', 'Reggiolo', 46, 'RE', 44.9167, 10.8167, 'comune'),
('Hub urbano Centro storico Novellara', 'urbano', 'Novellara', 46, 'RE', 44.8456, 10.7289, 'comune'),
('Hub urbano Centro storico Guastalla', 'urbano', 'Guastalla', 46, 'RE', 44.9222, 10.6556, 'comune'),
('Hub urbano Centro storico Correggio', 'urbano', 'Correggio', 46, 'RE', 44.7722, 10.7822, 'comune');

-- PARMA (provincia_id=43)
INSERT INTO hub_emilia_romagna (nome, tipo, comune, provincia_id, provincia_sigla, lat, lng, livello) VALUES
('Hub urbano Parma', 'urbano', 'Parma', 43, 'PR', 44.8015, 10.3279, 'capoluogo'),
('Hub urbano Fidenza', 'urbano', 'Fidenza', 43, 'PR', 44.8667, 10.0611, 'comune'),
('Hub urbano Busseto Centro', 'urbano', 'Busseto', 43, 'PR', 44.9789, 10.0422, 'comune'),
('Hub urbano Salsomaggiore Terme Hub centro', 'urbano', 'Salsomaggiore Terme', 43, 'PR', 44.8167, 9.9833, 'comune');

-- PIACENZA (provincia_id=44)
INSERT INTO hub_emilia_romagna (nome, tipo, comune, provincia_id, provincia_sigla, lat, lng, livello) VALUES
('Hub urbano Piacenza', 'urbano', 'Piacenza', 44, 'PC', 45.0526, 9.6930, 'capoluogo'),
('Hub urbano Calendasco', 'urbano', 'Calendasco', 44, 'PC', 45.0789, 9.5889, 'comune'),
('Hub urbano Vernasca', 'urbano', 'Vernasca', 44, 'PC', 44.8022, 9.8289, 'comune');

-- FERRARA (provincia_id=40)
INSERT INTO hub_emilia_romagna (nome, tipo, comune, provincia_id, provincia_sigla, lat, lng, livello) VALUES
('Hub urbano Ferrara', 'urbano', 'Ferrara', 40, 'FE', 44.8381, 11.6198, 'capoluogo'),
('Hub urbano Codigoro', 'urbano', 'Codigoro', 40, 'FE', 44.8322, 12.1089, 'comune'),
('Hub urbano Tresigallo Tresignana', 'urbano', 'Tresignana', 40, 'FE', 44.8167, 11.8833, 'comune'),
('Hub urbano Formignana Tresignana', 'urbano', 'Tresignana', 40, 'FE', 44.8389, 11.8556, 'comune'),
('Hub prossimità Ferrara', 'prossimita', 'Ferrara', 40, 'FE', 44.8481, 11.6298, 'capoluogo'),
('Hub urbano Cento', 'urbano', 'Cento', 40, 'FE', 44.7267, 11.2889, 'comune');

-- RAVENNA (provincia_id=45)
INSERT INTO hub_emilia_romagna (nome, tipo, comune, provincia_id, provincia_sigla, lat, lng, livello) VALUES
('Hub urbano Ravenna', 'urbano', 'Ravenna', 45, 'RA', 44.4184, 12.2035, 'capoluogo'),
('Hub urbano Cervia Centro', 'urbano', 'Cervia', 45, 'RA', 44.2622, 12.3489, 'comune');

-- FORLÌ-CESENA (provincia_id=41)
INSERT INTO hub_emilia_romagna (nome, tipo, comune, provincia_id, provincia_sigla, lat, lng, livello) VALUES
('Hub urbano Cesena', 'urbano', 'Cesena', 41, 'FC', 44.1378, 12.2422, 'capoluogo'),
('Hub prossimità Bagno di Romagna', 'prossimita', 'Bagno di Romagna', 41, 'FC', 43.8333, 11.9667, 'comune'),
('Hub prossimità Ranchio Sarsina', 'prossimita', 'Sarsina', 41, 'FC', 43.9167, 12.1333, 'comune'),
('Hub prossimità Le Vigne Cesena', 'prossimita', 'Cesena', 41, 'FC', 44.1478, 12.2522, 'capoluogo'),
('Hub prossimità Magnani Oltrepo Cesena', 'prossimita', 'Cesena', 41, 'FC', 44.1278, 12.2322, 'capoluogo'),
('Hub urbano Bagno di Romagna', 'urbano', 'Bagno di Romagna', 41, 'FC', 43.8333, 11.9667, 'comune'),
('Hub urbano Sarsina', 'urbano', 'Sarsina', 41, 'FC', 43.9167, 12.1333, 'comune'),
('Hub urbano Forlimpopoli', 'urbano', 'Forlimpopoli', 41, 'FC', 44.1889, 12.1278, 'comune'),
('Hub urbano Meldola', 'urbano', 'Meldola', 41, 'FC', 44.1278, 12.0589, 'comune');

-- RIMINI (provincia_id=47)
INSERT INTO hub_emilia_romagna (nome, tipo, comune, provincia_id, provincia_sigla, lat, lng, livello) VALUES
('Hub urbano Rimini', 'urbano', 'Rimini', 47, 'RN', 44.0678, 12.5695, 'capoluogo'),
('Hub prossimità Regina Elena Rimini', 'prossimita', 'Rimini', 47, 'RN', 44.0778, 12.5795, 'capoluogo'),
('Hub prossimità MarinaCentro Rimini', 'prossimita', 'Rimini', 47, 'RN', 44.0622, 12.5789, 'capoluogo'),
('Hub urbano Riccione Paese', 'urbano', 'Riccione', 47, 'RN', 43.9989, 12.6556, 'comune'),
('Hub urbano Ceccarini Dante Riccione', 'urbano', 'Riccione', 47, 'RN', 43.9956, 12.6522, 'comune'),
('Hub urbano Abissinia Riccione', 'urbano', 'Riccione', 47, 'RN', 44.0022, 12.6589, 'comune'),
('Hub urbano Cattolica Centro', 'urbano', 'Cattolica', 47, 'RN', 43.9622, 12.7389, 'comune');

-- ============================================================================
-- VERIFICA INSERIMENTO
-- ============================================================================
-- SELECT provincia_sigla, COUNT(*) as hub_count FROM hub_emilia_romagna GROUP BY provincia_sigla ORDER BY provincia_sigla;
-- Risultato atteso:
-- BO: 6, FE: 6, FC: 9, MO: 12, PR: 4, PC: 3, RA: 2, RE: 13, RN: 7
-- TOTALE: 62 HUB
