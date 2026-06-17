import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const spec = {
  "openapi": "3.0.3",
  "info": {
    "title": "Subscription Admin API Docs",
    "version": "1.0.0",
    "description": "Full REST API for the clinic subscription platform. Covers client auth, coin wallet, subscriptions, clinic management, operational users and the subscription-admin domain."
  },
  "servers": [
    {
      "url": "/api/v1",
      "description": "Local dev server"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    },
    "schemas": {
      "LoginRequest": {
        "type": "object",
        "required": [
          "email",
          "password"
        ],
        "properties": {
          "email": {
            "type": "string",
            "format": "email",
            "example": "admin@admin.com"
          },
          "password": {
            "type": "string",
            "example": "secret123"
          }
        }
      },
      "ProviderCreateRequest": {
        "type": "object",
        "required": ["provider_name"],
        "properties": {
          "provider_name": { "type": "string" },
          "description": { "type": "string", "nullable": true }
        }
      },
      "DentalAd": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "category": { "type": "string" },
          "image_path": { "type": "string" },
          "created_at": { "type": "string", "format": "date-time" },
          "updated_at": { "type": "string", "format": "date-time" }
        }
      },
      "CreateDentalAdRequest": {
        "type": "object",
        "required": ["name", "category", "image_path"],
        "properties": {
          "name": { "type": "string" },
          "category": { "type": "string" },
          "image_path": { "type": "string" }
        }
      },
      "RefreshRequest": {
        "type": "object",
        "required": [
          "refreshToken"
        ],
        "properties": {
          "refreshToken": {
            "type": "string",
            "example": "eyJhbGci..."
          }
        }
      },
      "CreatePlanRequest": {
        "type": "object",
        "required": [
          "sku_name",
          "sku_code",
          "sku_type",
          "coin_cost"
        ],
        "properties": {
          "id": {
            "type": "integer",
            "nullable": true,
            "example": 1
          },
          "sku_name": {
            "type": "string",
            "example": "Pro Monthly"
          },
          "sku_code": {
            "type": "string",
            "example": "PRO-MONTHLY"
          },
          "sku_type": {
            "type": "string",
            "enum": [
              "PACKAGE",
              "ADDON"
            ],
            "example": "PACKAGE"
          },
          "package_tier": {
            "type": "string",
            "enum": [
              "BASIC",
              "LITE",
              "MEDIUM",
              "PRO",
              "ENTERPRISE"
            ],
            "nullable": true,
            "example": "PRO"
          },
          "rank": {
            "type": "integer",
            "default": 0,
            "example": 3
          },
          "billing_duration_days": {
            "type": "integer",
            "default": 30,
            "example": 30
          },
          "coin_cost": {
            "type": "number",
            "example": 5000
          },
          "is_active": {
            "type": "boolean",
            "default": true
          },
          "benefits": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer",
                  "nullable": true
                },
                "benefit_type": {
                  "type": "string",
                  "example": "storage_gb"
                },
                "benefit_value": {
                  "type": "string",
                  "nullable": true,
                  "example": "100"
                },
                "max_usage": {
                  "type": "integer",
                  "nullable": true,
                  "example": null
                }
              }
            }
          },
          "features": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer",
                  "nullable": true
                },
                "display_name": {
                  "type": "string",
                  "example": "EMR Access"
                },
                "feature": {
                  "type": "string",
                  "example": "emr_access"
                },
                "is_active": {
                  "type": "boolean",
                  "default": true
                }
              }
            }
          },
          "addons": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "integer",
                  "nullable": true
                },
                "resource_type": {
                  "type": "string",
                  "example": "clinic"
                },
                "display_name": {
                  "type": "string",
                  "example": "Extra Clinic Slot"
                },
                "quota_value": {
                  "type": "integer",
                  "example": 1
                },
                "description": {
                  "type": "string",
                  "nullable": true
                }
              }
            }
          },
          "removed": {
            "type": "object",
            "nullable": true,
            "properties": {
              "benefits": {
                "type": "array",
                "items": { "type": "integer" },
                "example": [ 12, 14 ]
              },
              "features": {
                "type": "array",
                "items": { "type": "integer" }
              },
              "addons": {
                "type": "array",
                "items": { "type": "integer" }
              }
            }
          }
        }
      },
      "CreateCurrencyRequest": {
        "type": "object",
        "required": [
          "currency_name",
          "currency_code",
          "symbol",
          "conversion_rate",
          "effective_from"
        ],
        "properties": {
          "currency_name": {
            "type": "string",
            "example": "Indonesian Rupiah"
          },
          "currency_code": {
            "type": "string",
            "length": 3,
            "example": "IDR"
          },
          "symbol": {
            "type": "string",
            "example": "Rp"
          },
          "conversion_rate": {
            "type": "number",
            "example": 15500
          },
          "is_active": {
            "type": "boolean",
            "default": true
          },
          "effective_from": {
            "type": "string",
            "format": "date-time",
            "example": "2025-01-01T00:00:00Z"
          },
          "effective_until": {
            "type": "string",
            "format": "date-time",
            "nullable": true,
            "example": null
          }
        }
      },
      "CreateBundleRequest": {
        "type": "object",
        "required": [
          "bundle_name",
          "coin_amount",
          "currency_id"
        ],
        "properties": {
          "bundle_name": {
            "type": "string",
            "example": "Starter Pack 500"
          },
          "coin_amount": {
            "type": "integer",
            "example": 500
          },
          "currency_id": {
            "type": "integer",
            "example": 1
          },

          "discounted_price": {
            "type": "number",
            "nullable": true,
            "example": 65000
          },
          "tax_rate": {
            "type": "number",
            "default": 0,
            "example": 11
          },
          "is_active": {
            "type": "boolean",
            "default": true
          }
        }
      },

      "CreateTaxRequest": {
        "type": "object",
        "required": [
          "tax_name",
          "rate_percent",
          "region"
        ],
        "properties": {
          "tax_name": {
            "type": "string",
            "example": "PPN"
          },
          "rate_percent": {
            "type": "number",
            "example": 11
          },
          "region": {
            "type": "string",
            "example": "ID"
          },
          "is_active": {
            "type": "boolean",
            "default": true
          }
        }
      },
      "UpdateAccountRequest": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "example": "Jane Doe"
          },
          "phone": {
            "type": "string",
            "example": "+62812345678"
          },
          "profile": {
            "type": "object",
            "properties": {
              "city": { "type": "string", "example": "Jakarta" },
              "country": { "type": "string", "example": "ID" },
              "clinic_name": { "type": "string", "example": "Klinik Sehat" }
            }
          }
        }
      },
      "ChangePasswordRequest": {
        "type": "object",
        "required": ["currentPassword", "newPassword"],
        "properties": {
          "currentPassword": {
            "type": "string",
            "example": "OldSecret123!"
          },
          "newPassword": {
            "type": "string",
            "example": "NewSecret123!"
          }
        }
      },
      "ErrorResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": false
          },
          "code": {
            "type": "string",
            "example": "BAD_REQUEST"
          },
          "message": {
            "type": "string",
            "example": "An error occurred"
          },
          "details": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "nullable": true
          }
        }
      }
    },
    "responses": {
      "Unauthorized": {
        "description": "Missing or invalid JWT",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            },
            "example": {
              "success": false,
              "code": "UNAUTHORIZED",
              "message": "Token is invalid or expired"
            }
          }
        }
      },
      "NotFound": {
        "description": "Resource not found",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            },
            "example": {
              "success": false,
              "code": "NOT_FOUND",
              "message": "Resource not found"
            }
          }
        }
      },
      "Forbidden": {
        "description": "Insufficient role",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ErrorResponse"
            }
          }
        }
      }
    }
  },
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "tags": [
    {
      "name": "Shared Auth",
      "description": "Token refresh & logout (all users)"
    },
    {
      "name": "Shared Account",
      "description": "Token-based account profile and password management"
    },
    {
      "name": "Upload",
      "description": "File upload endpoints"
    },
    {
      "name": "Plans",
      "description": "Subscription plan admin "
    },
    {
      "name": "Currencies",
      "description": "Currency admin "
    },
    {
      "name": "Bundles",
      "description": "Bundle admin "
    },

    {
      "name": "Taxes",
      "description": "Tax configuration admin "
    },
    {
      "name": "Payment Gateways",
      "description": "Payment gateway admin"
    },
    {
      "name": "Insurances",
      "description": "Insurance master data admin"
    },
    {
      "name": "Payors",
      "description": "Payor master data admin"
    },
    {
      "name": "ICD-10",
      "description": "ICD-10 diagnosis code admin"
    },
    {
      "name": "SNOMED-CT",
      "description": "SNOMED-CT clinical term admin"
    },
    {
      "name": "Payment Methods",
      "description": "Payment method admin"
    },
    {
      "name": "Webhooks",
      "description": "MPG (Mega Payment Gateway) payment webhook"
    },
    {
      "name": "Dental Ads",
      "description": "Dental advertisement admin"
    },
    {
      "name": "Dashboard",
      "description": "Admin dashboard metrics"
    }
  ],
  "paths": {
    "/subscription/dashboard": {
      "get": {
        "tags": [
          "Dashboard"
        ],
        "summary": "Get admin dashboard metrics",
        "responses": {
          "200": {
            "description": "Dashboard data returned successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessResponse"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    },
    "/shared/auth/refresh": {
      "post": {
        "tags": [
          "Shared Auth"
        ],
        "summary": "Refresh the access token",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RefreshRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "New access token issued"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    },
    "/shared/auth/logout": {
      "post": {
        "tags": [
          "Shared Auth"
        ],
        "summary": "Revoke refresh token (logout)",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RefreshRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Logged out"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    },
    "/shared/account/me": {
      "get": {
        "tags": [
          "Shared Account"
        ],
        "summary": "Get current user profile",
        "responses": {
          "200": {
            "description": "User profile returned",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessResponse"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      },
      "put": {
        "tags": [
          "Shared Account"
        ],
        "summary": "Update current user profile base information",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateAccountRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Profile updated",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessResponse"
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    },
    "/shared/account/password": {
      "patch": {
        "tags": [
          "Shared Account"
        ],
        "summary": "Change current user password",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ChangePasswordRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Password successfully updated"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      }
    },
    "/shared/upload/image": {
      "post": {
        "tags": [
          "Upload"
        ],
        "summary": "Upload a profile or clinic image",
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Image uploaded",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "url": "/uploads/images/abc123.jpg"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/shared/upload/document": {
      "post": {
        "tags": [
          "Upload"
        ],
        "summary": "Upload a document (PDF, DOCX, etc.)",
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Document uploaded",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "url": "/uploads/documents/report.pdf"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/subscription/reports/transactions/chart": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Get transaction report data for line charts grouped by date",
        "parameters": [
          {
            "in": "query",
            "name": "start_date",
            "schema": {
              "type": "string",
              "format": "date"
            },
            "description": "Start date for the report"
          },
          {
            "in": "query",
            "name": "end_date",
            "schema": {
              "type": "string",
              "format": "date"
            },
            "description": "End date for the report"
          },
          {
            "in": "query",
            "name": "payment_method_id",
            "schema": {
              "type": "integer"
            },
            "description": "Filter by payment method ID"
          },
          {
            "in": "query",
            "name": "status",
            "schema": {
              "type": "string"
            },
            "description": "Filter by order status"
          }
        ],
        "responses": {
          "200": {
            "description": "Line chart data",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": [
                    {
                      "date": "2026-06-15",
                      "total_orders": 5,
                      "total_coin_price": 375000,
                      "total_tax_amount": 41250,
                      "total_gateway_fee": 7500,
                      "total_price_paid": 423750
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/subscription/reports/transactions": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Get transaction report",
        "parameters": [
          {
            "in": "query",
            "name": "start_date",
            "schema": {
              "type": "string",
              "format": "date"
            },
            "description": "Start date for the report"
          },
          {
            "in": "query",
            "name": "end_date",
            "schema": {
              "type": "string",
              "format": "date"
            },
            "description": "End date for the report"
          },
          {
            "in": "query",
            "name": "payment_method_id",
            "schema": {
              "type": "integer"
            },
            "description": "Filter by payment method ID"
          },
          {
            "in": "query",
            "name": "status",
            "schema": {
              "type": "string"
            },
            "description": "Filter by order status"
          },
          {
            "in": "query",
            "name": "format",
            "schema": {
              "type": "string",
              "enum": ["json", "csv"]
            },
            "description": "Format of the report (default json)"
          },
          {
            "in": "query",
            "name": "page",
            "schema": {
              "type": "integer",
              "default": 1
            },
            "description": "Page number (ignored if format is csv)"
          },
          {
            "in": "query",
            "name": "limit",
            "schema": {
              "type": "integer",
              "default": 10
            },
            "description": "Items per page (ignored if format is csv)"
          }
        ],
        "responses": {
          "200": {
            "description": "Report data or CSV file",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": [],
                  "meta": {
                    "total": 0,
                    "page": 1,
                    "last_page": 1
                  }
                }
              },
              "text/csv": {
                "schema": {
                  "type": "string",
                  "format": "binary"
                }
              }
            }
          }
        }
      }
    },
    "/subscription/plans": {
      "post": {
        "tags": [
          "Plans"
        ],
        "summary": "Upsert a subscription plan (Create or Update if ID mapped) ",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreatePlanRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Plan created",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "plan": {
                      "id": 1,
                      "sku_name": "Pro Monthly",
                      "sku_code": "PRO-MONTHLY",
                      "sku_type": "PACKAGE",
                      "package_tier": "PRO",
                      "rank": 3,
                      "billing_duration_days": 30,
                      "coin_cost": 5000,
                      "is_active": true
                    }
                  }
                }
              }
            }
          }
        }
      },
      "get": {
        "tags": [
          "Plans"
        ],
        "summary": "List all subscription plans",
        "responses": {
          "200": {
            "description": "Plans list",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "plans": [
                      {
                        "id": 1,
                        "sku_name": "Pro Monthly",
                        "sku_code": "PRO-MONTHLY",
                        "sku_type": "PACKAGE",
                        "package_tier": "PRO",
                        "rank": 3,
                        "billing_duration_days": 30,
                        "coin_cost": 5000,
                        "is_active": true
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    "/subscription/plans/{id}": {
      "get": {
        "tags": [
          "Plans"
        ],
        "summary": "Get plan by ID",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Plan detail",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "plan": {
                      "id": 1,
                      "sku_name": "Pro Monthly",
                      "sku_code": "PRO-MONTHLY",
                      "sku_type": "PACKAGE",
                      "package_tier": "PRO",
                      "rank": 3,
                      "billing_duration_days": 30,
                      "coin_cost": 5000,
                      "is_active": true
                    }
                  }
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      },

      "delete": {
        "tags": [
          "Plans"
        ],
        "summary": "Deactivate a plan (ADMIN only)",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Plan deactivated"
          }
        }
      }
    },
    "/subscription/currencies": {
      "post": {
        "tags": [
          "Currencies"
        ],
        "summary": "Create a coin currency (auto-deactivates all other currencies when is_active is true)",
        "description": "Creates a new currency. When is_active is true (default), all existing active currencies are automatically deactivated to enforce a single active currency policy.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateCurrencyRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Currency created (other currencies deactivated if is_active is true)"
          },
          "409": {
            "description": "Duplicate currency code"
          }
        }
      },
      "get": {
        "tags": [
          "Currencies"
        ],
        "summary": "List all currencies",
        "responses": {
          "200": {
            "description": "Currencies list"
          }
        }
      }
    },
    "/subscription/currencies/active": {
      "get": {
        "tags": [
          "Currencies"
        ],
        "summary": "Get the currently active currency",
        "description": "Retrieves the single active currency currently enforced across the subscription domain.",
        "responses": {
          "200": {
            "description": "Active currency details returned"
          }
        }
      }
    },
    "/subscription/currencies/{id}": {
      "get": {
        "tags": [
          "Currencies"
        ],
        "summary": "Get currency by ID",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Currency detail"
          }
        }
      },
      "put": {
        "tags": [
          "Currencies"
        ],
        "summary": "Update a currency",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateCurrencyRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Currency updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Currencies"
        ],
        "summary": "Remove a currency",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Currency removed"
          }
        }
      }
    },
    "/subscription/currencies/{id}/activate": {
      "patch": {
        "tags": [
          "Currencies"
        ],
        "summary": "Activate a currency (deactivates all others)",
        "description": "Sets the specified currency as the only active currency. All other currencies are atomically deactivated within a transaction.",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            },
            "description": "Currency ID to activate"
          }
        ],
        "responses": {
          "200": {
            "description": "Currency activated successfully",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "currency": {
                      "id": 1,
                      "currency_name": "Indonesian Rupiah",
                      "currency_code": "IDR",
                      "symbol": "Rp",
                      "conversion_rate": 15500,
                      "is_active": true,
                      "effective_from": "2025-01-01T00:00:00.000Z",
                      "effective_until": null
                    }
                  }
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/subscription/bundles": {
      "post": {
        "tags": [
          "Bundles"
        ],
        "summary": "Create a coin bundle",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateBundleRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Bundle created"
          }
        }
      },
      "get": {
        "tags": [
          "Bundles"
        ],
        "summary": "List all bundles",
        "responses": {
          "200": {
            "description": "Bundles list"
          }
        }
      }
    },
    "/subscription/bundles/{id}": {
      "get": {
        "tags": [
          "Bundles"
        ],
        "summary": "Get bundle by ID",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Bundle detail"
          }
        }
      },
      "put": {
        "tags": [
          "Bundles"
        ],
        "summary": "Update a bundle",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateBundleRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Bundle updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Bundles"
        ],
        "summary": "Remove a bundle",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Bundle removed"
          }
        }
      }
    },

    "/subscription/taxes": {
      "post": {
        "tags": [
          "Taxes"
        ],
        "summary": "Create a tax config (auto-deactivates all other taxes when is_active is true)",
        "description": "Creates a new tax configuration. When is_active is true (default), all existing active taxes are automatically deactivated to enforce a single active tax policy.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateTaxRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Tax created (other taxes deactivated if is_active is true)"
          }
        }
      },
      "get": {
        "tags": [
          "Taxes"
        ],
        "summary": "List all tax configs",
        "responses": {
          "200": {
            "description": "Taxes list",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "taxes": [
                      {
                        "id": 1,
                        "tax_name": "PPN",
                        "rate_percent": 11,
                        "region": "ID",
                        "is_active": true
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    "/subscription/taxes/active": {
      "get": {
        "tags": [
          "Taxes"
        ],
        "summary": "Get the currently active tax",
        "description": "Retrieves the single active tax configuration currently enforced across the subscription domain.",
        "responses": {
          "200": {
            "description": "Active tax details returned",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "tax": {
                      "id": 1,
                      "tax_name": "PPN",
                      "rate_percent": 11,
                      "region": "ID",
                      "is_active": true
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/subscription/taxes/{id}": {
      "get": {
        "tags": [
          "Taxes"
        ],
        "summary": "Get tax by ID",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Tax detail"
          }
        }
      },
      "put": {
        "tags": [
          "Taxes"
        ],
        "summary": "Update a tax (auto-deactivates others if is_active set to true)",
        "description": "Updates a tax configuration. When is_active is set to true, all other active taxes are automatically deactivated to enforce a single active tax policy.",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateTaxRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Tax updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Taxes"
        ],
        "summary": "Delete a tax",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Tax deleted"
          }
        }
      }
    },
    "/subscription/taxes/{id}/activate": {
      "patch": {
        "tags": [
          "Taxes"
        ],
        "summary": "Activate a tax (deactivates all others)",
        "description": "Sets the specified tax as the only active tax. All other taxes are atomically deactivated within a transaction.",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            },
            "description": "Tax ID to activate"
          }
        ],
        "responses": {
          "200": {
            "description": "Tax activated successfully",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "tax": {
                      "id": 1,
                      "tax_name": "PPN",
                      "rate_percent": 11,
                      "region": "ID",
                      "is_active": true
                    }
                  }
                }
              }
            }
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/subscription/payment-gateways": {
      "post": {
        "tags": [
          "Payment Gateways"
        ],
        "summary": "Create a payment gateway config",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "gateway_name": {
                    "type": "string",
                    "example": "MPG"
                  },
                  "is_active": {
                    "type": "boolean",
                    "default": true
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Gateway created"
          }
        }
      },
      "get": {
        "tags": [
          "Payment Gateways"
        ],
        "summary": "List all payment gateways",
        "responses": {
          "200": {
            "description": "Gateways list",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "paymentGateways": [
                      {
                        "id": 1,
                        "gateway_name": "MPG",
                        "api_key": "SB-Mid-server-...",
                        "endpoint_url": "https://developer.bankmega.app/openapi/v1.0/ipg/inquiries",
                        "webhook_secret": "SB-Mid-...",
                        "is_active": true
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    "/subscription/payment-gateways/{id}": {
      "get": {
        "tags": [
          "Payment Gateways"
        ],
        "summary": "Get gateway by ID",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Gateway detail"
          }
        }
      },
      "put": {
        "tags": [
          "Payment Gateways"
        ],
        "summary": "Update a gateway",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Gateway updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Payment Gateways"
        ],
        "summary": "Delete a gateway",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Gateway deleted"
          }
        }
      }
    },
    "/subscription/insurances": {
      "post": {
        "tags": [
          "Insurances"
        ],
        "summary": "Create insurance",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "insurance_name": {
                    "type": "string",
                    "example": "BPJS Kesehatan"
                  },
                  "is_active": {
                    "type": "boolean",
                    "default": true
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created"
          }
        }
      },
      "get": {
        "tags": [
          "Insurances"
        ],
        "summary": "List insurances",
        "responses": {
          "200": {
            "description": "List",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "insurances": [
                      {
                        "id": 1,
                        "name": "BPJS Kesehatan",
                        "code": "BPJS",
                        "display_name": "BPJS",
                        "type": "NATIONAL",
                        "status": "ACTIVE"
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    "/subscription/insurances/{id}": {
      "get": {
        "tags": [
          "Insurances"
        ],
        "summary": "Get insurance",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Detail"
          }
        }
      },
      "put": {
        "tags": [
          "Insurances"
        ],
        "summary": "Update insurance",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Insurances"
        ],
        "summary": "Delete insurance",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Deleted"
          }
        }
      }
    },
    "/subscription/payors": {
      "post": {
        "tags": [
          "Payors"
        ],
        "summary": "Create payor",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "payor_name": {
                    "type": "string",
                    "example": "Asuransi XYZ"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created"
          }
        }
      },
      "get": {
        "tags": [
          "Payors"
        ],
        "summary": "List payors",
        "responses": {
          "200": {
            "description": "List",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "payors": [
                      {
                        "id": 1,
                        "name": "BPJS Payor",
                        "code": "BPJS_PAYOR",
                        "status": "ACTIVE"
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    "/subscription/payors/{id}": {
      "get": {
        "tags": [
          "Payors"
        ],
        "summary": "Get payor",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Detail"
          }
        }
      },
      "put": {
        "tags": [
          "Payors"
        ],
        "summary": "Update payor",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Payors"
        ],
        "summary": "Delete payor",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Deleted"
          }
        }
      }
    },
    "/subscription/icd-10": {
      "post": {
        "tags": [
          "ICD-10"
        ],
        "summary": "Create ICD-10 code",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "code": {
                    "type": "string",
                    "example": "A00"
                  },
                  "description": {
                    "type": "string",
                    "example": "Cholera"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created"
          }
        }
      },
      "get": {
        "tags": [
          "ICD-10"
        ],
        "summary": "List ICD-10 codes",
        "parameters": [
          {
            "in": "query",
            "name": "q",
            "schema": {
              "type": "string"
            },
            "description": "Search term"
          }
        ],
        "responses": {
          "200": {
            "description": "List"
          }
        }
      }
    },
    "/subscription/icd-10/{id}": {
      "get": {
        "tags": [
          "ICD-10"
        ],
        "summary": "Get ICD-10 code",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Detail"
          }
        }
      },
      "put": {
        "tags": [
          "ICD-10"
        ],
        "summary": "Update ICD-10 code",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated"
          }
        }
      },
      "delete": {
        "tags": [
          "ICD-10"
        ],
        "summary": "Delete ICD-10 code",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Deleted"
          }
        }
      }
    },
    "/subscription/snomed-ct": {
      "post": {
        "tags": [
          "SNOMED-CT"
        ],
        "summary": "Create SNOMED-CT term",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "concept_id": {
                    "type": "string",
                    "example": "73211009"
                  },
                  "term": {
                    "type": "string",
                    "example": "Diabetes mellitus"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created"
          }
        }
      },
      "get": {
        "tags": [
          "SNOMED-CT"
        ],
        "summary": "List SNOMED-CT terms",
        "parameters": [
          {
            "in": "query",
            "name": "q",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List"
          }
        }
      }
    },
    "/subscription/snomed-ct/{id}": {
      "get": {
        "tags": [
          "SNOMED-CT"
        ],
        "summary": "Get SNOMED-CT term",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Detail"
          }
        }
      },
      "put": {
        "tags": [
          "SNOMED-CT"
        ],
        "summary": "Update SNOMED-CT term",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated"
          }
        }
      },
      "delete": {
        "tags": [
          "SNOMED-CT"
        ],
        "summary": "Delete SNOMED-CT term",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Deleted"
          }
        }
      }
    },
    "/subscription/payment-methods": {
      "post": {
        "tags": [
          "Payment Methods"
        ],
        "summary": "Create payment method",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "example": "Virtual Account"
                  },
                  "code": {
                    "type": "string",
                    "example": "va"
                  },
                  "fee_type": {
                    "type": "string",
                    "enum": ["FIXED", "PERCENTAGE"],
                    "example": "FIXED"
                  },
                  "fee_value": {
                    "type": "number",
                    "example": 4000
                  },
                  "is_active": {
                    "type": "boolean",
                    "default": true
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Created"
          }
        }
      },
      "get": {
        "tags": [
          "Payment Methods"
        ],
        "summary": "List payment methods",
        "responses": {
          "200": {
            "description": "List",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "paymentMethods": [
                      {
                        "id": 1,
                        "name": "Virtual Account",
                        "code": "va",
                        "fee_type": "FIXED",
                        "fee_value": 4000,
                        "image_path": "/public/uploads/payment-methods/image.png",
                        "is_active": true
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    "/subscription/payment-methods/active": {
      "get": {
        "tags": [
          "Payment Methods"
        ],
        "summary": "List active payment methods",
        "responses": {
          "200": {
            "description": "List of active payment methods",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "paymentMethods": [
                      {
                        "id": 1,
                        "name": "Virtual Account",
                        "code": "va",
                        "fee_type": "FIXED",
                        "fee_value": 4000,
                        "image_path": "/public/uploads/payment-methods/image.png",
                        "is_active": true
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    "/subscription/payment-methods/{id}": {
      "get": {
        "tags": [
          "Payment Methods"
        ],
        "summary": "Get payment method",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Detail"
          }
        }
      },
      "put": {
        "tags": [
          "Payment Methods"
        ],
        "summary": "Update payment method",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "example": "Virtual Account"
                  },
                  "code": {
                    "type": "string",
                    "example": "va"
                  },
                  "fee_type": {
                    "type": "string",
                    "enum": ["FIXED", "PERCENTAGE"],
                    "example": "FIXED"
                  },
                  "fee_value": {
                    "type": "number",
                    "example": 4000
                  },
                  "is_active": {
                    "type": "boolean"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Payment Methods"
        ],
        "summary": "Delete payment method",
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Deleted"
          }
        }
      }
    },
    "/shared/webhook/mpg": {
      "post": {
        "tags": [
          "Webhooks"
        ],
        "summary": "MPG payment notification callback",
        "security": [],
        "description": "Called by Mega Payment Gateway after a payment event. Verifies webhook signature and updates order/wallet status.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object"
              },
              "example": {
                "type": "payment.received",
                "transaction": {
                  "id": "c4ff67dd-153b-4968-8148-ebe9a05a3b9a",
                  "status": "captured",
                  "statusCode": "00",
                  "paymentSource": "va",
                  "amount": 75000
                },
                "inquiry": {
                  "id": "17b4a7d9-f7d4-49e0-9f82-868ef1f1dd52",
                  "status": "paid",
                  "order": {
                    "id": "COIN-1-1234567890-abc123"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Notification processed",
            "content": {
              "application/json": {
                "example": {
                  "status": "ok",
                  "validateSignature": "33c14f48191b9fd5d9a1081931eceb7b"
                }
              }
            }
          }
        }
      }
    },
    "/subscription/auth/login": {
      "post": {
        "tags": [
          "Shared Auth"
        ],
        "summary": "Subscription admin login",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Admin login successful"
          }
        }
      }
    },
    "/subscription/dental-ads": {
      "get": {
        "tags": ["Dental Ads"],
        "summary": "Get all dental ads",
        "responses": {
          "200": { "description": "Success" }
        }
      },
      "post": {
        "tags": ["Dental Ads"],
        "summary": "Create a new dental ad",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateDentalAdRequest" }
            }
          }
        },
        "responses": {
          "201": { "description": "Created" }
        }
      }
    },
    "/subscription/dental-ads/{id}": {
      "get": {
        "tags": ["Dental Ads"],
        "summary": "Get dental ad by ID",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Success" }
        }
      },
      "put": {
        "tags": ["Dental Ads"],
        "summary": "Update dental ad",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/CreateDentalAdRequest" }
            }
          }
        },
        "responses": {
          "200": { "description": "Success" }
        }
      },
      "delete": {
        "tags": ["Dental Ads"],
        "summary": "Delete dental ad",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Success" }
        }
      }
    }
  }
};

export const createSwaggerRouter = (): ReturnType<typeof import('express').Router> => {
  const router = Router();

  const swaggerUiOptions = {
    customSiteTitle: spec.info.title,
    swaggerOptions: {
      persistAuthorization: true,
      responseInterceptor: (res: any) => {
        if (res.ok && res.url) {
          if (res.url.includes('/auth/login') || res.url.includes('/auth/register')) {
            try {
              const body = typeof res.obj === 'string' ? JSON.parse(res.obj) : res.obj;
              const token = body?.data?.tokens?.accessToken;
              if (token) {
                setTimeout(() => {
                  const ui = (window as any).ui;
                  if (ui) {
                    ui.authActions.authorize({
                      bearerAuth: {
                        name: 'bearerAuth',
                        schema: {
                          type: 'http',
                          in: 'header',
                          name: 'Authorization',
                          scheme: 'bearer',
                          bearerFormat: 'JWT',
                        },
                        value: token,
                      },
                    });
                  }
                }, 0);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          } else if (res.url.includes('/auth/logout')) {
            setTimeout(() => {
              const ui = (window as any).ui;
              if (ui) {
                ui.authActions.logout(['bearerAuth']);
              }
            }, 0);
          }
        }
        return res;
      },
    },
  };

  router.use('/', swaggerUi.serveFiles(spec, swaggerUiOptions));
  router.get('/', swaggerUi.setup(spec, swaggerUiOptions));
  router.get('/spec.json', (_, res) => res.json(spec));
  return router;
};
