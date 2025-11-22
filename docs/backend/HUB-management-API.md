# API Documentation - HUB Management

**Version:** 1.0  
**Date:** 22 November 2024  
**Author:** Manus AI Agent

---

## Overview

This document provides a detailed overview of the tRPC API endpoints for managing HUB locations, shops, and services within the DMS HUB system. All endpoints are located under the `dmsHub.hub` router.

### Key Features
- **CRUD Operations**: Full support for Create, Read, Update, and Delete operations.
- **Soft Delete**: All delete operations are "soft" (setting `active=0` or `status='inactive'`), preserving data integrity and history.
- **Logging**: All write operations (create, update, delete) are automatically logged in the `audit_logs` table.
- **Schema-aligned**: All API inputs and outputs are aligned with the Drizzle database schema.

---

## 1. HUB Locations

**Path:** `dmsHub.hub.locations`

### 1.1. `list` (Query)

Retrieves a list of HUB locations. By default, only active locations are returned.

**Input:**
```typescript
{
  includeInactive?: boolean; // Optional, default: false
}
```

**Output:**
```typescript
Array<{
  id: number;
  marketId: number;
  name: string;
  address: string;
  city: string;
  lat: string;
  lng: string;
  areaGeojson: string | null;
  openingHours: string | null;
  active: number; // 1 = active, 0 = inactive
  description: string | null;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

**Example:**
```typescript
// Get only active HUBs
const activeHubs = await trpc.dmsHub.hub.locations.list.useQuery();

// Get all HUBs, including inactive
const allHubs = await trpc.dmsHub.hub.locations.list.useQuery({ includeInactive: true });
```

### 1.2. `getById` (Query)

Retrieves a single HUB location by its ID.

**Input:**
```typescript
{
  id: number;
}
```

**Output:**
- A single HUB location object (see `list` output) or `null` if not found.

### 1.3. `create` (Mutation)

Creates a new HUB location.

**Input:**
```typescript
{
  marketId: number;
  name: string;
  address: string;
  city: string;
  lat: string;
  lng: string;
  areaGeojson?: string;
  openingHours?: string;
  description?: string;
  photoUrl?: string;
}
```

**Output:**
```typescript
{
  success: true;
  hubId: number; // ID of the newly created HUB
}
```

### 1.4. `update` (Mutation)

Updates an existing HUB location. Only the provided fields are updated.

**Input:**
```typescript
{
  id: number; // Required
  marketId?: number;
  name?: string;
  address?: string;
  city?: string;
  lat?: string;
  lng?: string;
  areaGeojson?: string;
  openingHours?: string;
  description?: string;
  photoUrl?: string;
}
```

**Output:**
```typescript
{
  success: true;
}
```

### 1.5. `delete` (Mutation - Soft Delete)

Deactivates a HUB location by setting its `active` field to `0`.

**Input:**
```typescript
{
  id: number;
}
```

**Output:**
```typescript
{
  success: true;
}
```

**Behavior:**
- **Does NOT delete** the record from the database.
- Sets `active = 0`.
- Updates the `updatedAt` timestamp.
- The location will no longer appear in `list` queries unless `includeInactive: true` is used.

---

## 2. HUB Shops

**Path:** `dmsHub.hub.shops`

### 2.1. `list` (Query)

Retrieves a list of shops for a specific HUB.

**Input:**
```typescript
{
  hubId: number;
}
```

**Output:**
```typescript
Array<{
  id: number;
  hubId: number;
  name: string;
  category: string | null;
  // ... other fields
  status: string; // active, suspended, inactive
}>
```

### 2.2. `create` (Mutation)

Creates a new shop within a HUB.

**Input:**
```typescript
{
  hubId: number;
  name: string;
  category?: string;
  // ... other fields
}
```

**Output:**
```typescript
{
  success: true;
  shopId: number;
}
```

### 2.3. `update` (Mutation)

**Status: ⏳ NOT IMPLEMENTED**

### 2.4. `delete` (Mutation)

**Status: ⏳ NOT IMPLEMENTED**

---

## 3. HUB Services

**Path:** `dmsHub.hub.services`

### 3.1. `list` (Query)

Retrieves a list of services for a specific HUB.

**Input:**
```typescript
{
  hubId: number;
}
```

**Output:**
```typescript
Array<{
  id: number;
  hubId: number;
  name: string;
  type: string;
  // ... other fields
  status: string; // active, maintenance, inactive
}>
```

### 3.2. `create` (Mutation)

Creates a new service within a HUB.

**Input:**
```typescript
{
  hubId: number;
  name: string;
  type: string;
  // ... other fields
}
```

**Output:**
```typescript
{
  success: true;
  serviceId: number;
}
```

### 3.3. `update` (Mutation)

**Status: ⏳ NOT IMPLEMENTED**

### 3.4. `delete` (Mutation)

**Status: ⏳ NOT IMPLEMENTED**

---

## ⚠️ Testing Status

**HUB Locations:**
- ✅ **Code Verified**: All CRUD operations have been implemented and the code compiles without errors.
- ✅ **Logic Verified**: The implementation logic aligns with the database schema and project requirements (e.g., soft delete).
- ❌ **End-to-End Testing**: **NOT PERFORMED**. These APIs have not been tested against a live database. End-to-end testing must be performed in a staging/production environment with a real `DATABASE_URL`.

**HUB Shops & Services:**
- ⏳ **Partially Implemented**: Only `list` and `create` are implemented. `update` and `delete` are pending.

---

## Database Schema

### `hub_locations`

```sql
CREATE TABLE hub_locations (
  id SERIAL PRIMARY KEY,
  market_id INTEGER NOT NULL REFERENCES markets(id),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  lat VARCHAR(20) NOT NULL,
  lng VARCHAR(20) NOT NULL,
  area_geojson TEXT,
  opening_hours TEXT,
  active INTEGER DEFAULT 1 NOT NULL,  -- 1=active, 0=inactive
  description TEXT,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

---

## Logging

All write operations (`create`, `update`, `delete`) on HUB Locations are automatically logged in the `audit_logs` table. The log entry includes the action performed, the entity ID, the old value (for updates/deletes), and the new value.

**Example Log Entry:**
```json
{
  "userEmail": "system",
  "action": "UPDATE_HUB",
  "entityType": "hub_location",
  "entityId": 1,
  "oldValue": { "name": "Old Name" },
  "newValue": { "name": "New Name" },
  "timestamp": "2024-11-22T12:00:00Z"
}
```
