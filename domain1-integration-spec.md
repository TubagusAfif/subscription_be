# Domain 1 Integration Spec — Untuk Domain 1 (Subscription Platform)

## Daftar Isi

1. [Gambaran Umum 2 Domain](#1-gambaran-umum-2-domain)
2. [Tanggung Jawab Domain 1 vs Domain 2](#2-tanggung-jawab-domain-1-vs-domain-2)
3. [Authentication & Signing Convention](#3-authentication--signing-convention)
4. [Webhook Events — Domain 1 → Domain 2](#4-webhook-events--domain-1--domain-2)
5. [REST Endpoints yang Domain 1 HARUS Build](#5-rest-endpoints-yang-domain-1-harus-build)
6. [REST Endpoints Domain 2 — yang Domain 1 Boleh Consume](#6-rest-endpoints-domain-2--yang-domain-1-boleh-consume)
7. [Expiry & Grace Period — Flow Lengkap](#7-expiry--grace-period--flow-lengkap)
8. [Edge Cases yang Wajib Dihandle](#8-edge-cases-yang-wajib-dihandle)
9. [Error, Retry & Idempotency](#9-error-retry--idempotency)
10. [Enum Constants — Harus Match Persis](#10-enum-constants--harus-match-persis)
11. [Mock Strategy & Handshake Test](#11-mock-strategy--handshake-test)

---

## 1. Gambaran Umum 2 Domain

```
┌────────────────────────────────┐          ┌────────────────────────────────┐
│  DOMAIN 1                      │          │  DOMAIN 2                      │
│  idental.subs.com              │          │  app.idental.com               │
│                                │          │                                │
│  Subscription Platform         │          │  Software Operasional Klinik   │
│  • Owner beli paket            │          │  • Dokter input rekam medis    │
│  • Bayar via Bank Mega         │          │  • Staff catat appointment     │
│  • Kelola addon (klinik/user)  │          │  • Owner kelola klinik/staff   │
│  • Track quota                 │          │  • Pasien transaksi            │
│                                │          │                                │
│  Stack: TypeScript + Postgres  │          │  Stack: Node.js + MySQL        │
│  Status: ❌ BELUM dibangun     │ ─webhook→│  Status: ✅ SUDAH ready        │
│                                │ ←REST───→│  (clean code architecture)     │
└────────────────────────────────┘          └────────────────────────────────┘
```

**Kunci yang harus dipahami:**

- **Database TERPISAH**. Domain 1 (Postgres) dan Domain 2 (MySQL) tidak share schema. Komunikasi via HTTP saja.
- **Domain 2 menyimpan SNAPSHOT** subscription per company di tabel `company_subscriptions`. Snapshot ini di-sync dari Domain 1 via webhook setiap ada perubahan.
- **Data klinik (pasien, MR, payment, dll) HANYA di Domain 2**. Domain 1 tidak pernah menyentuh data medis.
- **Data subscription (SKU, billing, payment) HANYA di Domain 1**. Domain 2 tidak pernah memproses pembayaran kartu kredit.

---

## 2. Tanggung Jawab Domain 1 vs Domain 2

### Domain 1

| Tanggung Jawab                                          | Detail                                                                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Owner sign-up & subscription purchase                   | Halaman pricing, checkout, payment gateway integration (Bank Mega)                                                                |
| Kelola SKU base + addon (CLINIC, USER, FEATURE)         | CRUD bundle, mapping fitur per tier                                                                                               |
| Track `subscription_quotas` per company                 | `max_quota`, `used_quota` per resource_type (CLINIC, USER, FEATURE)                                                               |
| Track `addon_slot_map`                                  | Mapping addon ↔ resource ID di Domain 2 (yang slot-nya dipakai)                                                                   |
| Deteksi expiry (cron daily 00:05 WIB)                   | Cek `billing_end < NOW()` → kirim email H-7/H-3/H-1, mulai grace period                                                           |
| Grace period management (7 hari)                        | Setelah `billing_end + 7 hari` masih belum perpanjang → kirim webhook enforcement ke Domain 2                                     |
| Push webhook ke Domain 2                                | 9 event (lihat Section 4)                                                                                                         |
| Expose REST endpoint untuk Domain 2                     | 4 endpoint (lihat Section 5)                                                                                                      |
| Notifikasi email ke owner                               | H-7, H-3, H-1, H+1 (grace start), H+7 (enforce)                                                                                   |
| Generate renewal URL                                    | Untuk redirect dari Domain 2 saat owner klik "Perpanjang"                                                                         |

### Domain 2

| Tanggung Jawab                                          | Detail                                                                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Terima webhook dari Domain 1                            | Endpoint `POST /api/internal/webhook/subscription-change`                                                                         |
| Verifikasi HMAC signature                               | Pakai shared secret yang sama dengan Domain 1                                                                                     |
| Update `company_subscriptions` (snapshot)               | Tier, status, features, billing_end, max_clinics, dll                                                                             |
| Eksekusi enforcement                                    | `deactivate_clinics`, `suspend_users`, `full_lockout`, `feature_removal/downgrade` — TANPA hapus data                            |
| Eksekusi reaktivasi                                     | `reactivate_clinics`, `reactivate_users`, `full_reactivation`                                                                     |
| Subscription gate per endpoint                          | Middleware `subscriptionGate("<feature_key>")` cek tier sebelum izinkan akses                                                     |
| Slot reporting saat create resource                     | Call Domain 1 `POST /slots/assign` saat owner buat klinik/staff/doctor baru                                                       |
| Audit log enforcement                                   | Setiap deactivate/suspend tercatat di `audit_logs`                                                                                |

> **Pembagian prinsip:** Domain 1 = **HITUNG** (deteksi expiry, hitung quota, tentukan resource mana yang di-enforce). Domain 2 = **EKSEKUSI** (terima instruksi spesifik, soft-block resource, audit log). Domain 1 TIDAK tahu detail klinik, Domain 2 TIDAK tahu detail billing — masing-masing fokus di domainnya.

---

## 3. Authentication & Signing Convention

### Shared Secret

Generate sekali, simpan di kedua domain sebagai env var:

```bash
# Generate 32-byte hex (256-bit)
openssl rand -hex 32
# → e.g. a3f5c2d7e8b9a1...
```

```bash
# .env di Domain 1 (sign outgoing)
WEBHOOK_SHARED_SECRET=a3f5c2d7e8b9a1...

# .env di Domain 2 (verify incoming)
WEBHOOK_SHARED_SECRET=a3f5c2d7e8b9a1...   # ← HARUS PERSIS SAMA
```

**Rules:**
- Rotasi tiap 90 hari (manual via deployment).
- JANGAN commit ke git. Inject via Secret Manager / CI/CD.
- Secret berlaku untuk **semua arah** (D1→D2 webhook DAN D2→D1 REST calls).

### Headers Wajib

Setiap request HTTP ke Domain 2 (atau dari Domain 2 ke Domain 1) HARUS punya 5 header ini:

| Header                  | Wajib | Contoh                          | Tujuan                                          |
| ----------------------- | ----- | ------------------------------- | ----------------------------------------------- |
| `Content-Type`          | ✅    | `application/json`              | Body parsing                                    |
| `X-Webhook-Signature`   | ✅    | `sha256=<hex>`                  | HMAC-SHA256 dari raw body                       |
| `X-Webhook-Event`       | ✅    | `subscription.created`          | Event identifier (untuk routing di receiver)    |
| `X-Idempotency-Key`     | ✅    | `evt_d1_subcreated_<unix_ms>_<rnd>` | Unique per event, retry pakai key SAMA      |
| `X-Webhook-Timestamp`   | ✅    | `1717200300`                    | Unix epoch detik. Reject jika drift > 5 menit   |
| `X-Webhook-Attempt`     | opt   | `3`                             | Counter retry (untuk monitoring)                |

### Cara Sign (TypeScript example)

```typescript
import crypto from "crypto";

function signWebhook(rawBody: string, secret: string): string {
  // CATATAN PENTING: rawBody adalah string JSON yang akan dikirim.
  // JANGAN re-stringify hasil parse — whitespace beda = signature beda.
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  return "sha256=" + hmac.digest("hex");
}

// Penggunaan:
const body = JSON.stringify({ event: "addon.expired", ... });
const signature = signWebhook(body, process.env.WEBHOOK_SHARED_SECRET!);

await fetch("https://app.idental.com/api/internal/webhook/subscription-change", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-Signature": signature,
    "X-Webhook-Event": "addon.expired",
    "X-Idempotency-Key": `evt_d1_addonexp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    "X-Webhook-Timestamp": String(Math.floor(Date.now() / 1000)),
  },
  body,
});
```

### Cara Verify (REST endpoint Domain 1)

Saat Domain 2 hit endpoint (`/slots/assign`, dll), verify signature:

```typescript
import crypto from "crypto";

function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + crypto.createHmac("sha256", secret)
    .update(rawBody).digest("hex");

  // PENTING: pakai timingSafeEqual untuk cegah timing attack
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
```

**Catatan implementasi penting:**
- Pakai `express.raw({ type: "application/json" })` untuk endpoint internal supaya bisa akses `rawBody`. JANGAN pakai `express.json()` middleware untuk path internal.
- Body parsed dibuat ulang dari rawBody setelah signature OK.
- Reject (401) jika: signature invalid · timestamp drift > 5 menit · header wajib hilang.

---

## 4. Webhook Events — Domain 1 → Domain 2

Domain 1 POST ke **SATU endpoint** Domain 2 untuk semua event:

```
POST https://app.idental.com/api/internal/webhook/subscription-change
```

Routing per event ditentukan dari `X-Webhook-Event` header + field `event` di body.

### Daftar 9 Event yang HARUS dikirim

| Event                       | Kapan dikirim                                                | enforcement.type di payload          |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| `subscription.created`      | Owner first-time purchase → company di-provision di Domain 2 | _(none — create row baru)_           |
| `subscription.sync`         | Manual/scheduled full re-sync (override semua field)         | _(none — overwrite row)_             |
| `subscription.renewed`      | Subscription perpanjang (billing_end mundur)                 | `full_reactivation` (jika sblumnya expired) |
| `subscription.upgraded`     | Tier upgrade (mis. Business → Enterprise)                    | `feature_upgrade`                    |
| `subscription.downgraded`   | Tier downgrade (mis. Enterprise → Business)                  | `feature_downgrade`                  |
| `subscription.expired`      | billing_end + grace period habis → base expired              | `full_lockout`                       |
| `subscription.cancelled`    | Owner cancel sebelum billing_end                             | `full_lockout` (immediate)           |
| `addon.expired`             | Addon (CLINIC / USER / FEATURE) expired + grace habis        | `deactivate_clinics` / `suspend_users` / `feature_removal` |
| `addon.renewed`             | Addon di-perpanjang                                          | `reactivate_clinics` / `reactivate_users` / `feature_restoration` |

### Standard Payload Envelope

Format yang SAMA untuk semua event:

```json
{
  "event": "addon.expired",
  "timestamp": "2026-04-28T00:05:00Z",
  "data": {
    "company_id": 1,
    "external_subscription_id": "sub_abc123",
    "subscription_update": {
      "tier": "business",
      "status": "active",
      "max_clinics": 2,
      "max_users_per_clinic": 5,
      "features": ["dashboard_clinic", "scheduling_calendar", "..."],
      "addons": {},
      "billing_start": "2026-01-01",
      "billing_end": "2026-12-31",
      "trial_end": null
    },
    "enforcement": {
      "type": "deactivate_clinics",
      "reason": "addon_clinic_expired",
      "clinic_ids": [3],
      "staff_ids": [],
      "doctor_ids": [],
      "removed_features": [],
      "message_id": "addon_clinic_expired"
    }
  }
}
```

**Penjelasan field:**

- **`event`** — sama dengan `X-Webhook-Event` header.
- **`timestamp`** — ISO 8601 UTC. Kapan event terjadi di Domain 1.
- **`data.company_id`** — ID company di Domain 2 (Dapat saat `subscription.created` pertama kali — Domain 2 yang assign).
- **`data.external_subscription_id`** — ID subscription di Domain 1.
- **`data.subscription_update`** — Field-field di `company_subscriptions` yang berubah. PATCH semantik: field yang TIDAK ada di payload TIDAK di-overwrite (kecuali untuk `subscription.sync` yang full overwrite).
- **`data.enforcement`** — Opsional. Hanya ada jika ada aksi konkret yang Domain 2 harus eksekusi.

### Aturan Penting

1. **PATCH vs FULL overwrite**: Untuk `subscription.sync`, kirim FULL state (semua field di `subscription_update`). Untuk event lain, kirim hanya field yang berubah.
2. **`enforcement.type` enum tertutup** — Domain 2 akan reject dengan 500 jika dapat type unknown.
3. **`enforcement.message_id`** adalah **key i18n** (bukan teks). Domain 2 yang translate ke Bahasa Indonesia. Daftar message_id ada di Section 10.
4. **Pisah `staff_ids` dan `doctor_ids`** untuk suspend/reactivate — JANGAN merge jadi `user_ids[]`. Di Domain 2 staff dan doctor adalah entitas terpisah. Anda tahu mapping karena saat slot di-assign (Section 5.1), Domain 2 lapor `ref_type: "staff" | "doctor"`.

### enforcement.type — Semantic per Type

| Type                   | Field wajib di payload  | Aksi yang Domain 2 lakukan                                       |
| ---------------------- | ----------------------- | ---------------------------------------------------------------- |
| `deactivate_clinics`   | `clinic_ids[]`          | `UPDATE clinics SET status='INACTIVE'` untuk ID tersebut         |
| `suspend_users`        | `staff_ids[]` dan/atau `doctor_ids[]` | `UPDATE users SET status='SUSPENDED'` untuk user_id terkait |
| `full_lockout`         | _(none)_                | `UPDATE clinics SET status='INACTIVE'` SEMUA klinik company      |
| `feature_removal`      | `removed_features[]`    | Audit log saja (features sudah di-update di `subscription_update.features`) |
| `feature_downgrade`    | `removed_features[]`    | Sama dengan `feature_removal`, tapi konteks event-nya tier change |
| `feature_upgrade`      | _(none)_                | Audit log saja                                                   |
| `reactivate_clinics`   | `clinic_ids[]`          | `UPDATE clinics SET status='ACTIVE'` untuk ID tersebut           |
| `reactivate_users`     | `staff_ids[]` dan/atau `doctor_ids[]` | `UPDATE users SET status='ACTIVE'`                  |
| `full_reactivation`    | _(none)_                | Reactivate semua klinik yang sebelumnya INACTIVE karena `subscription_expired` |
| `feature_restoration`  | _(none)_                | Audit log saja                                                   |

### Response dari Domain 2

**Sukses (200):**

```json
{
  "success": true,
  "message": "Webhook processed",
  "data": {
    "status": "processed",
    "event": "addon.expired",
    "sync_log_id": 42
  }
}
```

`status: "already_processed"` artinya event dengan `idempotency_key` ini sudah pernah diproses → Boleh anggap success, jangan retry.

**Signature/payload invalid (401/422)** — FATAL, jangan retry. Fix confignya dulu:

```json
{ "success": false, "message": "Invalid webhook signature", "data": null, "error_code": "UNAUTHORIZED" }
```

**Internal error (5xx)** — Transient. HARUS retry dengan backoff (lihat Section 9):

```json
{ "success": false, "message": "Internal error processing webhook", "data": null, "error_code": "INTERNAL_ERROR" }
```

### Status Code yang Harus Handle

| Code | Aksi                                                |
| ---- | -------------------------------------------------------- |
| 200  | Success — done                                           |
| 401  | Signature/auth invalid — FATAL, fix config, jangan retry |
| 422  | Payload schema mismatch — FATAL, jangan retry            |
| 429  | Rate limited — retry dengan backoff lebih panjang        |
| 5xx  | Transient error — retry                                  |
| timeout / network error | Retry                                     |

---

## 5. REST Endpoints yang Domain 1 HARUS Build

Ini adalah 4 endpoint yang **Harus expose** di Domain 1. Domain 2 akan consume.

**Base URL** (Domain 2 punya env `DOMAIN1_BASE_URL`):

```
https://idental.subs.com/api/internal/v1
```

Semua endpoint di sini di-protect dengan HMAC signature yang sama (Section 3).

---

### 5.1. `POST /slots/assign` — Slot Reservation

**Trigger:** Setiap kali owner buat klinik baru, staff baru, atau doctor baru di Domain 2.

**Request:**

```http
POST /api/internal/v1/slots/assign
Headers:
  X-Webhook-Signature: sha256=<HMAC>
  X-Webhook-Timestamp: 1717200300
  X-Idempotency-Key: evt_d2_slotassign_<unix_ms>_<rnd>
  Content-Type: application/json

Body:
{
  "external_subscription_id": "sub_abc123",
  "resource_type": "CLINIC",          // atau "USER"
  "ref_id": 3,                        // ID lokal di Domain 2 (clinic_id / user_id)
  "ref_type": "clinic",               // "clinic" | "staff" | "doctor"
  "assigned_at": "2026-05-25T10:00:00Z"
}
```

**Response 200 — Slot tersedia, sukses recorded:**

```json
{
  "success": true,
  "data": {
    "slot_id": 42,
    "quota_remaining": 1
  }
}
```

**Response 409 — Quota habis:**

Domain 2 akan ROLLBACK transaction create resource. Owner dapat error "Quota klinik habis, upgrade tier".

```json
{
  "success": false,
  "error_code": "QUOTA_EXCEEDED",
  "message": "Quota CLINIC habis. Owner harus upgrade tier atau beli addon.",
  "data": {
    "resource_type": "CLINIC",
    "max_quota": 3,
    "used_quota": 3
  }
}
```

**Response 404 — Subscription tidak ditemukan:**

```json
{
  "success": false,
  "error_code": "SUBSCRIPTION_NOT_FOUND",
  "message": "Subscription dengan external_subscription_id tidak ditemukan"
}
```

**⚠️ ATOMICITY WAJIB:**

Endpoint ini bisa di-call concurrent (mis. 2 owner aktif bersamaan). WAJIB pakai DB transaction + locking:

```typescript
// PostgreSQL contoh
await db.transaction(async (tx) => {
  // Lock baris quota supaya tidak ada race condition
  const quota = await tx.query(
    `SELECT * FROM subscription_quotas
     WHERE subscription_id = $1 AND resource_type = $2
     FOR UPDATE`,  // ← LOCK
    [subscriptionId, "CLINIC"]
  );

  if (quota.used_quota >= quota.max_quota) {
    throw new QuotaExceededError(); // → return 409
  }

  await tx.query(
    `UPDATE subscription_quotas SET used_quota = used_quota + 1
     WHERE id = $1`,
    [quota.id]
  );

  await tx.query(
    `INSERT INTO addon_slot_map (subscription_id, resource_type, ref_id, ref_type)
     VALUES ($1, $2, $3, $4)`,
    [subscriptionId, "CLINIC", refId, refType]
  );
});
```

---

### 5.2. `POST /slots/release` — Slot Release

**Trigger:** Saat owner delete klinik/staff/doctor di Domain 2.

**Request:**

```http
POST /api/internal/v1/slots/release
Body:
{
  "external_subscription_id": "sub_abc123",
  "resource_type": "CLINIC",
  "ref_id": 3
}
```

**Response 200 — Sukses release:**

```json
{ "success": true, "data": { "quota_remaining": 2 } }
```

**Response 200 — Slot tidak ada (idempotent OK, JANGAN return error):**

```json
{
  "success": true,
  "data": {
    "quota_remaining": 1,
    "note": "already released or never existed"
  }
}
```

**Catatan:** Idempotent — kalau slot sudah pernah di-release (atau memang tidak pernah ada), tetap return 200. Domain 2 mungkin retry, dan kita tidak mau gagal di delete flow.

---

### 5.3. `GET /subscriptions/by-company/:external_subscription_id` — Snapshot

**Trigger:**
- Domain 2 startup boot (re-sync data hilang).
- Daily reconciliation cron Domain 2 (jam 02:00 WIB).
- Manual force-sync via admin.

**Request:**

```http
GET /api/internal/v1/subscriptions/by-company/sub_abc123
Headers:
  X-Webhook-Signature: sha256=<HMAC of empty string>
  X-Webhook-Timestamp: 1717200300
```

**Response 200:**

Return payload **sama persis dengan event `subscription.sync`** di Section 4 — Domain 2 akan apply sebagai full overwrite.

```json
{
  "success": true,
  "data": {
    "event": "subscription.sync",
    "timestamp": "2026-05-25T02:00:00Z",
    "data": {
      "company_id": 1,
      "external_subscription_id": "sub_abc123",
      "subscription_update": {
        "tier": "business",
        "status": "active",
        "max_clinics": 2,
        "max_users_per_clinic": 5,
        "features": ["dashboard_clinic", "..."],
        "addons": {},
        "billing_start": "2026-01-01",
        "billing_end": "2026-12-31",
        "trial_end": null
      }
    }
  }
}
```

**Response 404 — Subscription tidak ditemukan.**

---

### 5.4. `POST /billing/renewal-url` — Generate Renewal URL

**Trigger:** Saat user di Domain 2 klik tombol "Perpanjang" di banner expired.

**Request:**

```http
POST /api/internal/v1/billing/renewal-url
Body:
{
  "external_subscription_id": "sub_abc123",
  "return_url": "https://app.idental.com/dashboard"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "renewal_url": "https://idental.subs.com/checkout?token=xyz789&return=https%3A%2F%2Fapp.idental.com%2Fdashboard",
    "expires_at": "2026-05-25T10:30:00Z"
  }
}
```

**Catatan:**
- `renewal_url` HARUS one-time / short-lived (30 menit cukup). Owner akan langsung di-redirect.
- `return_url` adalah URL yang user balik ke Domain 2 setelah perpanjangan selesai. WAJIB validate domainnya (allowlist) supaya tidak open redirect.

---

### Ringkasan 4 Endpoint

| # | Method | Path                                            | Atomicity     | Purpose                       |
| - | ------ | ----------------------------------------------- | ------------- | ----------------------------- |
| 1 | POST   | `/api/internal/v1/slots/assign`                 | ✅ WAJIB transactional + lock | Reserve slot (clinic/user)    |
| 2 | POST   | `/api/internal/v1/slots/release`                | Idempotent    | Release slot                  |
| 3 | GET    | `/api/internal/v1/subscriptions/by-company/:id` | Read-only     | Snapshot subscription state   |
| 4 | POST   | `/api/internal/v1/billing/renewal-url`          | Read-only     | Generate checkout link        |

Plus webhook outbound (9 event di Section 4) yang di PUSH ke Domain 2.

---

## 6. REST Endpoints Domain 2 — yang Domain 1 Boleh Consume

Sebagai referensi — 2 endpoint Domain 2 yang boleh hit jika butuh:

### 6.1. Verify subscription state

```
GET https://app.idental.com/api/internal/subscriptions/:company_id
```

Cek state snapshot subscription di Domain 2 (untuk debug / reconciliation).

### 6.2. List current slot usage

```
GET https://app.idental.com/api/internal/subscriptions/:company_id/slots
```

Dapat list semua klinik/staff/doctor aktif di Domain 2 + status mereka. Berguna untuk decision support di Domain 1 (mis. tentukan klinik mana yang di-deactivate saat addon expired, jika `addon_slot_map` tidak lengkap karena slot belum pernah di-assign explicit).

Format response sama dengan Section 4 envelope. Sign request dengan HMAC.

---

## 7. Expiry & Grace Period — Flow Lengkap

### Timeline per Subscription / Addon

```
──────────────────────────────────────────────────────────────────────────
│ ACTIVE          │ GRACE PERIOD        │ EXPIRED (enforced)           │
│                 │ (7 hari)            │                              │
├─────────────────┼─────────────────────┼──────────────────────────────┤
│ billing_end     │ billing_end + 1d    │ billing_end + 7 hari         │
│ Semua fitur     │                     │ (grace habis)                │
│ berjalan normal │                     │                              │
│                 │ Domain 1 kirim:     │ Domain 1 kirim:              │
│                 │  • Email H-7        │  • Webhook ke Domain 2       │
│                 │  • Email H-3        │    "enforce expiry"          │
│                 │  • Email H-1        │                              │
│                 │  • Banner FE        │ Domain 2 eksekusi:           │
│                 │                     │  • Soft-block klinik/user    │
│                 │ Domain 2:           │  • Update company_subs       │
│                 │  TIDAK ADA aksi     │  • Catat audit_logs          │
│                 │  (masih normal)     │                              │
│                 │                     │  Data TETAP tersimpan.       │
──────────────────────────────────────────────────────────────────────────
```

### Notifikasi Email yang dikirim

| Timing | Subjek (contoh)                                                                     |
| ------ | ----------------------------------------------------------------------------------- |
| H-7    | "Addon +1 Klinik Anda akan berakhir dalam 7 hari. Perpanjang sekarang."             |
| H-3    | "Addon +1 Klinik berakhir 3 hari lagi. Klinik [Cabang Barat] akan dinonaktifkan."   |
| H-1    | "PERINGATAN: Addon +1 Klinik berakhir BESOK. Perpanjang sekarang."                  |
| H+1    | "Grace period dimulai. Anda punya 7 hari untuk perpanjang."                         |
| H+7    | "Grace period habis. Klinik [Cabang Barat] dinonaktifkan. Beli addon untuk aktifkan kembali." |

Domain 2 TIDAK kirim email apa pun terkait subscription — semua dari Domain 1.

### Lima Skenario Expiry

#### Skenario A — Addon CLINIC expired

```
KONDISI: dr. Budi punya 2 klinik base + 1 klinik dari addon "+1 Klinik".
         Addon expired, grace habis.

Domain 1 hitung:
  - Dari sku_addons: resource_type=CLINIC, quota_value=1
  - subscription_quotas: max_quota: 3 → 2, used_quota: 3 (over-quota 1)
  - addon_slot_map: ref_id=3 (clinic_id 3 yang pakai slot addon)

Webhook ke Domain 2:
  {
    "event": "addon.expired",
    "data": {
      "company_id": 1,
      "external_subscription_id": "sub_100",
      "subscription_update": {
        "max_clinics": 2,        ← turun
        "addons": {},
        "billing_end": "2026-12-31"  ← base masih aktif
      },
      "enforcement": {
        "type": "deactivate_clinics",
        "reason": "addon_clinic_expired",
        "clinic_ids": [3],
        "message_id": "addon_clinic_expired"
      }
    }
  }

Domain 2 eksekusi:
  1. UPDATE company_subscriptions SET max_clinics=2, addons={}
  2. UPDATE clinics SET status='INACTIVE', deactivated_reason='addon_clinic_expired'
     WHERE id=3
  3. INSERT audit_logs
  4. Invalidate Redis cache
```

#### Skenario B — Addon USER expired

```
KONDISI: dr. Budi punya addon "+5 User", quota 12, used 11.
         Addon expired.

Domain 1 hitung:
  - max_quota turun 12 → 7, used 11, over-quota 4 user
  - Dari addon_slot_map: user_ids yang pakai slot addon = [15, 14, 13, 12]
    (LIFO: terakhir ditambah = pertama disuspend)
  - Resolusi mana yg staff vs doctor: cek addon_slot_map.ref_type
    - 15 = staff, 14 = staff, 13 = doctor, 12 = doctor

Webhook ke Domain 2:
  {
    "event": "addon.expired",
    "data": {
      "subscription_update": { "max_users_per_clinic": 7, "addons": {} },
      "enforcement": {
        "type": "suspend_users",
        "reason": "addon_user_expired",
        "staff_ids": [15, 14],
        "doctor_ids": [13, 12],
        "message_id": "addon_user_expired"
      }
    }
  }

Domain 2 eksekusi:
  1. Resolve user_id untuk staff_ids dan doctor_ids
  2. UPDATE users SET status='SUSPENDED', suspended_reason='addon_user_expired'
  3. INSERT audit_logs (1 row per user)
```

#### Skenario C — Base subscription expired

```
KONDISI: Subscription utama expired, grace habis.

Webhook:
  {
    "event": "subscription.expired",
    "data": {
      "subscription_update": {
        "status": "expired",
        "max_clinics": 0,
        "max_users_per_clinic": 0,
        "features": [],
        "addons": {}
      },
      "enforcement": {
        "type": "full_lockout",
        "reason": "subscription_expired",
        "message_id": "subscription_expired"
      }
    }
  }

Domain 2 eksekusi:
  1. UPDATE company_subscriptions SET status='expired', max_clinics=0, ...
  2. UPDATE clinics SET status='INACTIVE', deactivated_reason='subscription_expired'
     WHERE company_id=1
  3. Owner tetap bisa login workspace COMPANY (read-only) untuk perpanjang
  4. Staff/Doctor TIDAK bisa login (clinic INACTIVE)
```

#### Skenario D — Downgrade tier

```
KONDISI: Owner downgrade Enterprise → Business di billing cycle baru.

Webhook:
  {
    "event": "subscription.downgraded",
    "data": {
      "subscription_update": {
        "tier": "business",
        "max_users_per_clinic": 10,
        "features": [
          "dashboard_clinic", "scheduling_calendar", "report_sales",
          "commission_calculation"
          // "report_consolidated_all", "payment_backdate" HILANG
        ]
      },
      "enforcement": {
        "type": "feature_downgrade",
        "reason": "tier_downgraded",
        "removed_features": ["report_consolidated_all", "payment_backdate"],
        "message_id": "tier_downgraded"
      }
    }
  }

Domain 2 eksekusi:
  - UPDATE company_subscriptions
  - Audit log
  - Tidak deactivate klinik/user (quota tidak berubah di contoh ini)
  - Jika max_users turun & over-quota, Domain 1 kirim juga enforcement
    `suspend_users` di webhook yang SAMA (pisah event tetap satu webhook delivery).
```

#### Skenario E — Addon FEATURE expired

```
KONDISI: Addon "WA Blast" expired, grace habis.

Webhook:
  {
    "event": "addon.expired",
    "data": {
      "subscription_update": {
        "features": [...]  // tanpa "marketing_wa_blast"
      },
      "enforcement": {
        "type": "feature_removal",
        "reason": "addon_feature_expired",
        "removed_features": ["marketing_wa_blast"],
        "message_id": "addon_feature_expired"
      }
    }
  }

Domain 2 eksekusi:
  - UPDATE features array
  - Audit log
  - Endpoint yang gate "marketing_wa_blast" return 403
  - Riwayat blast yang sudah dikirim TETAP ADA
```

---

## 8. Edge Cases yang Wajib Dihandle

Berikut hal-hal yang **sering terlupakan** tapi penting saat build Domain 1:

### 8.1. Race Condition — Enforcement vs Reactivate

**Skenario:** Webhook `addon.expired` sedang diproses Domain 2 (update 50 klinik), tiba-tiba owner perpanjang → kirim `addon.renewed`.

**Yang harus dilakukan:**
- Setiap webhook punya `timestamp` (di body). Domain 2 reject event yang `timestamp` lebih lama dari event terakhir untuk company yang sama.
- Atau lebih aman: Domain 1 JANGAN kirim `addon.renewed` jika ada webhook in-flight untuk company yang sama. Track via internal "outbox" pattern.

### 8.2. Grace Period Cancel (Owner perpanjang DI TENGAH grace)

**Skenario:** Hari ke-3 grace period, owner perpanjang.

**Yang harus dilakukan:**
- Update `addon_subscriptions.status = 'active'`, billing_end mundur.
- JANGAN kirim webhook `addon.expired` ke Domain 2 (karena grace dibatalkan sebelum enforce).
- Kirim email konfirmasi ke owner.
- Tidak perlu webhook ke Domain 2 sama sekali — karena Domain 2 tidak pernah tahu ada grace period (Domain 1 yang manage timer).

### 8.3. Webhook Lost (Domain 2 down saat enforce)

**Skenario:** Domain 2 down 6 jam setelah kirim `addon.expired`.

**Yang harus dilakukan:**
- Retry policy (Section 9): 1m, 5m, 30m, 2h, 12h.
- Setelah 6x gagal → mark webhook FAILED di DB, kirim alert ke admin Domain 1.
- Domain 2 akan self-heal via daily reconciliation cron (jam 02:00 WIB) yang call `GET /subscriptions/by-company/:id`.

### 8.4. Trial Expired

**Skenario:** Company baru trial 14 hari, tidak perpanjang.

**Yang harus dilakukan:**
- Trigger sama dengan `subscription.expired`.
- Tapi tambah field di payload: `"data": { ..., "context": "trial_ended" }` supaya Domain 2 bisa pakai message_id berbeda untuk FE ("Masa trial berakhir" vs "Subscription berakhir").

### 8.5. Payment Failed Mid-Cycle

**Skenario:** Auto-renewal payment gagal 5 hari sebelum billing_end.

**Yang harus dilakukan:**
- Retry payment internal di Domain 1 (3x retry).
- Jika tetap gagal → kirim email warning ke owner, MASUK grace period lebih awal.
- Domain 2 TIDAK perlu tahu detail — tinggal terima `subscription.expired` atau `subscription.renewed` di akhir flow.
- (Opsional MVP+): Kirim event `subscription.payment_warning` (advisory) supaya Domain 2 bisa tampilkan banner di FE. Skip untuk MVP.

### 8.6. Multiple Addon Expired Bersamaan

**Skenario:** Owner punya 2 addon CLINIC + 1 addon USER, semua expired sekaligus.

**Yang harus dilakukan:**
- Kirim **SATU webhook** dengan multiple enforcement, ATAU
- Kirim **beberapa webhook terpisah** (lebih sederhana, lebih atomic per addon).
- Rekomendasi: **terpisah per addon** — lebih mudah retry dan audit.

### 8.7. Slot Assignment Race Saat Quota Habis

**Skenario:** Owner buat 2 klinik bersamaan via 2 tab browser, quota tinggal 1.

**Yang harus dilakukan:**
- `POST /slots/assign` WAJIB transactional dengan `SELECT FOR UPDATE` (Section 5.1).
- Salah satu request akan 200 + quota habis, yang lain dapat 409.
- Domain 2 yang dapat 409 akan rollback create klinik → owner dapat error message.

### 8.8. Cancellation Mid-Cycle

**Skenario:** Owner cancel subscription tengah-tengah billing cycle (mis. masih ada 6 bulan).

**Pertimbangan bisnis:**
- Refund prorated? → Domain 1 keputusan.
- Akses sampai billing_end? → **YA, default**.
- Atau immediate lockout? → opsional.

**Yang harus dilakukan:**
- Default: TUNGGU sampai billing_end, lalu kirim `subscription.expired` seperti biasa.
- Jika immediate: kirim `subscription.cancelled` dengan `enforcement.type='full_lockout'`.

---

## 9. Error, Retry & Idempotency

### Idempotency

**Setiap request HARUS punya `X-Idempotency-Key`** yang unique. Domain 2 simpan di tabel `subscription_sync_logs.idempotency_key` dengan UNIQUE constraint.

**Format key yang direkomendasikan:**

```
<source>_<event_type>_<unix_ms>_<random6>

Contoh:
  d1_addon_expired_1717200300000_a3f5c2
  d1_sub_created_1717200400000_b8e1f4
```

Saat retry, pakai key yang **SAMA**. Domain 2 cek key di DB → kalau sudah ada → return 200 dengan `status: "already_processed"`. Anggap success.

### Retry Policy

```
Attempt 1: immediate
Attempt 2: after 1 minute
Attempt 3: after 5 minutes
Attempt 4: after 30 minutes
Attempt 5: after 2 hours
Attempt 6: after 12 hours
After 6x failed → mark FAILED, alert admin Domain 1
```

Pakai exponential backoff dengan jitter (random ±10%) supaya tidak thundering herd jika Domain 2 sedang recovery.

### Storage Idempotency

HARUS simpan setiap outgoing event di DB :

```sql
CREATE TABLE webhook_outbox (
  id BIGSERIAL PRIMARY KEY,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  company_id INTEGER NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending|sent|failed
  attempts INTEGER DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Worker process scan baris dengan `status='pending' AND next_attempt_at <= NOW()` setiap 30 detik, kirim webhook, update status.

### Status Code Decision Tree

```
Domain 2 response → Aksi
─────────────────────────────
200                 → done, update status='sent'
401 / 422           → FATAL (config salah), status='failed', alert
429                 → retry dengan delay 2x lipat normal
5xx / timeout       → retry sesuai schedule
```

---

## 10. Enum Constants — Harus Match Persis

Berikut nilai-nilai enum yang **HARUS sama persis** antara Domain 1 dan Domain 2. Salah satu huruf beda = reject.

```typescript
// Tier
export const TIERS = ["basic", "business", "enterprise"] as const;

// Status di company_subscriptions
export const SUBSCRIPTION_STATUS = [
  "active", "trial", "expired", "suspended", "cancelled"
] as const;

// enforcement.type
export const ENFORCEMENT_TYPES = [
  "deactivate_clinics",
  "suspend_users",
  "full_lockout",
  "feature_removal",
  "feature_downgrade",
  "feature_upgrade",
  "reactivate_clinics",
  "reactivate_users",
  "full_reactivation",
  "feature_restoration",
] as const;

// resource_type (di slot assign/release)
export const RESOURCE_TYPES = ["CLINIC", "USER"] as const;

// ref_type (di slot assign)
export const REF_TYPES = ["clinic", "staff", "doctor"] as const;

// enforcement.reason — convention snake_case (untuk audit log)
export const REASONS = [
  "addon_clinic_expired",
  "addon_user_expired",
  "addon_feature_expired",
  "subscription_expired",
  "subscription_cancelled",
  "tier_downgraded",
  "addon_clinic_renewed",
  "addon_user_renewed",
  "subscription_renewed",
  "tier_upgraded",
] as const;

// enforcement.message_id — i18n key (Domain 2 translate ke Bahasa Indonesia)
export const MESSAGE_IDS = [
  "addon_clinic_expired",
  "addon_user_expired",
  "addon_feature_expired",
  "subscription_expired",
  "subscription_cancelled",
  "tier_downgraded",
  "reactivated",
  "manual_deactivation",
] as const;
```

### Feature Keys

Daftar `feature_key` mapping ke tier — **Domain 1 tidak perlu hard-code seluruh daftar**. Cukup pass-through dari config SKU/bundle. Domain 2 punya tabel `subscription_features` sebagai source of truth.

Contoh:

```typescript
// Basic tier
"dashboard_clinic", "satusehat", "scheduling_calendar", "payment_cash",
"medical_record_*", "user_doctor_internal", "marketing_point", ...

// Business tier
"dashboard_company", "dashboard_marketing", "scheduling_confirmation",
"payment_medicine", "payment_voucher", "report_sales", "commission_*",
"marketing_promo", "marketing_voucher", "marketing_package", ...

// Enterprise tier
"dashboard_insurance_company", "payment_backdate", "report_consolidated_all"
```

Total ~50 feature keys. Daftar lengkap ada di Domain 2 (request ke tim untuk dapat daftar finalnya — atau lihat langsung tabel `subscription_features` di DB Domain 2).

---

## 11. Mock Strategy & Handshake Test

### Saat Domain 2 Development

Domain 2 punya `MOCK_DOMAIN1=true` env flag — semua call ke Domain 1 di-mock dengan canned response. Jangan khawatir kalau ada test data di Domain 2 saat mulai integrasi.

### Saat Domain 1 Development

Butuh mock Domain 2 untuk test webhook outbound. 2 opsi:

**Opsi 1 — webhook.site (paling cepat):**

1. Buka https://webhook.site → dapat unique URL.
2. Set di Domain 1: `DOMAIN2_BASE_URL=https://webhook.site/<your-id>`
3. Kirim webhook → lihat payload di dashboard webhook.site.
4. Verify signature manual (copy payload, sign sendiri, compare).

**Opsi 2 — Mini Express receiver (untuk verify signature otomatis):**

```typescript
// scripts/mock-domain2.ts
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.raw({ type: "application/json" }));

app.post("/api/internal/webhook/subscription-change", (req, res) => {
  const sig = req.headers["x-webhook-signature"];
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.WEBHOOK_SHARED_SECRET!)
    .update(req.body).digest("hex");

  console.log("Received:", req.headers["x-webhook-event"]);
  console.log("Signature OK:", sig === expected);
  console.log("Payload:", JSON.parse(req.body.toString()));

  res.json({
    success: true,
    data: {
      status: "processed",
      event: req.headers["x-webhook-event"],
      sync_log_id: Math.floor(Math.random() * 1000),
    },
  });
});

app.listen(4000, () => console.log("Mock Domain 2 listening on :4000"));
```

### Handshake Test — 5 Step Pertama Saat Integrasi

Saat Domain 1 dan Domain 2 sudah siap masing-masing, run handshake test ini untuk verify integrasi end-to-end. Bisa di staging env atau dev.

```
STEP 1 — Sync Shared Secret
  • Generate WEBHOOK_SHARED_SECRET, set di kedua .env
  • Restart kedua domain

STEP 2 — Subscription Created
  • Kirim subscription.created webhook ke Domain 2:
    POST /api/internal/webhook/subscription-change
    body: { event: "subscription.created", data: { company_id: 1,
            external_subscription_id: "sub_test_001",
            subscription_update: { tier: "enterprise", status: "active",
              max_clinics: 5, max_users_per_clinic: 20,
              features: [<all feature keys>], billing_end: "2027-01-01" }}}
  • EXPECT: 200 OK + sync_log_id
  • VERIFY di Domain 2: SELECT * FROM company_subscriptions WHERE company_id=1
    → row exists, status='active', tier='enterprise'

STEP 3 — Slot Assign
  • Owner di Domain 2 buat klinik baru via UI / API
  • Domain 2 akan call : POST /api/internal/v1/slots/assign
  • EXPECT di : 200 + quota_remaining
  • VERIFY di DB : subscription_quotas.used_quota += 1,
    addon_slot_map row baru dengan ref_id=<id_clinic_baru>

STEP 4 — Addon Expired Enforcement
  • Kirim addon.expired ke Domain 2:
    enforcement: { type: "deactivate_clinics", clinic_ids: [<id_clinic_baru>] }
  • EXPECT: 200 OK
  • VERIFY di Domain 2: clinics.status='INACTIVE', deactivated_reason='addon_clinic_expired'
  • Login user yang punya akses klinik tersebut → expect 403 dengan pesan jelas

STEP 5 — Addon Renewed Reactivation
  • Kirim addon.renewed:
    enforcement: { type: "reactivate_clinics", clinic_ids: [<id_clinic>] }
  • EXPECT: 200 OK
  • VERIFY di Domain 2: clinics.status='ACTIVE', deactivated_reason=NULL
  • User bisa login ke klinik lagi
```

Jika 5 step di atas PASS → integrasi handshake OK. Wire ke production flow.