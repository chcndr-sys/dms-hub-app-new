# DATABASE_INVENTORY_COMPLETO.md

> **Generato automaticamente da Manus** — 14 February 2026, 22:35 UTC  
> **Database:** Neon PostgreSQL (`neondb` su `ep-bold-silence-adftsojg-pooler.c-2.us-east-1.aws.neon.tech`)  
> **Backend:** Hetzner 157.90.29.66 (`mihub-backend-rest` v1.1.0)  
> **Scopo:** Inventario completo per allineamento con MASTER_BLUEPRINT_MIOHUB.md

---

## SEZIONE 1: TABELLE

### 1.1 Riepilogo

| Metrica | Valore |
|---|---|
| **Tabelle totali** | 149 |
| **Colonne totali** | 2021 |
| **Righe totali (stima)** | 372,143 |
| **Indici totali** | 409 |
| **Trigger** | 9 |
| **Funzioni** | 37 |

### 1.2 Conteggio Righe per Tabella

| # | Tabella | Righe (COUNT) | Righe (pg_stat) |
|---|---|---|---|
| 1 | `mio_agent_logs` | 326,543 | 326,543 |
| 2 | `gtfs_stops` | 23,930 | 23,930 |
| 3 | `mobility_data` | 9,554 | 9,554 |
| 4 | `agent_messages` | 3,850 | 3,850 |
| 5 | `cultural_pois` | 1,127 | 1,127 |
| 6 | `wallet_transactions` | 1,058 | 1,058 |
| 7 | `notifiche_destinatari` | 938 | 938 |
| 8 | `agent_messages_backup_20251204_174125` | 745 | 0 |
| 9 | `stalls` | 583 | 583 |
| 10 | `market_session_details` | 500 | 500 |
| 11 | `agent_conversations` | 415 | 415 |
| 12 | `market_sessions` | 394 | 394 |
| 13 | `security_events` | 364 | 364 |
| 14 | `agent_logs_backup_20251204_174125` | 360 | 0 |
| 15 | `notifiche` | 337 | 337 |
| 16 | `role_permissions` | 285 | 285 |
| 17 | `login_attempts` | 270 | 270 |
| 18 | `suap_checks` | 232 | 232 |
| 19 | `wallet_history` | 132 | 132 |
| 20 | `province` | 107 | 107 |
| 21 | `transactions` | 106 | 107 |
| 22 | `permissions` | 102 | 102 |
| 23 | `settori_comune` | 94 | 94 |
| 24 | `wallets` | 89 | 89 |
| 25 | `hub_locations` | 79 | 79 |
| 26 | `wallet_scadenze` | 68 | 68 |
| 27 | `user_sessions` | 66 | 66 |
| 28 | `graduatoria_presenze` | 52 | 52 |
| 29 | `vendor_presences` | 52 | 52 |
| 30 | `spend_qr_tokens` | 49 | 49 |
| 31 | `suap_eventi` | 48 | 48 |
| 32 | `qualificazioni` | 42 | 42 |
| 33 | `gtfs_routes` | 37 | 37 |
| 34 | `civic_reports` | 36 | 36 |
| 35 | `sanctions` | 36 | 36 |
| 36 | `imprese` | 34 | 34 |
| 37 | `pm_watchlist` | 32 | 32 |
| 38 | `market_transgressions` | 31 | 31 |
| 39 | `concessions` | 30 | 30 |
| 40 | `domande_spunta` | 29 | 29 |
| 41 | `suap_pratiche` | 28 | 28 |
| 42 | `fund_transactions` | 24 | 24 |
| 43 | `servizi_associazioni` | 24 | 24 |
| 44 | `suap_decisioni` | 22 | 22 |
| 45 | `operator_daily_wallet` | 21 | 21 |
| 46 | `infraction_types` | 20 | 20 |
| 47 | `regioni` | 20 | 20 |
| 48 | `regolarita_imprese` | 20 | 20 |
| 49 | `cultural_visits` | 18 | 18 |
| 50 | `operator_transactions` | 16 | 16 |
| 51 | `user_roles` | 14 | 14 |
| 52 | `v_enterprise_compliance` | 14 | ? |
| 53 | `vendors` | 14 | 6 |
| 54 | `mobility_checkins` | 13 | 13 |
| 55 | `formazione_iscrizioni` | 10 | 10 |
| 56 | `qualification_types` | 10 | 0 |
| 57 | `richieste_servizi` | 10 | 10 |
| 58 | `secrets_meta` | 10 | 0 |
| 59 | `comuni` | 9 | 9 |
| 60 | `gaming_rewards_config` | 9 | 9 |
| 61 | `hub_shops` | 9 | 9 |
| 62 | `secure_credentials` | 9 | 2 |
| 63 | `agents` | 8 | 0 |
| 64 | `bandi_catalogo` | 8 | 8 |
| 65 | `users` | 8 | 8 |
| 66 | `agent_screenshots` | 7 | 5 |
| 67 | `formazione_corsi` | 6 | 6 |
| 68 | `workspace_snapshots` | 6 | 6 |
| 69 | `bandi_associazioni` | 5 | 5 |
| 70 | `civic_config` | 5 | 5 |
| 71 | `civic_config_backup_20260203` | 5 | 5 |
| 72 | `extended_users` | 5 | 5 |
| 73 | `formazione_enti` | 5 | 5 |
| 74 | `secrets` | 5 | 0 |
| 75 | `user_role_assignments` | 5 | 5 |
| 76 | `autorizzazioni` | 4 | 4 |
| 77 | `gaming_challenges` | 4 | 4 |
| 78 | `impresa_giustificazioni` | 4 | 4 |
| 79 | `qr_tokens` | 4 | 4 |
| 80 | `referrals` | 4 | 4 |
| 81 | `wallet_notifications` | 4 | 4 |
| 82 | `access_logs` | 3 | 3 |
| 83 | `carbon_credits_rules` | 3 | 3 |
| 84 | `carbon_credits_rules_backup_20260203` | 3 | 3 |
| 85 | `dms_companies` | 3 | 0 |
| 86 | `market_settings` | 3 | 3 |
| 87 | `markets` | 3 | 2 |
| 88 | `shops` | 3 | 3 |
| 89 | `collaboratori_impresa` | 2 | 2 |
| 90 | `comune_utenti` | 2 | 2 |
| 91 | `inspections` | 2 | 2 |
| 92 | `market_geometry` | 2 | 2 |
| 93 | `v_tcc_circulation_by_comune` | 2 | ? |
| 94 | `v_top_merchants_by_comune` | 2 | ? |
| 95 | `carbon_credits_config` | 1 | 1 |
| 96 | `carbon_credits_config_backup_20260203` | 1 | 1 |
| 97 | `dms_suap_instances` | 1 | 0 |
| 98 | `impostazioni_mora` | 1 | 1 |
| 99 | `route_completions` | 1 | 1 |
| 100 | `v_fund_stats_by_comune` | 1 | ? |
| 101 | `agent_brain` | 0 | 0 |
| 102 | `agent_context` | 0 | 0 |
| 103 | `agent_projects` | 0 | 0 |
| 104 | `agent_tasks` | 0 | 0 |
| 105 | `api_keys` | 0 | 0 |
| 106 | `api_metrics` | 0 | 0 |
| 107 | `audit_logs` | 0 | 0 |
| 108 | `bookings` | 0 | 0 |
| 109 | `business_analytics` | 0 | 0 |
| 110 | `carbon_footprint` | 0 | 0 |
| 111 | `challenge_participations` | 0 | 0 |
| 112 | `chat_messages_old` | 0 | 0 |
| 113 | `checkins` | 0 | 0 |
| 114 | `compliance_certificates` | 0 | 0 |
| 115 | `comune_contratti` | 0 | 0 |
| 116 | `comune_fatture` | 0 | 0 |
| 117 | `concession_payments` | 0 | 0 |
| 118 | `custom_areas` | 0 | 0 |
| 119 | `custom_markers` | 0 | 0 |
| 120 | `data_bag` | 0 | 0 |
| 121 | `dima_mappe` | 0 | 0 |
| 122 | `dms_durc_snapshots` | 0 | 0 |
| 123 | `ecocredits` | 0 | 0 |
| 124 | `enterprise_employees` | 0 | 0 |
| 125 | `enterprise_qualifications` | 0 | 0 |
| 126 | `external_connections` | 0 | 0 |
| 127 | `hub_services` | 0 | 0 |
| 128 | `inspections_detailed` | 0 | 0 |
| 129 | `ip_blacklist` | 0 | 0 |
| 130 | `market_tariffs` | 0 | 0 |
| 131 | `notifications` | 0 | 0 |
| 132 | `product_tracking` | 0 | 0 |
| 133 | `products` | 0 | 0 |
| 134 | `reimbursements` | 0 | 0 |
| 135 | `security_delegations` | 0 | 0 |
| 136 | `suap_azioni` | 0 | 0 |
| 137 | `suap_documenti` | 0 | 0 |
| 138 | `suap_regole` | 0 | 0 |
| 139 | `sustainability_metrics` | 0 | 0 |
| 140 | `system_events` | 0 | 0 |
| 141 | `system_logs` | 0 | 0 |
| 142 | `user_analytics` | 0 | 0 |
| 143 | `v_burn_rate_by_comune` | 0 | ? |
| 144 | `vendor_documents` | 0 | 0 |
| 145 | `violations` | 0 | 0 |
| 146 | `wallet_balance_snapshots` | 0 | 0 |
| 147 | `webhook_logs` | 0 | 0 |
| 148 | `webhooks` | 0 | 0 |
| 149 | `zapier_webhook_logs` | 0 | 0 |

### 1.3 Dettaglio Colonne per Tabella

#### Tabelle con dati

**`access_logs`** (3 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('access_logs_id_seq'::regclass) |
| `user_id` | `integer` | YES | — |
| `session_id` | `integer` | YES | — |
| `action` | `USER-DEFINED` | NO | — |
| `resource` | `character varying` | YES | — |
| `resource_id` | `character varying` | YES | — |
| `ip_address` | `character varying` | YES | — |
| `user_agent` | `text` | YES | — |
| `request_method` | `character varying` | YES | — |
| `request_path` | `text` | YES | — |
| `request_params` | `jsonb` | YES | — |
| `response_status` | `integer` | YES | — |
| `response_time_ms` | `integer` | YES | — |
| `created_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |

**`agent_conversations`** (415 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `character varying` | NO | — |
| `created_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `mode` | `character varying` | NO | — |
| `last_agent` | `character varying` | YES | — |
| `last_message` | `text` | YES | — |
| `manus_task_id` | `text` | YES | — |
| `memory_summary` | `text` | YES | — |

**`agent_logs_backup_20251204_174125`** (360 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | YES | — |
| `conversation_id` | `text` | YES | — |
| `agent_name` | `character varying` | YES | — |
| `role` | `character varying` | YES | — |
| `step` | `character varying` | YES | — |
| `message` | `text` | YES | — |
| `meta` | `jsonb` | YES | — |
| `created_at` | `timestamp with time zone` | YES | — |
| `error` | `boolean` | YES | — |

**`agent_messages`** (3,850 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `conversation_id` | `character varying` | NO | — |
| `sender` | `character varying` | YES | — |
| `recipient` | `character varying` | YES | — |
| `role` | `character varying` | NO | — |
| `message` | `text` | NO | — |
| `tool_call_id` | `character varying` | YES | — |
| `tool_name` | `character varying` | YES | — |
| `tool_args` | `jsonb` | YES | — |
| `meta` | `jsonb` | YES | — |
| `error` | `boolean` | YES | false |
| `created_at` | `timestamp with time zone` | NO | now() |
| `agent` | `character varying` | YES | — |
| `mode` | `character varying` | YES | 'auto'::character varying |

**`agent_messages_backup_20251204_174125`** (745 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | YES | — |
| `conversation_id` | `character varying` | YES | — |
| `agent` | `character varying` | YES | — |
| `role` | `character varying` | YES | — |
| `message` | `text` | YES | — |
| `meta_json` | `jsonb` | YES | — |
| `created_at` | `timestamp with time zone` | YES | — |
| `sender` | `character varying` | YES | — |

**`agent_screenshots`** (7 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('agent_screenshots_id_seq'::regclass) |
| `screenshot_id` | `character varying` | NO | — |
| `agent_name` | `character varying` | NO | — |
| `url` | `text` | YES | — |
| `image_data` | `bytea` | YES | — |
| `image_url` | `text` | YES | — |
| `metadata` | `jsonb` | YES | — |
| `conversation_id` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |

**`agents`** (8 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `character varying` | NO | — |
| `name` | `character varying` | NO | — |
| `role` | `character varying` | YES | — |
| `description` | `text` | YES | — |
| `endpoint` | `character varying` | YES | — |
| `is_active` | `boolean` | YES | true |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`autorizzazioni`** (4 righe, 20 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('autorizzazioni_id_seq'::regclass) |
| `vendor_id` | `integer` | NO | — |
| `numero_autorizzazione` | `character varying` | NO | — |
| `ente_rilascio` | `character varying` | NO | — |
| `data_rilascio` | `date` | NO | — |
| `data_scadenza` | `date` | YES | — |
| `stato` | `character varying` | YES | 'ATTIVA'::character varying |
| `note` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |
| `tipo` | `character varying` | YES | — |
| `settore` | `character varying` | YES | — |
| `sottosettore` | `character varying` | YES | — |
| `mercato_id` | `integer` | YES | — |
| `posteggio_id` | `integer` | YES | — |
| `durc_numero` | `character varying` | YES | — |
| `durc_data_rilascio` | `date` | YES | — |
| `durc_data_scadenza` | `date` | YES | — |
| `impresa_id` | `integer` | YES | — |
| `comune_id` | `integer` | YES | — |

**`bandi_associazioni`** (5 righe, 27 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('bandi_associazioni_id_seq'::regclass) |
| `denominazione` | `character varying` | NO | — |
| `tipo` | `character varying` | YES | — |
| `partita_iva` | `character varying` | YES | — |
| `codice_fiscale` | `character varying` | YES | — |
| `indirizzo` | `text` | YES | — |
| `citta` | `character varying` | YES | — |
| `provincia` | `character varying` | YES | — |
| `cap` | `character varying` | YES | — |
| `telefono` | `character varying` | YES | — |
| `email` | `character varying` | YES | — |
| `pec` | `character varying` | YES | — |
| `sito_web` | `character varying` | YES | — |
| `logo_url` | `text` | YES | — |
| `specializzazioni` | `text` | YES | — |
| `settori_competenza` | `text` | YES | — |
| `rating` | `numeric` | YES | 0 |
| `pratiche_totali` | `integer` | YES | 0 |
| `pratiche_approvate` | `integer` | YES | 0 |
| `success_rate` | `numeric` | YES | 0 |
| `piano_abbonamento` | `character varying` | YES | 'free'::character varying |
| `data_inizio_abbonamento` | `date` | YES | — |
| `data_fine_abbonamento` | `date` | YES | — |
| `user_id` | `integer` | YES | — |
| `stato` | `character varying` | YES | 'attivo'::character varying |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`bandi_catalogo`** (8 righe, 25 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('bandi_catalogo_id_seq'::regclass) |
| `titolo` | `character varying` | NO | — |
| `descrizione` | `text` | YES | — |
| `ente_erogatore` | `character varying` | YES | — |
| `tipo_ente` | `character varying` | YES | — |
| `importo_minimo` | `numeric` | YES | — |
| `importo_massimo` | `numeric` | YES | — |
| `percentuale_fondo_perduto` | `numeric` | YES | — |
| `percentuale_finanziamento` | `numeric` | YES | — |
| `data_apertura` | `date` | YES | — |
| `data_chiusura` | `date` | YES | — |
| `link_bando` | `text` | YES | — |
| `documenti_richiesti` | `text` | YES | — |
| `settori_ammessi` | `text` | YES | — |
| `fatturato_minimo` | `numeric` | YES | — |
| `fatturato_massimo` | `numeric` | YES | — |
| `dipendenti_minimo` | `integer` | YES | — |
| `dipendenti_massimo` | `integer` | YES | — |
| `anni_attivita_minimo` | `integer` | YES | — |
| `requisiti_aggiuntivi` | `text` | YES | — |
| `priorita` | `integer` | YES | 0 |
| `in_evidenza` | `boolean` | YES | false |
| `stato` | `character varying` | YES | 'aperto'::character varying |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`carbon_credits_config`** (1 righe, 13 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `base_value` | `integer` | NO | — |
| `area_boosts` | `text` | YES | — |
| `category_boosts` | `text` | YES | — |
| `updated_by` | `character varying` | YES | — |
| `updated_at` | `timestamp without time zone` | NO | now() |
| `policy_multiplier` | `numeric` | YES | 1.0 |
| `ets_base_price` | `numeric` | YES | 80.0 |
| `last_policy_update` | `timestamp without time zone` | YES | now() |
| `policy_notes` | `text` | YES | — |
| `tcc_value` | `numeric` | YES | 0.01 |
| `comune_id` | `integer` | YES | — |
| `last_updated` | `timestamp without time zone` | YES | now() |

**`carbon_credits_config_backup_20260203`** (1 righe, 13 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | YES | — |
| `base_value` | `integer` | YES | — |
| `area_boosts` | `text` | YES | — |
| `category_boosts` | `text` | YES | — |
| `updated_by` | `character varying` | YES | — |
| `updated_at` | `timestamp without time zone` | YES | — |
| `policy_multiplier` | `numeric` | YES | — |
| `ets_base_price` | `numeric` | YES | — |
| `last_policy_update` | `timestamp without time zone` | YES | — |
| `policy_notes` | `text` | YES | — |
| `tcc_value` | `numeric` | YES | — |
| `comune_id` | `integer` | YES | — |
| `last_updated` | `timestamp without time zone` | YES | — |

**`carbon_credits_rules`** (3 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('carbon_credits_rules_id_seq'::regclass) |
| `name` | `character varying` | NO | — |
| `type` | `character varying` | NO | — |
| `value` | `character varying` | NO | — |
| `multiplier_boost` | `numeric` | NO | 1.00 |
| `is_active` | `boolean` | NO | true |
| `comune_id` | `integer` | NO | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`carbon_credits_rules_backup_20260203`** (3 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | YES | — |
| `name` | `character varying` | YES | — |
| `type` | `character varying` | YES | — |
| `value` | `character varying` | YES | — |
| `multiplier_boost` | `numeric` | YES | — |
| `is_active` | `boolean` | YES | — |
| `comune_id` | `integer` | YES | — |
| `created_at` | `timestamp without time zone` | YES | — |
| `updated_at` | `timestamp without time zone` | YES | — |

**`civic_config`** (5 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('civic_config_id_seq'::regclass) |
| `comune_id` | `integer` | YES | — |
| `tcc_reward_default` | `integer` | YES | 20 |
| `tcc_reward_urgent` | `integer` | YES | 30 |
| `tcc_reward_photo_bonus` | `integer` | YES | 5 |
| `auto_assign_enabled` | `boolean` | YES | false |
| `notify_pm_enabled` | `boolean` | YES | true |
| `notify_pa_enabled` | `boolean` | YES | true |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`civic_config_backup_20260203`** (5 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | YES | — |
| `comune_id` | `integer` | YES | — |
| `tcc_reward_default` | `integer` | YES | — |
| `tcc_reward_urgent` | `integer` | YES | — |
| `tcc_reward_photo_bonus` | `integer` | YES | — |
| `auto_assign_enabled` | `boolean` | YES | — |
| `notify_pm_enabled` | `boolean` | YES | — |
| `notify_pa_enabled` | `boolean` | YES | — |
| `created_at` | `timestamp without time zone` | YES | — |
| `updated_at` | `timestamp without time zone` | YES | — |

**`civic_reports`** (36 righe, 22 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `user_id` | `integer` | YES | — |
| `type` | `character varying` | NO | — |
| `description` | `text` | NO | — |
| `lat` | `character varying` | YES | — |
| `lng` | `character varying` | YES | — |
| `photo_url` | `text` | YES | — |
| `status` | `character varying` | NO | 'pending'::character varying |
| `created_at` | `timestamp without time zone` | NO | now() |
| `comune_id` | `integer` | YES | — |
| `impresa_id` | `integer` | YES | — |
| `address` | `text` | YES | — |
| `priority` | `character varying` | YES | 'NORMAL'::character varying |
| `assigned_to` | `integer` | YES | — |
| `assigned_at` | `timestamp without time zone` | YES | — |
| `resolved_at` | `timestamp without time zone` | YES | — |
| `resolved_by` | `integer` | YES | — |
| `resolution_notes` | `text` | YES | — |
| `tcc_reward` | `integer` | YES | 20 |
| `tcc_rewarded` | `boolean` | YES | false |
| `linked_sanction_id` | `integer` | YES | — |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`collaboratori_impresa`** (2 righe, 11 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('collaboratori_impresa_id_seq'::regclass) |
| `impresa_id` | `integer` | NO | — |
| `nome` | `character varying` | NO | — |
| `cognome` | `character varying` | NO | — |
| `codice_fiscale` | `character varying` | YES | — |
| `ruolo` | `character varying` | NO | 'Collaboratore'::character varying |
| `telefono` | `character varying` | YES | — |
| `autorizzato_presenze` | `boolean` | NO | false |
| `status` | `character varying` | NO | 'active'::character varying |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`comune_utenti`** (2 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('comune_utenti_id_seq'::regclass) |
| `comune_id` | `integer` | YES | — |
| `user_id` | `integer` | YES | — |
| `ruolo` | `character varying` | NO | 'operatore'::character varying |
| `permessi` | `jsonb` | YES | '{}'::jsonb |
| `attivo` | `boolean` | YES | true |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`comuni`** (9 righe, 32 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('comuni_id_seq'::regclass) |
| `nome` | `character varying` | NO | — |
| `provincia` | `character varying` | YES | — |
| `regione` | `character varying` | YES | — |
| `cap` | `character varying` | YES | — |
| `codice_istat` | `character varying` | YES | — |
| `codice_catastale` | `character varying` | YES | — |
| `pec` | `character varying` | YES | — |
| `email` | `character varying` | YES | — |
| `telefono` | `character varying` | YES | — |
| `sito_web` | `character varying` | YES | — |
| `indirizzo` | `character varying` | YES | — |
| `logo_url` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |
| `blocco_automatico_pagamenti` | `boolean` | YES | true |
| `giorni_tolleranza_blocco` | `integer` | YES | 30 |
| `codice_ipa` | `character varying` | YES | — |
| `codice_fiscale` | `character varying` | YES | — |
| `responsabile_nome` | `character varying` | YES | — |
| `responsabile_cognome` | `character varying` | YES | — |
| `responsabile_titolo` | `character varying` | YES | — |
| `facebook_url` | `character varying` | YES | — |
| `twitter_url` | `character varying` | YES | — |
| `youtube_url` | `character varying` | YES | — |
| `linkedin_url` | `character varying` | YES | — |
| `data_aggiornamento_ipa` | `timestamp without time zone` | YES | — |
| `tipologia` | `character varying` | YES | — |
| `sindaco_nome` | `character varying` | YES | — |
| `sindaco_cognome` | `character varying` | YES | — |
| `sindaco_titolo` | `character varying` | YES | — |
| `acronimo` | `character varying` | YES | — |

**`concessions`** (30 righe, 74 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('concessions_id_seq'::regclass) |
| `market_id` | `integer` | NO | — |
| `stall_id` | `integer` | NO | — |
| `vendor_id` | `integer` | NO | — |
| `type` | `character varying` | YES | 'fisso'::character varying |
| `valid_from` | `date` | NO | — |
| `valid_to` | `date` | YES | — |
| `notes` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `settore_merceologico` | `character varying` | YES | 'Alimentare'::character varying |
| `comune_rilascio` | `character varying` | YES | — |
| `numero_protocollo` | `character varying` | YES | — |
| `data_protocollazione` | `date` | YES | — |
| `oggetto` | `text` | YES | — |
| `numero_file` | `character varying` | YES | — |
| `durata_anni` | `integer` | YES | 10 |
| `data_decorrenza` | `date` | YES | — |
| `tipo_concessione` | `character varying` | YES | 'subingresso'::character varying |
| `sottotipo_conversione` | `character varying` | YES | — |
| `stato` | `character varying` | YES | 'ATTIVA'::character varying |
| `cf_concessionario` | `character varying` | YES | — |
| `partita_iva` | `character varying` | YES | — |
| `ragione_sociale` | `character varying` | YES | — |
| `qualita` | `character varying` | YES | — |
| `nome` | `character varying` | YES | — |
| `cognome` | `character varying` | YES | — |
| `data_nascita` | `date` | YES | — |
| `luogo_nascita` | `character varying` | YES | — |
| `residenza_via` | `character varying` | YES | — |
| `residenza_comune` | `character varying` | YES | — |
| `residenza_provincia` | `character varying` | YES | — |
| `residenza_cap` | `character varying` | YES | — |
| `sede_legale_via` | `character varying` | YES | — |
| `sede_legale_comune` | `character varying` | YES | — |
| `sede_legale_provincia` | `character varying` | YES | — |
| `sede_legale_cap` | `character varying` | YES | — |
| `cedente_cf` | `character varying` | YES | — |
| `cedente_partita_iva` | `character varying` | YES | — |
| `cedente_ragione_sociale` | `character varying` | YES | — |
| `cedente_impresa_id` | `integer` | YES | — |
| `autorizzazione_precedente_pg` | `character varying` | YES | — |
| `autorizzazione_precedente_data` | `date` | YES | — |
| `autorizzazione_precedente_intestatario` | `character varying` | YES | — |
| `fila` | `character varying` | YES | — |
| `mq` | `numeric` | YES | — |
| `dimensioni_lineari` | `character varying` | YES | — |
| `giorno` | `character varying` | YES | — |
| `tipo_posteggio` | `character varying` | YES | — |
| `attrezzature` | `character varying` | YES | — |
| `ubicazione` | `character varying` | YES | — |
| `limitazioni_merceologia` | `text` | YES | — |
| `merceologia_precedente` | `character varying` | YES | — |
| `merceologia_nuova` | `character varying` | YES | — |
| `dimensioni_precedenti` | `character varying` | YES | — |
| `dimensioni_nuove` | `character varying` | YES | — |
| `mq_precedenti` | `numeric` | YES | — |
| `mq_nuovi` | `numeric` | YES | — |
| `canone_unico` | `numeric` | YES | — |
| `scia_precedente_numero` | `character varying` | YES | — |
| `scia_precedente_data` | `date` | YES | — |
| `scia_precedente_comune` | `character varying` | YES | — |
| `planimetria_allegata` | `boolean` | YES | false |
| `prescrizioni` | `text` | YES | — |
| `impresa_id` | `integer` | YES | — |
| `scia_id` | `text` | YES | — |
| `status` | `character varying` | YES | 'ATTIVA'::character varying |
| `durc_valido` | `boolean` | YES | false |
| `durc_data` | `date` | YES | — |
| `requisiti_morali` | `boolean` | YES | true |
| `requisiti_professionali` | `boolean` | YES | true |
| `comune_id` | `integer` | YES | — |
| `mercaweb_id` | `integer` | YES | — |
| `legacy_concession_id` | `integer` | YES | — |

**`cultural_pois`** (1,127 righe, 17 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('cultural_pois_id_seq'::regclass) |
| `osm_id` | `bigint` | YES | — |
| `name` | `character varying` | YES | — |
| `type` | `character varying` | YES | — |
| `lat` | `numeric` | YES | — |
| `lng` | `numeric` | YES | — |
| `region` | `character varying` | YES | — |
| `wikidata` | `character varying` | YES | — |
| `wikipedia` | `character varying` | YES | — |
| `opening_hours` | `character varying` | YES | — |
| `fee` | `boolean` | YES | false |
| `wheelchair` | `character varying` | YES | — |
| `description` | `text` | YES | — |
| `tcc_reward` | `integer` | YES | 15 |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |
| `comune_id` | `integer` | YES | — |

**`cultural_visits`** (18 righe, 11 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('cultural_visits_id_seq'::regclass) |
| `user_id` | `integer` | YES | — |
| `poi_type` | `character varying` | NO | — |
| `poi_id` | `character varying` | YES | — |
| `poi_name` | `character varying` | NO | — |
| `lat` | `numeric` | YES | — |
| `lng` | `numeric` | YES | — |
| `comune_id` | `integer` | YES | — |
| `credits_earned` | `integer` | YES | 0 |
| `visit_date` | `date` | YES | CURRENT_DATE |
| `created_at` | `timestamp without time zone` | YES | now() |

**`dms_companies`** (3 righe, 23 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `created_at` | `timestamp with time zone` | NO | now() |
| `updated_at` | `timestamp with time zone` | NO | now() |
| `codice_fiscale` | `text` | NO | — |
| `partita_iva` | `text` | YES | — |
| `numero_rea` | `text` | YES | — |
| `cciaa_sigla` | `text` | YES | — |
| `denominazione` | `text` | NO | — |
| `forma_giuridica` | `text` | YES | — |
| `stato_impresa` | `text` | YES | — |
| `indirizzo_via` | `text` | YES | — |
| `indirizzo_civico` | `text` | YES | — |
| `indirizzo_cap` | `text` | YES | — |
| `indirizzo_comune` | `text` | YES | — |
| `indirizzo_provincia` | `text` | YES | — |
| `indirizzo_stato` | `text` | YES | — |
| `pec` | `text` | YES | — |
| `codice_ateco` | `text` | YES | — |
| `descrizione_ateco` | `text` | YES | — |
| `data_iscrizione_ri` | `timestamp with time zone` | YES | — |
| `data_cancellazione_ri` | `timestamp with time zone` | YES | — |
| `flag_impresa_artigiana` | `boolean` | YES | — |
| `flag_startup_innovativa` | `boolean` | YES | — |

**`dms_suap_instances`** (1 righe, 25 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `created_at` | `timestamp with time zone` | NO | now() |
| `updated_at` | `timestamp with time zone` | NO | now() |
| `company_id` | `uuid` | NO | — |
| `market_id` | `text` | YES | — |
| `stall_id` | `text` | YES | — |
| `cui` | `text` | NO | — |
| `codice_procedimento` | `text` | NO | — |
| `evento_vita` | `text` | NO | — |
| `regime_amministrativo` | `text` | NO | — |
| `stato_procedimento` | `text` | NO | — |
| `data_presentazione` | `timestamp with time zone` | YES | — |
| `data_protocollazione` | `timestamp with time zone` | YES | — |
| `data_inizio_attivita` | `timestamp with time zone` | YES | — |
| `data_fine_concessione` | `timestamp with time zone` | YES | — |
| `data_ultimo_aggiornamento` | `timestamp with time zone` | YES | — |
| `tipo_concessione` | `text` | YES | — |
| `giorno_settimana` | `text` | YES | — |
| `orario_inizio` | `text` | YES | — |
| `orario_fine` | `text` | YES | — |
| `superficie_mq` | `numeric` | YES | — |
| `codice_area` | `text` | YES | — |
| `sezione_mercato` | `text` | YES | — |
| `url_pratica_suap` | `text` | YES | — |
| `url_documento_autorizzazione` | `text` | YES | — |

**`domande_spunta`** (29 righe, 16 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('domande_spunta_id_seq'::regclass) |
| `impresa_id` | `integer` | NO | — |
| `autorizzazione_id` | `integer` | YES | — |
| `mercato_id` | `integer` | NO | — |
| `giorno_settimana` | `character varying` | YES | — |
| `settore_richiesto` | `character varying` | YES | — |
| `numero_presenze` | `integer` | YES | 0 |
| `data_prima_presenza` | `date` | YES | — |
| `stato` | `character varying` | NO | 'IN_ATTESA'::character varying |
| `data_richiesta` | `date` | NO | CURRENT_DATE |
| `data_approvazione` | `date` | YES | — |
| `wallet_id` | `integer` | YES | — |
| `note` | `text` | YES | — |
| `created_at` | `timestamp with time zone` | NO | now() |
| `updated_at` | `timestamp with time zone` | NO | now() |
| `motivo_revisione` | `text` | YES | — |

**`extended_users`** (5 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `user_id` | `integer` | NO | — |
| `wallet_balance` | `integer` | NO | 0 |
| `sustainability_rating` | `integer` | YES | 0 |
| `transport_preference` | `character varying` | YES | — |
| `phone` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | NO | now() |
| `updated_at` | `timestamp without time zone` | NO | now() |
| `eco_credit_active` | `boolean` | YES | false |

**`formazione_corsi`** (6 righe, 20 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('formazione_corsi_id_seq'::regclass) |
| `ente_id` | `integer` | YES | — |
| `titolo` | `character varying` | NO | — |
| `descrizione` | `text` | YES | — |
| `tipo_attestato` | `character varying` | YES | — |
| `durata_ore` | `integer` | YES | — |
| `modalita` | `character varying` | YES | — |
| `data_inizio` | `date` | YES | — |
| `data_fine` | `date` | YES | — |
| `orario` | `text` | YES | — |
| `sede` | `text` | YES | — |
| `posti_totali` | `integer` | YES | 20 |
| `posti_disponibili` | `integer` | YES | 20 |
| `prezzo` | `numeric` | YES | — |
| `prezzo_scontato` | `numeric` | YES | — |
| `in_evidenza` | `boolean` | YES | false |
| `priorita_notifiche` | `integer` | YES | 0 |
| `stato` | `character varying` | YES | 'programmato'::character varying |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`formazione_enti`** (5 righe, 26 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('formazione_enti_id_seq'::regclass) |
| `denominazione` | `character varying` | NO | — |
| `partita_iva` | `character varying` | YES | — |
| `codice_fiscale` | `character varying` | YES | — |
| `indirizzo` | `text` | YES | — |
| `citta` | `character varying` | YES | — |
| `provincia` | `character varying` | YES | — |
| `cap` | `character varying` | YES | — |
| `telefono` | `character varying` | YES | — |
| `email` | `character varying` | YES | — |
| `pec` | `character varying` | YES | — |
| `sito_web` | `character varying` | YES | — |
| `logo_url` | `text` | YES | — |
| `accreditamento_regionale` | `character varying` | YES | — |
| `data_accreditamento` | `date` | YES | — |
| `specializzazioni` | `text` | YES | — |
| `rating` | `numeric` | YES | 0 |
| `totale_corsi` | `integer` | YES | 0 |
| `totale_allievi` | `integer` | YES | 0 |
| `piano_abbonamento` | `character varying` | YES | 'free'::character varying |
| `data_inizio_abbonamento` | `date` | YES | — |
| `data_fine_abbonamento` | `date` | YES | — |
| `user_id` | `integer` | YES | — |
| `stato` | `character varying` | YES | 'attivo'::character varying |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`formazione_iscrizioni`** (10 righe, 13 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('formazione_iscrizioni_id_seq'::regclass) |
| `corso_id` | `integer` | NO | — |
| `impresa_id` | `integer` | NO | — |
| `utente_nome` | `character varying` | YES | — |
| `utente_email` | `character varying` | YES | — |
| `utente_telefono` | `character varying` | YES | — |
| `stato` | `character varying` | YES | 'ISCRITTO'::character varying |
| `data_iscrizione` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `data_conferma` | `timestamp without time zone` | YES | — |
| `data_completamento` | `timestamp without time zone` | YES | — |
| `note` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`fund_transactions`** (24 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `type` | `character varying` | NO | — |
| `source` | `character varying` | NO | — |
| `amount` | `integer` | NO | — |
| `description` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | NO | now() |
| `euro_value` | `integer` | YES | — |
| `shop_id` | `integer` | YES | — |
| `status` | `character varying` | YES | 'pending'::character varying |
| `comune_id` | `integer` | YES | — |

**`gaming_challenges`** (4 righe, 18 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('gaming_challenges_id_seq'::regclass) |
| `comune_id` | `integer` | NO | 1 |
| `title` | `character varying` | NO | — |
| `description` | `text` | YES | — |
| `category` | `character varying` | NO | 'civic'::character varying |
| `challenge_type` | `character varying` | NO | 'count'::character varying |
| `target_value` | `integer` | NO | 10 |
| `tcc_reward` | `integer` | NO | 50 |
| `bonus_multiplier` | `numeric` | YES | 1.00 |
| `start_date` | `timestamp without time zone` | YES | now() |
| `end_date` | `timestamp without time zone` | YES | — |
| `is_active` | `boolean` | YES | true |
| `icon` | `character varying` | YES | 'trophy'::character varying |
| `color` | `character varying` | YES | '#8b5cf6'::character varying |
| `participants_count` | `integer` | YES | 0 |
| `completions_count` | `integer` | YES | 0 |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`gaming_rewards_config`** (9 righe, 28 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('gaming_rewards_config_id_seq'::regclass) |
| `comune_id` | `integer` | NO | — |
| `civic_enabled` | `boolean` | YES | true |
| `civic_tcc_default` | `integer` | YES | 10 |
| `civic_tcc_urgent` | `integer` | YES | 5 |
| `civic_tcc_photo_bonus` | `integer` | YES | 5 |
| `mobility_enabled` | `boolean` | YES | false |
| `mobility_tcc_bus` | `integer` | YES | 10 |
| `mobility_tcc_bike_km` | `integer` | YES | 3 |
| `mobility_tcc_walk_km` | `integer` | YES | 5 |
| `mobility_tcc_train` | `integer` | YES | 15 |
| `mobility_rush_hour_bonus` | `integer` | YES | 0 |
| `culture_enabled` | `boolean` | YES | false |
| `culture_tcc_museum` | `integer` | YES | 100 |
| `culture_tcc_monument` | `integer` | YES | 50 |
| `culture_tcc_route` | `integer` | YES | 300 |
| `culture_tcc_event` | `integer` | YES | 50 |
| `culture_weekend_bonus` | `integer` | YES | 0 |
| `shopping_enabled` | `boolean` | YES | false |
| `shopping_cashback_percent` | `numeric` | YES | 1.00 |
| `shopping_km0_bonus` | `integer` | YES | 20 |
| `shopping_artisan_bonus` | `integer` | YES | 15 |
| `shopping_market_bonus` | `integer` | YES | 10 |
| `challenge_enabled` | `boolean` | YES | false |
| `challenge_max_active` | `integer` | YES | 3 |
| `challenge_default_bonus` | `integer` | YES | 50 |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`graduatoria_presenze`** (52 righe, 18 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('graduatoria_presenze_id_seq'::regclass) |
| `market_id` | `integer` | NO | — |
| `impresa_id` | `integer` | YES | — |
| `wallet_id` | `integer` | YES | — |
| `stall_id` | `integer` | YES | — |
| `tipo` | `character varying` | NO | 'CONCESSION'::character varying |
| `presenze_totali` | `integer` | YES | 0 |
| `punteggio` | `integer` | YES | 0 |
| `posizione` | `integer` | YES | — |
| `data_prima_presenza` | `date` | YES | — |
| `ultima_presenza` | `date` | YES | — |
| `assenze_non_giustificate` | `integer` | YES | 0 |
| `soglia_revoca` | `integer` | YES | — |
| `stato_revoca` | `character varying` | YES | 'OK'::character varying |
| `anno` | `integer` | NO | EXTRACT(year FROM CURRENT_DATE) |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |
| `assenze_totali` | `integer` | YES | 0 |

**`gtfs_routes`** (37 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('gtfs_routes_id_seq'::regclass) |
| `route_id` | `character varying` | NO | — |
| `route_short_name` | `character varying` | YES | — |
| `route_long_name` | `character varying` | YES | — |
| `route_type` | `character varying` | YES | 'bus'::character varying |
| `provider` | `character varying` | NO | 'unknown'::character varying |
| `route_color` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`gtfs_stops`** (23,930 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('gtfs_stops_id_seq'::regclass) |
| `stop_id` | `character varying` | NO | — |
| `stop_name` | `character varying` | NO | — |
| `stop_lat` | `numeric` | NO | — |
| `stop_lon` | `numeric` | NO | — |
| `stop_type` | `character varying` | YES | 'bus'::character varying |
| `provider` | `character varying` | NO | 'unknown'::character varying |
| `region` | `character varying` | YES | 'unknown'::character varying |
| `routes` | `jsonb` | YES | '[]'::jsonb |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `comune_id` | `integer` | YES | — |

**`hub_locations`** (79 righe, 24 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('hub_locations_id_seq'::regclass) |
| `market_id` | `integer` | YES | — |
| `name` | `character varying` | NO | — |
| `address` | `text` | NO | — |
| `city` | `character varying` | NO | — |
| `lat` | `character varying` | NO | — |
| `lng` | `character varying` | NO | — |
| `center_lat` | `character varying` | YES | — |
| `center_lng` | `character varying` | YES | — |
| `area_geojson` | `text` | YES | — |
| `corner_geojson` | `text` | YES | — |
| `opening_hours` | `text` | YES | — |
| `active` | `integer` | NO | 1 |
| `is_independent` | `integer` | NO | 0 |
| `description` | `text` | YES | — |
| `photo_url` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | NO | now() |
| `updated_at` | `timestamp without time zone` | NO | now() |
| `area_sqm` | `numeric` | YES | — |
| `provincia_id` | `integer` | YES | — |
| `regione_id` | `integer` | YES | — |
| `livello` | `character varying` | YES | 'capoluogo'::character varying |
| `tipo` | `character varying` | YES | 'urbano'::character varying |
| `provincia_sigla` | `character varying` | YES | — |

**`hub_shops`** (9 righe, 25 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('hub_shops_id_seq'::regclass) |
| `hub_id` | `integer` | NO | — |
| `shop_number` | `integer` | YES | — |
| `letter` | `character varying` | YES | — |
| `name` | `character varying` | NO | — |
| `category` | `character varying` | YES | — |
| `certifications` | `text` | YES | — |
| `owner_id` | `integer` | YES | — |
| `business_name` | `character varying` | YES | — |
| `vat_number` | `character varying` | YES | — |
| `phone` | `character varying` | YES | — |
| `email` | `character varying` | YES | — |
| `vetrina_url` | `text` | YES | — |
| `lat` | `character varying` | YES | — |
| `lng` | `character varying` | YES | — |
| `area_mq` | `integer` | YES | — |
| `status` | `character varying` | NO | 'active'::character varying |
| `opening_hours` | `text` | YES | — |
| `description` | `text` | YES | — |
| `photo_url` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | NO | now() |
| `updated_at` | `timestamp without time zone` | NO | now() |
| `wallet_enabled` | `boolean` | YES | false |
| `comune_id` | `integer` | YES | — |
| `address` | `character varying` | YES | — |

**`impostazioni_mora`** (1 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('impostazioni_mora_id_seq'::regclass) |
| `comune_id` | `integer` | YES | 1 |
| `mora_abilitata` | `boolean` | YES | false |
| `tasso_interesse_giornaliero` | `numeric` | YES | 0.000137 |
| `tasso_mora_fisso` | `numeric` | YES | 0.05 |
| `giorni_grazia` | `integer` | YES | 0 |
| `note` | `text` | YES | — |
| `created_at` | `timestamp with time zone` | NO | now() |
| `updated_at` | `timestamp with time zone` | NO | now() |

**`impresa_giustificazioni`** (4 righe, 20 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('impresa_giustificazioni_id_seq'::regclass |
| `impresa_id` | `integer` | NO | — |
| `comune_id` | `integer` | NO | — |
| `market_id` | `integer` | YES | — |
| `giorno_mercato` | `date` | NO | — |
| `tipo_giustifica` | `character varying` | YES | 'certificato_medico'::character varying |
| `reason` | `text` | YES | — |
| `justification_file_url` | `text` | NO | — |
| `status` | `character varying` | NO | 'INVIATA'::character varying |
| `reviewed_by` | `integer` | YES | — |
| `reviewed_at` | `timestamp with time zone` | YES | — |
| `reviewer_notes` | `text` | YES | — |
| `created_at` | `timestamp with time zone` | NO | now() |
| `updated_at` | `timestamp with time zone` | NO | now() |
| `file_content` | `bytea` | YES | — |
| `file_name` | `character varying` | YES | — |
| `file_mime` | `character varying` | YES | — |
| `file_size` | `integer` | YES | — |
| `market_name` | `character varying` | YES | — |
| `comune_name` | `character varying` | YES | — |

**`imprese`** (34 righe, 50 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('imprese_id_seq'::regclass) |
| `denominazione` | `character varying` | NO | — |
| `partita_iva` | `character varying` | NO | — |
| `codice_fiscale` | `character varying` | NO | — |
| `comune` | `character varying` | NO | — |
| `settore` | `character varying` | YES | — |
| `telefono` | `character varying` | YES | — |
| `email` | `character varying` | YES | — |
| `pec` | `character varying` | YES | — |
| `rappresentante_legale` | `character varying` | YES | — |
| `data_costituzione` | `date` | YES | — |
| `note` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `numero_rea` | `character varying` | YES | — |
| `cciaa_sigla` | `character varying` | YES | — |
| `forma_giuridica` | `character varying` | YES | — |
| `stato_impresa` | `character varying` | YES | 'ATTIVA'::character varying |
| `indirizzo_via` | `character varying` | YES | — |
| `indirizzo_civico` | `character varying` | YES | — |
| `indirizzo_cap` | `character varying` | YES | — |
| `indirizzo_provincia` | `character varying` | YES | — |
| `codice_ateco` | `character varying` | YES | — |
| `descrizione_ateco` | `character varying` | YES | — |
| `rappresentante_legale_cognome` | `character varying` | YES | — |
| `rappresentante_legale_nome` | `character varying` | YES | — |
| `rappresentante_legale_cf` | `character varying` | YES | — |
| `rappresentante_legale_data_nascita` | `date` | YES | — |
| `rappresentante_legale_luogo_nascita` | `character varying` | YES | — |
| `rappresentante_legale_residenza_via` | `character varying` | YES | — |
| `rappresentante_legale_residenza_civico` | `character varying` | YES | — |
| `rappresentante_legale_residenza_cap` | `character varying` | YES | — |
| `rappresentante_legale_residenza_comune` | `character varying` | YES | — |
| `rappresentante_legale_residenza_provincia` | `character varying` | YES | — |
| `capitale_sociale` | `numeric` | YES | — |
| `numero_addetti` | `integer` | YES | — |
| `sito_web` | `character varying` | YES | — |
| `data_iscrizione_ri` | `date` | YES | — |
| `vetrina_immagine_principale` | `text` | YES | — |
| `vetrina_gallery` | `jsonb` | YES | '[]'::jsonb |
| `vetrina_descrizione` | `text` | YES | — |
| `vetrina_orari` | `jsonb` | YES | — |
| `social_facebook` | `text` | YES | — |
| `social_instagram` | `text` | YES | — |
| `social_website` | `text` | YES | — |
| `social_whatsapp` | `text` | YES | — |
| `rating` | `numeric` | YES | — |
| `comune_id` | `integer` | YES | — |
| `mercaweb_id` | `integer` | YES | — |
| `legacy_vendor_id` | `integer` | YES | — |

**`infraction_types`** (20 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('infraction_types_id_seq'::regclass) |
| `code` | `character varying` | NO | — |
| `description` | `text` | NO | — |
| `category` | `character varying` | YES | 'GENERALE'::character varying |
| `min_amount` | `numeric` | NO | — |
| `max_amount` | `numeric` | NO | — |
| `default_amount` | `numeric` | NO | — |
| `active` | `boolean` | YES | true |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `testo_legge_completo` | `text` | YES | — |

**`inspections`** (2 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `business_id` | `integer` | YES | — |
| `business_name` | `character varying` | NO | — |
| `type` | `character varying` | NO | — |
| `inspector` | `character varying` | YES | — |
| `status` | `character varying` | NO | — |
| `scheduled_date` | `timestamp without time zone` | YES | — |
| `completed_date` | `timestamp without time zone` | YES | — |
| `violation_found` | `boolean` | YES | false |
| `fine_amount` | `integer` | YES | — |
| `notes` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | NO | now() |

**`login_attempts`** (270 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('login_attempts_id_seq'::regclass) |
| `username` | `character varying` | YES | — |
| `user_id` | `integer` | YES | — |
| `ip_address` | `character varying` | NO | — |
| `user_agent` | `text` | YES | — |
| `success` | `boolean` | NO | — |
| `failure_reason` | `character varying` | YES | — |
| `created_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |

**`market_geometry`** (2 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `market_id` | `integer` | NO | — |
| `container_geojson` | `text` | YES | — |
| `center_lat` | `character varying` | NO | — |
| `center_lng` | `character varying` | NO | — |
| `hub_area_geojson` | `text` | YES | — |
| `market_area_geojson` | `text` | YES | — |
| `gcp_data` | `text` | YES | — |
| `png_url` | `text` | YES | — |
| `png_metadata` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | NO | now() |
| `updated_at` | `timestamp without time zone` | NO | now() |

**`market_session_details`** (500 righe, 18 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('market_session_details_id_seq'::regclass) |
| `session_id` | `integer` | NO | — |
| `stall_id` | `integer` | YES | — |
| `stall_number` | `character varying` | YES | — |
| `area_mq` | `numeric` | YES | — |
| `impresa_id` | `integer` | YES | — |
| `impresa_nome` | `character varying` | YES | — |
| `impresa_piva` | `character varying` | YES | — |
| `tipo_presenza` | `character varying` | YES | — |
| `ora_accesso` | `time without time zone` | YES | — |
| `ora_uscita` | `time without time zone` | YES | — |
| `ora_rifiuti` | `time without time zone` | YES | — |
| `importo_addebitato` | `numeric` | YES | — |
| `mq_posteggio` | `numeric` | YES | — |
| `notes` | `text` | YES | — |
| `presenze_totali` | `integer` | YES | — |
| `assenze_non_giustificate` | `integer` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`market_sessions`** (394 righe, 13 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('market_sessions_id_seq'::regclass) |
| `market_id` | `integer` | NO | — |
| `data_mercato` | `date` | NO | — |
| `ora_apertura` | `time without time zone` | YES | — |
| `ora_chiusura` | `time without time zone` | YES | — |
| `stato` | `character varying` | YES | 'CHIUSO'::character varying |
| `totale_presenze` | `integer` | YES | 0 |
| `totale_incassato` | `numeric` | YES | 0 |
| `posteggi_occupati` | `integer` | YES | 0 |
| `note` | `text` | YES | — |
| `chiuso_da` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `legacy_session_id` | `integer` | YES | — |

**`market_settings`** (3 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('market_settings_id_seq'::regclass) |
| `market_id` | `integer` | NO | — |
| `presence_start_time` | `time without time zone` | NO | '06:00:00'::time without time zone |
| `presence_end_time` | `time without time zone` | NO | '08:00:00'::time without time zone |
| `spunta_presence_start_time` | `time without time zone` | NO | '07:30:00'::time without time zone |
| `waste_disposal_start_time` | `time without time zone` | NO | '12:00:00'::time without time zone |
| `waste_disposal_end_time` | `time without time zone` | NO | '13:00:00'::time without time zone |
| `exit_market_start_time` | `time without time zone` | NO | '13:00:00'::time without time zone |
| `exit_market_end_time` | `time without time zone` | NO | '14:00:00'::time without time zone |
| `is_active` | `boolean` | YES | false |
| `justification_days` | `integer` | YES | 3 |
| `auto_sanction_rules` | `jsonb` | YES | '{"PRESENZA_TARDIVA": false, "USCITA_ANTICIPATA":  |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`market_transgressions`** (31 righe, 16 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('market_transgressions_id_seq'::regclass) |
| `market_id` | `integer` | NO | — |
| `market_date` | `date` | NO | — |
| `business_id` | `integer` | NO | — |
| `transgression_type` | `character varying` | NO | — |
| `status` | `character varying` | YES | 'PENDING'::character varying |
| `justification_deadline` | `timestamp without time zone` | YES | — |
| `justification_file_path` | `character varying` | YES | — |
| `justification_status` | `character varying` | YES | — |
| `justification_notes` | `text` | YES | — |
| `justification_review_notes` | `text` | YES | — |
| `sanction_id` | `integer` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |
| `checkin_time` | `timestamp without time zone` | YES | — |
| `detection_details` | `text` | YES | — |

**`markets`** (3 righe, 17 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('markets_id_seq'::regclass) |
| `code` | `character varying` | NO | — |
| `name` | `character varying` | NO | — |
| `municipality` | `character varying` | NO | — |
| `days` | `character varying` | YES | — |
| `total_stalls` | `integer` | YES | 0 |
| `status` | `character varying` | YES | 'active'::character varying |
| `gis_market_id` | `character varying` | YES | — |
| `latitude` | `numeric` | YES | — |
| `longitude` | `numeric` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `cost_per_sqm` | `numeric` | YES | 0.00 |
| `annual_market_days` | `integer` | YES | 52 |
| `comune_id` | `integer` | YES | — |
| `mercaweb_id` | `integer` | YES | — |
| `legacy_market_id` | `integer` | YES | — |

**`mio_agent_logs`** (326,543 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('mio_agent_logs_id_seq'::regclass) |
| `timestamp` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `agent` | `character varying` | NO | — |
| `service_id` | `character varying` | YES | — |
| `endpoint` | `character varying` | NO | — |
| `method` | `character varying` | NO | — |
| `status_code` | `integer` | YES | — |
| `risk` | `character varying` | YES | — |
| `success` | `boolean` | YES | true |
| `message` | `text` | YES | — |
| `meta_json` | `jsonb` | YES | — |
| `created_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |

**`mobility_checkins`** (13 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('mobility_checkins_id_seq'::regclass) |
| `user_id` | `integer` | NO | — |
| `stop_id` | `character varying` | NO | — |
| `stop_name` | `character varying` | NO | — |
| `lat` | `numeric` | YES | — |
| `lng` | `numeric` | YES | — |
| `comune_id` | `integer` | YES | — |
| `credits_earned` | `integer` | YES | 15 |
| `checkin_date` | `date` | YES | CURRENT_DATE |
| `created_at` | `timestamp without time zone` | YES | now() |

**`mobility_data`** (9,554 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `type` | `character varying` | NO | — |
| `line_number` | `character varying` | YES | — |
| `line_name` | `character varying` | YES | — |
| `stop_name` | `character varying` | YES | — |
| `lat` | `character varying` | YES | — |
| `lng` | `character varying` | YES | — |
| `status` | `character varying` | YES | 'active'::character varying |
| `occupancy` | `integer` | YES | — |
| `available_spots` | `integer` | YES | — |
| `total_spots` | `integer` | YES | — |
| `next_arrival` | `integer` | YES | — |
| `updated_at` | `timestamp without time zone` | NO | now() |
| `created_at` | `timestamp without time zone` | NO | now() |

**`notifiche`** (337 righe, 19 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('notifiche_id_seq'::regclass) |
| `mittente_id` | `integer` | YES | — |
| `mittente_tipo` | `character varying` | NO | 'PA'::character varying |
| `mittente_nome` | `character varying` | YES | — |
| `titolo` | `character varying` | NO | — |
| `messaggio` | `text` | NO | — |
| `tipo_messaggio` | `character varying` | NO | 'INFORMATIVA'::character varying |
| `data_invio` | `timestamp without time zone` | YES | now() |
| `id_conversazione` | `integer` | YES | — |
| `target_tipo` | `character varying` | YES | — |
| `target_id` | `integer` | YES | — |
| `target_nome` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |
| `letta` | `boolean` | YES | false |
| `impresa_id` | `integer` | YES | — |
| `tipo` | `character varying` | YES | 'GENERALE'::character varying |
| `comune_id` | `integer` | YES | — |
| `link_riferimento` | `text` | YES | — |

**`notifiche_destinatari`** (938 righe, 6 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('notifiche_destinatari_id_seq'::regclass) |
| `notifica_id` | `integer` | NO | — |
| `impresa_id` | `integer` | NO | — |
| `data_lettura` | `timestamp without time zone` | YES | — |
| `stato` | `character varying` | NO | 'INVIATO'::character varying |
| `created_at` | `timestamp without time zone` | YES | now() |

**`operator_daily_wallet`** (21 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('operator_daily_wallet_id_seq'::regclass) |
| `operator_id` | `integer` | NO | — |
| `date` | `date` | NO | CURRENT_DATE |
| `tcc_issued` | `integer` | YES | 0 |
| `tcc_redeemed` | `integer` | YES | 0 |
| `euro_sales` | `numeric` | YES | 0 |
| `settlement_status` | `character varying` | YES | 'open'::character varying |
| `settlement_euro` | `numeric` | YES | — |
| `settlement_date` | `timestamp without time zone` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |
| `impresa_id` | `integer` | YES | — |
| `wallet_status` | `character varying` | YES | 'active'::character varying |
| `settlement_number` | `character varying` | YES | — |

**`operator_transactions`** (16 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('operator_transactions_id_seq'::regclass) |
| `operator_id` | `integer` | NO | — |
| `user_id` | `integer` | YES | — |
| `type` | `character varying` | NO | — |
| `tcc_amount` | `integer` | NO | — |
| `euro_amount` | `numeric` | YES | — |
| `description` | `text` | YES | — |
| `qr_token` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `comune_id` | `integer` | YES | — |
| `lat` | `numeric` | YES | — |
| `lng` | `numeric` | YES | — |

**`permissions`** (102 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('permissions_id_seq'::regclass) |
| `code` | `character varying` | NO | — |
| `name` | `character varying` | NO | — |
| `description` | `text` | YES | — |
| `category` | `character varying` | NO | — |
| `resource` | `character varying` | NO | — |
| `action` | `character varying` | NO | — |
| `is_sensitive` | `boolean` | YES | false |
| `requires_audit` | `boolean` | YES | false |
| `created_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |

**`pm_watchlist`** (32 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('pm_watchlist_id_seq'::regclass) |
| `impresa_id` | `integer` | YES | — |
| `trigger_type` | `character varying` | NO | — |
| `trigger_description` | `text` | YES | — |
| `priority` | `character varying` | YES | 'MEDIA'::character varying |
| `status` | `character varying` | YES | 'PENDING'::character varying |
| `assigned_agent_id` | `integer` | YES | — |
| `source_id` | `integer` | YES | — |
| `source_type` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `comune_id` | `integer` | YES | — |

**`province`** (107 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('province_id_seq'::regclass) |
| `regione_id` | `integer` | YES | — |
| `nome` | `character varying` | NO | — |
| `sigla` | `character varying` | NO | — |
| `capoluogo` | `character varying` | NO | — |
| `lat` | `numeric` | NO | — |
| `lng` | `numeric` | NO | — |
| `zoom` | `integer` | YES | 10 |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`qr_tokens`** (4 righe, 5 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('qr_tokens_id_seq'::regclass) |
| `user_id` | `integer` | NO | — |
| `token` | `character varying` | NO | — |
| `expires_at` | `timestamp without time zone` | NO | — |
| `created_at` | `timestamp without time zone` | YES | now() |

**`qualification_types`** (10 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('qualification_types_id_seq'::regclass) |
| `code` | `character varying` | NO | — |
| `name` | `character varying` | NO | — |
| `description` | `text` | YES | — |
| `scope` | `USER-DEFINED` | NO | 'ENTERPRISE'::qualification_scope |
| `default_validity_months` | `integer` | YES | 0 |
| `issuer_type` | `USER-DEFINED` | NO | 'ALTRO'::qualification_issuer_type |
| `is_mandatory` | `boolean` | YES | false |
| `mandatory_for_json` | `jsonb` | YES | — |
| `enabled` | `boolean` | YES | true |
| `created_at` | `timestamp with time zone` | YES | now() |
| `updated_at` | `timestamp with time zone` | YES | now() |

**`qualificazioni`** (42 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('qualificazioni_id_seq'::regclass) |
| `impresa_id` | `integer` | NO | — |
| `tipo` | `character varying` | NO | — |
| `numero_certificato` | `character varying` | YES | — |
| `ente_rilascio` | `character varying` | NO | — |
| `data_rilascio` | `date` | NO | — |
| `data_scadenza` | `date` | NO | — |
| `stato` | `character varying` | YES | 'ATTIVA'::character varying |
| `note` | `text` | YES | — |
| `documento_url` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`referrals`** (4 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('referrals_id_seq'::regclass) |
| `referrer_user_id` | `integer` | NO | — |
| `referred_user_id` | `integer` | YES | — |
| `referral_code` | `character varying` | NO | — |
| `status` | `character varying` | YES | 'pending'::character varying |
| `registration_rewarded` | `boolean` | YES | false |
| `purchase_rewarded` | `boolean` | YES | false |
| `first_purchase_shop_id` | `integer` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `registered_at` | `timestamp without time zone` | YES | — |
| `first_purchase_at` | `timestamp without time zone` | YES | — |
| `comune_id` | `integer` | NO | — |

**`regioni`** (20 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('regioni_id_seq'::regclass) |
| `nome` | `character varying` | NO | — |
| `codice_istat` | `character varying` | NO | — |
| `capoluogo` | `character varying` | NO | — |
| `lat` | `numeric` | NO | — |
| `lng` | `numeric` | NO | — |
| `zoom` | `integer` | YES | 8 |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`regolarita_imprese`** (20 righe, 12 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('regolarita_imprese_id_seq'::regclass) |
| `impresa_id` | `integer` | NO | — |
| `tipo` | `character varying` | NO | — |
| `stato` | `character varying` | YES | 'REGOLARE'::character varying |
| `numero_documento` | `character varying` | YES | — |
| `data_rilascio` | `date` | YES | — |
| `data_scadenza` | `date` | YES | — |
| `ente_rilascio` | `character varying` | YES | — |
| `note` | `text` | YES | — |
| `ultimo_controllo` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`richieste_servizi`** (10 righe, 17 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('richieste_servizi_id_seq'::regclass) |
| `servizio_id` | `integer` | NO | — |
| `impresa_id` | `integer` | NO | — |
| `associazione_id` | `integer` | YES | — |
| `stato` | `character varying` | YES | 'RICHIESTA'::character varying |
| `priorita` | `character varying` | YES | 'NORMALE'::character varying |
| `note_richiesta` | `text` | YES | — |
| `note_lavorazione` | `text` | YES | — |
| `data_richiesta` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `data_presa_carico` | `timestamp without time zone` | YES | — |
| `data_completamento` | `timestamp without time zone` | YES | — |
| `operatore_assegnato` | `character varying` | YES | — |
| `importo_preventivo` | `numeric` | YES | — |
| `importo_finale` | `numeric` | YES | — |
| `documenti_allegati` | `ARRAY` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`role_permissions`** (285 righe, 7 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('role_permissions_id_seq'::regclass) |
| `role_id` | `integer` | NO | — |
| `permission_id` | `integer` | NO | — |
| `scope` | `USER-DEFINED` | YES | 'own'::permission_scope |
| `conditions` | `jsonb` | YES | — |
| `granted_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `granted_by` | `integer` | YES | — |

**`route_completions`** (1 righe, 20 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('route_completions_id_seq'::regclass) |
| `route_id` | `character varying` | NO | — |
| `user_id` | `integer` | YES | — |
| `start_lat` | `numeric` | YES | — |
| `start_lng` | `numeric` | YES | — |
| `end_lat` | `numeric` | YES | — |
| `end_lng` | `numeric` | YES | — |
| `destination_type` | `character varying` | YES | — |
| `destination_id` | `integer` | YES | — |
| `mode` | `character varying` | NO | — |
| `distance_m` | `integer` | YES | — |
| `duration_s` | `integer` | YES | — |
| `co2_saved_g` | `integer` | YES | 0 |
| `credits_earned` | `integer` | YES | 0 |
| `started_at` | `timestamp without time zone` | YES | — |
| `completed_at` | `timestamp without time zone` | YES | — |
| `status` | `character varying` | YES | 'started'::character varying |
| `comune_id` | `integer` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`sanctions`** (36 righe, 33 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('sanctions_id_seq'::regclass) |
| `inspection_id` | `integer` | YES | — |
| `impresa_id` | `integer` | YES | — |
| `verbale_code` | `character varying` | NO | — |
| `infraction_code` | `character varying` | NO | — |
| `description` | `text` | YES | — |
| `amount` | `numeric` | NO | — |
| `payment_status` | `character varying` | YES | 'NON_PAGATO'::character varying |
| `issue_date` | `date` | YES | CURRENT_DATE |
| `due_date` | `date` | YES | — |
| `paid_date` | `date` | YES | — |
| `notified` | `boolean` | YES | false |
| `notified_at` | `timestamp without time zone` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `verbale_data_json` | `jsonb` | YES | — |
| `verbale_pdf_path` | `character varying` | YES | — |
| `agent_name` | `character varying` | YES | — |
| `agent_badge` | `character varying` | YES | — |
| `location` | `text` | YES | — |
| `transgressor_name` | `character varying` | YES | — |
| `transgressor_cf` | `character varying` | YES | — |
| `transgressor_address` | `text` | YES | — |
| `transgressor_doc_type` | `character varying` | YES | — |
| `transgressor_doc_number` | `character varying` | YES | — |
| `violation_datetime` | `timestamp without time zone` | YES | — |
| `contested_immediately` | `boolean` | YES | false |
| `transgressor_declaration` | `text` | YES | — |
| `accessory_sanctions` | `text` | YES | — |
| `pagopa_iuv` | `character varying` | YES | — |
| `pagopa_payment_date` | `timestamp without time zone` | YES | — |
| `reduced_amount` | `numeric` | YES | — |
| `reduced_due_date` | `date` | YES | — |

**`secrets`** (5 righe, 3 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `key` | `character varying` | NO | — |
| `value_encrypted` | `text` | NO | — |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`secrets_meta`** (10 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `character varying` | NO | — |
| `label` | `character varying` | NO | — |
| `category` | `character varying` | YES | — |
| `envvar` | `character varying` | NO | — |
| `env` | `character varying` | YES | 'prod'::character varying |
| `present` | `boolean` | YES | false |
| `notes` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |

**`secure_credentials`** (9 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `name` | `text` | NO | — |
| `scope` | `text` | NO | — |
| `last4` | `text` | NO | — |
| `created_by` | `text` | NO | — |
| `created_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `value_encrypted` | `text` | NO | — |

**`security_events`** (364 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('security_events_id_seq'::regclass) |
| `event_type` | `USER-DEFINED` | NO | — |
| `severity` | `USER-DEFINED` | NO | 'low'::severity |
| `user_id` | `integer` | YES | — |
| `ip_address` | `character varying` | YES | — |
| `user_agent` | `text` | YES | — |
| `description` | `text` | YES | — |
| `details` | `jsonb` | YES | — |
| `is_resolved` | `boolean` | YES | false |
| `resolved_at` | `timestamp with time zone` | YES | — |
| `resolved_by` | `integer` | YES | — |
| `resolution_notes` | `text` | YES | — |
| `created_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `metadata` | `jsonb` | YES | — |

**`servizi_associazioni`** (24 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('servizi_associazioni_id_seq'::regclass) |
| `associazione_id` | `integer` | YES | — |
| `codice` | `character varying` | NO | — |
| `nome` | `character varying` | NO | — |
| `descrizione` | `text` | YES | — |
| `categoria` | `character varying` | YES | — |
| `prezzo_base` | `numeric` | YES | — |
| `prezzo_associati` | `numeric` | YES | — |
| `durata_media_giorni` | `integer` | YES | 7 |
| `documenti_richiesti` | `ARRAY` | YES | — |
| `priorita` | `integer` | YES | 0 |
| `attivo` | `boolean` | YES | true |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

**`settori_comune`** (94 righe, 24 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('settori_comune_id_seq'::regclass) |
| `comune_id` | `integer` | YES | — |
| `tipo_settore` | `character varying` | NO | — |
| `nome_settore` | `character varying` | YES | — |
| `responsabile_nome` | `character varying` | YES | — |
| `responsabile_cognome` | `character varying` | YES | — |
| `email` | `character varying` | YES | — |
| `pec` | `character varying` | YES | — |
| `telefono` | `character varying` | YES | — |
| `indirizzo` | `character varying` | YES | — |
| `orari_apertura` | `text` | YES | — |
| `note` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |
| `codice_uni_uo` | `character varying` | YES | — |
| `codice_uni_aoo` | `character varying` | YES | — |
| `codice_uo` | `character varying` | YES | — |
| `descrizione_uo` | `text` | YES | — |
| `cap` | `character varying` | YES | — |
| `comune` | `character varying` | YES | — |
| `provincia` | `character varying` | YES | — |
| `regione` | `character varying` | YES | — |
| `codice_fiscale_sfe` | `character varying` | YES | — |
| `data_aggiornamento_ipa` | `timestamp without time zone` | YES | — |

**`shops`** (3 righe, 9 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `market_id` | `integer` | YES | — |
| `name` | `character varying` | NO | — |
| `category` | `character varying` | YES | — |
| `certifications` | `text` | YES | — |
| `pending_reimbursement` | `integer` | NO | 0 |
| `total_reimbursed` | `integer` | NO | 0 |
| `bank_account` | `character varying` | YES | — |
| `created_at` | `timestamp without time zone` | NO | now() |

**`spend_qr_tokens`** (49 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('spend_qr_tokens_id_seq'::regclass) |
| `user_id` | `integer` | NO | — |
| `token` | `character varying` | NO | — |
| `tcc_amount` | `integer` | NO | — |
| `euro_amount` | `numeric` | NO | — |
| `status` | `character varying` | YES | 'pending'::character varying |
| `used_by_operator_id` | `integer` | YES | — |
| `used_at` | `timestamp without time zone` | YES | — |
| `expires_at` | `timestamp without time zone` | NO | — |
| `created_at` | `timestamp without time zone` | YES | now() |

**`stalls`** (583 righe, 28 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('stalls_id_seq'::regclass) |
| `market_id` | `integer` | NO | — |
| `number` | `character varying` | NO | — |
| `gis_slot_id` | `character varying` | YES | — |
| `width` | `numeric` | YES | — |
| `depth` | `numeric` | YES | — |
| `type` | `character varying` | YES | 'fisso'::character varying |
| `status` | `character varying` | YES | 'libero'::character varying |
| `orientation` | `numeric` | YES | — |
| `notes` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `is_active` | `boolean` | NO | true |
| `market_code` | `character` | YES | — |
| `row_code` | `character` | YES | — |
| `stall_code` | `character` | YES | — |
| `full_code` | `character` | YES | — |
| `latitude` | `numeric` | YES | — |
| `longitude` | `numeric` | YES | — |
| `area_mq` | `numeric` | YES | — |
| `geometry_geojson` | `jsonb` | YES | — |
| `dimensions` | `character varying` | YES | — |
| `rotation` | `numeric` | YES | — |
| `spuntista_impresa_id` | `integer` | YES | — |
| `spuntista_nome` | `character varying` | YES | — |
| `comune_id` | `integer` | YES | — |
| `mercaweb_id` | `integer` | YES | — |
| `legacy_stall_id` | `integer` | YES | — |

**`suap_checks`** (232 righe, 7 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `pratica_id` | `uuid` | NO | — |
| `check_code` | `character varying` | NO | — |
| `esito` | `boolean` | NO | — |
| `dettaglio` | `jsonb` | YES | — |
| `fonte` | `character varying` | YES | — |
| `created_at` | `timestamp with time zone` | YES | now() |

**`suap_decisioni`** (22 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `pratica_id` | `uuid` | NO | — |
| `outcome_code` | `character varying` | NO | — |
| `score` | `integer` | YES | — |
| `reasons` | `jsonb` | YES | — |
| `human_summary` | `text` | YES | — |
| `approved_by` | `character varying` | YES | — |
| `created_at` | `timestamp with time zone` | YES | now() |

**`suap_eventi`** (48 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `pratica_id` | `uuid` | NO | — |
| `tipo_evento` | `character varying` | NO | — |
| `descrizione` | `text` | YES | — |
| `payload_raw` | `jsonb` | YES | — |
| `correlation_id` | `character varying` | YES | — |
| `operatore` | `character varying` | YES | 'SYSTEM'::character varying |
| `created_at` | `timestamp with time zone` | YES | now() |

**`suap_pratiche`** (28 righe, 73 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `uuid` | NO | gen_random_uuid() |
| `ente_id` | `uuid` | NO | — |
| `cui` | `character varying` | NO | — |
| `tipo_pratica` | `character varying` | NO | — |
| `stato` | `character varying` | NO | 'RECEIVED'::character varying |
| `richiedente_cf` | `character varying` | YES | — |
| `richiedente_nome` | `character varying` | YES | — |
| `impresa_id` | `uuid` | YES | — |
| `data_presentazione` | `timestamp with time zone` | NO | — |
| `esito_automatico` | `character varying` | YES | — |
| `score` | `integer` | YES | 0 |
| `created_at` | `timestamp with time zone` | YES | now() |
| `updated_at` | `timestamp with time zone` | YES | now() |
| `oggetto` | `character varying` | YES | — |
| `numero_protocollo` | `character varying` | YES | — |
| `comune_presentazione` | `character varying` | YES | 'MODENA'::character varying |
| `tipo_segnalazione` | `character varying` | YES | 'subingresso'::character varying |
| `motivo_subingresso` | `character varying` | YES | — |
| `settore_merceologico` | `character varying` | YES | 'Non Alimentare'::character varying |
| `ruolo_dichiarante` | `character varying` | YES | 'Titolare'::character varying |
| `sub_ragione_sociale` | `character varying` | YES | — |
| `sub_nome` | `character varying` | YES | — |
| `sub_cognome` | `character varying` | YES | — |
| `sub_data_nascita` | `date` | YES | — |
| `sub_luogo_nascita` | `character varying` | YES | — |
| `sub_residenza_via` | `character varying` | YES | — |
| `sub_residenza_comune` | `character varying` | YES | — |
| `sub_residenza_cap` | `character varying` | YES | — |
| `sub_sede_via` | `character varying` | YES | — |
| `sub_sede_comune` | `character varying` | YES | — |
| `sub_sede_provincia` | `character varying` | YES | — |
| `sub_sede_cap` | `character varying` | YES | — |
| `sub_pec` | `character varying` | YES | — |
| `sub_telefono` | `character varying` | YES | — |
| `ced_cf` | `character varying` | YES | — |
| `ced_ragione_sociale` | `character varying` | YES | — |
| `ced_nome` | `character varying` | YES | — |
| `ced_cognome` | `character varying` | YES | — |
| `ced_data_nascita` | `date` | YES | — |
| `ced_luogo_nascita` | `character varying` | YES | — |
| `ced_residenza_via` | `character varying` | YES | — |
| `ced_residenza_comune` | `character varying` | YES | — |
| `ced_residenza_cap` | `character varying` | YES | — |
| `ced_pec` | `character varying` | YES | — |
| `ced_scia_precedente` | `character varying` | YES | — |
| `ced_data_presentazione` | `date` | YES | — |
| `ced_comune_presentazione` | `character varying` | YES | — |
| `mercato_id` | `character varying` | YES | — |
| `mercato_nome` | `character varying` | YES | — |
| `posteggio_id` | `character varying` | YES | — |
| `posteggio_numero` | `character varying` | YES | — |
| `ubicazione_mercato` | `character varying` | YES | — |
| `giorno_mercato` | `character varying` | YES | — |
| `fila` | `character varying` | YES | — |
| `dimensioni_mq` | `numeric` | YES | — |
| `dimensioni_lineari` | `character varying` | YES | — |
| `attrezzature` | `character varying` | YES | — |
| `notaio_rogante` | `character varying` | YES | — |
| `numero_repertorio` | `character varying` | YES | — |
| `data_atto` | `date` | YES | — |
| `del_nome` | `character varying` | YES | — |
| `del_cognome` | `character varying` | YES | — |
| `del_cf` | `character varying` | YES | — |
| `del_data_nascita` | `date` | YES | — |
| `del_luogo_nascita` | `character varying` | YES | — |
| `del_qualifica` | `character varying` | YES | — |
| `del_residenza_via` | `character varying` | YES | — |
| `del_residenza_comune` | `character varying` | YES | — |
| `del_residenza_cap` | `character varying` | YES | — |
| `sub_partita_iva` | `character varying` | YES | — |
| `ced_partita_iva` | `character varying` | YES | — |
| `del_pec` | `character varying` | YES | — |
| `concessione_id` | `integer` | YES | — |

**`transactions`** (106 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `user_id` | `integer` | YES | — |
| `shop_id` | `integer` | YES | — |
| `type` | `character varying` | NO | — |
| `amount` | `integer` | NO | — |
| `euro_value` | `integer` | YES | — |
| `description` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | NO | now() |
| `operator_id` | `integer` | YES | — |
| `qr_token` | `character varying` | YES | — |

**`user_role_assignments`** (5 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('user_role_assignments_id_seq'::regclass) |
| `user_id` | `integer` | NO | — |
| `role_id` | `integer` | NO | — |
| `territory_type` | `USER-DEFINED` | YES | — |
| `territory_id` | `integer` | YES | — |
| `assigned_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `assigned_by` | `integer` | YES | — |
| `expires_at` | `timestamp with time zone` | YES | — |
| `is_active` | `boolean` | YES | true |
| `notes` | `text` | YES | — |

**`user_roles`** (14 righe, 11 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('user_roles_id_seq'::regclass) |
| `code` | `character varying` | NO | — |
| `name` | `character varying` | NO | — |
| `description` | `text` | YES | — |
| `sector` | `USER-DEFINED` | NO | — |
| `level` | `integer` | NO | 0 |
| `is_system` | `boolean` | YES | false |
| `can_delegate` | `boolean` | YES | false |
| `max_delegation_depth` | `integer` | YES | 0 |
| `created_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |

**`user_sessions`** (66 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('user_sessions_id_seq'::regclass) |
| `user_id` | `integer` | NO | — |
| `session_token` | `character varying` | NO | — |
| `ip_address` | `character varying` | YES | — |
| `user_agent` | `text` | YES | — |
| `device_type` | `USER-DEFINED` | YES | 'unknown'::device_type |
| `device_info` | `jsonb` | YES | — |
| `location_info` | `jsonb` | YES | — |
| `created_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `last_activity_at` | `timestamp with time zone` | YES | CURRENT_TIMESTAMP |
| `expires_at` | `timestamp with time zone` | NO | — |
| `is_active` | `boolean` | YES | true |
| `terminated_at` | `timestamp with time zone` | YES | — |
| `termination_reason` | `character varying` | YES | — |

**`users`** (8 righe, 18 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `openId` | `character varying` | NO | — |
| `name` | `text` | YES | — |
| `email` | `character varying` | YES | — |
| `loginMethod` | `character varying` | YES | — |
| `role` | `USER-DEFINED` | NO | 'user'::role |
| `createdAt` | `timestamp without time zone` | NO | now() |
| `updatedAt` | `timestamp without time zone` | NO | now() |
| `lastSignedIn` | `timestamp without time zone` | NO | now() |
| `fiscal_code` | `character varying` | YES | — |
| `password_hash` | `character varying` | YES | — |
| `auth_provider` | `character varying` | YES | 'spid'::character varying |
| `email_verified` | `boolean` | YES | false |
| `must_change_password` | `boolean` | YES | false |
| `created_at` | `timestamp without time zone` | YES | now() |
| `updated_at` | `timestamp without time zone` | YES | now() |
| `impresa_id` | `integer` | YES | — |
| `legacy_user_id` | `integer` | YES | — |

**`v_enterprise_compliance`** (14 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `enterprise_id` | `integer` | YES | — |
| `has_haccp_valid` | `boolean` | YES | — |
| `has_firecourse_valid` | `boolean` | YES | — |
| `has_firstaid_valid` | `boolean` | YES | — |
| `has_safetycourse_valid` | `boolean` | YES | — |
| `has_dvr_valid` | `boolean` | YES | — |
| `has_req_sanitary_valid` | `boolean` | YES | — |
| `has_req_sommin_valid` | `boolean` | YES | — |
| `durc_inps_status` | `USER-DEFINED` | YES | — |
| `durc_inail_status` | `USER-DEFINED` | YES | — |
| `missing_requirements` | `jsonb` | YES | — |
| `expiring_soon` | `jsonb` | YES | — |
| `overall_status` | `USER-DEFINED` | YES | — |
| `last_check_at` | `timestamp with time zone` | YES | — |

**`v_fund_stats_by_comune`** (1 righe, 7 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `comune_id` | `integer` | YES | — |
| `total_deposits` | `bigint` | YES | — |
| `total_withdrawals` | `bigint` | YES | — |
| `fund_balance` | `bigint` | YES | — |
| `total_deposits_eur` | `bigint` | YES | — |
| `total_withdrawals_eur` | `bigint` | YES | — |
| `fund_balance_eur` | `bigint` | YES | — |

**`v_tcc_circulation_by_comune`** (2 righe, 4 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `comune_id` | `integer` | YES | — |
| `total_issued` | `bigint` | YES | — |
| `total_redeemed` | `bigint` | YES | — |
| `tcc_in_circulation` | `bigint` | YES | — |

**`v_top_merchants_by_comune`** (2 righe, 4 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `comune_id` | `integer` | YES | — |
| `operator_id` | `integer` | YES | — |
| `total_tcc_issued` | `bigint` | YES | — |
| `transaction_count` | `bigint` | YES | — |

**`vendor_presences`** (52 righe, 23 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | — |
| `vendor_id` | `integer` | NO | — |
| `stall_id` | `integer` | YES | — |
| `booking_id` | `integer` | YES | — |
| `checkin_time` | `timestamp without time zone` | NO | — |
| `checkout_time` | `timestamp without time zone` | YES | — |
| `duration` | `integer` | YES | — |
| `lat` | `character varying` | YES | — |
| `lng` | `character varying` | YES | — |
| `notes` | `text` | YES | — |
| `created_at` | `timestamp without time zone` | NO | now() |
| `market_id` | `integer` | YES | — |
| `impresa_id` | `integer` | YES | — |
| `wallet_id` | `integer` | YES | — |
| `tipo_presenza` | `character varying` | YES | 'CONCESSION'::character varying |
| `giorno_mercato` | `date` | YES | — |
| `orario_deposito_rifiuti` | `timestamp without time zone` | YES | — |
| `importo_addebitato` | `numeric` | YES | — |
| `mq_posteggio` | `numeric` | YES | — |
| `costo_mq_giorno` | `numeric` | YES | — |
| `transaction_id` | `integer` | YES | — |
| `graduatoria_id` | `integer` | YES | — |
| `legacy_presence_id` | `integer` | YES | — |

**`vendors`** (14 righe, 14 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('vendors_id_seq'::regclass) |
| `code` | `character varying` | NO | — |
| `business_name` | `character varying` | NO | — |
| `vat_number` | `character varying` | YES | — |
| `contact_name` | `character varying` | YES | — |
| `phone` | `character varying` | YES | — |
| `email` | `character varying` | YES | — |
| `address` | `text` | YES | — |
| `status` | `character varying` | YES | 'active'::character varying |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `impresa_id` | `integer` | YES | — |
| `comune_id` | `integer` | YES | — |
| `legacy_vendor_ref_id` | `integer` | YES | — |

**`wallet_history`** (132 righe, 13 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('wallet_history_id_seq'::regclass) |
| `wallet_id` | `integer` | NO | — |
| `impresa_id` | `integer` | YES | — |
| `evento` | `character varying` | NO | — |
| `motivo` | `character varying` | YES | — |
| `saldo_al_momento` | `numeric` | YES | 0 |
| `saldo_trasferito_a` | `integer` | YES | — |
| `concessione_id` | `integer` | YES | — |
| `mercato_id` | `integer` | YES | — |
| `posteggio_id` | `integer` | YES | — |
| `note` | `text` | YES | — |
| `operatore_id` | `character varying` | YES | — |
| `created_at` | `timestamp with time zone` | NO | now() |

**`wallet_notifications`** (4 righe, 11 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('wallet_notifications_id_seq'::regclass) |
| `user_id` | `integer` | NO | — |
| `type` | `character varying` | NO | — |
| `amount` | `integer` | YES | — |
| `category` | `character varying` | YES | — |
| `title` | `character varying` | YES | — |
| `message` | `text` | YES | — |
| `icon` | `character varying` | YES | — |
| `color` | `character varying` | YES | — |
| `read` | `boolean` | YES | false |
| `created_at` | `timestamp without time zone` | YES | now() |

**`wallet_scadenze`** (68 righe, 21 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('wallet_scadenze_id_seq'::regclass) |
| `wallet_id` | `integer` | NO | — |
| `tipo` | `character varying` | NO | — |
| `anno_riferimento` | `integer` | NO | — |
| `importo_dovuto` | `numeric` | NO | — |
| `importo_pagato` | `numeric` | YES | 0 |
| `data_scadenza` | `date` | NO | — |
| `data_pagamento` | `date` | YES | — |
| `giorni_ritardo` | `integer` | YES | 0 |
| `importo_mora` | `numeric` | YES | 0 |
| `importo_interessi` | `numeric` | YES | 0 |
| `tasso_mora` | `numeric` | YES | 0.05 |
| `tasso_interessi_giornaliero` | `numeric` | YES | 0.000137 |
| `stato` | `character varying` | NO | 'DA_PAGARE'::character varying |
| `avviso_pagopa_id` | `integer` | YES | — |
| `note` | `text` | YES | — |
| `created_at` | `timestamp with time zone` | NO | now() |
| `updated_at` | `timestamp with time zone` | NO | now() |
| `rata_numero` | `integer` | YES | 1 |
| `rata_totale` | `integer` | YES | 1 |
| `pagato_in_mora` | `boolean` | YES | false |

**`wallet_transactions`** (1,058 righe, 8 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('wallet_transactions_id_seq'::regclass) |
| `wallet_id` | `integer` | YES | — |
| `type` | `character varying` | NO | — |
| `amount` | `numeric` | NO | — |
| `description` | `text` | YES | — |
| `reference_id` | `character varying` | YES | — |
| `transaction_date` | `timestamp without time zone` | YES | now() |
| `created_at` | `timestamp without time zone` | YES | now() |

**`wallets`** (89 righe, 10 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('wallets_id_seq'::regclass) |
| `company_id` | `integer` | YES | — |
| `concession_id` | `integer` | YES | — |
| `market_id` | `integer` | YES | — |
| `type` | `character varying` | NO | — |
| `balance` | `numeric` | YES | 0.00 |
| `status` | `character varying` | YES | 'ACTIVE'::character varying |
| `last_update` | `timestamp without time zone` | YES | now() |
| `created_at` | `timestamp without time zone` | YES | now() |
| `comune_id` | `integer` | YES | — |

**`workspace_snapshots`** (6 righe, 5 colonne)

| Colonna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | `integer` | NO | nextval('workspace_snapshots_id_seq'::regclass) |
| `conversation_id` | `character varying` | NO | — |
| `snapshot` | `jsonb` | NO | — |
| `created_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |
| `updated_at` | `timestamp without time zone` | YES | CURRENT_TIMESTAMP |

#### Tabelle vuote (0 righe)

| Tabella | Colonne |
|---|---|
| `agent_brain` | id, agent, memory_type, key, value, confidence, expires_at, created_at ... (+1) |
| `agent_context` | id, context_id, conversation_id, context_type, key, value, visibility, priority ... (+3) |
| `agent_projects` | id, project_id, name, description, status, metadata, tags, created_by ... (+2) |
| `agent_tasks` | id, task_id, agent_assigned, task_type, priority, status, input, output ... (+6) |
| `api_keys` | id, name, key, environment, status, permissions, rate_limit, last_used_at ... (+4) |
| `api_metrics` | id, api_key_id, endpoint, method, status_code, response_time, ip_address, user_agent ... (+2) |
| `audit_logs` | id, user_email, action, entity_type, entity_id, old_value, new_value, ip_address ... (+1) |
| `bookings` | id, stall_id, user_id, vendor_id, status, booking_date, expires_at, checked_in_at ... (+3) |
| `business_analytics` | id, business_id, business_name, category, total_sales, total_credits, total_revenue, rating ... (+3) |
| `carbon_footprint` | id, product_id, lifecycle_co2, transport_co2, packaging_co2, total_co2, calculated_at |
| `challenge_participations` | id, challenge_id, user_id, current_value, completed, rewarded, joined_at, completed_at |
| `chat_messages_old` | id, room, agent, content, meta, created_at |
| `checkins` | id, user_id, market_id, transport, lat, lng, carbon_saved, created_at |
| `compliance_certificates` | id, user_id, certificate_type, issued_at, expires_at, document_url, verified_by, verification_notes ... (+1) |
| `comune_contratti` | id, comune_id, tipo_contratto, descrizione, data_inizio, data_fine, importo_annuale, stato ... (+3) |
| `comune_fatture` | id, comune_id, contratto_id, numero_fattura, data_emissione, data_scadenza, importo, iva ... (+7) |
| `concession_payments` | id, concession_id, vendor_id, amount, payment_method, payment_reference, status, paid_at ... (+2) |
| `custom_areas` | id, market_id, name, type, geojson, color, opacity, description ... (+1) |
| `custom_markers` | id, market_id, name, type, lat, lng, icon, color ... (+2) |
| `data_bag` | id, key, value, value_type, owner, access_level, ttl, expires_at ... (+2) |
| `dima_mappe` | id, market_id, name, png_base64, corners, center_lat, center_lng, rotation ... (+6) |
| `dms_durc_snapshots` | id, created_at, company_id, richiesta_identificativo, numero_protocollo_durc, ente_emittente, esito_regolarita, data_emissione ... (+4) |
| `ecocredits` | id, user_id, tcc_converted, ecocredit_amount, tpas_fund_id, conversion_rate, converted_at |
| `enterprise_employees` | id, enterprise_id, full_name, cf, role, can_mark_presence, is_active, created_at ... (+1) |
| `enterprise_qualifications` | id, enterprise_id, qualification_type_id, holder_type, holder_id, issue_date, expiry_date, status ... (+9) |
| `external_connections` | id, name, type, endpoint, status, last_check_at, last_sync_at, last_error ... (+5) |
| `hub_services` | id, hub_id, name, type, description, capacity, available, price ... (+6) |
| `inspections_detailed` | id, vendor_id, stall_id, inspector_name, inspector_badge, type, checklist, photos_urls ... (+6) |
| `ip_blacklist` | id, ip_address, reason, blocked_by, blocked_at, expires_at, is_permanent, unblocked_at ... (+1) |
| `market_tariffs` | id, market_id, year, price_per_sqm, market_days_count, created_at, updated_at |
| `notifications` | id, title, message, type, target_users, sent, delivered, opened ... (+2) |
| `product_tracking` | id, product_id, tpass_id, origin_country, origin_city, transport_mode, distance_km, co2_kg ... (+4) |
| `products` | id, shop_id, name, category, certifications, price, created_at |
| `reimbursements` | id, shop_id, credits, euros, status, batch_id, processed_at, created_at |
| `security_delegations` | id, delegator_id, delegate_id, permission_id, role_id, scope, territory_type, territory_id ... (+7) |
| `suap_azioni` | id, pratica_id, tipo_azione, payload, status, idempotency_key, error_log, created_at ... (+1) |
| `suap_documenti` | id, pratica_id, file_name, file_hash, storage_path, metadata, created_at |
| `suap_regole` | id, ente_id, check_code, tipo, peso, enabled, config, created_at |
| `sustainability_metrics` | id, date, population_rating, total_co2_saved, local_purchases, ecommerce_purchases, avg_co2_local, avg_co2_ecommerce |
| `system_events` | id, event_id, event_type, source, target, payload, metadata, processed ... (+2) |
| `system_logs` | id, app, level, type, message, user_email, ip_address, created_at |
| `user_analytics` | id, user_id, transport, origin, sustainability_rating, co2_saved, created_at |
| `v_burn_rate_by_comune` | comune_id, avg_daily_burn_rate |
| `vendor_documents` | id, vendor_id, type, document_number, issue_date, expiry_date, file_url, status ... (+5) |
| `violations` | id, inspection_id, vendor_id, stall_id, violation_type, violation_code, description, fine_amount ... (+7) |
| `wallet_balance_snapshots` | id, wallet_id, anno, mese, saldo_iniziale, saldo_finale, totale_entrate, totale_uscite ... (+2) |
| `webhook_logs` | id, webhook_id, event, payload, status_code, response_body, response_time, success ... (+3) |
| `webhooks` | id, name, url, events, status, secret, headers, retry_policy ... (+6) |
| `zapier_webhook_logs` | id, event_type, payload, status, response, error, created_at |

---

## SEZIONE 2: INDICI

**`access_logs`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_access_logs_user` | `CREATE INDEX idx_access_logs_user ON public.access_logs USING btree (user_id)` |
| `idx_access_logs_created` | `CREATE INDEX idx_access_logs_created ON public.access_logs USING btree (created_at DESC)` |
| `access_logs_pkey` | `CREATE UNIQUE INDEX access_logs_pkey ON public.access_logs USING btree (id)` |

**`agent_brain`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `agent_brain_pkey` | `CREATE UNIQUE INDEX agent_brain_pkey ON public.agent_brain USING btree (id)` |

**`agent_context`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `agent_context_context_id_unique` | `CREATE UNIQUE INDEX agent_context_context_id_unique ON public.agent_context USING btree (context_id)` |
| `agent_context_pkey` | `CREATE UNIQUE INDEX agent_context_pkey ON public.agent_context USING btree (id)` |

**`agent_conversations`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `agent_conversations_pkey` | `CREATE UNIQUE INDEX agent_conversations_pkey ON public.agent_conversations USING btree (id)` |
| `idx_agent_conversations_updated_at` | `CREATE INDEX idx_agent_conversations_updated_at ON public.agent_conversations USING btree (updated_at DESC)` |

**`agent_messages`** (9 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_agent_messages_recipient` | `CREATE INDEX idx_agent_messages_recipient ON public.agent_messages USING btree (recipient) WHERE (recipient IS NOT NULL)` |
| `idx_agent_messages_tool` | `CREATE INDEX idx_agent_messages_tool ON public.agent_messages USING btree (tool_call_id) WHERE (tool_call_id IS NOT NULL)` |
| `idx_agent_messages_error` | `CREATE INDEX idx_agent_messages_error ON public.agent_messages USING btree (error) WHERE (error = true)` |
| `idx_agent_messages_created` | `CREATE INDEX idx_agent_messages_created ON public.agent_messages USING btree (created_at DESC)` |
| `agent_messages_pkey` | `CREATE UNIQUE INDEX agent_messages_pkey ON public.agent_messages USING btree (id)` |
| `idx_agent_messages_conv` | `CREATE INDEX idx_agent_messages_conv ON public.agent_messages USING btree (conversation_id, created_at DESC)` |
| `idx_agent_messages_conversation_id` | `CREATE INDEX idx_agent_messages_conversation_id ON public.agent_messages USING btree (conversation_id)` |
| `idx_agent_messages_agent` | `CREATE INDEX idx_agent_messages_agent ON public.agent_messages USING btree (agent)` |
| `idx_agent_messages_sender` | `CREATE INDEX idx_agent_messages_sender ON public.agent_messages USING btree (sender)` |

**`agent_projects`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `agent_projects_pkey` | `CREATE UNIQUE INDEX agent_projects_pkey ON public.agent_projects USING btree (id)` |
| `agent_projects_project_id_unique` | `CREATE UNIQUE INDEX agent_projects_project_id_unique ON public.agent_projects USING btree (project_id)` |

**`agent_screenshots`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `agent_screenshots_pkey` | `CREATE UNIQUE INDEX agent_screenshots_pkey ON public.agent_screenshots USING btree (id)` |
| `idx_screenshots_id` | `CREATE INDEX idx_screenshots_id ON public.agent_screenshots USING btree (screenshot_id)` |
| `idx_screenshots_conversation` | `CREATE INDEX idx_screenshots_conversation ON public.agent_screenshots USING btree (conversation_id)` |
| `agent_screenshots_screenshot_id_key` | `CREATE UNIQUE INDEX agent_screenshots_screenshot_id_key ON public.agent_screenshots USING btree (screenshot_id)` |
| `idx_screenshots_agent` | `CREATE INDEX idx_screenshots_agent ON public.agent_screenshots USING btree (agent_name)` |

**`agent_tasks`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `agent_tasks_task_id_unique` | `CREATE UNIQUE INDEX agent_tasks_task_id_unique ON public.agent_tasks USING btree (task_id)` |
| `agent_tasks_pkey` | `CREATE UNIQUE INDEX agent_tasks_pkey ON public.agent_tasks USING btree (id)` |

**`agents`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `agents_pkey` | `CREATE UNIQUE INDEX agents_pkey ON public.agents USING btree (id)` |

**`api_keys`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `api_keys_pkey` | `CREATE UNIQUE INDEX api_keys_pkey ON public.api_keys USING btree (id)` |
| `api_keys_key_unique` | `CREATE UNIQUE INDEX api_keys_key_unique ON public.api_keys USING btree (key)` |

**`api_metrics`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `api_metrics_pkey` | `CREATE UNIQUE INDEX api_metrics_pkey ON public.api_metrics USING btree (id)` |

**`audit_logs`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `audit_logs_pkey` | `CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)` |

**`autorizzazioni`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `autorizzazioni_pkey` | `CREATE UNIQUE INDEX autorizzazioni_pkey ON public.autorizzazioni USING btree (id)` |
| `idx_autorizzazioni_tipo` | `CREATE INDEX idx_autorizzazioni_tipo ON public.autorizzazioni USING btree (tipo)` |
| `idx_autorizzazioni_mercato` | `CREATE INDEX idx_autorizzazioni_mercato ON public.autorizzazioni USING btree (mercato_id)` |
| `idx_autorizzazioni_impresa` | `CREATE INDEX idx_autorizzazioni_impresa ON public.autorizzazioni USING btree (impresa_id)` |

**`bandi_associazioni`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_bandi_associazioni_stato` | `CREATE INDEX idx_bandi_associazioni_stato ON public.bandi_associazioni USING btree (stato)` |
| `bandi_associazioni_pkey` | `CREATE UNIQUE INDEX bandi_associazioni_pkey ON public.bandi_associazioni USING btree (id)` |

**`bandi_catalogo`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_bandi_catalogo_data_chiusura` | `CREATE INDEX idx_bandi_catalogo_data_chiusura ON public.bandi_catalogo USING btree (data_chiusura)` |
| `bandi_catalogo_pkey` | `CREATE UNIQUE INDEX bandi_catalogo_pkey ON public.bandi_catalogo USING btree (id)` |
| `idx_bandi_catalogo_stato` | `CREATE INDEX idx_bandi_catalogo_stato ON public.bandi_catalogo USING btree (stato)` |

**`bookings`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `bookings_pkey` | `CREATE UNIQUE INDEX bookings_pkey ON public.bookings USING btree (id)` |

**`business_analytics`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `business_analytics_pkey` | `CREATE UNIQUE INDEX business_analytics_pkey ON public.business_analytics USING btree (id)` |

**`carbon_credits_config`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `carbon_credits_config_pkey` | `CREATE UNIQUE INDEX carbon_credits_config_pkey ON public.carbon_credits_config USING btree (id)` |

**`carbon_credits_rules`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `carbon_credits_rules_pkey` | `CREATE UNIQUE INDEX carbon_credits_rules_pkey ON public.carbon_credits_rules USING btree (id)` |
| `idx_carbon_credits_rules_comune_id` | `CREATE INDEX idx_carbon_credits_rules_comune_id ON public.carbon_credits_rules USING btree (comune_id)` |
| `idx_carbon_credits_rules_type` | `CREATE INDEX idx_carbon_credits_rules_type ON public.carbon_credits_rules USING btree (type)` |

**`carbon_footprint`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `carbon_footprint_pkey` | `CREATE UNIQUE INDEX carbon_footprint_pkey ON public.carbon_footprint USING btree (id)` |

**`challenge_participations`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `challenge_participations_challenge_id_user_id_key` | `CREATE UNIQUE INDEX challenge_participations_challenge_id_user_id_key ON public.challenge_participations USING btree (challenge_id, user_id)` |
| `idx_cp_challenge` | `CREATE INDEX idx_cp_challenge ON public.challenge_participations USING btree (challenge_id)` |
| `idx_cp_user` | `CREATE INDEX idx_cp_user ON public.challenge_participations USING btree (user_id)` |
| `challenge_participations_pkey` | `CREATE UNIQUE INDEX challenge_participations_pkey ON public.challenge_participations USING btree (id)` |

**`chat_messages_old`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_chat_messages_created_at` | `CREATE INDEX idx_chat_messages_created_at ON public.chat_messages_old USING btree (created_at DESC)` |
| `idx_chat_messages_room` | `CREATE INDEX idx_chat_messages_room ON public.chat_messages_old USING btree (room)` |
| `chat_messages_pkey` | `CREATE UNIQUE INDEX chat_messages_pkey ON public.chat_messages_old USING btree (id)` |
| `idx_chat_messages_room_created_at` | `CREATE INDEX idx_chat_messages_room_created_at ON public.chat_messages_old USING btree (room, created_at DESC)` |

**`checkins`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `checkins_pkey` | `CREATE UNIQUE INDEX checkins_pkey ON public.checkins USING btree (id)` |

**`civic_config`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `civic_config_comune_id_key` | `CREATE UNIQUE INDEX civic_config_comune_id_key ON public.civic_config USING btree (comune_id)` |
| `civic_config_pkey` | `CREATE UNIQUE INDEX civic_config_pkey ON public.civic_config USING btree (id)` |

**`civic_reports`** (6 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_civic_reports_comune` | `CREATE INDEX idx_civic_reports_comune ON public.civic_reports USING btree (comune_id)` |
| `idx_civic_reports_status` | `CREATE INDEX idx_civic_reports_status ON public.civic_reports USING btree (status)` |
| `idx_civic_reports_type` | `CREATE INDEX idx_civic_reports_type ON public.civic_reports USING btree (type)` |
| `civic_reports_pkey` | `CREATE UNIQUE INDEX civic_reports_pkey ON public.civic_reports USING btree (id)` |
| `idx_civic_reports_created` | `CREATE INDEX idx_civic_reports_created ON public.civic_reports USING btree (created_at DESC)` |
| `idx_civic_reports_priority` | `CREATE INDEX idx_civic_reports_priority ON public.civic_reports USING btree (priority)` |

**`collaboratori_impresa`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_collaboratori_telefono` | `CREATE INDEX idx_collaboratori_telefono ON public.collaboratori_impresa USING btree (telefono)` |
| `idx_collaboratori_impresa_id` | `CREATE INDEX idx_collaboratori_impresa_id ON public.collaboratori_impresa USING btree (impresa_id)` |
| `collaboratori_impresa_pkey` | `CREATE UNIQUE INDEX collaboratori_impresa_pkey ON public.collaboratori_impresa USING btree (id)` |

**`compliance_certificates`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `compliance_certificates_pkey` | `CREATE UNIQUE INDEX compliance_certificates_pkey ON public.compliance_certificates USING btree (id)` |

**`comune_contratti`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `comune_contratti_pkey` | `CREATE UNIQUE INDEX comune_contratti_pkey ON public.comune_contratti USING btree (id)` |

**`comune_fatture`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `comune_fatture_pkey` | `CREATE UNIQUE INDEX comune_fatture_pkey ON public.comune_fatture USING btree (id)` |

**`comune_utenti`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `comune_utenti_comune_id_user_id_key` | `CREATE UNIQUE INDEX comune_utenti_comune_id_user_id_key ON public.comune_utenti USING btree (comune_id, user_id)` |
| `idx_comune_utenti_comune` | `CREATE INDEX idx_comune_utenti_comune ON public.comune_utenti USING btree (comune_id)` |
| `comune_utenti_pkey` | `CREATE UNIQUE INDEX comune_utenti_pkey ON public.comune_utenti USING btree (id)` |
| `idx_comune_utenti_user` | `CREATE INDEX idx_comune_utenti_user ON public.comune_utenti USING btree (user_id)` |
| `idx_comune_utenti_ruolo` | `CREATE INDEX idx_comune_utenti_ruolo ON public.comune_utenti USING btree (ruolo)` |

**`comuni`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `comuni_codice_ipa_key` | `CREATE UNIQUE INDEX comuni_codice_ipa_key ON public.comuni USING btree (codice_ipa)` |
| `idx_comuni_nome` | `CREATE INDEX idx_comuni_nome ON public.comuni USING btree (nome)` |
| `comuni_pkey` | `CREATE UNIQUE INDEX comuni_pkey ON public.comuni USING btree (id)` |

**`concession_payments`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `concession_payments_pkey` | `CREATE UNIQUE INDEX concession_payments_pkey ON public.concession_payments USING btree (id)` |

**`concessions`** (12 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_concessions_legacy_concession_id` | `CREATE INDEX idx_concessions_legacy_concession_id ON public.concessions USING btree (legacy_concession_id)` |
| `idx_concessions_tipo` | `CREATE INDEX idx_concessions_tipo ON public.concessions USING btree (tipo_concessione)` |
| `concessions_market_id_stall_id_vendor_id_valid_from_key` | `CREATE UNIQUE INDEX concessions_market_id_stall_id_vendor_id_valid_from_key ON public.concessions USING btree (market_id, stall_id, vendor_id, valid_from)` |
| `idx_concessions_cf` | `CREATE INDEX idx_concessions_cf ON public.concessions USING btree (cf_concessionario)` |
| `idx_concessions_dates` | `CREATE INDEX idx_concessions_dates ON public.concessions USING btree (valid_from, valid_to)` |
| `idx_concessions_vendor_id` | `CREATE INDEX idx_concessions_vendor_id ON public.concessions USING btree (vendor_id)` |
| `concessions_pkey` | `CREATE UNIQUE INDEX concessions_pkey ON public.concessions USING btree (id)` |
| `idx_concessions_market_id` | `CREATE INDEX idx_concessions_market_id ON public.concessions USING btree (market_id)` |
| `idx_concessions_impresa` | `CREATE INDEX idx_concessions_impresa ON public.concessions USING btree (impresa_id)` |
| `idx_concessions_status` | `CREATE INDEX idx_concessions_status ON public.concessions USING btree (status)` |
| `idx_concessions_stall_id` | `CREATE INDEX idx_concessions_stall_id ON public.concessions USING btree (stall_id)` |
| `idx_concessions_stato` | `CREATE INDEX idx_concessions_stato ON public.concessions USING btree (stato)` |

**`cultural_pois`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `cultural_pois_osm_id_key` | `CREATE UNIQUE INDEX cultural_pois_osm_id_key ON public.cultural_pois USING btree (osm_id)` |
| `idx_cultural_pois_region` | `CREATE INDEX idx_cultural_pois_region ON public.cultural_pois USING btree (region)` |
| `idx_cultural_pois_type` | `CREATE INDEX idx_cultural_pois_type ON public.cultural_pois USING btree (type)` |
| `idx_cultural_pois_coords` | `CREATE INDEX idx_cultural_pois_coords ON public.cultural_pois USING btree (lat, lng)` |
| `cultural_pois_pkey` | `CREATE UNIQUE INDEX cultural_pois_pkey ON public.cultural_pois USING btree (id)` |

**`cultural_visits`** (6 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_cultural_visits_poi_type` | `CREATE INDEX idx_cultural_visits_poi_type ON public.cultural_visits USING btree (poi_type)` |
| `idx_cultural_visits_unique_daily` | `CREATE UNIQUE INDEX idx_cultural_visits_unique_daily ON public.cultural_visits USING btree (user_id, poi_id, visit_date)` |
| `idx_cultural_visits_comune` | `CREATE INDEX idx_cultural_visits_comune ON public.cultural_visits USING btree (comune_id)` |
| `idx_cultural_visits_date` | `CREATE INDEX idx_cultural_visits_date ON public.cultural_visits USING btree (visit_date)` |
| `idx_cultural_visits_user` | `CREATE INDEX idx_cultural_visits_user ON public.cultural_visits USING btree (user_id)` |
| `cultural_visits_pkey` | `CREATE UNIQUE INDEX cultural_visits_pkey ON public.cultural_visits USING btree (id)` |

**`custom_areas`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `custom_areas_pkey` | `CREATE UNIQUE INDEX custom_areas_pkey ON public.custom_areas USING btree (id)` |

**`custom_markers`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `custom_markers_pkey` | `CREATE UNIQUE INDEX custom_markers_pkey ON public.custom_markers USING btree (id)` |

**`data_bag`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `data_bag_pkey` | `CREATE UNIQUE INDEX data_bag_pkey ON public.data_bag USING btree (id)` |
| `data_bag_key_unique` | `CREATE UNIQUE INDEX data_bag_key_unique ON public.data_bag USING btree (key)` |

**`dima_mappe`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `market_maps_pkey` | `CREATE UNIQUE INDEX market_maps_pkey ON public.dima_mappe USING btree (id)` |
| `market_maps_market_id_name_key` | `CREATE UNIQUE INDEX market_maps_market_id_name_key ON public.dima_mappe USING btree (market_id, name)` |

**`dms_companies`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_companies_rea` | `CREATE INDEX idx_companies_rea ON public.dms_companies USING btree (numero_rea, cciaa_sigla)` |
| `idx_companies_piva` | `CREATE INDEX idx_companies_piva ON public.dms_companies USING btree (partita_iva)` |
| `idx_companies_cf` | `CREATE INDEX idx_companies_cf ON public.dms_companies USING btree (codice_fiscale)` |
| `dms_companies_pkey` | `CREATE UNIQUE INDEX dms_companies_pkey ON public.dms_companies USING btree (id)` |

**`dms_durc_snapshots`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_durc_company` | `CREATE INDEX idx_durc_company ON public.dms_durc_snapshots USING btree (company_id)` |
| `idx_durc_esito` | `CREATE INDEX idx_durc_esito ON public.dms_durc_snapshots USING btree (esito_regolarita)` |
| `dms_durc_snapshots_pkey` | `CREATE UNIQUE INDEX dms_durc_snapshots_pkey ON public.dms_durc_snapshots USING btree (id)` |

**`dms_suap_instances`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_suap_stall` | `CREATE INDEX idx_suap_stall ON public.dms_suap_instances USING btree (stall_id)` |
| `idx_suap_company` | `CREATE INDEX idx_suap_company ON public.dms_suap_instances USING btree (company_id)` |
| `idx_suap_cui` | `CREATE INDEX idx_suap_cui ON public.dms_suap_instances USING btree (cui)` |
| `dms_suap_instances_pkey` | `CREATE UNIQUE INDEX dms_suap_instances_pkey ON public.dms_suap_instances USING btree (id)` |
| `idx_suap_market` | `CREATE INDEX idx_suap_market ON public.dms_suap_instances USING btree (market_id)` |

**`domande_spunta`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `domande_spunta_pkey` | `CREATE UNIQUE INDEX domande_spunta_pkey ON public.domande_spunta USING btree (id)` |
| `idx_domande_spunta_stato` | `CREATE INDEX idx_domande_spunta_stato ON public.domande_spunta USING btree (stato)` |
| `idx_domande_spunta_mercato` | `CREATE INDEX idx_domande_spunta_mercato ON public.domande_spunta USING btree (mercato_id)` |
| `idx_domande_spunta_impresa` | `CREATE INDEX idx_domande_spunta_impresa ON public.domande_spunta USING btree (impresa_id)` |

**`ecocredits`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `ecocredits_pkey` | `CREATE UNIQUE INDEX ecocredits_pkey ON public.ecocredits USING btree (id)` |

**`enterprise_employees`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_enterprise_employees_enterprise_id` | `CREATE INDEX idx_enterprise_employees_enterprise_id ON public.enterprise_employees USING btree (enterprise_id)` |
| `enterprise_employees_pkey` | `CREATE UNIQUE INDEX enterprise_employees_pkey ON public.enterprise_employees USING btree (id)` |
| `idx_enterprise_employees_active` | `CREATE INDEX idx_enterprise_employees_active ON public.enterprise_employees USING btree (is_active)` |
| `idx_enterprise_employees_cf` | `CREATE INDEX idx_enterprise_employees_cf ON public.enterprise_employees USING btree (cf)` |

**`enterprise_qualifications`** (6 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_enterprise_qualifications_type_id` | `CREATE INDEX idx_enterprise_qualifications_type_id ON public.enterprise_qualifications USING btree (qualification_type_id)` |
| `idx_enterprise_qualifications_enterprise_id` | `CREATE INDEX idx_enterprise_qualifications_enterprise_id ON public.enterprise_qualifications USING btree (enterprise_id)` |
| `enterprise_qualifications_pkey` | `CREATE UNIQUE INDEX enterprise_qualifications_pkey ON public.enterprise_qualifications USING btree (id)` |
| `idx_enterprise_qualifications_status` | `CREATE INDEX idx_enterprise_qualifications_status ON public.enterprise_qualifications USING btree (status)` |
| `idx_enterprise_qualifications_expiry_date` | `CREATE INDEX idx_enterprise_qualifications_expiry_date ON public.enterprise_qualifications USING btree (expiry_date)` |
| `idx_enterprise_qualifications_holder` | `CREATE INDEX idx_enterprise_qualifications_holder ON public.enterprise_qualifications USING btree (holder_type, holder_id)` |

**`extended_users`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_extended_users_eco_credit_active` | `CREATE INDEX idx_extended_users_eco_credit_active ON public.extended_users USING btree (eco_credit_active) WHERE (eco_credit_active = true)` |
| `extended_users_pkey` | `CREATE UNIQUE INDEX extended_users_pkey ON public.extended_users USING btree (id)` |

**`external_connections`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `external_connections_pkey` | `CREATE UNIQUE INDEX external_connections_pkey ON public.external_connections USING btree (id)` |

**`formazione_corsi`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_formazione_corsi_ente` | `CREATE INDEX idx_formazione_corsi_ente ON public.formazione_corsi USING btree (ente_id)` |
| `idx_formazione_corsi_stato` | `CREATE INDEX idx_formazione_corsi_stato ON public.formazione_corsi USING btree (stato)` |
| `formazione_corsi_pkey` | `CREATE UNIQUE INDEX formazione_corsi_pkey ON public.formazione_corsi USING btree (id)` |

**`formazione_enti`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `formazione_enti_pkey` | `CREATE UNIQUE INDEX formazione_enti_pkey ON public.formazione_enti USING btree (id)` |
| `idx_formazione_enti_stato` | `CREATE INDEX idx_formazione_enti_stato ON public.formazione_enti USING btree (stato)` |

**`formazione_iscrizioni`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_iscrizioni_stato` | `CREATE INDEX idx_iscrizioni_stato ON public.formazione_iscrizioni USING btree (stato)` |
| `formazione_iscrizioni_corso_id_impresa_id_key` | `CREATE UNIQUE INDEX formazione_iscrizioni_corso_id_impresa_id_key ON public.formazione_iscrizioni USING btree (corso_id, impresa_id)` |
| `formazione_iscrizioni_pkey` | `CREATE UNIQUE INDEX formazione_iscrizioni_pkey ON public.formazione_iscrizioni USING btree (id)` |
| `idx_iscrizioni_impresa` | `CREATE INDEX idx_iscrizioni_impresa ON public.formazione_iscrizioni USING btree (impresa_id)` |
| `idx_iscrizioni_corso` | `CREATE INDEX idx_iscrizioni_corso ON public.formazione_iscrizioni USING btree (corso_id)` |

**`fund_transactions`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `fund_transactions_pkey` | `CREATE UNIQUE INDEX fund_transactions_pkey ON public.fund_transactions USING btree (id)` |

**`gaming_challenges`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `gaming_challenges_pkey` | `CREATE UNIQUE INDEX gaming_challenges_pkey ON public.gaming_challenges USING btree (id)` |

**`gaming_rewards_config`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_gaming_rewards_comune` | `CREATE INDEX idx_gaming_rewards_comune ON public.gaming_rewards_config USING btree (comune_id)` |
| `gaming_rewards_config_pkey` | `CREATE UNIQUE INDEX gaming_rewards_config_pkey ON public.gaming_rewards_config USING btree (id)` |
| `gaming_rewards_config_comune_id_key` | `CREATE UNIQUE INDEX gaming_rewards_config_comune_id_key ON public.gaming_rewards_config USING btree (comune_id)` |

**`graduatoria_presenze`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `graduatoria_presenze_market_id_impresa_id_tipo_anno_key` | `CREATE UNIQUE INDEX graduatoria_presenze_market_id_impresa_id_tipo_anno_key ON public.graduatoria_presenze USING btree (market_id, impresa_id, tipo, anno)` |
| `idx_grad_pres_market` | `CREATE INDEX idx_grad_pres_market ON public.graduatoria_presenze USING btree (market_id, tipo, anno)` |
| `graduatoria_presenze_pkey` | `CREATE UNIQUE INDEX graduatoria_presenze_pkey ON public.graduatoria_presenze USING btree (id)` |
| `idx_grad_pres_posizione` | `CREATE INDEX idx_grad_pres_posizione ON public.graduatoria_presenze USING btree (market_id, tipo, anno, posizione)` |
| `idx_grad_pres_impresa` | `CREATE INDEX idx_grad_pres_impresa ON public.graduatoria_presenze USING btree (impresa_id)` |

**`gtfs_routes`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_gtfs_routes_type` | `CREATE INDEX idx_gtfs_routes_type ON public.gtfs_routes USING btree (route_type)` |
| `idx_gtfs_routes_provider` | `CREATE INDEX idx_gtfs_routes_provider ON public.gtfs_routes USING btree (provider)` |
| `gtfs_routes_route_id_provider_key` | `CREATE UNIQUE INDEX gtfs_routes_route_id_provider_key ON public.gtfs_routes USING btree (route_id, provider)` |
| `gtfs_routes_pkey` | `CREATE UNIQUE INDEX gtfs_routes_pkey ON public.gtfs_routes USING btree (id)` |

**`gtfs_stops`** (6 indici)

| Nome Indice | Definizione |
|---|---|
| `gtfs_stops_stop_id_provider_key` | `CREATE UNIQUE INDEX gtfs_stops_stop_id_provider_key ON public.gtfs_stops USING btree (stop_id, provider)` |
| `idx_gtfs_stops_provider` | `CREATE INDEX idx_gtfs_stops_provider ON public.gtfs_stops USING btree (provider)` |
| `idx_gtfs_stops_region` | `CREATE INDEX idx_gtfs_stops_region ON public.gtfs_stops USING btree (region)` |
| `gtfs_stops_pkey` | `CREATE UNIQUE INDEX gtfs_stops_pkey ON public.gtfs_stops USING btree (id)` |
| `idx_gtfs_stops_type` | `CREATE INDEX idx_gtfs_stops_type ON public.gtfs_stops USING btree (stop_type)` |
| `idx_gtfs_stops_coords` | `CREATE INDEX idx_gtfs_stops_coords ON public.gtfs_stops USING btree (stop_lat, stop_lon)` |

**`hub_locations`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_hub_locations_market` | `CREATE INDEX idx_hub_locations_market ON public.hub_locations USING btree (market_id)` |
| `idx_hub_locations_city` | `CREATE INDEX idx_hub_locations_city ON public.hub_locations USING btree (city)` |
| `hub_locations_pkey` | `CREATE UNIQUE INDEX hub_locations_pkey ON public.hub_locations USING btree (id)` |

**`hub_services`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `hub_services_pkey` | `CREATE UNIQUE INDEX hub_services_pkey ON public.hub_services USING btree (id)` |
| `idx_hub_services_hub` | `CREATE INDEX idx_hub_services_hub ON public.hub_services USING btree (hub_id)` |

**`hub_shops`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `hub_shops_pkey` | `CREATE UNIQUE INDEX hub_shops_pkey ON public.hub_shops USING btree (id)` |
| `idx_hub_shops_hub` | `CREATE INDEX idx_hub_shops_hub ON public.hub_shops USING btree (hub_id)` |

**`impostazioni_mora`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `impostazioni_mora_pkey` | `CREATE UNIQUE INDEX impostazioni_mora_pkey ON public.impostazioni_mora USING btree (id)` |
| `impostazioni_mora_comune_id_key` | `CREATE UNIQUE INDEX impostazioni_mora_comune_id_key ON public.impostazioni_mora USING btree (comune_id)` |

**`impresa_giustificazioni`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_ig_impresa_id` | `CREATE INDEX idx_ig_impresa_id ON public.impresa_giustificazioni USING btree (impresa_id)` |
| `idx_ig_giorno` | `CREATE INDEX idx_ig_giorno ON public.impresa_giustificazioni USING btree (giorno_mercato)` |
| `idx_ig_status` | `CREATE INDEX idx_ig_status ON public.impresa_giustificazioni USING btree (status)` |
| `idx_ig_comune_id` | `CREATE INDEX idx_ig_comune_id ON public.impresa_giustificazioni USING btree (comune_id)` |
| `impresa_giustificazioni_pkey` | `CREATE UNIQUE INDEX impresa_giustificazioni_pkey ON public.impresa_giustificazioni USING btree (id)` |

**`imprese`** (10 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_imprese_codice_fiscale` | `CREATE INDEX idx_imprese_codice_fiscale ON public.imprese USING btree (codice_fiscale)` |
| `imprese_pkey` | `CREATE UNIQUE INDEX imprese_pkey ON public.imprese USING btree (id)` |
| `imprese_partita_iva_key` | `CREATE UNIQUE INDEX imprese_partita_iva_key ON public.imprese USING btree (partita_iva)` |
| `imprese_codice_fiscale_key` | `CREATE UNIQUE INDEX imprese_codice_fiscale_key ON public.imprese USING btree (codice_fiscale)` |
| `idx_imprese_piva` | `CREATE INDEX idx_imprese_piva ON public.imprese USING btree (partita_iva)` |
| `idx_imprese_cf` | `CREATE INDEX idx_imprese_cf ON public.imprese USING btree (codice_fiscale)` |
| `idx_imprese_comune` | `CREATE INDEX idx_imprese_comune ON public.imprese USING btree (comune)` |
| `idx_imprese_settore` | `CREATE INDEX idx_imprese_settore ON public.imprese USING btree (settore)` |
| `idx_imprese_partita_iva` | `CREATE INDEX idx_imprese_partita_iva ON public.imprese USING btree (partita_iva)` |
| `idx_imprese_legacy_vendor_id` | `CREATE INDEX idx_imprese_legacy_vendor_id ON public.imprese USING btree (legacy_vendor_id)` |

**`infraction_types`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `infraction_types_pkey` | `CREATE UNIQUE INDEX infraction_types_pkey ON public.infraction_types USING btree (id)` |
| `infraction_types_code_key` | `CREATE UNIQUE INDEX infraction_types_code_key ON public.infraction_types USING btree (code)` |

**`inspections`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `inspections_pkey` | `CREATE UNIQUE INDEX inspections_pkey ON public.inspections USING btree (id)` |

**`inspections_detailed`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `inspections_detailed_pkey` | `CREATE UNIQUE INDEX inspections_detailed_pkey ON public.inspections_detailed USING btree (id)` |

**`ip_blacklist`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `ip_blacklist_ip_address_key` | `CREATE UNIQUE INDEX ip_blacklist_ip_address_key ON public.ip_blacklist USING btree (ip_address)` |
| `ip_blacklist_pkey` | `CREATE UNIQUE INDEX ip_blacklist_pkey ON public.ip_blacklist USING btree (id)` |
| `idx_ip_blacklist_ip` | `CREATE INDEX idx_ip_blacklist_ip ON public.ip_blacklist USING btree (ip_address)` |

**`login_attempts`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_login_attempts_created` | `CREATE INDEX idx_login_attempts_created ON public.login_attempts USING btree (created_at DESC)` |
| `login_attempts_pkey` | `CREATE UNIQUE INDEX login_attempts_pkey ON public.login_attempts USING btree (id)` |
| `idx_login_attempts_ip` | `CREATE INDEX idx_login_attempts_ip ON public.login_attempts USING btree (ip_address)` |

**`market_geometry`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `market_geometry_pkey` | `CREATE UNIQUE INDEX market_geometry_pkey ON public.market_geometry USING btree (id)` |

**`market_session_details`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `market_session_details_pkey` | `CREATE UNIQUE INDEX market_session_details_pkey ON public.market_session_details USING btree (id)` |
| `idx_session_details_session` | `CREATE INDEX idx_session_details_session ON public.market_session_details USING btree (session_id)` |

**`market_sessions`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_market_sessions_market` | `CREATE INDEX idx_market_sessions_market ON public.market_sessions USING btree (market_id)` |
| `idx_market_sessions_data` | `CREATE INDEX idx_market_sessions_data ON public.market_sessions USING btree (data_mercato)` |
| `idx_market_sessions_legacy_session_id` | `CREATE INDEX idx_market_sessions_legacy_session_id ON public.market_sessions USING btree (legacy_session_id)` |
| `market_sessions_pkey` | `CREATE UNIQUE INDEX market_sessions_pkey ON public.market_sessions USING btree (id)` |

**`market_settings`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `market_settings_pkey` | `CREATE UNIQUE INDEX market_settings_pkey ON public.market_settings USING btree (id)` |
| `market_settings_market_id_key` | `CREATE UNIQUE INDEX market_settings_market_id_key ON public.market_settings USING btree (market_id)` |
| `idx_market_settings_market_id` | `CREATE INDEX idx_market_settings_market_id ON public.market_settings USING btree (market_id)` |

**`market_tariffs`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `market_tariffs_pkey` | `CREATE UNIQUE INDEX market_tariffs_pkey ON public.market_tariffs USING btree (id)` |
| `market_tariffs_market_id_year_key` | `CREATE UNIQUE INDEX market_tariffs_market_id_year_key ON public.market_tariffs USING btree (market_id, year)` |

**`market_transgressions`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_market_transgressions_status` | `CREATE INDEX idx_market_transgressions_status ON public.market_transgressions USING btree (status)` |
| `idx_market_transgressions_market_id` | `CREATE INDEX idx_market_transgressions_market_id ON public.market_transgressions USING btree (market_id)` |
| `market_transgressions_pkey` | `CREATE UNIQUE INDEX market_transgressions_pkey ON public.market_transgressions USING btree (id)` |
| `idx_market_transgressions_business_id` | `CREATE INDEX idx_market_transgressions_business_id ON public.market_transgressions USING btree (business_id)` |
| `idx_market_transgressions_date` | `CREATE INDEX idx_market_transgressions_date ON public.market_transgressions USING btree (market_date)` |

**`markets`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `markets_pkey` | `CREATE UNIQUE INDEX markets_pkey ON public.markets USING btree (id)` |
| `idx_markets_legacy_market_id` | `CREATE INDEX idx_markets_legacy_market_id ON public.markets USING btree (legacy_market_id)` |
| `markets_code_key` | `CREATE UNIQUE INDEX markets_code_key ON public.markets USING btree (code)` |

**`mio_agent_logs`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_mio_agent_logs_timestamp` | `CREATE INDEX idx_mio_agent_logs_timestamp ON public.mio_agent_logs USING btree ("timestamp" DESC)` |
| `idx_mio_agent_logs_service_id` | `CREATE INDEX idx_mio_agent_logs_service_id ON public.mio_agent_logs USING btree (service_id)` |
| `mio_agent_logs_pkey` | `CREATE UNIQUE INDEX mio_agent_logs_pkey ON public.mio_agent_logs USING btree (id)` |
| `idx_mio_agent_logs_success` | `CREATE INDEX idx_mio_agent_logs_success ON public.mio_agent_logs USING btree (success)` |
| `idx_mio_agent_logs_agent` | `CREATE INDEX idx_mio_agent_logs_agent ON public.mio_agent_logs USING btree (agent)` |

**`mobility_checkins`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_mobility_checkins_stop_date` | `CREATE INDEX idx_mobility_checkins_stop_date ON public.mobility_checkins USING btree (stop_id, checkin_date)` |
| `mobility_checkins_pkey` | `CREATE UNIQUE INDEX mobility_checkins_pkey ON public.mobility_checkins USING btree (id)` |
| `idx_mobility_checkins_user_date` | `CREATE INDEX idx_mobility_checkins_user_date ON public.mobility_checkins USING btree (user_id, checkin_date)` |

**`mobility_data`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `mobility_data_pkey` | `CREATE UNIQUE INDEX mobility_data_pkey ON public.mobility_data USING btree (id)` |

**`notifications`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `notifications_pkey` | `CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)` |

**`notifiche`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_notifiche_data` | `CREATE INDEX idx_notifiche_data ON public.notifiche USING btree (data_invio DESC)` |
| `idx_notifiche_conversazione` | `CREATE INDEX idx_notifiche_conversazione ON public.notifiche USING btree (id_conversazione)` |
| `idx_notifiche_mittente` | `CREATE INDEX idx_notifiche_mittente ON public.notifiche USING btree (mittente_id, mittente_tipo)` |
| `notifiche_pkey` | `CREATE UNIQUE INDEX notifiche_pkey ON public.notifiche USING btree (id)` |

**`notifiche_destinatari`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `notifiche_destinatari_pkey` | `CREATE UNIQUE INDEX notifiche_destinatari_pkey ON public.notifiche_destinatari USING btree (id)` |
| `idx_notifiche_dest_stato` | `CREATE INDEX idx_notifiche_dest_stato ON public.notifiche_destinatari USING btree (stato)` |
| `idx_notifiche_dest_impresa` | `CREATE INDEX idx_notifiche_dest_impresa ON public.notifiche_destinatari USING btree (impresa_id)` |

**`operator_daily_wallet`** (7 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_operator_daily_wallet_date` | `CREATE INDEX idx_operator_daily_wallet_date ON public.operator_daily_wallet USING btree (date)` |
| `operator_daily_wallet_pkey` | `CREATE UNIQUE INDEX operator_daily_wallet_pkey ON public.operator_daily_wallet USING btree (id)` |
| `idx_wallet_impresa` | `CREATE INDEX idx_wallet_impresa ON public.operator_daily_wallet USING btree (impresa_id)` |
| `idx_wallet_status` | `CREATE INDEX idx_wallet_status ON public.operator_daily_wallet USING btree (wallet_status)` |
| `idx_operator_daily_wallet_settlement_number` | `CREATE INDEX idx_operator_daily_wallet_settlement_number ON public.operator_daily_wallet USING btree (settlement_number)` |
| `idx_operator_daily_wallet_status` | `CREATE INDEX idx_operator_daily_wallet_status ON public.operator_daily_wallet USING btree (settlement_status)` |
| `idx_operator_daily_wallet_operator` | `CREATE INDEX idx_operator_daily_wallet_operator ON public.operator_daily_wallet USING btree (operator_id)` |

**`operator_transactions`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_operator_transactions_type` | `CREATE INDEX idx_operator_transactions_type ON public.operator_transactions USING btree (type)` |
| `operator_transactions_pkey` | `CREATE UNIQUE INDEX operator_transactions_pkey ON public.operator_transactions USING btree (id)` |
| `idx_operator_transactions_date` | `CREATE INDEX idx_operator_transactions_date ON public.operator_transactions USING btree (created_at)` |
| `idx_operator_transactions_operator` | `CREATE INDEX idx_operator_transactions_operator ON public.operator_transactions USING btree (operator_id)` |

**`permissions`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `permissions_pkey` | `CREATE UNIQUE INDEX permissions_pkey ON public.permissions USING btree (id)` |
| `permissions_code_key` | `CREATE UNIQUE INDEX permissions_code_key ON public.permissions USING btree (code)` |

**`pm_watchlist`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_watchlist_impresa` | `CREATE INDEX idx_watchlist_impresa ON public.pm_watchlist USING btree (impresa_id)` |
| `idx_watchlist_status` | `CREATE INDEX idx_watchlist_status ON public.pm_watchlist USING btree (status)` |
| `pm_watchlist_pkey` | `CREATE UNIQUE INDEX pm_watchlist_pkey ON public.pm_watchlist USING btree (id)` |

**`product_tracking`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `product_tracking_tpass_id_unique` | `CREATE UNIQUE INDEX product_tracking_tpass_id_unique ON public.product_tracking USING btree (tpass_id)` |
| `product_tracking_pkey` | `CREATE UNIQUE INDEX product_tracking_pkey ON public.product_tracking USING btree (id)` |

**`products`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `products_pkey` | `CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id)` |

**`province`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_province_regione` | `CREATE INDEX idx_province_regione ON public.province USING btree (regione_id)` |
| `province_sigla_key` | `CREATE UNIQUE INDEX province_sigla_key ON public.province USING btree (sigla)` |
| `province_pkey` | `CREATE UNIQUE INDEX province_pkey ON public.province USING btree (id)` |

**`qr_tokens`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `qr_tokens_user_id_key` | `CREATE UNIQUE INDEX qr_tokens_user_id_key ON public.qr_tokens USING btree (user_id)` |
| `idx_qr_tokens_token` | `CREATE INDEX idx_qr_tokens_token ON public.qr_tokens USING btree (token)` |
| `idx_qr_tokens_user_id` | `CREATE INDEX idx_qr_tokens_user_id ON public.qr_tokens USING btree (user_id)` |
| `qr_tokens_pkey` | `CREATE UNIQUE INDEX qr_tokens_pkey ON public.qr_tokens USING btree (id)` |

**`qualification_types`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_qualification_types_enabled` | `CREATE INDEX idx_qualification_types_enabled ON public.qualification_types USING btree (enabled)` |
| `qualification_types_pkey` | `CREATE UNIQUE INDEX qualification_types_pkey ON public.qualification_types USING btree (id)` |
| `qualification_types_code_key` | `CREATE UNIQUE INDEX qualification_types_code_key ON public.qualification_types USING btree (code)` |
| `idx_qualification_types_code` | `CREATE INDEX idx_qualification_types_code ON public.qualification_types USING btree (code)` |

**`qualificazioni`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_qualificazioni_tipo` | `CREATE INDEX idx_qualificazioni_tipo ON public.qualificazioni USING btree (tipo)` |
| `qualificazioni_pkey` | `CREATE UNIQUE INDEX qualificazioni_pkey ON public.qualificazioni USING btree (id)` |
| `idx_qualificazioni_impresa` | `CREATE INDEX idx_qualificazioni_impresa ON public.qualificazioni USING btree (impresa_id)` |
| `idx_qualificazioni_stato` | `CREATE INDEX idx_qualificazioni_stato ON public.qualificazioni USING btree (stato)` |
| `idx_qualificazioni_scadenza` | `CREATE INDEX idx_qualificazioni_scadenza ON public.qualificazioni USING btree (data_scadenza)` |

**`referrals`** (6 indici)

| Nome Indice | Definizione |
|---|---|
| `referrals_referral_code_key` | `CREATE UNIQUE INDEX referrals_referral_code_key ON public.referrals USING btree (referral_code)` |
| `idx_referrals_comune` | `CREATE INDEX idx_referrals_comune ON public.referrals USING btree (comune_id)` |
| `idx_referrals_code` | `CREATE INDEX idx_referrals_code ON public.referrals USING btree (referral_code)` |
| `referrals_pkey` | `CREATE UNIQUE INDEX referrals_pkey ON public.referrals USING btree (id)` |
| `idx_referrals_referred` | `CREATE INDEX idx_referrals_referred ON public.referrals USING btree (referred_user_id)` |
| `idx_referrals_referrer` | `CREATE INDEX idx_referrals_referrer ON public.referrals USING btree (referrer_user_id)` |

**`regioni`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `regioni_pkey` | `CREATE UNIQUE INDEX regioni_pkey ON public.regioni USING btree (id)` |
| `regioni_codice_istat_key` | `CREATE UNIQUE INDEX regioni_codice_istat_key ON public.regioni USING btree (codice_istat)` |
| `idx_regioni_codice` | `CREATE INDEX idx_regioni_codice ON public.regioni USING btree (codice_istat)` |

**`regolarita_imprese`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `regolarita_imprese_pkey` | `CREATE UNIQUE INDEX regolarita_imprese_pkey ON public.regolarita_imprese USING btree (id)` |
| `idx_regolarita_stato` | `CREATE INDEX idx_regolarita_stato ON public.regolarita_imprese USING btree (stato)` |
| `idx_regolarita_tipo` | `CREATE INDEX idx_regolarita_tipo ON public.regolarita_imprese USING btree (tipo)` |
| `idx_regolarita_impresa` | `CREATE INDEX idx_regolarita_impresa ON public.regolarita_imprese USING btree (impresa_id)` |
| `regolarita_imprese_impresa_id_tipo_key` | `CREATE UNIQUE INDEX regolarita_imprese_impresa_id_tipo_key ON public.regolarita_imprese USING btree (impresa_id, tipo)` |

**`reimbursements`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `reimbursements_pkey` | `CREATE UNIQUE INDEX reimbursements_pkey ON public.reimbursements USING btree (id)` |

**`richieste_servizi`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_richieste_stato` | `CREATE INDEX idx_richieste_stato ON public.richieste_servizi USING btree (stato)` |
| `idx_richieste_impresa` | `CREATE INDEX idx_richieste_impresa ON public.richieste_servizi USING btree (impresa_id)` |
| `idx_richieste_servizio` | `CREATE INDEX idx_richieste_servizio ON public.richieste_servizi USING btree (servizio_id)` |
| `richieste_servizi_pkey` | `CREATE UNIQUE INDEX richieste_servizi_pkey ON public.richieste_servizi USING btree (id)` |

**`role_permissions`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `role_permissions_role_id_permission_id_key` | `CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON public.role_permissions USING btree (role_id, permission_id)` |
| `idx_role_permissions_role` | `CREATE INDEX idx_role_permissions_role ON public.role_permissions USING btree (role_id)` |
| `role_permissions_pkey` | `CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (id)` |

**`route_completions`** (7 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_route_completions_comune` | `CREATE INDEX idx_route_completions_comune ON public.route_completions USING btree (comune_id)` |
| `idx_route_completions_completed_at` | `CREATE INDEX idx_route_completions_completed_at ON public.route_completions USING btree (completed_at)` |
| `idx_route_completions_mode` | `CREATE INDEX idx_route_completions_mode ON public.route_completions USING btree (mode)` |
| `idx_route_completions_status` | `CREATE INDEX idx_route_completions_status ON public.route_completions USING btree (status)` |
| `idx_route_completions_user` | `CREATE INDEX idx_route_completions_user ON public.route_completions USING btree (user_id)` |
| `route_completions_route_id_key` | `CREATE UNIQUE INDEX route_completions_route_id_key ON public.route_completions USING btree (route_id)` |
| `route_completions_pkey` | `CREATE UNIQUE INDEX route_completions_pkey ON public.route_completions USING btree (id)` |

**`sanctions`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `sanctions_verbale_code_key` | `CREATE UNIQUE INDEX sanctions_verbale_code_key ON public.sanctions USING btree (verbale_code)` |
| `idx_sanctions_status` | `CREATE INDEX idx_sanctions_status ON public.sanctions USING btree (payment_status)` |
| `idx_sanctions_impresa` | `CREATE INDEX idx_sanctions_impresa ON public.sanctions USING btree (impresa_id)` |
| `sanctions_pkey` | `CREATE UNIQUE INDEX sanctions_pkey ON public.sanctions USING btree (id)` |

**`secrets`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `secrets_pkey` | `CREATE UNIQUE INDEX secrets_pkey ON public.secrets USING btree (key)` |

**`secrets_meta`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `secrets_meta_pkey` | `CREATE UNIQUE INDEX secrets_meta_pkey ON public.secrets_meta USING btree (id)` |

**`secure_credentials`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_secure_credentials_scope` | `CREATE INDEX idx_secure_credentials_scope ON public.secure_credentials USING btree (scope)` |
| `idx_secure_credentials_updated_at` | `CREATE INDEX idx_secure_credentials_updated_at ON public.secure_credentials USING btree (updated_at DESC)` |
| `secure_credentials_name_key` | `CREATE UNIQUE INDEX secure_credentials_name_key ON public.secure_credentials USING btree (name)` |
| `secure_credentials_pkey` | `CREATE UNIQUE INDEX secure_credentials_pkey ON public.secure_credentials USING btree (id)` |

**`security_delegations`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_security_delegations_delegator` | `CREATE INDEX idx_security_delegations_delegator ON public.security_delegations USING btree (delegator_id)` |
| `idx_security_delegations_delegate` | `CREATE INDEX idx_security_delegations_delegate ON public.security_delegations USING btree (delegate_id)` |
| `security_delegations_pkey` | `CREATE UNIQUE INDEX security_delegations_pkey ON public.security_delegations USING btree (id)` |

**`security_events`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_security_events_created` | `CREATE INDEX idx_security_events_created ON public.security_events USING btree (created_at DESC)` |
| `idx_security_events_type` | `CREATE INDEX idx_security_events_type ON public.security_events USING btree (event_type)` |
| `security_events_pkey` | `CREATE UNIQUE INDEX security_events_pkey ON public.security_events USING btree (id)` |

**`servizi_associazioni`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_servizi_associazione` | `CREATE INDEX idx_servizi_associazione ON public.servizi_associazioni USING btree (associazione_id)` |
| `servizi_associazioni_pkey` | `CREATE UNIQUE INDEX servizi_associazioni_pkey ON public.servizi_associazioni USING btree (id)` |
| `idx_servizi_categoria` | `CREATE INDEX idx_servizi_categoria ON public.servizi_associazioni USING btree (categoria)` |

**`settori_comune`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_settori_codice_uni_uo` | `CREATE INDEX idx_settori_codice_uni_uo ON public.settori_comune USING btree (codice_uni_uo)` |
| `idx_settori_tipo` | `CREATE INDEX idx_settori_tipo ON public.settori_comune USING btree (tipo_settore)` |
| `idx_settori_comune_id` | `CREATE INDEX idx_settori_comune_id ON public.settori_comune USING btree (comune_id)` |
| `settori_comune_pkey` | `CREATE UNIQUE INDEX settori_comune_pkey ON public.settori_comune USING btree (id)` |

**`shops`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `shops_pkey` | `CREATE UNIQUE INDEX shops_pkey ON public.shops USING btree (id)` |

**`spend_qr_tokens`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_spend_qr_tokens_status` | `CREATE INDEX idx_spend_qr_tokens_status ON public.spend_qr_tokens USING btree (status)` |
| `idx_spend_qr_tokens_expires` | `CREATE INDEX idx_spend_qr_tokens_expires ON public.spend_qr_tokens USING btree (expires_at)` |
| `spend_qr_tokens_pkey` | `CREATE UNIQUE INDEX spend_qr_tokens_pkey ON public.spend_qr_tokens USING btree (id)` |
| `spend_qr_tokens_token_key` | `CREATE UNIQUE INDEX spend_qr_tokens_token_key ON public.spend_qr_tokens USING btree (token)` |
| `idx_spend_qr_tokens_user` | `CREATE INDEX idx_spend_qr_tokens_user ON public.spend_qr_tokens USING btree (user_id)` |

**`stalls`** (10 indici)

| Nome Indice | Definizione |
|---|---|
| `stalls_market_id_number_key` | `CREATE UNIQUE INDEX stalls_market_id_number_key ON public.stalls USING btree (market_id, number)` |
| `idx_stalls_gis_slot_id` | `CREATE INDEX idx_stalls_gis_slot_id ON public.stalls USING btree (gis_slot_id)` |
| `idx_stalls_legacy_stall_id` | `CREATE INDEX idx_stalls_legacy_stall_id ON public.stalls USING btree (legacy_stall_id)` |
| `idx_stalls_market_id` | `CREATE INDEX idx_stalls_market_id ON public.stalls USING btree (market_id)` |
| `idx_stalls_status` | `CREATE INDEX idx_stalls_status ON public.stalls USING btree (status)` |
| `unique_full_code` | `CREATE UNIQUE INDEX unique_full_code ON public.stalls USING btree (full_code)` |
| `idx_stalls_full_code` | `CREATE INDEX idx_stalls_full_code ON public.stalls USING btree (full_code)` |
| `idx_stalls_market_code` | `CREATE INDEX idx_stalls_market_code ON public.stalls USING btree (market_code)` |
| `stalls_pkey` | `CREATE UNIQUE INDEX stalls_pkey ON public.stalls USING btree (id)` |
| `idx_stalls_coordinates` | `CREATE INDEX idx_stalls_coordinates ON public.stalls USING btree (latitude, longitude)` |

**`suap_azioni`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `suap_azioni_pkey` | `CREATE UNIQUE INDEX suap_azioni_pkey ON public.suap_azioni USING btree (id)` |
| `idx_suap_azioni_idempotency` | `CREATE UNIQUE INDEX idx_suap_azioni_idempotency ON public.suap_azioni USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL)` |
| `idx_suap_azioni_status` | `CREATE INDEX idx_suap_azioni_status ON public.suap_azioni USING btree (status)` |

**`suap_checks`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_suap_checks_pratica` | `CREATE INDEX idx_suap_checks_pratica ON public.suap_checks USING btree (pratica_id)` |
| `suap_checks_pkey` | `CREATE UNIQUE INDEX suap_checks_pkey ON public.suap_checks USING btree (id)` |

**`suap_decisioni`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `suap_decisioni_pkey` | `CREATE UNIQUE INDEX suap_decisioni_pkey ON public.suap_decisioni USING btree (id)` |

**`suap_documenti`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `suap_documenti_pkey` | `CREATE UNIQUE INDEX suap_documenti_pkey ON public.suap_documenti USING btree (id)` |

**`suap_eventi`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `suap_eventi_pkey` | `CREATE UNIQUE INDEX suap_eventi_pkey ON public.suap_eventi USING btree (id)` |
| `idx_suap_eventi_pratica` | `CREATE INDEX idx_suap_eventi_pratica ON public.suap_eventi USING btree (pratica_id)` |

**`suap_pratiche`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `uq_suap_pratiche_ente_cui` | `CREATE UNIQUE INDEX uq_suap_pratiche_ente_cui ON public.suap_pratiche USING btree (ente_id, cui)` |
| `idx_suap_pratiche_data` | `CREATE INDEX idx_suap_pratiche_data ON public.suap_pratiche USING btree (data_presentazione DESC)` |
| `idx_suap_pratiche_ente_stato` | `CREATE INDEX idx_suap_pratiche_ente_stato ON public.suap_pratiche USING btree (ente_id, stato)` |
| `suap_pratiche_pkey` | `CREATE UNIQUE INDEX suap_pratiche_pkey ON public.suap_pratiche USING btree (id)` |

**`suap_regole`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `suap_regole_pkey` | `CREATE UNIQUE INDEX suap_regole_pkey ON public.suap_regole USING btree (id)` |
| `uq_suap_regole_ente_code` | `CREATE UNIQUE INDEX uq_suap_regole_ente_code ON public.suap_regole USING btree (ente_id, check_code)` |

**`sustainability_metrics`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `sustainability_metrics_pkey` | `CREATE UNIQUE INDEX sustainability_metrics_pkey ON public.sustainability_metrics USING btree (id)` |

**`system_events`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `system_events_pkey` | `CREATE UNIQUE INDEX system_events_pkey ON public.system_events USING btree (id)` |
| `system_events_event_id_unique` | `CREATE UNIQUE INDEX system_events_event_id_unique ON public.system_events USING btree (event_id)` |

**`system_logs`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `system_logs_pkey` | `CREATE UNIQUE INDEX system_logs_pkey ON public.system_logs USING btree (id)` |

**`transactions`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `transactions_pkey` | `CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id)` |

**`user_analytics`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `user_analytics_pkey` | `CREATE UNIQUE INDEX user_analytics_pkey ON public.user_analytics USING btree (id)` |

**`user_role_assignments`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_user_role_assignments_user` | `CREATE INDEX idx_user_role_assignments_user ON public.user_role_assignments USING btree (user_id)` |
| `user_role_assignments_pkey` | `CREATE UNIQUE INDEX user_role_assignments_pkey ON public.user_role_assignments USING btree (id)` |
| `idx_user_role_assignments_role` | `CREATE INDEX idx_user_role_assignments_role ON public.user_role_assignments USING btree (role_id)` |
| `user_role_assignments_user_id_role_id_territory_type_territ_key` | `CREATE UNIQUE INDEX user_role_assignments_user_id_role_id_territory_type_territ_key ON public.user_role_assignments USING btree (user_id, role_id, territory_type, territory_id)` |

**`user_roles`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `user_roles_pkey` | `CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id)` |
| `user_roles_code_key` | `CREATE UNIQUE INDEX user_roles_code_key ON public.user_roles USING btree (code)` |

**`user_sessions`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_user_sessions_token` | `CREATE INDEX idx_user_sessions_token ON public.user_sessions USING btree (session_token)` |
| `user_sessions_session_token_key` | `CREATE UNIQUE INDEX user_sessions_session_token_key ON public.user_sessions USING btree (session_token)` |
| `user_sessions_pkey` | `CREATE UNIQUE INDEX user_sessions_pkey ON public.user_sessions USING btree (id)` |
| `idx_user_sessions_user` | `CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id)` |

**`users`** (5 indici)

| Nome Indice | Definizione |
|---|---|
| `users_pkey` | `CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)` |
| `users_openId_unique` | `CREATE UNIQUE INDEX "users_openId_unique" ON public.users USING btree ("openId")` |
| `idx_users_legacy_user_id` | `CREATE INDEX idx_users_legacy_user_id ON public.users USING btree (legacy_user_id)` |
| `idx_users_fiscal_code` | `CREATE INDEX idx_users_fiscal_code ON public.users USING btree (fiscal_code)` |
| `idx_users_email` | `CREATE INDEX idx_users_email ON public.users USING btree (email)` |

**`vendor_documents`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `vendor_documents_pkey` | `CREATE UNIQUE INDEX vendor_documents_pkey ON public.vendor_documents USING btree (id)` |

**`vendor_presences`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_vendor_presences_legacy_presence_id` | `CREATE INDEX idx_vendor_presences_legacy_presence_id ON public.vendor_presences USING btree (legacy_presence_id)` |
| `vendor_presences_pkey` | `CREATE UNIQUE INDEX vendor_presences_pkey ON public.vendor_presences USING btree (id)` |
| `vendor_presences_market_stall_giorno_idx` | `CREATE UNIQUE INDEX vendor_presences_market_stall_giorno_idx ON public.vendor_presences USING btree (market_id, stall_id, giorno_mercato)` |

**`vendors`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_vendors_impresa_id` | `CREATE INDEX idx_vendors_impresa_id ON public.vendors USING btree (impresa_id)` |
| `idx_vendors_legacy_vendor_ref_id` | `CREATE INDEX idx_vendors_legacy_vendor_ref_id ON public.vendors USING btree (legacy_vendor_ref_id)` |
| `vendors_code_key` | `CREATE UNIQUE INDEX vendors_code_key ON public.vendors USING btree (code)` |
| `vendors_pkey` | `CREATE UNIQUE INDEX vendors_pkey ON public.vendors USING btree (id)` |

**`violations`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `violations_pkey` | `CREATE UNIQUE INDEX violations_pkey ON public.violations USING btree (id)` |

**`wallet_balance_snapshots`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `wallet_balance_snapshots_wallet_id_anno_mese_key` | `CREATE UNIQUE INDEX wallet_balance_snapshots_wallet_id_anno_mese_key ON public.wallet_balance_snapshots USING btree (wallet_id, anno, mese)` |
| `wallet_balance_snapshots_pkey` | `CREATE UNIQUE INDEX wallet_balance_snapshots_pkey ON public.wallet_balance_snapshots USING btree (id)` |

**`wallet_history`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_wallet_history_wallet_id` | `CREATE INDEX idx_wallet_history_wallet_id ON public.wallet_history USING btree (wallet_id)` |
| `idx_wallet_history_evento` | `CREATE INDEX idx_wallet_history_evento ON public.wallet_history USING btree (evento)` |
| `idx_wallet_history_impresa_id` | `CREATE INDEX idx_wallet_history_impresa_id ON public.wallet_history USING btree (impresa_id)` |
| `wallet_history_pkey` | `CREATE UNIQUE INDEX wallet_history_pkey ON public.wallet_history USING btree (id)` |

**`wallet_notifications`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `idx_wallet_notif_read` | `CREATE INDEX idx_wallet_notif_read ON public.wallet_notifications USING btree (user_id, read)` |
| `idx_wallet_notif_user` | `CREATE INDEX idx_wallet_notif_user ON public.wallet_notifications USING btree (user_id)` |
| `wallet_notifications_pkey` | `CREATE UNIQUE INDEX wallet_notifications_pkey ON public.wallet_notifications USING btree (id)` |

**`wallet_scadenze`** (4 indici)

| Nome Indice | Definizione |
|---|---|
| `wallet_scadenze_pkey` | `CREATE UNIQUE INDEX wallet_scadenze_pkey ON public.wallet_scadenze USING btree (id)` |
| `idx_wallet_scadenze_wallet` | `CREATE INDEX idx_wallet_scadenze_wallet ON public.wallet_scadenze USING btree (wallet_id)` |
| `idx_wallet_scadenze_stato` | `CREATE INDEX idx_wallet_scadenze_stato ON public.wallet_scadenze USING btree (stato)` |
| `idx_wallet_scadenze_unique` | `CREATE UNIQUE INDEX idx_wallet_scadenze_unique ON public.wallet_scadenze USING btree (wallet_id, anno_riferimento, rata_numero)` |

**`wallet_transactions`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `wallet_transactions_pkey` | `CREATE UNIQUE INDEX wallet_transactions_pkey ON public.wallet_transactions USING btree (id)` |

**`wallets`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `wallets_pkey` | `CREATE UNIQUE INDEX wallets_pkey ON public.wallets USING btree (id)` |

**`webhook_logs`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `webhook_logs_pkey` | `CREATE UNIQUE INDEX webhook_logs_pkey ON public.webhook_logs USING btree (id)` |

**`webhooks`** (1 indici)

| Nome Indice | Definizione |
|---|---|
| `webhooks_pkey` | `CREATE UNIQUE INDEX webhooks_pkey ON public.webhooks USING btree (id)` |

**`workspace_snapshots`** (2 indici)

| Nome Indice | Definizione |
|---|---|
| `workspace_snapshots_pkey` | `CREATE UNIQUE INDEX workspace_snapshots_pkey ON public.workspace_snapshots USING btree (id)` |
| `workspace_snapshots_conversation_id_key` | `CREATE UNIQUE INDEX workspace_snapshots_conversation_id_key ON public.workspace_snapshots USING btree (conversation_id)` |

**`zapier_webhook_logs`** (3 indici)

| Nome Indice | Definizione |
|---|---|
| `zapier_webhook_logs_pkey` | `CREATE UNIQUE INDEX zapier_webhook_logs_pkey ON public.zapier_webhook_logs USING btree (id)` |
| `idx_zapier_webhook_logs_created` | `CREATE INDEX idx_zapier_webhook_logs_created ON public.zapier_webhook_logs USING btree (created_at)` |
| `idx_zapier_webhook_logs_event` | `CREATE INDEX idx_zapier_webhook_logs_event ON public.zapier_webhook_logs USING btree (event_type)` |

---

## SEZIONE 3: TRIGGER E FUNZIONI

### 3.1 Trigger

| Trigger | Tabella | Timing | Evento |
|---|---|---|---|
| `update_qualification_types_updated_at` | `qualification_types` | BEFORE | UPDATE |
| `update_enterprise_employees_updated_at` | `enterprise_employees` | BEFORE | UPDATE |
| `update_enterprise_qualifications_updated_at` | `enterprise_qualifications` | BEFORE | UPDATE |
| `update_imprese_updated_at` | `imprese` | BEFORE | UPDATE |
| `update_qualificazioni_updated_at` | `qualificazioni` | BEFORE | UPDATE |
| `update_markets_updated_at` | `markets` | BEFORE | UPDATE |
| `update_stalls_updated_at` | `stalls` | BEFORE | UPDATE |
| `update_vendors_updated_at` | `vendors` | BEFORE | UPDATE |
| `update_concessions_updated_at` | `concessions` | BEFORE | UPDATE |

### 3.2 Funzioni

| Funzione | Tipo |
|---|---|
| `digest` | FUNCTION |
| `digest` | FUNCTION |
| `hmac` | FUNCTION |
| `hmac` | FUNCTION |
| `crypt` | FUNCTION |
| `gen_salt` | FUNCTION |
| `gen_salt` | FUNCTION |
| `encrypt` | FUNCTION |
| `decrypt` | FUNCTION |
| `encrypt_iv` | FUNCTION |
| `decrypt_iv` | FUNCTION |
| `gen_random_bytes` | FUNCTION |
| `gen_random_uuid` | FUNCTION |
| `pgp_sym_encrypt` | FUNCTION |
| `pgp_sym_encrypt_bytea` | FUNCTION |
| `pgp_sym_encrypt` | FUNCTION |
| `pgp_sym_encrypt_bytea` | FUNCTION |
| `pgp_sym_decrypt` | FUNCTION |
| `pgp_sym_decrypt_bytea` | FUNCTION |
| `pgp_sym_decrypt` | FUNCTION |
| `pgp_sym_decrypt_bytea` | FUNCTION |
| `pgp_pub_encrypt` | FUNCTION |
| `pgp_pub_encrypt_bytea` | FUNCTION |
| `pgp_pub_encrypt` | FUNCTION |
| `pgp_pub_encrypt_bytea` | FUNCTION |
| `pgp_pub_decrypt` | FUNCTION |
| `pgp_pub_decrypt_bytea` | FUNCTION |
| `pgp_pub_decrypt` | FUNCTION |
| `pgp_pub_decrypt_bytea` | FUNCTION |
| `pgp_pub_decrypt` | FUNCTION |
| `pgp_pub_decrypt_bytea` | FUNCTION |
| `pgp_key_id` | FUNCTION |
| `armor` | FUNCTION |
| `armor` | FUNCTION |
| `dearmor` | FUNCTION |
| `pgp_armor_headers` | FUNCTION |
| `update_updated_at_column` | FUNCTION |

---

## SEZIONE 4: BACKEND ROUTES

### 4.1 File Route (`/root/mihub-backend-rest/routes/`)

**Totale file route:** 82

| # | File |
|---|---|
| 1 | `abacusGithub.js` |
| 2 | `abacusSql.js` |
| 3 | `adminDeploy.js` |
| 4 | `admin.js` |
| 5 | `adminMigrate.js` |
| 6 | `adminSecrets.js` |
| 7 | `agentLogsRouter.js` |
| 8 | `apiSecrets.js` |
| 9 | `auth.js` |
| 10 | `autorizzazioni.js` |
| 11 | `bandi.js` |
| 12 | `canone-unico.js` |
| 13 | `chats.js` |
| 14 | `citizens.js` |
| 15 | `civic-reports.js` |
| 16 | `collaboratori.js` |
| 17 | `comuni.js` |
| 18 | `concessions.js` |
| 19 | `dimaMappe.js` |
| 20 | `dmsHub.js` |
| 21 | `dms-legacy.js` |
| 22 | `dms-legacy-service.js` |
| 23 | `dms-legacy-transformer.js` |
| 24 | `documents.js` |
| 25 | `domande-spunta.js` |
| 26 | `formazione.js` |
| 27 | `gaming-rewards.js` |
| 28 | `gis.js` |
| 29 | `giustificazioni.js` |
| 30 | `gptdev.js` |
| 31 | `gtfs.js` |
| 32 | `guardian.js` |
| 33 | `guardianSync.js` |
| 34 | `health-monitor.js` |
| 35 | `hub.js` |
| 36 | `imprese.js` |
| 37 | `inspections.js` |
| 38 | `integrations.js` |
| 39 | `internalTraces.js` |
| 40 | `ipa.js` |
| 41 | `logs.js` |
| 42 | `market-settings.js` |
| 43 | `markets.js` |
| 44 | `mercaweb.js` |
| 45 | `mercaweb-transformer.js` |
| 46 | `migratePDND.js` |
| 47 | `mihub.js` |
| 48 | `mioAgent.js` |
| 49 | `monitoring-debug.js` |
| 50 | `monitoring-logs.js` |
| 51 | `notifiche.js` |
| 52 | `orchestrator.js` |
| 53 | `orchestratorMock.js` |
| 54 | `panic.js` |
| 55 | `presenze.js` |
| 56 | `public-search.js` |
| 57 | `qualificazioni.js` |
| 58 | `regioni.js` |
| 59 | `routing.js` |
| 60 | `sanctions.js` |
| 61 | `security.js` |
| 62 | `stalls.js` |
| 63 | `stats.js` |
| 64 | `stats-qualificazione.js` |
| 65 | `suap.js` |
| 66 | `system.js` |
| 67 | `system-logs.js` |
| 68 | `tariffs.js` |
| 69 | `tcc.js` |
| 70 | `tcc-v2.js` |
| 71 | `test-mercato.js` |
| 72 | `toolsManus.js` |
| 73 | `vendors.js` |
| 74 | `verbali_invia_new.js` |
| 75 | `verbali.js` |
| 76 | `wallet-history.js` |
| 77 | `wallet-scadenze.js` |
| 78 | `wallets.js` |
| 79 | `watchlist.js` |
| 80 | `webhook.js` |
| 81 | `webhooks.js` |
| 82 | `workspace.js` |

### 4.2 Endpoint Montati in `index.js`

| # | Path | Dettaglio |
|---|---|---|
| 1 | `/api/logs` | `app.use('/api/logs', logsRoutes);` |
| 2 | `/api/mihub` | `app.use('/api/mihub', mihubRoutes);` |
| 3 | `/api/mihub` | `app.use('/api/mihub', orchestratorRoutes);` |
| 4 | `/api/mihub` | `app.use('/api/mihub', orchestratorMockRoutes);` |
| 5 | `/api/guardian` | `app.use('/api/guardian', guardianRoutes);` |
| 6 | `/api/mihub` | `app.use('/api/mihub', guardianSyncRoutes);` |
| 7 | `/admin` | `app.use('/admin', adminRoutes);` |
| 8 | `/api/admin/secrets` | `app.use('/api/admin/secrets', adminSecretsRoutes);` |
| 9 | `/api/secrets` | `app.use('/api/secrets', apiSecretsRoutes);` |
| 10 | `/api/gis` | `app.use('/api/gis', gisRoutes);` |
| 11 | `/api/markets` | `app.use('/api/markets', marketsRoutes);` |
| 12 | `/api/stalls` | `app.use('/api/stalls', stallsRoutes);` |
| 13 | `/api/vendors` | `app.use('/api/vendors', vendorsRoutes);` |
| 14 | `/api/concessions` | `app.use('/api/concessions', concessionsRoutes);` |
| 15 | `/api/autorizzazioni` | `app.use('/api/autorizzazioni', autorizzazioniRoutes);` |
| 16 | `/api/domande-spunta` | `app.use('/api/domande-spunta', domandeSpuntaRoutes);` |
| 17 | `/api/imprese` | `app.use('/api/imprese', impreseRoutes);` |
| 18 | `/api/suap` | `app.use('/api/suap', suapRoutes);` |
| 19 | `/api/qualificazioni` | `app.use('/api/qualificazioni', qualificazioniRoutes);` |
| 20 | `/api/regioni` | `app.use('/api/regioni', regioniRoutes);` |
| 21 | `/api/documents` | `app.use('/api/documents', documentsRoutes);` |
| 22 | `/api/comuni` | `app.use('/api/comuni', comuniRoutes);` |
| 23 | `/api/ipa` | `app.use('/api/ipa', ipaRoutes); // IndicePA - Import comuni` |
| 24 | `/api/tariffs` | `app.use('/api/tariffs', tariffsRoutes);` |
| 25 | `/api/wallets` | `app.use('/api/wallets', walletsRoutes);` |
| 26 | `/api/wallet-history` | `app.use('/api/wallet-history', walletHistoryRoutes);` |
| 27 | `/api/wallet-scadenze` | `app.use('/api/wallet-scadenze', walletScadenzeRoutes);` |
| 28 | `/api/canone-unico` | `app.use('/api/canone-unico', canoneUnicoRoutes);` |
| 29 | `/api/presenze` | `app.use('/api/presenze', presenzeRoutes);` |
| 30 | `/api` | `app.use('/api', presenzeRoutes); // Per /api/graduatoria/*` |
| 31 | `/api/collaboratori` | `app.use('/api/collaboratori', collaboratoriRoutes); // Collaboratori impresa per autorizzazione pres` |
| 32 | `/api/giustificazioni` | `app.use('/api/giustificazioni', giustificazioniRoutes); // Giustificazioni impresa per uscite antici` |
| 33 | `/api/test-mercato` | `app.use('/api/test-mercato', testMercatoRoutes); // Test Mercato endpoints` |
| 34 | `/api/market-settings` | `app.use('/api/market-settings', marketSettingsRoutes); // Impostazioni orari mercato e trasgressioni` |
| 35 | `/api/hub` | `app.use('/api/hub', hubRoutes);` |
| 36 | `/api/routing` | `app.use('/api/routing', routingRoutes);` |
| 37 | `/api/dmsHub` | `app.use('/api/dmsHub', dmsHubRoutes);` |
| 38 | `/api/abacus/github` | `app.use('/api/abacus/github', abacusGithubRoutes);` |
| 39 | `/api/mio` | `app.use('/api/mio', mioAgentRoutes);` |
| 40 | `/api/hooks` | `app.use('/api/hooks', webhooksRoutes);` |
| 41 | `/webhook` | `app.use('/webhook', deployWebhookRoutes);` |
| 42 | `/api/abacus/sql` | `app.use('/api/abacus/sql', abacusSqlRoutes);` |
| 43 | `/api/admin` | `app.use('/api/admin', adminMigrateRoutes);` |
| 44 | `/api/admin` | `app.use('/api/admin', migratePDNDRoutes);` |
| 45 | `/api/admin` | `app.use('/api/admin', adminDeployRoutes);` |
| 46 | `/api/mihub/chats` | `app.use('/api/mihub/chats', chatsRoutes);` |
| 47 | `/api/system` | `app.use('/api/system', systemRoutes);` |
| 48 | `/api/health` | `app.use('/api/health', healthMonitorRoutes);` |
| 49 | `/api/workspace` | `app.use('/api/workspace', workspaceRoutes);` |
| 50 | `/api/dashboard/integrations` | `app.use('/api/dashboard/integrations', integrationsRoutes);` |
| 51 | `/api/stats` | `app.use('/api/stats', statsRoutes);` |
| 52 | `/api/stats/qualificazione` | `app.use('/api/stats/qualificazione', statsQualificazioneRoutes);` |
| 53 | `/api/formazione` | `app.use('/api/formazione', formazioneRoutes);` |
| 54 | `/api/bandi` | `app.use('/api/bandi', bandiRoutes);` |
| 55 | `/api/notifiche` | `app.use('/api/notifiche', notificheRoutes);` |
| 56 | `/api/security` | `app.use('/api/security', securityRoutes);` |
| 57 | `/api/auth` | `app.use('/api/auth', authRoutes);` |
| 58 | `/api/citizens` | `app.use('/api/citizens', citizensRoutes);` |
| 59 | `/api/tcc` | `app.use('/api/tcc', tccRoutes);` |
| 60 | `/api/tcc/v2` | `app.use('/api/tcc/v2', tccV2Routes);` |
| 61 | `/api/public` | `app.use('/api/public', publicSearchRoutes);` |
| 62 | `/api/inspections` | `app.use('/api/inspections', inspectionsRoutes);` |
| 63 | `/api/sanctions` | `app.use('/api/sanctions', sanctionsRoutes);` |
| 64 | `/api/watchlist` | `app.use('/api/watchlist', watchlistRoutes);` |
| 65 | `/api/verbali` | `app.use('/api/verbali', verbaliRoutes);` |
| 66 | `/api/civic-reports` | `app.use('/api/civic-reports', civicReportsRoutes);` |
| 67 | `/api/gtfs` | `app.use('/api/gtfs', gtfsRoutes);` |
| 68 | `/api/gaming-rewards` | `app.use('/api/gaming-rewards', gamingRewardsRoutes);` |
| 69 | `/api/integrations/dms-legacy` | `app.use('/api/integrations/dms-legacy', dmsLegacyRoutes);` |
| 70 | `/api/integrations/mercaweb` | `app.use('/api/integrations/mercaweb', mercawebRoutes);` |

### 4.3 File Route NON Montati in index.js

I seguenti file `.js` esistono in `/routes/` ma non hanno un corrispondente `app.use()` diretto in `index.js` (potrebbero essere importati indirettamente come service/transformer):

- `dms-legacy-service.js` — service/transformer (importato indirettamente)
- `dms-legacy-transformer.js` — service/transformer (importato indirettamente)
- `internalTraces.js` — service/transformer (importato indirettamente)
- `mercaweb-transformer.js` — service/transformer (importato indirettamente)
- `monitoring-debug.js` — service/transformer (importato indirettamente)
- `monitoring-logs.js` — service/transformer (importato indirettamente)
- `panic.js` — service/transformer (importato indirettamente)
- `system-logs.js` — service/transformer (importato indirettamente)
- `toolsManus.js` — service/transformer (importato indirettamente)
- `verbali_invia_new.js` — service/transformer (importato indirettamente)

---

## SEZIONE 5: VARIABILI AMBIENTE (`.env`)

> Solo nomi delle variabili, senza valori per sicurezza.

| # | Variabile | Categoria |
|---|---|---|
| 1 | `BASE_URL` | SERVER |
| 2 | `BLUEPRINT_REPO` | GITHUB |
| 3 | `CORS_ORIGINS` | SERVER |
| 4 | `DATABASE_URL` | DATABASE |
| 5 | `DB_HOST` | DATABASE |
| 6 | `DB_NAME` | DATABASE |
| 7 | `DB_PASSWORD` | DATABASE |
| 8 | `DB_PORT` | DATABASE |
| 9 | `DB_SSL` | DATABASE |
| 10 | `DB_USER` | DATABASE |
| 11 | `ENABLE_AGENT_LOGS` | FEATURES |
| 12 | `ENABLE_GUARDIAN_LOOP` | FEATURES |
| 13 | `ENABLE_MIO_CHAT` | FEATURES |
| 14 | `ENABLE_SECRETS_SYNC` | FEATURES |
| 15 | `GEMINI_API_KEY` | API KEYS |
| 16 | `GITHUB_PAT_DMS` | GITHUB |
| 17 | `GITHUB_PERSONAL_ACCESS_TOKEN` | GITHUB |
| 18 | `GITHUB_TOKEN` | GITHUB |
| 19 | `JWT_SECRET` | AUTH/SECURITY |
| 20 | `LOG_FILE` | SERVER |
| 21 | `MANUS_API_KEY` | API KEYS |
| 22 | `MERCAWEB_API_KEY` | API KEYS |
| 23 | `MIO_HUB_BASE` | SERVER |
| 24 | `MIOHUB_SECRETS_KEY` | AUTH/SECURITY |
| 25 | `NEON_POSTGRES_URL` | DATABASE |
| 26 | `NODE_ENV` | SERVER |
| 27 | `ORCHESTRATOR_ENABLED` | FEATURES |
| 28 | `PORT` | SERVER |
| 29 | `POSTGRES_URL` | DATABASE |
| 30 | `ZAPIER_API_KEY` | API KEYS |
| 31 | `ZAPIER_NLA_API_KEY` | API KEYS |

---

## SEZIONE 6: PM2 STATUS E LOGS

### 6.1 PM2 Status

```
┌────┬──────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name             │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼──────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ mihub-backend    │ default     │ 1.1.0   │ cluster │ 711337   │ 103m   │ 21   │ online    │ 0%       │ 168.3mb  │ root     │ disabled │
└────┴──────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

### 6.2 PM2 Logs (ultimi 30)

**Error log:**

```
[TAILING] Tailing last 30 lines for [mihub-backend] process (change the value with --lines option)
/root/.pm2/logs/mihub-backend-error-0.log last 30 lines:
0|mihub-ba | - If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'
0|mihub-ba | 
0|mihub-ba | See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
0|mihub-ba | (Use `node --trace-warnings ...` to show where the warning was created)
0|mihub-ba | Query error: Error: Connection terminated due to connection timeout
0|mihub-ba |     at /root/mihub-backend-rest/node_modules/pg-pool/index.js:45:11
0|mihub-ba |     at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
0|mihub-ba |     at async query (/root/mihub-backend-rest/config/database.js:42:17)
0|mihub-ba |     at async /root/mihub-backend-rest/routes/security.js:157:20 {
0|mihub-ba |   [cause]: Error: Connection terminated unexpectedly
0|mihub-ba |       at Connection.<anonymous> (/root/mihub-backend-rest/node_modules/pg/lib/client.js:177:73)
0|mihub-ba |       at Object.onceWrapper (node:events:633:28)
0|mihub-ba |       at Connection.emit (node:events:519:28)
0|mihub-ba |       at Socket.<anonymous> (/root/mihub-backend-rest/node_modules/pg/lib/connection.js:61:12)
0|mihub-ba |       at Socket.emit (node:events:531:35)
0|mihub-ba |       at TCP.<anonymous> (node:net:346:12)
0|mihub-ba | }
0|mihub-ba | [Security] Error getting users: Error: Connection terminated due to connection timeout
0|mihub-ba |     at /root/mihub-backend-rest/node_modules/pg-pool/index.js:45:11
0|mihub-ba |     at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
0|mihub-ba |     at async query (/root/mihub-backend-rest/config/database.js:42:17)
0|mihub-ba |     at async /root/mihub-backend-rest/routes/security.js:157:20 {
0|mihub-ba |   [cause]: Error: Connection terminated unexpectedly
0|mihub-ba |       at Connection.<anonymous> (/root/mihub-backend-rest/node_modules/pg/lib/client.js:177:73)
0|mihub-ba |       at Object.onceWrapper (node:events:633:28)
0|mihub-ba |       at Connection.emit (node:events:519:28)
0|mihub-ba |       at Socket.<anonymous> (/root/mihub-backend-rest/node_modules/pg/lib/connection.js:61:12)
0|mihub-ba |       at Socket.emit (node:events:531:35)
0|mihub-ba |       at TCP.<anonymous> (node:net:346:12)
0|mihub-ba | }

/root/.pm2/logs/mihub-backend-out-0.log last 30 lines:
0|mihub-ba |   rows: 5
0|mihub-ba | }
0|mihub-ba | Query executed {
0|mihub-ba |   text: '\n      SELECT \n        id,\n        stop_id,\n      ',
0|mihub-ba |   duration: 212,
0|mihub-ba |   rows: 30
0|mihub-ba | }
0|mihub-ba | [API Logger] Logged: GET /api/stats/realtime -> system
0|mihub-ba | [API Logger] Logged: GET /api/gtfs/stats -> system
0|mihub-ba | Query executed {
0|mihub-ba |   text: '\n      SELECT COUNT(*) as total\n      FROM gtfs_st',
0|mihub-ba |   duration: 105,
0|mihub-ba |   rows: 1
0|mihub-ba | }
0|mihub-ba | [API Logger] Logged: GET /api/band
```

### 6.3 package.json

```json
{
  "name": "mihub-backend-rest",
  "version": "1.1.0",
  "description": "Backend REST API per DMS MIO-HUB - Gestione Mercati e Sistema GIS",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "dms",
    "mio-hub",
    "rest-api",
    "gis",
    "mercati"
  ],
  "author": "DMS MIO-HUB Team",
  "license": "ISC",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.700.0",
    "@aws-sdk/s3-request-presigner": "^3.700.0",
    "@google/generative-ai": "^0.24.1",
    "adm-zip": "^0.5.16",
    "axios": "^1.13.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^8.2.1",
    "helmet": "^8.1.0",
    "luxon": "^3.7.2",
    "multer": "^1.4.5-lts.1",
    "mysql2": "^3.16.0",
    "nanoid": "^5.1.6",
    "node-fetch": "^2.7.0",
    "pdfkit": "^0.17.2",
    "pg": "^8.18.0",
    "puppeteer": "^24.32.1",
    "xml2js": "^0.6.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## SEZIONE 7: DISCREPANZE RISPETTO AL MASTER_BLUEPRINT_MIOHUB.md

### 7.1 Tabelle nel DB ma NON nel Blueprint

Le seguenti tabelle esistono nel database ma non sono documentate nel MASTER_BLUEPRINT:

| Tabella | Righe | Note |
|---|---|---|
| `market_session_details` | 500 | Dettagli sessioni mercato |
| `security_events` | 364 | Sistema sicurezza |
| `login_attempts` | 270 | Login tracking |
| `suap_checks` | 232 | Sistema SUAP |
| `province` | 107 | Anagrafica territoriale |
| `transactions` | 106 | Transazioni generiche |
| `settori_comune` | 94 | Settori merceologici comune |
| `hub_locations` | 79 | Hub locations/shops |
| `spend_qr_tokens` | 49 | QR/Spend tokens |
| `suap_eventi` | 48 | Sistema SUAP |
| `pm_watchlist` | 32 | Watchlist PM |
| `suap_pratiche` | 28 | Sistema SUAP |
| `fund_transactions` | 24 | Fund transactions |
| `servizi_associazioni` | 24 | Servizi associazioni |
| `suap_decisioni` | 22 | Sistema SUAP |
| `operator_daily_wallet` | 21 | Operatore daily wallet |
| `infraction_types` | 20 | Tipi infrazione |
| `regioni` | 20 | Anagrafica territoriale |
| `regolarita_imprese` | 20 | Regolarità imprese |
| `cultural_visits` | 18 | Visite culturali |
| `operator_transactions` | 16 | Operatore daily wallet |
| `v_enterprise_compliance` | 14 |  |
| `vendors` | 14 | Vendors legacy |
| `mobility_checkins` | 13 | Check-in mobilità |
| `formazione_iscrizioni` | 10 | Sistema formazione |
| `qualification_types` | 10 |  |
| `richieste_servizi` | 10 | Servizi associazioni |
| `secrets_meta` | 10 |  |
| `comuni` | 9 | Anagrafica territoriale |
| `gaming_rewards_config` | 9 | Sistema gaming/rewards |
| `hub_shops` | 9 | Hub locations/shops |
| `secure_credentials` | 9 | Credenziali sicure |
| `agents` | 8 |  |
| `bandi_catalogo` | 8 | Sistema bandi |
| `agent_screenshots` | 7 |  |
| `formazione_corsi` | 6 | Sistema formazione |
| `workspace_snapshots` | 6 | Workspace snapshots |
| `bandi_associazioni` | 5 | Sistema bandi |
| `civic_config` | 5 |  |
| `extended_users` | 5 | Utenti estesi |
| `formazione_enti` | 5 | Sistema formazione |
| `secrets` | 5 |  |
| `user_role_assignments` | 5 |  |
| `gaming_challenges` | 4 | Sistema gaming/rewards |
| `impresa_giustificazioni` | 4 | Giustificazioni impresa |
| `qr_tokens` | 4 | QR/Spend tokens |
| `referrals` | 4 | Referral system |
| `access_logs` | 3 | Access logs |
| `carbon_credits_rules` | 3 | Carbon credits |
| `dms_companies` | 3 |  |
| `market_settings` | 3 | Impostazioni mercato |
| `shops` | 3 | Negozi |
| `collaboratori_impresa` | 2 | Collaboratori impresa |
| `comune_utenti` | 2 | Utenti comune |
| `inspections` | 2 | Ispezioni |
| `market_geometry` | 2 | Geometria mercato |
| `v_tcc_circulation_by_comune` | 2 |  |
| `v_top_merchants_by_comune` | 2 |  |
| `carbon_credits_config` | 1 | Carbon credits |
| `dms_suap_instances` | 1 | Sistema SUAP |
| `impostazioni_mora` | 1 | Impostazioni mora |
| `route_completions` | 1 |  |
| `v_fund_stats_by_comune` | 1 | Fund transactions |

### 7.2 Route File NON Documentate nel Blueprint

I seguenti file route esistono nel backend ma non sono documentati nel MASTER_BLUEPRINT:

| File | Probabile Funzione |
|---|---|
| `abacusGithub.js` | Hub locations |
| `abacusSql.js` | Abacus (GitHub/SQL) |
| `adminDeploy.js` | Admin panel |
| `admin.js` | Admin panel |
| `adminMigrate.js` | Admin panel |
| `adminSecrets.js` | Admin panel |
| `agentLogsRouter.js` | MIO Agent AI |
| `apiSecrets.js` |  |
| `autorizzazioni.js` | Autorizzazioni |
| `bandi.js` | Bandi |
| `canone-unico.js` | Canone unico |
| `chats.js` | Chat system |
| `citizens.js` | Cittadini |
| `civic-reports.js` | Segnalazioni civiche |
| `collaboratori.js` | Collaboratori impresa |
| `comuni.js` | Comuni |
| `dimaMappe.js` | DIMA mappe |
| `dmsHub.js` | DMS Hub connector |
| `dms-legacy-service.js` | Service layer |
| `dms-legacy-transformer.js` | Data transformer |
| `documents.js` | Documenti |
| `formazione.js` | Formazione |
| `gaming-rewards.js` | Gaming rewards |
| `giustificazioni.js` | Giustificazioni |
| `gptdev.js` |  |
| `gtfs.js` | GTFS trasporto pubblico |
| `guardian.js` | Guardian blueprint sync |
| `guardianSync.js` | Guardian blueprint sync |
| `hub.js` | Hub locations |
| `inspections.js` | Ispezioni |
| `integrations.js` | Integrazioni dashboard |
| `internalTraces.js` | Internal traces |
| `ipa.js` | IndicePA |
| `logs.js` | Logging |
| `market-settings.js` | Impostazioni mercato |
| `mercaweb-transformer.js` | Data transformer |
| `migratePDND.js` | Migrazione dati |
| `mihub.js` | Hub locations |
| `mioAgent.js` | MIO Agent AI |
| `monitoring-debug.js` | Monitoring |
| `monitoring-logs.js` | Logging |
| `orchestrator.js` | Orchestrator AI |
| `orchestratorMock.js` | Orchestrator AI |
| `panic.js` | Panic button |
| `public-search.js` | Ricerca pubblica |
| `qualificazioni.js` | Qualificazioni |
| `regioni.js` | Regioni/territori |
| `routing.js` | Routing/navigazione |
| `stats.js` | Statistiche |
| `stats-qualificazione.js` | Statistiche |
| `suap.js` | SUAP pratiche |
| `system.js` | System management |
| `system-logs.js` | System management |
| `tariffs.js` | Tariffe |
| `tcc.js` | TCC wallet/tributi |
| `tcc-v2.js` | TCC wallet/tributi |
| `toolsManus.js` | Tools Manus |
| `vendors.js` | Vendors legacy |
| `verbali_invia_new.js` |  |
| `watchlist.js` | Watchlist PM |
| `webhook.js` | Webhooks |
| `webhooks.js` | Webhooks |
| `workspace.js` | Workspace snapshots |

### 7.3 Tabelle Backup/Legacy

Le seguenti tabelle sono backup o legacy e possono essere ignorate:

| Tabella | Note |
|---|---|
| `agent_logs_backup_20251204_174125` | Backup/migration |
| `agent_messages_backup_20251204_174125` | Backup/migration |
| `carbon_credits_config_backup_20260203` | Backup/migration |
| `carbon_credits_rules_backup_20260203` | Backup/migration |
| `civic_config_backup_20260203` | Backup/migration |

---

## NOTE FINALI

- **149 tabelle** nel database, di cui **~60 con dati** e **~89 vuote** (struttura predisposta)
- **82 file route** nel backend, di cui ~70 montati in `index.js`
- **PM2:** `mihub-backend` online, v1.1.0, cluster mode
- **Errori nei log:** Connection timeout sporadici su `security.js` (Neon pooler timeout)
- **Tabella più grande:** `mio_agent_logs` con 326,543 righe
- **Verifiche specifiche:** `cultural_pois` = 1,127, `gtfs_stops` = 23,930
