-- ============================================================================
-- MIGRATION: Estensione hub_locations per HUB Emilia Romagna
-- Data: 8 Gennaio 2026
-- Versione: 3.26.0
-- ============================================================================

-- STEP 1: Aggiungere nuove colonne a hub_locations
ALTER TABLE hub_locations 
ADD COLUMN IF NOT EXISTS provincia_id INTEGER REFERENCES province(id),
ADD COLUMN IF NOT EXISTS regione_id INTEGER,
ADD COLUMN IF NOT EXISTS livello VARCHAR(20) DEFAULT 'capoluogo',
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50) DEFAULT 'urbano',
ADD COLUMN IF NOT EXISTS provincia_sigla VARCHAR(2);

-- STEP 2: Aggiornare HUB esistenti con provincia_id e regione_id
-- Bologna (id=13) → provincia_id=39, regione_id=8
UPDATE hub_locations SET provincia_id = 39, regione_id = 8, livello = 'capoluogo', provincia_sigla = 'BO' WHERE id = 13;

-- Modena (id=19) → provincia_id=42, regione_id=8, ma come "provincia" (colore tenue)
UPDATE hub_locations SET provincia_id = 42, regione_id = 8, livello = 'provincia', provincia_sigla = 'MO' WHERE id = 19;

-- Grosseto (id=7) → provincia_id=53 (Grosseto), regione_id=9 (Toscana)
UPDATE hub_locations SET provincia_id = 53, regione_id = 9, livello = 'capoluogo', provincia_sigla = 'GR' WHERE id = 7;

-- STEP 3: Inserire nuovi HUB Emilia Romagna
-- ============================================================================

-- BOLOGNA (provincia_id=39) - Solo comuni (capoluogo già esiste id=13)
INSERT INTO hub_locations (name, address, city, center_lat, center_lng, lat, lng, provincia_id, regione_id, livello, tipo, provincia_sigla, is_independent, active) VALUES
('Hub urbano Budrio', 'Centro', 'Budrio', 44.5374, 11.5351, 44.5374, 11.5351, 39, 8, 'comune', 'urbano', 'BO', 1, 1),
('Hub prossimità Vergato', 'Centro', 'Vergato', 44.2819, 11.1122, 44.2819, 11.1122, 39, 8, 'comune', 'prossimita', 'BO', 1, 1),
('Hub urbano Castel San Pietro Terme', 'Centro', 'Castel San Pietro Terme', 44.3989, 11.5878, 44.3989, 11.5878, 39, 8, 'comune', 'urbano', 'BO', 1, 1),
('Hub urbano Casalecchio', 'Centro', 'Casalecchio di Reno', 44.4733, 11.2756, 44.4733, 11.2756, 39, 8, 'comune', 'urbano', 'BO', 1, 1),
('Hub urbano Centro Storico Imola', 'Centro Storico', 'Imola', 44.3531, 11.7148, 44.3531, 11.7148, 39, 8, 'comune', 'urbano', 'BO', 1, 1);

-- MODENA (provincia_id=42) - Solo comuni (capoluogo già esiste id=19 come "provincia")
INSERT INTO hub_locations (name, address, city, center_lat, center_lng, lat, lng, provincia_id, regione_id, livello, tipo, provincia_sigla, is_independent, active) VALUES
('Hub urbano Pievepelago', 'Centro', 'Pievepelago', 44.2089, 10.6167, 44.2089, 10.6167, 42, 8, 'comune', 'urbano', 'MO', 1, 1),
('Hub urbano Fiorano', 'Centro', 'Fiorano Modenese', 44.5389, 10.8156, 44.5389, 10.8156, 42, 8, 'comune', 'urbano', 'MO', 1, 1),
('Hub urbano Fiumalbo', 'Centro', 'Fiumalbo', 44.1789, 10.6489, 44.1789, 10.6489, 42, 8, 'comune', 'urbano', 'MO', 1, 1),
('Hub prossimità SantAnna San Cesario', 'Sant''Anna', 'San Cesario sul Panaro', 44.5622, 11.0356, 44.5622, 11.0356, 42, 8, 'comune', 'prossimita', 'MO', 1, 1),
('Hub prossimità Spezzano Fiorano', 'Spezzano', 'Fiorano Modenese', 44.5267, 10.8089, 44.5267, 10.8089, 42, 8, 'comune', 'prossimita', 'MO', 1, 1),
('Hub urbano Vignola Centro', 'Centro', 'Vignola', 44.4789, 11.0089, 44.4789, 11.0089, 42, 8, 'comune', 'urbano', 'MO', 1, 1),
('Hub urbano Formigine', 'Centro', 'Formigine', 44.5722, 10.8478, 44.5722, 10.8478, 42, 8, 'comune', 'urbano', 'MO', 1, 1),
('Hub urbano Concordia', 'Centro', 'Concordia sulla Secchia', 44.9122, 10.9822, 44.9122, 10.9822, 42, 8, 'comune', 'urbano', 'MO', 1, 1),
('Hub urbano Sassuolo', 'Centro', 'Sassuolo', 44.5422, 10.7856, 44.5422, 10.7856, 42, 8, 'comune', 'urbano', 'MO', 1, 1),
('Hub urbano San Cesario sul Panaro', 'Centro', 'San Cesario sul Panaro', 44.5622, 11.0356, 44.5622, 11.0356, 42, 8, 'comune', 'urbano', 'MO', 1, 1),
('Hub urbano Centro storico Carpi', 'Centro Storico', 'Carpi', 44.7833, 10.8833, 44.7833, 10.8833, 42, 8, 'comune', 'urbano', 'MO', 1, 1);

-- REGGIO EMILIA (provincia_id=46) - Capoluogo + Comuni
INSERT INTO hub_locations (name, address, city, center_lat, center_lng, lat, lng, provincia_id, regione_id, livello, tipo, provincia_sigla, is_independent, active) VALUES
('Hub urbano Reggio Emilia', 'Centro', 'Reggio Emilia', 44.6989, 10.6297, 44.6989, 10.6297, 46, 8, 'capoluogo', 'urbano', 'RE', 1, 1),
('Hub prossimità Correggio', 'Centro', 'Correggio', 44.7722, 10.7822, 44.7722, 10.7822, 46, 8, 'comune', 'prossimita', 'RE', 1, 1),
('Hub prossimità Arceto Scandiano', 'Arceto', 'Scandiano', 44.5956, 10.6889, 44.5956, 10.6889, 46, 8, 'comune', 'prossimita', 'RE', 1, 1),
('Hub prossimità Villanova Reggiolo', 'Villanova', 'Reggiolo', 44.9167, 10.8167, 44.9167, 10.8167, 46, 8, 'comune', 'prossimita', 'RE', 1, 1),
('Hub prossimità Brugneto Reggiolo', 'Brugneto', 'Reggiolo', 44.9089, 10.8089, 44.9089, 10.8089, 46, 8, 'comune', 'prossimita', 'RE', 1, 1),
('Hub prossimità Novellara', 'Centro', 'Novellara', 44.8456, 10.7289, 44.8456, 10.7289, 46, 8, 'comune', 'prossimita', 'RE', 1, 1),
('Hub prossimità Guastalla', 'Centro', 'Guastalla', 44.9222, 10.6556, 44.9222, 10.6556, 46, 8, 'comune', 'prossimita', 'RE', 1, 1),
('Hub urbano Scandiano', 'Centro', 'Scandiano', 44.5956, 10.6889, 44.5956, 10.6889, 46, 8, 'comune', 'urbano', 'RE', 1, 1),
('Hub urbano Campagnola', 'Centro', 'Campagnola Emilia', 44.8389, 10.7556, 44.8389, 10.7556, 46, 8, 'comune', 'urbano', 'RE', 1, 1),
('Hub urbano Reggiolo', 'Centro', 'Reggiolo', 44.9167, 10.8167, 44.9167, 10.8167, 46, 8, 'comune', 'urbano', 'RE', 1, 1);

-- PARMA (provincia_id=43) - Capoluogo + Comuni
INSERT INTO hub_locations (name, address, city, center_lat, center_lng, lat, lng, provincia_id, regione_id, livello, tipo, provincia_sigla, is_independent, active) VALUES
('Hub urbano Parma', 'Centro', 'Parma', 44.8015, 10.3279, 44.8015, 10.3279, 43, 8, 'capoluogo', 'urbano', 'PR', 1, 1),
('Hub urbano Fidenza', 'Centro', 'Fidenza', 44.8667, 10.0611, 44.8667, 10.0611, 43, 8, 'comune', 'urbano', 'PR', 1, 1),
('Hub urbano Busseto Centro', 'Centro', 'Busseto', 44.9789, 10.0422, 44.9789, 10.0422, 43, 8, 'comune', 'urbano', 'PR', 1, 1),
('Hub urbano Salsomaggiore Terme', 'Centro', 'Salsomaggiore Terme', 44.8167, 9.9833, 44.8167, 9.9833, 43, 8, 'comune', 'urbano', 'PR', 1, 1);

-- PIACENZA (provincia_id=44) - Capoluogo + Comuni
INSERT INTO hub_locations (name, address, city, center_lat, center_lng, lat, lng, provincia_id, regione_id, livello, tipo, provincia_sigla, is_independent, active) VALUES
('Hub urbano Piacenza', 'Centro', 'Piacenza', 45.0526, 9.6930, 45.0526, 9.6930, 44, 8, 'capoluogo', 'urbano', 'PC', 1, 1),
('Hub urbano Calendasco', 'Centro', 'Calendasco', 45.0789, 9.5889, 45.0789, 9.5889, 44, 8, 'comune', 'urbano', 'PC', 1, 1),
('Hub urbano Vernasca', 'Centro', 'Vernasca', 44.8022, 9.8289, 44.8022, 9.8289, 44, 8, 'comune', 'urbano', 'PC', 1, 1);

-- FERRARA (provincia_id=40) - Capoluogo + Comuni
INSERT INTO hub_locations (name, address, city, center_lat, center_lng, lat, lng, provincia_id, regione_id, livello, tipo, provincia_sigla, is_independent, active) VALUES
('Hub urbano Ferrara', 'Centro', 'Ferrara', 44.8381, 11.6198, 44.8381, 11.6198, 40, 8, 'capoluogo', 'urbano', 'FE', 1, 1),
('Hub urbano Codigoro', 'Centro', 'Codigoro', 44.8322, 12.1089, 44.8322, 12.1089, 40, 8, 'comune', 'urbano', 'FE', 1, 1),
('Hub urbano Tresigallo Tresignana', 'Centro', 'Tresignana', 44.8167, 11.8833, 44.8167, 11.8833, 40, 8, 'comune', 'urbano', 'FE', 1, 1),
('Hub urbano Formignana Tresignana', 'Centro', 'Tresignana', 44.8389, 11.8556, 44.8389, 11.8556, 40, 8, 'comune', 'urbano', 'FE', 1, 1),
('Hub prossimità Ferrara', 'Periferia', 'Ferrara', 44.8481, 11.6298, 44.8481, 11.6298, 40, 8, 'capoluogo', 'prossimita', 'FE', 1, 1),
('Hub urbano Cento', 'Centro', 'Cento', 44.7267, 11.2889, 44.7267, 11.2889, 40, 8, 'comune', 'urbano', 'FE', 1, 1);

-- RAVENNA (provincia_id=45) - Capoluogo + Comuni
INSERT INTO hub_locations (name, address, city, center_lat, center_lng, lat, lng, provincia_id, regione_id, livello, tipo, provincia_sigla, is_independent, active) VALUES
('Hub urbano Ravenna', 'Centro', 'Ravenna', 44.4184, 12.2035, 44.4184, 12.2035, 45, 8, 'capoluogo', 'urbano', 'RA', 1, 1),
('Hub urbano Cervia Centro', 'Centro', 'Cervia', 44.2622, 12.3489, 44.2622, 12.3489, 45, 8, 'comune', 'urbano', 'RA', 1, 1);

-- FORLÌ-CESENA (provincia_id=41) - Capoluogo + Comuni
INSERT INTO hub_locations (name, address, city, center_lat, center_lng, lat, lng, provincia_id, regione_id, livello, tipo, provincia_sigla, is_independent, active) VALUES
('Hub urbano Cesena', 'Centro', 'Cesena', 44.1378, 12.2422, 44.1378, 12.2422, 41, 8, 'capoluogo', 'urbano', 'FC', 1, 1),
('Hub prossimità Bagno di Romagna', 'Centro', 'Bagno di Romagna', 43.8333, 11.9667, 43.8333, 11.9667, 41, 8, 'comune', 'prossimita', 'FC', 1, 1),
('Hub prossimità Ranchio Sarsina', 'Ranchio', 'Sarsina', 43.9167, 12.1333, 43.9167, 12.1333, 41, 8, 'comune', 'prossimita', 'FC', 1, 1),
('Hub prossimità Le Vigne Cesena', 'Le Vigne', 'Cesena', 44.1478, 12.2522, 44.1478, 12.2522, 41, 8, 'capoluogo', 'prossimita', 'FC', 1, 1),
('Hub prossimità Magnani Oltrepo Cesena', 'Magnani-Oltrepo', 'Cesena', 44.1278, 12.2322, 44.1278, 12.2322, 41, 8, 'capoluogo', 'prossimita', 'FC', 1, 1),
('Hub urbano Bagno di Romagna', 'Centro', 'Bagno di Romagna', 43.8333, 11.9667, 43.8333, 11.9667, 41, 8, 'comune', 'urbano', 'FC', 1, 1),
('Hub urbano Sarsina', 'Centro', 'Sarsina', 43.9167, 12.1333, 43.9167, 12.1333, 41, 8, 'comune', 'urbano', 'FC', 1, 1),
('Hub urbano Forlimpopoli', 'Centro', 'Forlimpopoli', 44.1889, 12.1278, 44.1889, 12.1278, 41, 8, 'comune', 'urbano', 'FC', 1, 1),
('Hub urbano Meldola', 'Centro', 'Meldola', 44.1278, 12.0589, 44.1278, 12.0589, 41, 8, 'comune', 'urbano', 'FC', 1, 1);

-- RIMINI (provincia_id=47) - Capoluogo + Comuni
INSERT INTO hub_locations (name, address, city, center_lat, center_lng, lat, lng, provincia_id, regione_id, livello, tipo, provincia_sigla, is_independent, active) VALUES
('Hub urbano Rimini', 'Centro', 'Rimini', 44.0678, 12.5695, 44.0678, 12.5695, 47, 8, 'capoluogo', 'urbano', 'RN', 1, 1),
('Hub prossimità Regina Elena Rimini', 'Regina Elena', 'Rimini', 44.0778, 12.5795, 44.0778, 12.5795, 47, 8, 'capoluogo', 'prossimita', 'RN', 1, 1),
('Hub prossimità MarinaCentro Rimini', 'Marina Centro', 'Rimini', 44.0622, 12.5789, 44.0622, 12.5789, 47, 8, 'capoluogo', 'prossimita', 'RN', 1, 1),
('Hub urbano Riccione Paese', 'Centro', 'Riccione', 43.9989, 12.6556, 43.9989, 12.6556, 47, 8, 'comune', 'urbano', 'RN', 1, 1),
('Hub urbano Ceccarini Dante Riccione', 'Viale Ceccarini', 'Riccione', 43.9956, 12.6522, 43.9956, 12.6522, 47, 8, 'comune', 'urbano', 'RN', 1, 1),
('Hub urbano Abissinia Riccione', 'Abissinia', 'Riccione', 44.0022, 12.6589, 44.0022, 12.6589, 47, 8, 'comune', 'urbano', 'RN', 1, 1),
('Hub urbano Cattolica Centro', 'Centro', 'Cattolica', 43.9622, 12.7389, 43.9622, 12.7389, 47, 8, 'comune', 'urbano', 'RN', 1, 1);

-- ============================================================================
-- VERIFICA INSERIMENTO
-- ============================================================================
-- SELECT provincia_sigla, livello, COUNT(*) as hub_count 
-- FROM hub_locations 
-- WHERE regione_id = 8 
-- GROUP BY provincia_sigla, livello 
-- ORDER BY provincia_sigla, livello;
