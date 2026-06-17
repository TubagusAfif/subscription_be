import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const spec = {
  "openapi": "3.0.3",
  "info": {
    "title": "Client API Docs",
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
      "SuccessResponse": {
        "type": "object",
        "properties": {
          "success": {
            "type": "boolean",
            "example": true
          },
          "data": {
            "type": "object"
          }
        }
      },
      "RegisterRequest": {
        "type": "object",
        "required": [
          "email",
          "password",
          "name"
        ],
        "properties": {
          "email": {
            "type": "string",
            "format": "email",
            "example": "owner@clinic.com"
          },
          "password": {
            "type": "string",
            "minLength": 8,
            "example": "Secret123!"
          },
          "name": {
            "type": "string",
            "example": "Dr. Ahmad Fauzi"
          },
          "phone": {
            "type": "string",
            "example": "+6281234567890"
          },
          "profile": {
            "type": "object",
            "properties": {
              "date_of_birth": {
                "type": "string",
                "format": "date",
                "example": "1985-04-20"
              },
              "gender": {
                "type": "string",
                "example": "male"
              },
              "address_line1": {
                "type": "string",
                "example": "Jl. Sudirman No. 1"
              },
              "city": {
                "type": "string",
                "example": "Jakarta"
              },
              "province": {
                "type": "string",
                "example": "DKI Jakarta"
              },
              "postal_code": {
                "type": "string",
                "example": "10220"
              },
              "country": {
                "type": "string",
                "example": "ID"
              },
              "utc_timezone": {
                "type": "string",
                "example": "Asia/Jakarta"
              },
              "clinic_name": {
                "type": "string",
                "example": "Klinik Sehat Jaya"
              },
              "photo_url": {
                "type": "string",
                "example": "/uploads/profile.jpg"
              }
            }
          }
        }
      },
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
            "example": "owner@clinic.com"
          },
          "password": {
            "type": "string",
            "example": "Secret123!"
          }
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
      "SubscribeRequest": {
        "type": "object",
        "required": [
          "sku_id"
        ],
        "properties": {
          "sku_id": {
            "type": "integer",
            "example": 3
          }
        }
      },
      "SwitchPlanRequest": {
        "type": "object",
        "required": [
          "new_sku_id"
        ],
        "properties": {
          "new_sku_id": {
            "type": "integer",
            "example": 5
          }
        }
      },
      "CreateBundleCoinOrderRequest": {
        "type": "object",
        "required": [
          "bundle_id",
          "nominal",
          "payment_source"
        ],
        "properties": {
          "bundle_id": {
            "type": "integer",
            "example": 2
          },
          "nominal": {
            "type": "number",
            "example": 75000
          },
          "payment_source": {
            "type": "string",
            "enum": ["va", "qris"],
            "example": "va"
          }
        }
      },
      "CreateCoinOrderRequest": {
        "type": "object",
        "required": [
          "coin_amount",
          "nominal",
          "payment_source"
        ],
        "properties": {
          "coin_amount": {
            "type": "integer",
            "example": 500
          },
          "nominal": {
            "type": "number",
            "example": 75000
          },
          "payment_source": {
            "type": "string",
            "enum": ["va", "qris"],
            "example": "va"
          }
        }
      },
      "CreateClinicRequest": {
        "type": "object",
        "required": [
          "clinic_name",
          "clinic_code"
        ],
        "properties": {
          "clinic_name": {
            "type": "string",
            "example": "Klinik Sehat Jaya"
          },
          "clinic_code": {
            "type": "string",
            "example": "KSJ-001",
            "pattern": "^[A-Z0-9_-]+$"
          },
          "address": {
            "type": "string",
            "example": "Jl. Diponegoro No. 5, Jakarta"
          },
          "phone": {
            "type": "string",
            "example": "+62215550001"
          },
          "utc_timezone": {
            "type": "string",
            "example": "Asia/Jakarta"
          },
          "lat": {
            "type": "number",
            "example": -6.2088
          },
          "long": {
            "type": "number",
            "example": 106.8456
          }
        }
      },
      "UpdateClinicRequest": {
        "type": "object",
        "properties": {
          "clinic_name": {
            "type": "string",
            "example": "Klinik Sehat Baru"
          },
          "address": {
            "type": "string"
          },
          "phone": {
            "type": "string"
          },
          "utc_timezone": {
            "type": "string"
          },
          "lat": {
            "type": "number"
          },
          "long": {
            "type": "number"
          },
          "photo_url": {
            "type": "string",
            "example": "/uploads/clinic-logo.jpg"
          }
        }
      },
      "DeactivateRequest": {
        "type": "object",
        "properties": {
          "reason": {
            "type": "string",
            "enum": [
              "manual",
              "addon_expired"
            ],
            "example": "manual"
          }
        }
      },
      "InviteOpUserRequest": {
        "type": "object",
        "required": [
          "name",
          "email",
          "password",
          "role_id"
        ],
        "properties": {
          "name": {
            "type": "string",
            "example": "Sari Dewi"
          },
          "email": {
            "type": "string",
            "format": "email",
            "example": "sari@klinik.com"
          },
          "phone": {
            "type": "string",
            "example": "+6281200000001"
          },
          "password": {
            "type": "string",
            "minLength": 8,
            "example": "Staff@pass1"
          },
          "role_id": {
            "type": "integer",
            "example": 1
          }
        }
      },
      "DeactivateOpUserRequest": {
        "type": "object",
        "properties": {
          "reason": {
            "type": "string",
            "enum": [
              "manual",
              "addon_expired",
              "package_expired"
            ],
            "example": "manual"
          }
        }
      },
      "CreateRoleRequest": {
        "type": "object",
        "required": [
          "role_name"
        ],
        "properties": {
          "role_name": {
            "type": "string",
            "example": "Nurse"
          },
          "description": {
            "type": "string",
            "example": "Can view and update patient records"
          }
        }
      },
      "AssignPermissionRequest": {
        "type": "object",
        "required": [
          "permission_id"
        ],
        "properties": {
          "permission_id": {
            "type": "integer",
            "example": 7
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
      "name": "Client Auth",
      "description": "Client user registration & login"
    },
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
      "name": "Coin Orders",
      "description": "Client coin bundle purchases"
    },
    {
      "name": "Coin Wallet",
      "description": "Client coin wallet & transactions"
    },
    {
      "name": "Subscriptions",
      "description": "Client subscription lifecycle"
    },
    {
      "name": "Clinics",
      "description": "Clinic CRUD (OWNER only)"
    },
    {
      "name": "Operational Users",
      "description": "Clinic staff management (OWNER only)"
    },
    {
      "name": "Roles & Permissions",
      "description": "Operational role & permission management"
    },
    {
      "name": "Webhooks",
      "description": "MPG (Mega Payment Gateway) payment webhook"
    },
    {
      "name": "Dashboard",
      "description": "Client dashboard metrics"
    }
  ],
  "paths": {
    "/client/dashboard": {
      "get": {
        "tags": [
          "Dashboard"
        ],
        "summary": "Get client dashboard metrics",
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
    "/client/auth/register": {
      "post": {
        "tags": [
          "Client Auth"
        ],
        "summary": "Register a new client account",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RegisterRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "User registered successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessResponse"
                },
                "example": {
                  "success": true,
                  "data": {
                    "user": {
                      "id": 1,
                      "email": "owner@clinic.com",
                      "name": "Dr. Ahmad Fauzi",
                      "role": "OWNER"
                    },
                    "tokens": {
                      "accessToken": "eyJ...",
                      "refreshToken": "eyJ..."
                    }
                  }
                }
              }
            }
          },
          "409": {
            "description": "Email already registered"
          },
          "422": {
            "description": "Validation error"
          }
        }
      }
    },
    "/client/auth/login": {
      "post": {
        "tags": [
          "Client Auth"
        ],
        "summary": "Login with email & password",
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
            "description": "Login successful",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/SuccessResponse"
                },
                "example": {
                  "success": true,
                  "data": {
                    "user": {
                      "id": 1,
                      "email": "owner@clinic.com",
                      "role": "OWNER"
                    },
                    "tokens": {
                      "accessToken": "eyJ...",
                      "refreshToken": "eyJ..."
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Invalid credentials"
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
    "/client/coin-orders/bundle": {
      "post": {
        "tags": [
          "Coin Orders"
        ],
        "summary": "Create a coin bundle order (initiates payment)",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateBundleCoinOrderRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Order created with payment URL",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "order": {
                      "id": 1,
                      "user_id": 1,
                      "bundle_id": 2,
                      "is_custom_qty": false,
                      "coin_amount": 500,
                      "currency_id": 1,
                      "price_paid": 75000,
                      "tax_amount": 8250,
                      "discount_id": null,
                      "status": "PENDING",
                      "checkout_url": "https://pgcheckoutdev.bankmega.com/...",
                      "pg_order_id": "COIN-1-1234567890-abc123",
                      "pg_response_id": "a60daf2b-1fd9-42ab-8235-41a264811025",
                      "created_at": "2025-01-01T00:00:00.000Z",
                      "updated_at": "2025-01-01T00:00:00.000Z"
                    }
                  }
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
    "/client/coin-orders": {
      "post": {
        "tags": [
          "Coin Orders"
        ],
        "summary": "Create a custom coin order (initiates payment)",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateCoinOrderRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Order created with payment URL",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "order": {
                      "id": 1,
                      "user_id": 1,
                      "bundle_id": null,
                      "is_custom_qty": true,
                      "coin_amount": 500,
                      "currency_id": 1,
                      "price_paid": 75000,
                      "tax_amount": 8250,
                      "discount_id": null,
                      "status": "PENDING",
                      "checkout_url": "https://pgcheckoutdev.bankmega.com/...",
                      "pg_order_id": "COIN-1-1234567890-abc123",
                      "pg_response_id": "a60daf2b-1fd9-42ab-8235-41a264811025",
                      "created_at": "2025-01-01T00:00:00.000Z",
                      "updated_at": "2025-01-01T00:00:00.000Z"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "$ref": "#/components/responses/Unauthorized"
          }
        }
      },
      "get": {
        "tags": [
          "Coin Orders"
        ],
        "summary": "List all my coin orders",
        "responses": {
          "200": {
            "description": "List of coin orders",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "orders": [
                      {
                        "id": 1,
                        "user_id": 1,
                        "bundle_id": 2,
                        "is_custom_qty": false,
                        "coin_amount": 500,
                        "currency_id": 1,
                        "price_paid": 75000,
                        "tax_amount": 8250,
                        "discount_id": null,
                        "status": "PAID",
                        "checkout_url": "https://pgcheckoutdev.bankmega.com/...",
                        "pg_order_id": "COIN-1-1234567890-abc123",
                        "pg_response_id": "a60daf2b-1fd9-42ab-8235-41a264811025",
                        "created_at": "2025-01-01T00:00:00.000Z",
                        "updated_at": "2025-01-01T00:00:00.000Z"
                      }
                    ]
                  }
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
    "/client/coin-orders/status": {
      "get": {
        "tags": [
          "Coin Orders"
        ],
        "summary": "Get coin order status by PG Order ID (Unauthenticated)",
        "security": [],
        "parameters": [
          {
            "in": "query",
            "name": "order_id",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "Payment Gateway Order ID"
          }
        ],
        "responses": {
          "200": {
            "description": "Coin order status detail",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "order": {
                      "id": 1,
                      "user_id": 1,
                      "bundle_id": 2,
                      "is_custom_qty": false,
                      "coin_amount": 500,
                      "currency_id": 1,
                      "price_paid": 75000,
                      "tax_amount": 8250,
                      "discount_id": null,
                      "status": "PAID",
                      "checkout_url": "https://pgcheckoutdev.bankmega.com/...",
                      "pg_order_id": "COIN-1-1234567890-abc123",
                      "pg_response_id": "a60daf2b-1fd9-42ab-8235-41a264811025",
                      "created_at": "2025-01-01T00:00:00.000Z",
                      "updated_at": "2025-01-01T00:00:00.000Z"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "$ref": "#/components/responses/BadRequest"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/client/coin-orders/{id}": {
      "get": {
        "tags": [
          "Coin Orders"
        ],
        "summary": "Get a specific coin order by ID",
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
            "description": "Coin order detail",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "order": {
                      "id": 1,
                      "user_id": 1,
                      "bundle_id": 2,
                      "is_custom_qty": false,
                      "coin_amount": 500,
                      "currency_id": 1,
                      "price_paid": 75000,
                      "tax_amount": 8250,
                      "discount_id": null,
                      "status": "PAID",
                      "checkout_url": "https://pgcheckoutdev.bankmega.com/...",
                      "pg_order_id": "COIN-1-1234567890-abc123",
                      "pg_response_id": "a60daf2b-1fd9-42ab-8235-41a264811025",
                      "created_at": "2025-01-01T00:00:00.000Z",
                      "updated_at": "2025-01-01T00:00:00.000Z"
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
    "/client/wallet": {
      "get": {
        "tags": [
          "Coin Wallet"
        ],
        "summary": "Get my coin wallet balance",
        "responses": {
          "200": {
            "description": "Wallet balance",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "wallet": {
                      "user_id": 1,
                      "balance": 1000,
                      "updated_at": "2025-01-01T00:00:00.000Z"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/client/wallet/transactions": {
      "get": {
        "tags": [
          "Coin Wallet"
        ],
        "summary": "List all coin transactions",
        "responses": {
          "200": {
            "description": "Transactions list",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "transactions": [
                      {
                        "id": 1,
                        "user_id": 1,
                        "type": "EARNED",
                        "reference_type": "ORDER",
                        "reference_id": 1,
                        "amount_change": 500,
                        "new_balance": 1000,
                        "description": "Bought coins",
                        "created_at": "2025-01-02T00:00:00Z"
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
    "/client/subscriptions": {
      "post": {
        "tags": [
          "Subscriptions"
        ],
        "summary": "Subscribe to a plan using coins",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/SubscribeRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Subscription created",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "subscription": {
                      "id": 1,
                      "user_id": 1,
                      "clinic_id": 1,
                      "sku_id": 5,
                      "status": "ACTIVE",
                      "current_period_start": "2025-01-01",
                      "current_period_end": "2025-02-01",
                      "auto_renew": true
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Insufficient coins"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      },
      "get": {
        "tags": [
          "Subscriptions"
        ],
        "summary": "Get my active subscription",
        "responses": {
          "200": {
            "description": "Active subscription"
          }
        }
      }
    },
    "/client/subscriptions/all": {
      "get": {
        "tags": [
          "Subscriptions"
        ],
        "summary": "Get all my subscriptions (history)",
        "responses": {
          "200": {
            "description": "All subscriptions"
          }
        }
      }
    },
    "/client/subscriptions/{id}/cancel": {
      "post": {
        "tags": [
          "Subscriptions"
        ],
        "summary": "Cancel a subscription",
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
            "description": "Subscription cancelled"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/client/subscriptions/{id}/switch": {
      "post": {
        "tags": [
          "Subscriptions"
        ],
        "summary": "Switch to a different plan",
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
                "$ref": "#/components/schemas/SwitchPlanRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Plan switched"
          },
          "400": {
            "description": "Insufficient coins or invalid plan"
          }
        }
      }
    },
    "/client/clinics": {
      "post": {
        "tags": [
          "Clinics"
        ],
        "summary": "Create a new clinic",
        "description": "Consumes `clinic` quota from the active subscription.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateClinicRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Clinic created",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "clinic": {
                      "id": 1,
                      "clinic_name": "Klinik Sehat Jaya",
                      "clinic_code": "KSJ-001",
                      "is_active": true
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "Quota exceeded or no active subscription"
          },
          "409": {
            "description": "Duplicate clinic_code"
          }
        }
      },
      "get": {
        "tags": [
          "Clinics"
        ],
        "summary": "List all my clinics",
        "responses": {
          "200": {
            "description": "List of clinics"
          }
        }
      }
    },
    "/client/clinics/{id}": {
      "get": {
        "tags": [
          "Clinics"
        ],
        "summary": "Get a clinic by ID",
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
            "description": "Clinic detail"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      },
      "patch": {
        "tags": [
          "Clinics"
        ],
        "summary": "Update clinic details",
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
                "$ref": "#/components/schemas/UpdateClinicRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Clinic updated"
          },
          "403": {
            "$ref": "#/components/responses/Forbidden"
          }
        }
      }
    },
    "/client/clinics/{id}/deactivate": {
      "post": {
        "tags": [
          "Clinics"
        ],
        "summary": "Deactivate a clinic",
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
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeactivateRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Clinic deactivated"
          }
        }
      }
    },
    "/client/clinics/{clinicId}/op-users": {
      "post": {
        "tags": [
          "Operational Users"
        ],
        "summary": "Invite a new operational user (staff) to a clinic",
        "description": "Consumes `user` quota. Password is hashed with bcryptjs.",
        "parameters": [
          {
            "in": "path",
            "name": "clinicId",
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
                "$ref": "#/components/schemas/InviteOpUserRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Operational user created",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "operational_user": {
                      "id": 1,
                      "name": "Sari Dewi",
                      "email": "sari@klinik.com",
                      "is_active": true
                    }
                  }
                }
              }
            }
          },
          "403": {
            "description": "User quota exceeded"
          },
          "409": {
            "description": "Duplicate email in this clinic"
          }
        }
      },
      "get": {
        "tags": [
          "Operational Users"
        ],
        "summary": "List all operational users of a clinic",
        "parameters": [
          {
            "in": "path",
            "name": "clinicId",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of operational users"
          }
        }
      }
    },
    "/client/clinics/{clinicId}/op-users/{userId}/deactivate": {
      "post": {
        "tags": [
          "Operational Users"
        ],
        "summary": "Deactivate an operational user",
        "parameters": [
          {
            "in": "path",
            "name": "clinicId",
            "required": true,
            "schema": {
              "type": "integer"
            }
          },
          {
            "in": "path",
            "name": "userId",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeactivateOpUserRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Operational user deactivated"
          },
          "404": {
            "$ref": "#/components/responses/NotFound"
          }
        }
      }
    },
    "/client/clinics/{clinicId}/roles": {
      "post": {
        "tags": [
          "Roles & Permissions"
        ],
        "summary": "Create a new operational role for a clinic",
        "parameters": [
          {
            "in": "path",
            "name": "clinicId",
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
                "$ref": "#/components/schemas/CreateRoleRequest"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Role created",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "role": {
                      "id": 1,
                      "role_name": "Nurse",
                      "clinic_id": 1
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
          "Roles & Permissions"
        ],
        "summary": "List all roles of a clinic",
        "parameters": [
          {
            "in": "path",
            "name": "clinicId",
            "required": true,
            "schema": {
              "type": "integer"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of roles"
          }
        }
      }
    },
    "/client/clinics/{clinicId}/roles/{roleId}/permissions": {
      "post": {
        "tags": [
          "Roles & Permissions"
        ],
        "summary": "Assign a permission to a role (idempotent)",
        "parameters": [
          {
            "in": "path",
            "name": "clinicId",
            "required": true,
            "schema": {
              "type": "integer"
            }
          },
          {
            "in": "path",
            "name": "roleId",
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
                "$ref": "#/components/schemas/AssignPermissionRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Permission assigned"
          }
        }
      }
    },
    "/client/payment-methods/active": {
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
                        "method_name": "Credit Card",
                        "method_code": "credit_card",
                        "method_type": "card",
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
    "/client/permissions": {
      "get": {
        "tags": [
          "Roles & Permissions"
        ],
        "summary": "List all available system permissions",
        "responses": {
          "200": {
            "description": "Permissions list",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "data": {
                    "permissions": [
                      {
                        "id": 1,
                        "module": "clinic",
                        "action": "read"
                      },
                      {
                        "id": 2,
                        "module": "clinic",
                        "action": "create"
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
