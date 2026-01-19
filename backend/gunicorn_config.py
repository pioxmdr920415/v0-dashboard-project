#!/usr/bin/env python3
"""
Gunicorn configuration for production deployment
"""

import multiprocessing
import os
from dotenv import load_dotenv

load_dotenv()

# Server socket
bind = os.getenv('GUNICORN_BIND', '0.0.0.0:8000')
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'uvicorn.workers.UvicornWorker'
worker_connections = int(os.getenv('GUNICORN_WORKER_CONNECTIONS', 1000))
timeout = int(os.getenv('GUNICORN_TIMEOUT', 60))
keepalive = int(os.getenv('GUNICORN_KEEPALIVE', 5))

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None

# Logging
accesslog = os.getenv('GUNICORN_ACCESSLOG', '-')  # stdout
errorlog = os.getenv('GUNICORN_ERRORLOG', '-')    # stderr
loglevel = os.getenv('GUNICORN_LOGLEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'dashboard-api'

# Reload on code change (development only)
reload = os.getenv('GUNICORN_RELOAD', 'false').lower() == 'true'

# Server hooks
def on_starting(server):
    """Called just before master process is initialized"""
    print("Server starting...")

def when_ready(server):
    """Called just after the server is started"""
    print(f"Server ready. Workers: {server.cfg.workers}")

def on_exit(server):
    """Called when server is shutting down"""
    print("Server shutting down...")
