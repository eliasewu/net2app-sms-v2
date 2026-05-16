# net2app SMS Hub - API Documentation

## Base URL
```
Production: https://your-domain.com/api
Development: http://localhost:8000/api
```

## Authentication

All API requests require JWT authentication (except login).

```http
Authorization: Bearer <token>
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}

Response:
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

---

## Clients API

### List Clients
```http
GET /api/clients?page=1&limit=50&search=query&status=active

Response:
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

### Create Client
```http
POST /api/clients
Content-Type: application/json

{
  "client_code": "CL_EXAMPLE",
  "company_name": "Example Corp",
  "email": "contact@example.com",
  "phone": "+1234567890",
  "country": "USA",
  "billing_type": "prepaid",
  "billing_mode": "submit",
  "smpp_username": "example_smpp",
  "smpp_password": "secure_password",
  "smpp_tps": 100,
  "credit_limit": 1000
}
```

### Get Client
```http
GET /api/clients/{client_id}
```

### Update Client
```http
PUT /api/clients/{client_id}
Content-Type: application/json

{
  "company_name": "New Name",
  "smpp_tps": 200
}
```

### Delete Client
```http
DELETE /api/clients/{client_id}
```

### Add Funds (Topup)
```http
POST /api/clients/{client_id}/topup
Content-Type: application/json

{
  "amount": 1000.00,
  "payment_method": "Bank Transfer",
  "reference_number": "TXN123456",
  "notes": "Monthly topup"
}
```

### Get Balance
```http
GET /api/clients/{client_id}/balance

Response:
{
  "balance": 500.00,
  "credit_limit": 1000.00,
  "available": 1500.00,
  "billing_type": "prepaid"
}
```

### Client Translations
```http
GET /api/clients/{client_id}/translations
POST /api/clients/{client_id}/translations
DELETE /api/clients/{client_id}/translations/{translation_id}
```

### Client Bind Status
```http
GET /api/clients/{client_id}/bind-status
POST /api/clients/{client_id}/bind
POST /api/clients/{client_id}/unbind
```

---

## Suppliers API

### List Suppliers
```http
GET /api/suppliers?page=1&limit=50&type=smpp|http_api
```

### Create Supplier (SMPP)
```http
POST /api/suppliers
Content-Type: application/json

{
  "supplier_code": "SP_EXAMPLE",
  "company_name": "SMS Provider",
  "connection_type": "smpp",
  "smpp_host": "smsc.provider.com",
  "smpp_port": 2775,
  "smpp_username": "net2app",
  "smpp_password": "password",
  "smpp_tps": 500
}
```

### Create Supplier (HTTP API)
```http
POST /api/suppliers
Content-Type: application/json

{
  "supplier_code": "SP_API",
  "company_name": "API Provider",
  "connection_type": "http_api",
  "api_send_url": "https://api.provider.com/sms/send",
  "api_dlr_url": "https://api.provider.com/sms/status",
  "api_key": "your-api-key",
  "api_method": "POST",
  "api_provider_region": "global"
}
```

### Supplier Bind Status
```http
GET /api/suppliers/{supplier_id}/bind-status
POST /api/suppliers/{supplier_id}/bind
POST /api/suppliers/{supplier_id}/unbind
```

---

## Trunks API

### List Trunks
```http
GET /api/trunks?type=sim|voiceotp|marketing|spam|direct|local_direct
```

### Create Trunk
```http
POST /api/trunks
Content-Type: application/json

{
  "name": "BD SIM Routes",
  "trunk_type": "sim",
  "description": "Bangladesh SIM routes",
  "suppliers": [
    {
      "supplier_id": "uuid",
      "priority": 1,
      "weight": 100
    }
  ]
}
```

### Add Supplier to Trunk
```http
POST /api/trunks/{trunk_id}/suppliers
Content-Type: application/json

{
  "supplier_id": "uuid",
  "priority": 1,
  "weight": 100
}
```

---

## Routes API

### List Routes
```http
GET /api/routes?routing_type=priority|lcr|performance|round_robin|testing
```

### Create Route
```http
POST /api/routes
Content-Type: application/json

{
  "name": "India LCR Route",
  "routing_type": "lcr",
  "description": "Least cost routing for India",
  "trunks": [
    {
      "trunk_id": "uuid",
      "priority": 1
    }
  ]
}
```

### Assign Route to Client
```http
POST /api/clients/{client_id}/routes
Content-Type: application/json

{
  "route_id": "uuid",
  "mcc": "404",
  "mnc": "10",
  "priority": 1
}
```

---

## Rates API

### List Rates
```http
GET /api/rates?entity_type=client|supplier&entity_id=uuid&country=USA
```

### Add Rate
```http
POST /api/rates
Content-Type: application/json

{
  "entity_type": "client",
  "entity_id": "uuid",
  "mcc": "310",
  "mnc": "410",
  "rate": 0.025
}
```

### Bulk Add Rates
```http
POST /api/rates/bulk
Content-Type: application/json

{
  "entity_type": "client",
  "entity_id": "uuid",
  "rates": [
    {"mcc": "310", "mnc": "410", "rate": 0.025},
    {"mcc": "310", "mnc": "260", "rate": 0.022}
  ]
}
```

### MCC/MNC Database
```http
GET /api/rates/mccmnc?country=USA
```

---

## SMS API

### Send SMS (HTTP API)
```http
POST /api/sms/send
Content-Type: application/json
X-API-Key: client_api_key

{
  "source": "BRAND",
  "destination": "+14155551234",
  "message": "Hello World"
}

Response:
{
  "message_id": "MSG123456",
  "status": "submitted",
  "client_rate": 0.025
}
```

### Get SMS Status
```http
GET /api/sms/status/{message_id}

Response:
{
  "message_id": "MSG123456",
  "status": "delivered",
  "submit_time": "2024-01-15T10:30:00Z",
  "deliver_time": "2024-01-15T10:30:05Z"
}
```

### SMS Logs
```http
GET /api/sms/logs?client_id=uuid&status=delivered&from=2024-01-01&to=2024-01-15&page=1&limit=100

Response:
{
  "items": [...],
  "total": 10000,
  "page": 1,
  "limit": 100
}
```

### DLR Callback (for suppliers)
```http
GET /api/sms/dlr?msgid=MSG123&status=DELIVRD&dlr_time=2024-01-15T10:30:05
```

---

## Billing API

### Get Billing Summary
```http
GET /api/billing/summary?from=2024-01-01&to=2024-01-31

Response:
{
  "total_revenue": 50000.00,
  "total_cost": 30000.00,
  "total_profit": 20000.00,
  "total_messages": 2000000
}
```

### Payments
```http
GET /api/billing/payments?entity_type=client&entity_id=uuid
POST /api/billing/payments
```

### Invoices
```http
GET /api/billing/invoices?client_id=uuid&status=sent
POST /api/billing/invoices/generate
GET /api/billing/invoices/{invoice_id}
PUT /api/billing/invoices/{invoice_id}
POST /api/billing/invoices/{invoice_id}/send
```

---

## Reports API

### Real-time Stats
```http
GET /api/reports/realtime

Response:
{
  "total_messages": 15000,
  "delivered": 14500,
  "failed": 500,
  "revenue": 375.00,
  "profit": 150.00,
  "tps": 45
}
```

### Hourly Report
```http
GET /api/reports/hourly?date=2024-01-15&entity_type=client&entity_id=uuid
```

### Daily Report
```http
GET /api/reports/daily?from=2024-01-01&to=2024-01-31&entity_type=system
```

### Monthly Report
```http
GET /api/reports/monthly?year=2024&entity_type=client&entity_id=uuid
```

### Export Report
```http
GET /api/reports/export?type=daily&format=csv|xlsx&from=2024-01-01&to=2024-01-31
```

---

## Notifications API

### List Notifications
```http
GET /api/notifications?read=false
```

### Mark as Read
```http
PUT /api/notifications/{notification_id}/read
POST /api/notifications/read-all
```

### Notification Settings
```http
GET /api/notifications/settings
PUT /api/notifications/settings
```

---

## System API

### License Info
```http
GET /api/system/license
```

### Platform Settings
```http
GET /api/system/settings
PUT /api/system/settings
```

### Backup
```http
POST /api/system/backup
GET /api/system/backups
POST /api/system/restore
```

### Health Check
```http
GET /health

Response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "smpp_server": "running"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "detail": "Error message",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Rate Limited
- `500` - Internal Server Error

---

## Rate Limiting

- API: 1000 requests/minute per API key
- SMS Send: Based on client TPS setting
- Reports: 10 requests/minute

---

## Webhooks

Configure webhook URLs in client settings to receive real-time notifications:

### DLR Webhook
```http
POST {webhook_url}
Content-Type: application/json

{
  "event": "dlr",
  "message_id": "MSG123456",
  "status": "delivered",
  "timestamp": "2024-01-15T10:30:05Z",
  "error_code": null
}
```

### Low Balance Webhook
```http
POST {webhook_url}
Content-Type: application/json

{
  "event": "low_balance",
  "client_id": "uuid",
  "balance": 45.50,
  "threshold": 100.00,
  "timestamp": "2024-01-15T10:30:05Z"
}
```
