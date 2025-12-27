# Schema Database Completo - DMS Hub Production

**Data aggiornamento**: 22 Dicembre 2025  
**Branch**: production  
**Database**: neondb (PostgreSQL su Neon)  
**Totale tabelle**: 68  
**Totale campi**: 764  

---

## Indice

1. [Tabelle Core - Anagrafica](#tabelle-core---anagrafica)
2. [Tabelle Mercati](#tabelle-mercati)
3. [Tabelle Imprese e Qualificazioni](#tabelle-imprese-e-qualificazioni)
4. [Tabelle Agent/MIO](#tabelle-agentmio)
5. [Tabelle Sistema](#tabelle-sistema)
6. [Tabelle Integrazioni](#tabelle-integrazioni)
7. [Tabelle Legacy/Backup](#tabelle-legacybackup)
8. [Endpoint API](#endpoint-api)

---

## Tabelle Core - Anagrafica

### 1. `comuni` (48 kB)
Anagrafica dei comuni italiani.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| nome | varchar(255) | NO | - | Nome comune |
| provincia | varchar(2) | YES | - | Sigla provincia |
| regione | varchar(100) | YES | - | Nome regione |
| cap | varchar(10) | YES | - | CAP |
| codice_istat | varchar(10) | YES | - | Codice ISTAT |
| codice_catastale | varchar(10) | YES | - | Codice catastale |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (gestito localmente)

---

### 2. `settori_comune` (64 kB)
Settori/uffici dei comuni (SUAP, Polizia Locale, Tributi, ecc.).

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| comune_id | integer | NO | - | FK → comuni |
| tipo_settore | varchar(100) | NO | - | SUAP, POLIZIA_LOCALE, TRIBUTI, ecc. |
| nome_responsabile | varchar(255) | YES | - | - |
| email | varchar(255) | YES | - | - |
| pec | varchar(255) | YES | - | PEC ufficiale |
| telefono | varchar(50) | YES | - | - |
| indirizzo | text | YES | - | - |
| orari_apertura | text | YES | - | - |
| note | text | YES | - | - |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (gestito localmente)

---

### 3. `users` (24 kB)
Utenti del sistema.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| email | varchar(255) | NO | - | UNIQUE |
| password_hash | varchar(255) | YES | - | - |
| name | varchar(255) | YES | - | - |
| role | varchar(50) | YES | 'user' | admin, user, operator |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/auth/*`

---

## Tabelle Mercati

### 4. `markets` (48 kB)
Mercati rionali/comunali.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(255) | NO | - | Nome mercato |
| comune | varchar(255) | YES | - | Comune di appartenenza |
| address | text | YES | - | Indirizzo |
| latitude | decimal | YES | - | Coordinate GPS |
| longitude | decimal | YES | - | Coordinate GPS |
| total_stalls | integer | YES | 0 | Numero posteggi totali |
| market_type | varchar(50) | YES | - | coperto, scoperto, misto |
| opening_days | text | YES | - | Giorni apertura |
| opening_hours | text | YES | - | Orari |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/markets`, `/api/markets/:id`

---

### 5. `stalls` (240 kB)
Posteggi dei mercati.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| market_id | integer | NO | - | FK → markets |
| code | varchar(50) | NO | - | Codice posteggio (es. A1, B2) |
| sector | varchar(50) | YES | - | Settore merceologico |
| area_sqm | decimal | YES | - | Superficie mq |
| price_daily | decimal | YES | - | Tariffa giornaliera |
| price_monthly | decimal | YES | - | Tariffa mensile |
| status | varchar(50) | YES | 'available' | available, occupied, reserved, maintenance |
| latitude | decimal | YES | - | Coordinate GPS |
| longitude | decimal | YES | - | Coordinate GPS |
| polygon_coords | jsonb | YES | - | Coordinate poligono per mappa |
| notes | text | YES | - | - |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/markets/:marketId/stalls`

---

### 6. `autorizzazioni` (Nuova)
Autorizzazioni per il commercio itinerante (propedeutiche alla spunta).

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| vendor_id | integer | NO | - | FK → imprese |
| numero_autorizzazione | varchar(255) | NO | - | Numero documento |
| ente_rilascio | varchar(255) | NO | - | Comune/Ente |
| data_rilascio | date | NO | - | Data rilascio |
| data_scadenza | date | YES | - | Data scadenza |
| stato | varchar(50) | YES | 'ATTIVA' | ATTIVA, SCADUTA, SOSPESA, REVOCATA |
| note | text | YES | - | - |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/autorizzazioni`

---

### 7. `concessions` (112 kB)
Concessioni posteggi.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| stall_id | integer | NO | - | FK → stalls |
| company_id | integer | YES | - | FK → imprese/dms_companies |
| vendor_id | integer | YES | - | FK → vendors |
| concession_type | varchar(50) | YES | - | ordinaria, stagionale, spunta |
| start_date | date | NO | - | Data inizio |
| end_date | date | YES | - | Data fine |
| status | varchar(50) | YES | 'active' | active, expired, suspended, revoked |
| monthly_fee | decimal | YES | - | Canone mensile |
| notes | text | YES | - | - |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/markets/:marketId/concessions`, `/api/concessions`

---

### 7. `concession_payments` (16 kB)
Pagamenti canoni concessioni.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| concession_id | integer | NO | - | FK → concessions |
| amount | decimal | NO | - | Importo |
| payment_date | date | YES | - | Data pagamento |
| due_date | date | YES | - | Data scadenza |
| status | varchar(50) | YES | 'pending' | pending, paid, overdue |
| payment_method | varchar(50) | YES | - | - |
| receipt_number | varchar(100) | YES | - | - |
| notes | text | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (da implementare)

---

### 8. `vendors` (64 kB)
Operatori/venditori dei mercati.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| company_id | integer | YES | - | FK → imprese |
| first_name | varchar(100) | YES | - | - |
| last_name | varchar(100) | YES | - | - |
| fiscal_code | varchar(16) | YES | - | Codice fiscale |
| email | varchar(255) | YES | - | - |
| phone | varchar(50) | YES | - | - |
| badge_number | varchar(50) | YES | - | Numero tesserino |
| status | varchar(50) | YES | 'active' | active, inactive, suspended |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/vendors`

---

### 9. `vendor_presences` (16 kB)
Presenze giornaliere operatori.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| vendor_id | integer | NO | - | FK → vendors |
| stall_id | integer | YES | - | FK → stalls |
| date | date | NO | - | Data presenza |
| check_in_time | time | YES | - | Ora ingresso |
| check_out_time | time | YES | - | Ora uscita |
| status | varchar(50) | YES | - | present, absent, late |
| notes | text | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (da implementare)

---

### 10. `vendor_documents` (16 kB)
Documenti operatori.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| vendor_id | integer | NO | - | FK → vendors |
| document_type | varchar(100) | YES | - | Tipo documento |
| document_url | varchar(500) | YES | - | URL file |
| expiry_date | date | YES | - | Data scadenza |
| status | varchar(50) | YES | - | valid, expired, pending |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (da implementare)

---

### 11. `checkins` (8 kB)
Check-in operatori (spunta).

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| vendor_id | integer | YES | - | FK → vendors |
| stall_id | integer | YES | - | FK → stalls |
| market_id | integer | YES | - | FK → markets |
| checkin_time | timestamp | YES | now() | - |
| checkout_time | timestamp | YES | - | - |
| notes | text | YES | - | - |

**Endpoint API**: `/api/checkins`

---

### 12. `bookings` (16 kB)
Prenotazioni posteggi.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| stall_id | integer | NO | - | FK → stalls |
| vendor_id | integer | YES | - | FK → vendors |
| booking_date | date | NO | - | Data prenotazione |
| status | varchar(50) | YES | 'pending' | pending, confirmed, cancelled |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (da implementare)

---

### 13. `market_geometry` (16 kB)
Geometria mercati per mappe.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| market_id | integer | NO | - | FK → markets |
| geometry_type | varchar(50) | YES | - | polygon, point, line |
| coordinates | jsonb | YES | - | Coordinate GeoJSON |
| properties | jsonb | YES | - | Proprietà aggiuntive |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/markets/:id/geometry`

---

### 14. `inspections` (16 kB)
Ispezioni/controlli mercato.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| market_id | integer | YES | - | FK → markets |
| inspector_id | integer | YES | - | FK → users |
| inspection_date | date | YES | - | - |
| type | varchar(100) | YES | - | Tipo ispezione |
| result | varchar(50) | YES | - | passed, failed, pending |
| notes | text | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (da implementare)

---

### 15. `inspections_detailed` (16 kB)
Dettagli ispezioni.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| inspection_id | integer | NO | - | FK → inspections |
| check_item | varchar(255) | YES | - | Voce controllo |
| result | varchar(50) | YES | - | ok, warning, fail |
| notes | text | YES | - | - |

**Endpoint API**: Nessuno (da implementare)

---

### 16. `violations` (16 kB)
Violazioni/sanzioni.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| vendor_id | integer | YES | - | FK → vendors |
| inspection_id | integer | YES | - | FK → inspections |
| violation_type | varchar(100) | YES | - | Tipo violazione |
| description | text | YES | - | - |
| fine_amount | decimal | YES | - | Importo sanzione |
| status | varchar(50) | YES | 'pending' | pending, paid, contested |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (da implementare)

---

## Tabelle Imprese e Qualificazioni

### 17. `imprese` (160 kB)
Anagrafica imprese.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| ragione_sociale | varchar(255) | NO | - | - |
| partita_iva | varchar(11) | YES | - | - |
| codice_fiscale | varchar(16) | YES | - | - |
| indirizzo | text | YES | - | - |
| comune | varchar(255) | YES | - | - |
| provincia | varchar(2) | YES | - | - |
| cap | varchar(10) | YES | - | - |
| telefono | varchar(50) | YES | - | - |
| email | varchar(255) | YES | - | - |
| pec | varchar(255) | YES | - | - |
| settore | varchar(100) | YES | - | Settore merceologico |
| referente | varchar(255) | YES | - | Nome referente |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/imprese`, `/api/imprese/:id`

---

### 18. `qualificazioni` (96 kB)
Qualificazioni/certificazioni imprese.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| impresa_id | integer | NO | - | FK → imprese |
| tipo | varchar(100) | NO | - | DURC, HACCP, ISO 9001, CONCESSIONE, ecc. |
| numero_certificato | varchar(100) | YES | - | - |
| ente_rilascio | varchar(255) | YES | - | - |
| data_rilascio | date | YES | - | - |
| data_scadenza | date | YES | - | - |
| stato | varchar(50) | YES | 'ATTIVA' | ATTIVA, SCADUTA, IN_VERIFICA |
| note | text | YES | - | - |
| documento_url | varchar(500) | YES | - | URL documento |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/qualificazioni`, `/api/imprese/:id/qualificazioni`

---

### 19. `qualification_types` (80 kB)
Tipi di qualificazione.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| code | varchar(50) | NO | - | DURC, HACCP, ISO9001, ecc. |
| name | varchar(255) | NO | - | Nome esteso |
| description | text | YES | - | - |
| validity_months | integer | YES | - | Durata validità |
| required_for | varchar(100) | YES | - | Per quali attività è richiesto |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (da implementare)

---

### 20. `enterprise_qualifications` (56 kB)
⚠️ **Potenziale duplicato di `qualificazioni`**

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| enterprise_id | integer | YES | - | FK |
| qualification_type_id | integer | YES | - | FK → qualification_types |
| holder_type | varchar(50) | YES | - | - |
| issue_date | date | YES | - | - |
| expiry_date | date | YES | - | - |
| status | varchar(50) | YES | - | - |
| document_url | varchar(500) | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 21. `enterprise_employees` (40 kB)
Dipendenti imprese.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| enterprise_id | integer | YES | - | FK → imprese |
| first_name | varchar(100) | YES | - | - |
| last_name | varchar(100) | YES | - | - |
| fiscal_code | varchar(16) | YES | - | - |
| role | varchar(100) | YES | - | - |
| email | varchar(255) | YES | - | - |
| phone | varchar(50) | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (da implementare)

---

### 22. `dms_companies` (80 kB)
⚠️ **Potenziale duplicato di `imprese`** - Tabella legacy DMS

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(255) | YES | - | Ragione sociale |
| vat_number | varchar(11) | YES | - | P.IVA |
| fiscal_code | varchar(16) | YES | - | CF |
| address | text | YES | - | - |
| city | varchar(255) | YES | - | - |
| province | varchar(2) | YES | - | - |
| zip_code | varchar(10) | YES | - | - |
| phone | varchar(50) | YES | - | - |
| email | varchar(255) | YES | - | - |
| pec | varchar(255) | YES | - | - |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (legacy)

---

### 23. `dms_durc_snapshots` (32 kB)
Snapshot DURC imprese.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| company_id | integer | YES | - | FK → dms_companies |
| durc_status | varchar(50) | YES | - | regolare, irregolare |
| check_date | date | YES | - | Data verifica |
| expiry_date | date | YES | - | Data scadenza |
| protocol_number | varchar(100) | YES | - | - |
| source | varchar(100) | YES | - | INPS, INAIL, ecc. |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 24. `dms_suap_instances` (96 kB)
Istanze SUAP.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| company_id | integer | YES | - | FK |
| instance_type | varchar(100) | YES | - | SCIA, autorizzazione, ecc. |
| protocol_number | varchar(100) | YES | - | - |
| submission_date | date | YES | - | - |
| status | varchar(50) | YES | - | pending, approved, rejected |
| comune | varchar(255) | YES | - | - |
| notes | text | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

## Tabelle Agent/MIO

### 25. `agents` (32 kB)
Configurazione agenti AI.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(100) | NO | - | Nome agente |
| type | varchar(50) | YES | - | Tipo agente |
| status | varchar(50) | YES | 'active' | - |
| config | jsonb | YES | - | Configurazione |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/agents`

---

### 26. `agent_brain` (16 kB)
Memoria agenti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| agent | varchar(100) | NO | - | Nome agente |
| memory_type | varchar(50) | YES | - | short, long, episodic |
| key | varchar(255) | YES | - | Chiave memoria |
| value | text | YES | - | Valore |
| confidence | integer | YES | - | Confidenza 0-100 |
| expires_at | timestamp | YES | - | Scadenza |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (interno)

---

### 27. `agent_context` (24 kB)
Contesto conversazioni agenti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| conversation_id | varchar(100) | YES | - | ID conversazione |
| agent | varchar(100) | YES | - | - |
| context_data | jsonb | YES | - | Dati contesto |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (interno)

---

### 28. `agent_conversations` (224 kB)
Conversazioni agenti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| conversation_id | varchar(100) | NO | - | UNIQUE |
| agent | varchar(100) | YES | - | - |
| user_id | integer | YES | - | FK → users |
| status | varchar(50) | YES | 'active' | - |
| started_at | timestamp | YES | now() | - |
| ended_at | timestamp | YES | - | - |
| summary | text | YES | - | - |

**Endpoint API**: `/api/conversations`

---

### 29. `agent_messages` (1680 kB)
Messaggi conversazioni agenti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| conversation_id | varchar(100) | NO | - | FK |
| role | varchar(50) | NO | - | user, assistant, system |
| content | text | NO | - | Contenuto messaggio |
| tokens | integer | YES | - | Token utilizzati |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/conversations/:id/messages`

---

### 30. `agent_tasks` (24 kB)
Task agenti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| agent | varchar(100) | YES | - | - |
| task_type | varchar(100) | YES | - | - |
| status | varchar(50) | YES | 'pending' | - |
| input | jsonb | YES | - | Input task |
| output | jsonb | YES | - | Output task |
| error | text | YES | - | Errore |
| created_at | timestamp | YES | now() | - |
| completed_at | timestamp | YES | - | - |

**Endpoint API**: `/api/mihub/tasks`

---

### 31. `agent_projects` (24 kB)
Progetti agenti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(255) | NO | - | - |
| description | text | YES | - | - |
| status | varchar(50) | YES | 'active' | - |
| config | jsonb | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 32. `agent_screenshots` (3904 kB)
Screenshot agenti (più grande!).

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| task_id | integer | YES | - | FK → agent_tasks |
| url | varchar(500) | YES | - | URL pagina |
| screenshot_url | varchar(500) | YES | - | URL screenshot |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (interno)

---

### 33. `mio_agent_logs` (656 kB)
Log agente MIO.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| timestamp | timestamp | YES | now() | - |
| agent | varchar(100) | YES | - | - |
| service_id | varchar(100) | YES | - | - |
| endpoint | varchar(255) | YES | - | - |
| method | varchar(10) | YES | - | GET, POST, ecc. |
| status_code | integer | YES | - | - |
| success | boolean | YES | - | - |
| message | text | YES | - | - |
| meta | jsonb | YES | - | Metadati |

**Endpoint API**: `/api/mihub/logs`

---

### 34. `workspace_snapshots` (432 kB)
Snapshot workspace agenti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| workspace_id | varchar(100) | YES | - | - |
| snapshot_data | jsonb | YES | - | Dati snapshot |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (interno)

---

## Tabelle Sistema

### 35. `notifications` (16 kB)
Notifiche sistema.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| user_id | integer | YES | - | FK → users |
| type | varchar(50) | YES | - | email, sms, push |
| title | varchar(255) | YES | - | - |
| message | text | YES | - | - |
| status | varchar(50) | YES | 'pending' | pending, sent, failed |
| sent_at | timestamp | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/notifications`

---

### 36. `audit_logs` (16 kB)
Log audit.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| user_id | integer | YES | - | FK → users |
| action | varchar(100) | YES | - | Azione eseguita |
| entity_type | varchar(100) | YES | - | Tipo entità |
| entity_id | integer | YES | - | ID entità |
| old_value | jsonb | YES | - | Valore precedente |
| new_value | jsonb | YES | - | Nuovo valore |
| ip_address | varchar(50) | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 37. `system_logs` (16 kB)
Log sistema.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| level | varchar(20) | YES | - | info, warn, error |
| message | text | YES | - | - |
| source | varchar(100) | YES | - | - |
| meta | jsonb | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 38. `system_events` (24 kB)
Eventi sistema.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| event_type | varchar(100) | YES | - | - |
| payload | jsonb | YES | - | - |
| processed | boolean | YES | false | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 39. `data_bag` (24 kB)
Storage generico chiave-valore.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| key | varchar(255) | NO | - | UNIQUE |
| value | jsonb | YES | - | - |
| expires_at | timestamp | YES | - | - |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

## Tabelle Integrazioni

### 40. `api_keys` (24 kB)
Chiavi API.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(255) | YES | - | Nome chiave |
| key_hash | varchar(255) | NO | - | Hash chiave |
| user_id | integer | YES | - | FK → users |
| permissions | jsonb | YES | - | Permessi |
| last_used_at | timestamp | YES | - | - |
| expires_at | timestamp | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/api-keys`

---

### 41. `api_metrics` (16 kB)
Metriche API.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| endpoint | varchar(255) | YES | - | - |
| method | varchar(10) | YES | - | - |
| status_code | integer | YES | - | - |
| response_time_ms | integer | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 42. `webhooks` (16 kB)
Configurazione webhook.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(255) | YES | - | - |
| url | varchar(500) | NO | - | URL destinazione |
| events | jsonb | YES | - | Eventi sottoscritti |
| secret | varchar(255) | YES | - | Secret per firma |
| status | varchar(50) | YES | 'active' | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: `/api/webhooks`

---

### 43. `webhook_logs` (16 kB)
Log webhook.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| webhook_id | integer | YES | - | FK → webhooks |
| event | varchar(100) | YES | - | - |
| payload | jsonb | YES | - | - |
| response_code | integer | YES | - | - |
| success | boolean | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 44. `external_connections` (16 kB)
Connessioni esterne.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(255) | YES | - | - |
| type | varchar(100) | YES | - | database, api, ftp |
| config | jsonb | YES | - | Configurazione |
| status | varchar(50) | YES | - | - |
| last_check | timestamp | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 45. `secrets` (32 kB)
Segreti/credenziali.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(255) | NO | - | UNIQUE |
| value_encrypted | text | YES | - | Valore criptato |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (interno)

---

### 46. `secrets_meta` (32 kB)
Metadati segreti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| secret_id | integer | YES | - | FK → secrets |
| key | varchar(255) | YES | - | - |
| value | text | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (interno)

---

### 47. `secure_credentials` (80 kB)
Credenziali sicure.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| service | varchar(255) | NO | - | Nome servizio |
| username | varchar(255) | YES | - | - |
| password_encrypted | text | YES | - | - |
| api_key_encrypted | text | YES | - | - |
| extra_data | jsonb | YES | - | - |
| created_at | timestamp | YES | now() | - |
| updated_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno (interno)

---

## Altre Tabelle

### 48. `products` (16 kB)
Prodotti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(255) | YES | - | - |
| category | varchar(100) | YES | - | - |
| price | decimal | YES | - | - |
| vendor_id | integer | YES | - | FK → vendors |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 49. `product_tracking` (24 kB)
Tracciamento prodotti.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| product_id | integer | YES | - | FK → products |
| batch_number | varchar(100) | YES | - | - |
| origin | varchar(255) | YES | - | - |
| certifications | jsonb | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 50. `shops` (16 kB)
Negozi.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| name | varchar(255) | YES | - | - |
| address | text | YES | - | - |
| vendor_id | integer | YES | - | FK → vendors |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 51. `transactions` (16 kB)
Transazioni.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| type | varchar(50) | YES | - | - |
| amount | decimal | YES | - | - |
| from_entity | varchar(255) | YES | - | - |
| to_entity | varchar(255) | YES | - | - |
| status | varchar(50) | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 52. `fund_transactions` (16 kB)
Transazioni fondi.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| type | varchar(50) | YES | - | - |
| source | varchar(255) | YES | - | - |
| amount | integer | YES | - | - |
| description | text | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 53. `reimbursements` (8 kB)
Rimborsi.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| user_id | integer | YES | - | FK → users |
| amount | decimal | YES | - | - |
| reason | text | YES | - | - |
| status | varchar(50) | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 54. `civic_reports` (16 kB)
Segnalazioni civiche.

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| user_id | integer | YES | - | FK → users |
| category | varchar(100) | YES | - | - |
| description | text | YES | - | - |
| location | jsonb | YES | - | Coordinate |
| status | varchar(50) | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 55. `mobility_data` (16 kB)
Dati mobilità (TPER Bologna).

| Campo | Tipo | Nullable | Default | Note |
|-------|------|----------|---------|------|
| id | serial | NO | auto | PK |
| source | varchar(100) | YES | - | TPER, ecc. |
| data_type | varchar(100) | YES | - | - |
| payload | jsonb | YES | - | - |
| created_at | timestamp | YES | now() | - |

**Endpoint API**: Nessuno

---

### 56-60. Tabelle Sostenibilità

- `carbon_credits_config` (16 kB)
- `carbon_footprint` (8 kB)
- `ecocredits` (8 kB)
- `sustainability_metrics` (8 kB)

**Endpoint API**: Nessuno

---

### 61-62. Tabelle Analytics

- `business_analytics` (8 kB)
- `user_analytics` (8 kB)

**Endpoint API**: Nessuno

---

### 63-64. Tabelle Mappe

- `custom_areas` (16 kB)
- `custom_markers` (16 kB)

**Endpoint API**: Nessuno

---

### 65. `extended_users` (8 kB)
Utenti estesi.

**Endpoint API**: Nessuno

---

### 66. `v_enterprise_compliance` (0 bytes)
Vista compliance imprese.

**Tipo**: VIEW (non tabella)

---

## Tabelle Legacy/Backup

### 67. `agent_logs_backup_20251204_174125` (280 kB)
⚠️ **Backup vecchio - candidato per eliminazione**

### 68. `agent_messages_backup_20251204_174125` (496 kB)
⚠️ **Backup vecchio - candidato per eliminazione**

### 69. `chat_messages_old` (40 kB)
⚠️ **Vecchia tabella chat - candidato per eliminazione**

---

## Endpoint API

### Base URL
- **Produzione**: `https://api.mio-hub.me`
- **Locale**: `http://localhost:3000`

### Endpoint Implementati

| Endpoint | Metodo | Descrizione | Tabella |
|----------|--------|-------------|---------|
| `/api/imprese` | GET | Lista imprese | imprese |
| `/api/imprese/:id` | GET | Dettaglio impresa | imprese |
| `/api/qualificazioni` | GET | Lista qualificazioni | qualificazioni |
| `/api/imprese/:id/qualificazioni` | GET | Qualificazioni impresa | qualificazioni |
| `/api/markets` | GET | Lista mercati | markets |
| `/api/markets/:id` | GET | Dettaglio mercato | markets |
| `/api/markets/:id/stalls` | GET | Posteggi mercato | stalls |
| `/api/markets/:id/concessions` | GET | Concessioni mercato | concessions |
| `/api/vendors` | GET | Lista venditori | vendors |
| `/api/mihub/tasks` | GET/POST | Task agenti | agent_tasks |
| `/api/mihub/logs` | GET | Log agenti | mio_agent_logs |
| `/api/logs/*` | GET/POST | Log sistema | system_logs |
| `/api/guardian/*` | GET/POST | Guardian API | - |
| `/api/notifications` | GET/POST | Notifiche | notifications |

### Endpoint da Implementare

| Endpoint | Metodo | Descrizione | Tabella |
|----------|--------|-------------|---------|
| `/api/comuni` | GET | Lista comuni | comuni |
| `/api/comuni/:id/settori` | GET | Settori comune | settori_comune |
| `/api/concessions` | GET | Tutte le concessioni | concessions |
| `/api/qualification-types` | GET | Tipi qualificazione | qualification_types |
| `/api/inspections` | GET/POST | Ispezioni | inspections |
| `/api/violations` | GET/POST | Violazioni | violations |
| `/api/bookings` | GET/POST | Prenotazioni | bookings |

---

## Note Finali

### Tabelle da Rimuovere (Candidati)
1. `agent_logs_backup_20251204_174125` - Backup vecchio
2. `agent_messages_backup_20251204_174125` - Backup vecchio
3. `chat_messages_old` - Vecchia tabella chat

### Tabelle Duplicate (Da Verificare)
1. `dms_companies` vs `imprese` - Potrebbero essere unite
2. `enterprise_qualifications` vs `qualificazioni` - Potrebbero essere unite

### Spazio Totale Stimato
~10 MB (la maggior parte occupata dalle tabelle agent_*)
