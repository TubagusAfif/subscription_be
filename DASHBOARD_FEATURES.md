# Dashboard Features Summary

Based on the system architecture, database schema, and product specifications, here is a detailed list of features that can be shown on the **Client** and **Admin** dashboards.

---

## 1. Client Dashboard (End-User / Clinic Owner)

The Client Dashboard is intended for users who subscribe to the platform (typically Clinic Owners). It provides an overview of their account, subscription status, wallet balance, and usage.

### **Account & Profile Summary**
*   **Profile Overview**: Display user's name, email, clinic name, timezone, and basic contact info.
*   **Payment Methods**: List of saved payment methods (e.g., credit cards) and the default method.

### **Subscription & Usage**
*   **Active Subscription**: 
    *   Current plan name (e.g., Basic, Pro, Enterprise) and type.
    *   Subscription status (Active, On Hold, Cancelled).
    *   Next billing date and auto-renewal status.
*   **Usage Quotas**: 
    *   Visual indicators (progress bars) for limits based on the active plan (e.g., total clinics allowed vs. used, total operational users allowed vs. used).
*   **Add-ons**: List of currently active add-ons (e.g., extra clinics, extra users) attached to the main subscription.
*   **Plan Management Actions**: Quick links to Upgrade, Downgrade, or Cancel the current subscription.

### **Wallet & Billing**
*   **Coin Wallet Balance**: Current available balance in "Coins" (the platform's internal currency).
*   **Recent Transactions**: A mini-ledger of recent wallet activities (Top-ups and Spends).
*   **Billing History**: Recent orders, invoices, and billing cycle statuses (Pending, Paid, Failed).
*   **Top-up Actions**: Quick access to purchase more Coin Bundles.

---

## 2. Admin Dashboard (System Administrator)

The Admin Dashboard provides a bird's-eye view of the entire platform's health, financial metrics, and user base, allowing administrators to manage the system effectively.

### **High-Level Metrics & KPIs**
*   **Revenue & Financials**: 
    *   Total system revenue or MRR (Monthly Recurring Revenue).
    *   Total coins purchased vs. total coins spent.
*   **User & Subscription Stats**: 
    *   Total registered users.
    *   Number of active, expired, and cancelled subscriptions.
    *   Recent plan switches (Upgrades vs. Downgrades).

### **User Management Overview**
*   **Recent Signups**: A quick list of newly registered users or clinic owners.
*   **User Search & Filter**: Ability to find users by email or status quickly.
*   **Wallet Overviews**: Insight into which users have high or low coin balances.

### **SKU & Plan Monitoring**
*   **Active Packages & Add-ons**: Summary of all available plans (Basic, Lite, Medium, Pro, Enterprise) and their current coin costs.
*   **Popular Plans**: Metrics showing which plans or add-ons have the most active subscriptions.

### **Financial & System Operations**
*   **Recent Orders & Payments**: Live feed of recent coin orders, subscription renewals, and their statuses (Pending, Paid, Failed).
*   **Currency & Rates**: Current active currencies (e.g., IDR, USD) and their conversion rates.
*   **Tax Configurations**: Active tax rates applied to purchases based on regions.

### **Content Management**
*   **Dental Ads**: Summary of active promotional banners or dental ads currently running on the platform.
