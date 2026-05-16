# net2app SMS Hub - Complete Deployment Guide

## System Architecture Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    net2app SMS HUB ARCHITECTURE                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                      CLIENT LAYER                                                │   │
│  │                                                                                                   │   │
│  │   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                  │   │
│  │   │  Client A    │    │  Client B    │    │  Client C    │    │  Client D    │                  │   │
│  │   │  SMPP Bind   │    │  HTTP API    │    │  SMPP Bind   │    │  HTTP API    │                  │   │
│  │   │  TRX Mode    │    │  REST Call   │    │  TX Mode     │    │  REST Call   │                  │   │
│  │   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                  │   │
│  │          │                   │                   │                   │                           │   │
│  └──────────┼───────────────────┼───────────────────┼───────────────────┼───────────────────────────┘   │
│             │                   │                   │                   │                               │
│             ▼                   ▼                   ▼                   ▼                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                    SMPP SERVER LAYER (Python SMPP)                               │   │
│  │                                                                                                   │   │
│  │   ┌────────────────────────────────────────────────────────────────────────────────────────┐    │   │
│  │   │                              SMPP Server (Port 2775)                                    │    │   │
│  │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │    │   │
│  │   │  │ Auth Module │  │ Session Mgr │  │ TPS Control │  │ IP Whitelist│                   │    │   │
│  │   │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘                   │    │   │
│  │   └────────────────────────────────────────┬───────────────────────────────────────────────┘    │   │
│  │                                             │                                                    │   │
│  └─────────────────────────────────────────────┼────────────────────────────────────────────────────┘   │
│                                                │                                                        │
│                                                ▼                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                    CORE ENGINE LAYER (FastAPI)                                   │   │
│  │                                                                                                   │   │
│  │   ┌─────────────────────────────────────────────────────────────────────────────────────────┐   │   │
│  │   │                                MESSAGE PROCESSING PIPELINE                               │   │   │
│  │   │                                                                                          │   │   │
│  │   │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐             │   │   │
│  │   │  │   1.      │  │   2.      │  │   3.      │  │   4.      │  │   5.      │             │   │   │
│  │   │  │ RECEIVE   │─▶│TRANSLATE  │─▶│  ROUTE    │─▶│  BILLING  │─▶│  FORWARD  │             │   │   │
│  │   │  │  MESSAGE  │  │ (Client)  │  │ SELECTION │  │  CHECK    │  │ TO TRUNK  │             │   │   │
│  │   │  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘             │   │   │
│  │   │        │              │              │              │              │                    │   │   │
│  │   │        ▼              ▼              ▼              ▼              ▼                    │   │   │
│  │   │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐             │   │   │
│  │   │  │ - Validate│  │ - Content │  │ - MCC/MNC │  │ - Balance │  │ - Select  │             │   │   │
│  │   │  │ - Auth    │  │ - Number  │  │ - Priority│  │ - Credit  │  │   Supplier│             │   │   │
│  │   │  │ - Log     │  │ - SID     │  │ - LCR     │  │ - Charge  │  │ - Apply   │             │   │   │
│  │   │  │           │  │ - OTP     │  │ - Perf    │  │ - Record  │  │   Trans.  │             │   │   │
│  │   │  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘             │   │   │
│  │   │                                                                                          │   │   │
│  │   └─────────────────────────────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                                                   │   │
│  │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐                │   │
│  │   │ Rate Engine│  │Route Engine│  │Billing Eng │  │Report Gen  │  │ Notif Eng  │                │   │
│  │   └────────────┘  └────────────┘  └────────────┘  └────────────┘  └────────────┘                │   │
│  │                                                                                                   │   │
│  └───────────────────────────────────────────┬───────────────────────────────────────────────────────┘   │
│                                               │                                                          │
│                                               ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                    SUPPLIER LAYER (Kannel + HTTP)                                │   │
│  │                                                                                                   │   │
│  │   ┌────────────────────────────────────┐    ┌────────────────────────────────────┐              │   │
│  │   │       KANNEL SMSC (Port 13013)     │    │         HTTP API Connector          │              │   │
│  │   │  ┌──────────────────────────────┐  │    │  ┌──────────────────────────────┐  │              │   │
│  │   │  │     SMPP Client Connections  │  │    │  │    REST/HTTP Integrations    │  │              │   │
│  │   │  └──────────────────────────────┘  │    │  └──────────────────────────────┘  │              │   │
│  │   └────────────────┬───────────────────┘    └────────────────┬───────────────────┘              │   │
│  │                    │                                          │                                  │   │
│  └────────────────────┼──────────────────────────────────────────┼──────────────────────────────────┘   │
│                       │                                          │                                      │
│                       ▼                                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                    EXTERNAL SMSC / API PROVIDERS                                 │   │
│  │                                                                                                   │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │   │  AllSMS      │  │  BD Telecom  │  │  India DLT   │  │  Gulf SMS    │  │  US Carrier  │      │   │
│  │   │  SMPP        │  │  HTTP API    │  │  SMPP        │  │  SMPP        │  │  HTTP API    │      │   │
│  │   │  5.78.72.23  │  │  api.bdtel   │  │  103.25.x    │  │  185.50.x    │  │  api.uscarr  │      │   │
│  │   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  │                                                                                                   │   │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                    DATA LAYER                                                    │   │
│  │                                                                                                   │   │
│  │   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐                        │   │
│  │   │    PostgreSQL      │  │      Redis         │  │    RabbitMQ        │                        │   │
│  │   │    (Main DB)       │  │    (Cache/Queue)   │  │  (Message Queue)   │                        │   │
│  │   │                    │  │                    │  │                    │                        │   │
│  │   │ - Users            │  │ - Session Data     │  │ - SMS Queue        │                        │   │
│  │   │ - Clients          │  │ - Rate Cache       │  │ - DLR Queue        │                        │   │
│  │   │ - Suppliers        │  │ - Route Cache      │  │ - Notification Q   │                        │   │
│  │   │ - Routes/Trunks    │  │ - TPS Counters     │  │                    │                        │   │
│  │   │ - Rates/MCC/MNC    │  │                    │  │                    │                        │   │
│  │   │ - SMS Logs/CDR     │  │                    │  │                    │                        │   │
│  │   │ - Billing/Payments │  │                    │  │                    │                        │   │
│  │   └────────────────────┘  └────────────────────┘  └────────────────────┘                        │   │
│  │                                                                                                   │   │
│  └───────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Routing Decision Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           SMS ROUTING DECISION FLOW                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│   INCOMING MESSAGE                                                                      │
│         │                                                                               │
│         ▼                                                                               │
│   ┌─────────────┐                                                                       │
│   │ 1. VALIDATE │──No──▶ REJECT (Invalid credentials/IP)                               │
│   │    CLIENT   │                                                                       │
│   └──────┬──────┘                                                                       │
│          │ Yes                                                                          │
│          ▼                                                                               │
│   ┌─────────────┐                                                                       │
│   │ 2. APPLY    │                                                                       │
│   │  CLIENT     │  (Content/Number/SID translations in priority order)                 │
│   │ TRANSLATION │                                                                       │
│   └──────┬──────┘                                                                       │
│          │                                                                               │
│          ▼                                                                               │
│   ┌─────────────┐                                                                       │
│   │ 3. LOOKUP   │                                                                       │
│   │  MCC/MNC    │  (Parse destination → Identify country/operator)                     │
│   └──────┬──────┘                                                                       │
│          │                                                                               │
│          ▼                                                                               │
│   ┌─────────────┐                                                                       │
│   │ 4. GET      │                                                                       │
│   │ CLIENT RATE │  (Lookup rate for this MCC/MNC for this client)                      │
│   └──────┬──────┘                                                                       │
│          │                                                                               │
│          ▼                                                                               │
│   ┌─────────────┐                                                                       │
│   │ 5. CHECK    │──No──▶ REJECT (Insufficient balance)                                 │
│   │   BALANCE   │  Prepaid: balance >= rate                                            │
│   │             │  Postpaid: balance + credit_limit >= rate                            │
│   └──────┬──────┘                                                                       │
│          │ Yes                                                                          │
│          ▼                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐              │
│   │ 6. ROUTE SELECTION                                                   │              │
│   │                                                                      │              │
│   │   ┌─────────────────┐                                               │              │
│   │   │ Get Client      │  (Check client's assigned routes)            │              │
│   │   │ Routing Plan    │                                               │              │
│   │   └────────┬────────┘                                               │              │
│   │            │                                                         │              │
│   │            ▼                                                         │              │
│   │   ┌─────────────────┐                                               │              │
│   │   │ Match Routes by │  (MCC/MNC prefix matching)                    │              │
│   │   │ Destination     │                                               │              │
│   │   └────────┬────────┘                                               │              │
│   │            │                                                         │              │
│   │            ▼                                                         │              │
│   │   ┌─────────────────────────────────────────────────────┐           │              │
│   │   │ Apply Routing Method                                 │           │              │
│   │   │                                                      │           │              │
│   │   │  PRIORITY:     Select trunk with highest priority   │           │              │
│   │   │  LCR:          Select supplier with lowest cost     │           │              │
│   │   │  PERFORMANCE:  Select supplier with best DLR ratio  │           │              │
│   │   │  ROUND_ROBIN:  Load balance across trunks           │           │              │
│   │   │  TESTING:      Use test route for validation        │           │              │
│   │   │                                                      │           │              │
│   │   └────────┬────────────────────────────────────────────┘           │              │
│   │            │                                                         │              │
│   └────────────┼─────────────────────────────────────────────────────────┘              │
│                │                                                                         │
│                ▼                                                                         │
│   ┌─────────────┐                                                                       │
│   │ 7. SELECT   │                                                                       │
│   │  SUPPLIER   │  (Get supplier from selected trunk)                                  │
│   │  FROM TRUNK │                                                                       │
│   └──────┬──────┘                                                                       │
│          │                                                                               │
│          ▼                                                                               │
│   ┌─────────────┐                                                                       │
│   │ 8. GET      │                                                                       │
│   │ SUPPLIER    │  (Lookup supplier rate for MCC/MNC)                                  │
│   │   RATE      │                                                                       │
│   └──────┬──────┘                                                                       │
│          │                                                                               │
│          ▼                                                                               │
│   ┌─────────────┐                                                                       │
│   │ 9. APPLY    │                                                                       │
│   │  SUPPLIER   │  (Content/Number transformations)                                    │
│   │ TRANSLATION │                                                                       │
│   └──────┬──────┘                                                                       │
│          │                                                                               │
│          ▼                                                                               │
│   ┌─────────────┐                                                                       │
│   │ 10. SUBMIT  │  SMPP → Kannel → External SMSC                                       │
│   │ TO SUPPLIER │  HTTP → Direct API call                                              │
│   └──────┬──────┘                                                                       │
│          │                                                                               │
│          ▼                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐              │
│   │ 11. BILLING & LOGGING                                                │              │
│   │                                                                      │              │
│   │  Based on billing_mode (send/submit/dlr):                           │              │
│   │  ┌─────────────────────────────────────────────────────────────┐   │              │
│   │  │ - Charge client: balance -= client_rate                      │   │              │
│   │  │ - Record supplier cost: supplier_rate                        │   │              │
│   │  │ - Calculate profit: client_rate - supplier_rate              │   │              │
│   │  │ - Insert SMS log with all details                            │   │              │
│   │  │ - Update daily/hourly reports                                │   │              │
│   │  └─────────────────────────────────────────────────────────────┘   │              │
│   │                                                                      │              │
│   └──────────────────────────────────────────────────────────────────────┘              │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Server Requirements

### Minimum Hardware
- CPU: 4 cores
- RAM: 8 GB
- Storage: 100 GB SSD
- Network: 1 Gbps

### Recommended for Production
- CPU: 8+ cores
- RAM: 32 GB
- Storage: 500 GB NVMe SSD
- Network: 10 Gbps

## Quick Start Installation

```bash
# Clone and run installation
git clone https://github.com/net2app/sms-hub.git
cd sms-hub
chmod +x scripts/install.sh
sudo ./scripts/install.sh
```

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| SMPP Server | 2775 | Client SMPP connections |
| API Server | 8000 | REST API endpoints |
| Frontend | 3000 | Web dashboard |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & sessions |
| RabbitMQ | 5672 | Message queue |
| Kannel SMPP | 2776 | Outbound SMPP |
| Kannel HTTP | 13013 | Kannel admin |

## API Endpoints Overview

See `API_DOCUMENTATION.md` for complete endpoint reference.
