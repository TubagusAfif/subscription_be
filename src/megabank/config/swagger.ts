import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const spec = {
  "openapi": "3.0.3",
  "info": {
    "title": "Bank Mega SNAP IPG API Integration",
    "version": "1.0.0",
    "description": "API Documentation for Bank Mega SNAP IPG integration. Separated into Client APIs (for initiating payments and checking status) and Admin APIs (for receiving webhooks)."
  },
  "servers": [
    {
      "url": "https://developer.bankmega.app",
      "description": "Sandbox Server"
    },
    {
      "url": "/",
      "description": "Local Webhook Server"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer"
      }
    },
    "schemas": {
      "InquiriesRequest": {
        "type": "object",
        "required": [
          "amount",
          "currency",
          "referenceUrl",
          "order",
          "customer",
          "paymentSourceMethod",
          "paymentSource"
        ],
        "properties": {
          "amount": { "type": "number", "example": 200 },
          "currency": { "type": "string", "example": "IDR" },
          "referenceUrl": { "type": "string", "example": "https://djagadkreasi.id/?id=THG/20240201/S-1" },
          "order": {
            "type": "object",
            "required": ["id"],
            "properties": {
              "id": { "type": "string", "example": "THG/20240201/S-31523" }
            }
          },
          "customer": {
            "type": "object",
            "required": ["name", "email", "phoneNumber"],
            "properties": {
              "name": { "type": "string", "example": "Fyan Estu" },
              "email": { "type": "string", "example": "fyanestu@gmail.com" },
              "phoneNumber": { "type": "string", "example": "082114017471" },
              "country": { "type": "string", "example": "ID" },
              "postalCode": { "type": "string", "example": "13340" }
            }
          },
          "paymentSourceMethod": { "type": "string", "example": "" },
          "paymentSource": { "type": "string", "example": "creditcard" }
        }
      },
      "InquiriesResponse": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "example": "a60daf2b-1fd9-42ab-8235-41a264811025" },
          "createdTime": { "type": "string", "example": "2024-07-02T08:26:34.941+07:00" },
          "referenceId": { "type": "string", "example": "THG/20240201/S-31521" },
          "status": { "type": "string", "example": "unpaid" },
          "amount": { "type": "number", "example": 200 },
          "currency": { "type": "string", "example": "IDR" },
          "paymentSources": {
            "type": "array",
            "items": { "type": "string" },
            "example": ["creditcard"]
          },
          "paymentSourceMethod": { "type": "string", "example": "" },
          "urls": {
            "type": "object",
            "properties": {
              "selections": { "type": "string", "example": "https://pgcheckoutdev.bankmega.com/l2024E07v02v082635Y166" },
              "checkout": { "type": "string", "example": "https://pgcheckoutdev.bankmega.com/l2024E07v02v082635Y166" }
            }
          },
          "accountRef": { "type": "string", "example": "889089999584102" },
          "responseCode": { "type": "string", "example": "0" },
          "responseDesc": { "type": "string", "example": "Success" }
        }
      },
      "StatusResponse": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": { "type": "string", "example": "842623cf-63a5-4d6a-8f14-5d8367c2dfb1" },
            "createdTime": { "type": "string", "example": "2024-07-02T08:26:34.941+07:00" },
            "updatedTime": { "type": "string", "example": "2024-07-02T08:26:34.941+07:00" },
            "currency": { "type": "string", "example": "IDR" },
            "amount": { "type": "number", "example": 200 },
            "type": { "type": "string", "example": "payment" },
            "paymentSource": { "type": "string", "example": "creditcard" },
            "status": { "type": "string", "example": "authorized" },
            "statusCode": { "type": "string", "example": "00" },
            "statusData": {
              "type": "object",
              "properties": {
                "authenticationModule": { "type": "string", "example": "megacc" },
                "challengeAuthenticationCode": { "type": "string", "example": "" },
                "processingCode": { "type": "string", "example": "" },
                "authenticationCode": { "type": "string", "example": "" },
                "cardType": { "type": "string", "example": "credit" },
                "cardNetwork": { "type": "string", "example": "" },
                "message": { "type": "string", "example": "Get Status Success" }
              }
            }
          }
        }
      },
      "WebhookRequest": {
        "type": "object",
        "required": ["type", "transaction", "inquiry"],
        "properties": {
          "type": { "type": "string", "example": "payment.received" },
          "transaction": {
            "type": "object",
            "properties": {
              "id": { "type": "string", "example": "c4ff67dd-153b-4968-8148-ebe9a05a3b9a" },
              "createdTime": { "type": "string", "example": "2023-06-27T09:49:55.120+07:00" },
              "updatedTime": { "type": "string", "example": "2023-06-27T10:01:18.465+07:00" },
              "currency": { "type": "string", "example": "IDR" },
              "amount": { "type": "number", "example": 13000 },
              "inquiryId": { "type": "string", "example": "17b4a7d9-f7d4-49e0-9f82-868ef1f1dd52" },
              "merchantId": { "type": "string", "example": "3b7b561c-48d7-4f78-8fdd-10e259fe38df" },
              "type": { "type": "string", "example": "payment" },
              "paymentSource": { "type": "string", "example": "bniva" },
              "status": { "type": "string", "example": "captured" },
              "statusCode": { "type": "string", "example": "00" },
              "statusData": {
                "type": "object",
                "properties": {
                  "authenticationModule": { "type": "string", "example": "megacc" },
                  "cardType": { "type": "string", "example": "credit" },
                  "message": { "type": "string", "example": "Get Status Success" }
                }
              },
              "networkRefId": { "type": "string", "example": "649a50eb93b936d4d4a31619" }
            }
          },
          "inquiry": {
            "type": "object",
            "properties": {
              "id": { "type": "string", "example": "17b4a7d9-f7d4-49e0-9f82-868ef1f1dd52" },
              "createdTime": { "type": "string", "example": "2023-06-27T09:49:55.120+07:00" },
              "updatedTime": { "type": "string", "example": "2023-06-27T10:01:18.465+07:00" },
              "merchantId": { "type": "string", "example": "3b7b561c-48d7-4f78-8fdd-10e259fe38df" },
              "currency": { "type": "string", "example": "IDR" },
              "amount": { "type": "number", "example": 13000 },
              "lockedAmount": { "type": "number", "example": 0 },
              "status": { "type": "string", "example": "paid" },
              "order": {
                "type": "object",
                "properties": {
                  "id": { "type": "string", "example": "202352794954" },
                  "disablePromo": { "type": "boolean", "example": true }
                }
              },
              "customer": {
                "type": "object",
                "properties": {
                  "name": { "type": "string", "example": "Fyan" },
                  "email": { "type": "string", "example": "fyan@gmail.com" },
                  "phoneNumber": { "type": "string", "example": "087263626424" },
                  "country": { "type": "string", "example": "ID" },
                  "postalCode": { "type": "string", "example": "12345" }
                }
              },
              "merchant": {
                "type": "object",
                "properties": {
                  "id": { "type": "string", "example": "3b7b561c-48d7-4f78-8fdd-10e259fe38df" },
                  "name": { "type": "string", "example": "TransMart C" },
                  "status": { "type": "string", "example": "active" }
                }
              }
            }
          }
        }
      },
      "WebhookResponse": {
        "type": "object",
        "properties": {
          "status": { "type": "string", "example": "ok" },
          "validateSignature": { "type": "string", "example": "33c14f48191b9fd5d9a1081931eceb7b" }
        }
      }
    }
  },
  "tags": [
    {
      "name": "Client",
      "description": "Client APIs to initiate payment and check status"
    },
    {
      "name": "Admin / Webhook",
      "description": "Admin APIs for receiving payment webhooks"
    }
  ],
  "security": [
    { "bearerAuth": [] }
  ],
  "paths": {
    "/openapi/v1.0/ipg/inquiries": {
      "post": {
        "tags": ["Client"],
        "summary": "Create Payment Inquiry",
        "description": "Initiate payment on Mega Payment Gateway.",
        "parameters": [
          { "in": "header", "name": "X-TIMESTAMP", "required": true, "schema": { "type": "string" }, "example": "2024-07-02T08:27:12+07:00" },
          { "in": "header", "name": "X-SIGNATURE", "required": true, "schema": { "type": "string" } },
          { "in": "header", "name": "X-PARTNER-ID", "required": true, "schema": { "type": "string" }, "example": "6BPxIS7nJt1kwgN1PHA2YO" },
          { "in": "header", "name": "CHANNEL-ID", "required": true, "schema": { "type": "string" }, "example": "95221" },
          { "in": "header", "name": "X-EXTERNAL-ID", "required": true, "schema": { "type": "string" }, "example": "318075533589500931841630522" }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/InquiriesRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Inquiry created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/InquiriesResponse"
                }
              }
            }
          }
        }
      }
    },
    "/openapi/v1.0/ipg/transaction/{responseId}/status": {
      "get": {
        "tags": ["Client"],
        "summary": "Check Payment Status",
        "description": "Check the status of a payment by its response ID.",
        "parameters": [
          { "in": "path", "name": "responseId", "required": true, "schema": { "type": "string" }, "example": "a60daf2b-1fd9-42ab-8235-41a264811025" },
          { "in": "header", "name": "X-TIMESTAMP", "required": true, "schema": { "type": "string" }, "example": "2024-07-02T08:27:12+07:00" },
          { "in": "header", "name": "X-SIGNATURE", "required": true, "schema": { "type": "string" } },
          { "in": "header", "name": "X-PARTNER-ID", "required": true, "schema": { "type": "string" }, "example": "6BPxIS7nJt1kwgN1PHA2YO" },
          { "in": "header", "name": "CHANNEL-ID", "required": true, "schema": { "type": "string" }, "example": "95221" },
          { "in": "header", "name": "X-EXTERNAL-ID", "required": true, "schema": { "type": "string" }, "example": "318075533589500931841630522" }
        ],
        "responses": {
          "200": {
            "description": "Status checked successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/StatusResponse"
                }
              }
            }
          }
        }
      }
    },
    "/webhook": {
      "post": {
        "tags": ["Admin / Webhook"],
        "summary": "Payment Received Webhook",
        "description": "Endpoint to receive payment notifications from Mega Payment Gateway.",
        "parameters": [
          { "in": "header", "name": "Signature", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/WebhookRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Webhook processed successfully",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/WebhookResponse"
                }
              }
            }
          }
        }
      }
    }
  }
};

export const createMegaBankSwaggerRouter = (): ReturnType<typeof import('express').Router> => {
  const router = Router();
  
  const swaggerUiOptions = {
    customSiteTitle: spec.info.title,
  };

  router.use('/', swaggerUi.serveFiles(spec, swaggerUiOptions));
  router.get('/', swaggerUi.setup(spec, swaggerUiOptions));
  router.get('/spec.json', (_, res) => res.json(spec));
  
  return router;
};
