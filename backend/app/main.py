"""
net2app SMS Hub - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import structlog
import uvicorn

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.api import (
    auth, users, clients, suppliers, trunks, routes,
    rates, billing, sms, reports, notifications, system
)
from app.services.smpp_server import SMPPServer
from app.services.scheduler import start_scheduler

logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting net2app SMS Hub...")
    
    # Start SMPP server
    smpp_server = SMPPServer()
    await smpp_server.start()
    
    # Start background scheduler
    start_scheduler()
    
    logger.info("net2app SMS Hub started successfully")
    yield
    
    # Shutdown
    logger.info("Shutting down net2app SMS Hub...")
    await smpp_server.stop()

app = FastAPI(
    title="net2app SMS Hub API",
    description="Enterprise SMS Gateway Management Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["Suppliers"])
app.include_router(trunks.router, prefix="/api/trunks", tags=["Trunks"])
app.include_router(routes.router, prefix="/api/routes", tags=["Routes"])
app.include_router(rates.router, prefix="/api/rates", tags=["Rates"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])
app.include_router(sms.router, prefix="/api/sms", tags=["SMS"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(system.router, prefix="/api/system", tags=["System"])

@app.get("/")
async def root():
    return {
        "name": "net2app SMS Hub",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
