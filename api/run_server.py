"""Run the FastAPI app with environment-configurable host/port.

Usage (PowerShell):

    $env:API_HOST = "0.0.0.0"
    $env:API_PORT = "8000"
    python api\run_server.py

Usage (bash):

    export API_HOST=0.0.0.0
    export API_PORT=8000
    python api/run_server.py

This script centralizes the host/port configuration and avoids hardcoding values
in documentation or commands. It runs `uvicorn` programmatically.
"""
import os
import sys


def main():
    host = os.environ.get("API_HOST", "127.0.0.1")
    port = int(os.environ.get("API_PORT", os.environ.get("PORT", 8000)))
    log_level = os.environ.get("API_LOG_LEVEL", "info")

    try:
        import uvicorn
    except Exception:
        print("uvicorn is required to run the server. Install with: pip install uvicorn")
        raise

    uvicorn.run("api.main:app", host=host, port=port, log_level=log_level)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.exit(1)
