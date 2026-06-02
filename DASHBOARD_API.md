# Dashboard API Documentation

This document summarizes the available Dashboard API endpoints that can be integrated into external websites or frontends.

All endpoints are protected and require a valid Bearer token in the `Authorization` header.

---

## 1. Admin Dashboard APIs

These endpoints require the `ADMIN` role. They provide a bird's-eye view of the entire platform's health, financial metrics, and user base.

### 1.1. Get Full Admin Dashboard
**Endpoint:** `GET /api/v1/subscription/dashboard`

**Description:** Returns the full dashboard data including the summaries above, plus lists of recent subscriptions and recent coin orders.

**Response Structure (200 OK):**
```json
{
  "success": true,
  "data": {
    "user_stats": { ... },
    "subscription_stats": { ... },
    "revenue_stats": { ... },
    "plan_distribution": [ ... ],
    "plan_switch_summary": { ... },
    "recent_subscriptions": [
      {
        "id": 1,
        "user_name": "Dr. John Doe",
        "user_email": "john@clinic.com",
        "plan_name": "Pro",
        "plan_tier": "TIER_1",
        "status": "ACTIVE",
        "created_at": "2026-06-01T00:00:00Z"
      }
    ],
    "recent_coin_orders": [
      {
        "id": 101,
        "user_name": "Dr. Jane Smith",
        "user_email": "jane@clinic.com",
        "coin_amount": 1000,
        "price_paid": 500000,
        "tax_amount": 50000,
        "status": "PAID",
        "created_at": "2026-06-01T00:00:00Z"
      }
    ]
  }
}
```

---

## 2. Client Dashboard APIs

These endpoints require the `OWNER` role. They provide an overview of a specific user's account, subscription status, wallet balance, and usage.

### 2.1. Get Client Dashboard
**Endpoint:** `GET /api/v1/client/dashboard`

**Description:** Returns a unified view of the authenticated user's profile, active subscription, wallet balance, and recent activities.

**Response Structure (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Dr. John Doe",
      "email": "john@clinic.com"
      // Profile details
    },
    "subscription": {
      "id": 10,
      "status": "ACTIVE",
      "plan": "Pro",
      "next_billing_date": "2026-07-01T00:00:00Z"
    },
    "wallet": {
      "balance": 1500,
      "currency": "IDR"
    },
    "recentTransactions": [
      // 5 most recent coin transactions
    ],
    "recentOrders": [
      // 5 most recent orders
    ],
    "recentBillingCycles": [
      // 5 most recent billing cycles
    ]
  }
}
```
