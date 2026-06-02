# Dashboard Router Documentation

This document describes the dashboard routing architecture for both the `client` and `subscription` (admin) modules.

## Client Dashboard Router

**Location:** `src/client/routes/dashboard.routes.ts`

The client dashboard provides an overview of a user's profile, active subscription, coin wallet balance, and recent activities.

### Endpoints

- **`GET /api/v1/client/dashboard`**
  - **Description:** Retrieves the client dashboard summary.
  - **Middleware:** 
    - `authenticate`: Verifies the JWT token.
    - `authorize(['OWNER'])`: Restricts access to users with the `OWNER` role.
  - **Controller:** `ClientDashboardController.getDashboard`
  - **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "profile": {
          "name": "string",
          "email": "string",
          "phone": "string",
          "clinic_name": "string | null",
          "photo_url": "string | null",
          "city": "string | null",
          "province": "string | null",
          "country": "string | null"
        },
        "active_subscription": {
          "id": "number",
          "status": "string",
          "auto_renew": "boolean",
          "current_billing_start": "Date",
          "current_billing_end": "Date",
          "next_billing_date": "Date | null",
          "plan": {
            "id": "number",
            "sku_name": "string",
            "sku_code": "string",
            "package_tier": "string | null",
            "coin_cost": "number",
            "billing_duration_days": "number | null"
          },
          "quotas": [
            {
              "id": "number",
              "resource_type": "string",
              "total_quota": "number",
              "used_quota": "number",
              "available_quota": "number"
            }
          ],
          "active_addons": [
            {
              "id": "number",
              "status": "string",
              "current_billing_start": "Date",
              "current_billing_end": "Date",
              "sku": {
                "id": "number",
                "sku_name": "string",
                "sku_code": "string",
                "coin_cost": "number"
              }
            }
          ]
        },
        "wallet": {
          "id": "number",
          "balance": "number",
          "last_updated": "Date",
          "currency": {
            "id": "number",
            "currency_name": "string",
            "currency_code": "string",
            "symbol": "string"
          }
        },
        "recent_transactions": [
          {
            "id": "number",
            "type": "string",
            "amount": "number",
            "description": "string | null",
            "created_at": "Date"
          }
        ],
        "recent_orders": [
          {
            "id": "number",
            "order_number": "string",
            "coin_amount": "number",
            "status": "string",
            "created_at": "Date",
            "sku": {
              "id": "number",
              "sku_name": "string",
              "sku_code": "string",
              "sku_type": "string",
              "package_tier": "string | null"
            }
          }
        ],
        "billing": {
          "next_billing_date": "Date | null",
          "recent_cycles": [
            {
              "id": "number",
              "cycle_start": "Date",
              "cycle_end": "Date",
              "status": "string",
              "created_at": "Date"
            }
          ]
        }
      }
    }
    ```

## Subscription (Admin) Dashboard Router

**Location:** `src/subscription/routes/dashboard.routes.ts`

The subscription dashboard provides system-wide statistics, revenue metrics, and recent activities across all users.

### Endpoints

- **`GET /api/v1/subscription/dashboard`**
  - **Description:** Retrieves the admin dashboard summary.
  - **Middleware:**
    - `authenticate`: Verifies the JWT token.
    - `authorize(['ADMIN'])`: Restricts access to users with the `ADMIN` role.
  - **Controller:** `AdminDashboardController.getDashboard`
  - **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "user_stats": {
          "total_users": "number",
          "active_users": "number",
          "new_users_this_month": "number"
        },
        "subscription_stats": {
          "total_subscriptions": "number",
          "active_subscriptions": "number",
          "cancelled_subscriptions": "number",
          "expired_subscriptions": "number"
        },
        "revenue_stats": {
          "total_coins_purchased": "number",
          "total_coins_spent": "number",
          "total_coin_orders": "number",
          "paid_coin_orders": "number"
        },
        "plan_distribution": [
          {
            "plan_name": "string",
            "plan_tier": "string | null",
            "active_count": "number"
          }
        ],
        "recent_subscriptions": [
          {
            "id": "number",
            "user_name": "string",
            "user_email": "string",
            "plan_name": "string",
            "plan_tier": "string | null",
            "status": "string",
            "created_at": "Date"
          }
        ],
        "recent_coin_orders": [
          {
            "id": "number",
            "user_name": "string",
            "user_email": "string",
            "coin_amount": "number",
            "price_paid": "number",
            "tax_amount": "number",
            "status": "string",
            "created_at": "Date"
          }
        ],
        "plan_switch_summary": {
          "total_switches": "number",
          "upgrades": "number",
          "downgrades": "number",
          "crossgrades": "number"
        }
      }
    }
    ```
