"""
Voice Prescription Writer - Development Start Script
Starts both backend and frontend servers for local development.
"""
import subprocess
import sys
import os
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent


def check_prerequisites():
    """Check that required tools are installed."""
    errors = []
    
    # Check Python
    try:
        result = subprocess.run([sys.executable, "--version"], capture_output=True, text=True)
        print(f"[OK] Python: {result.stdout.strip()}")
    except FileNotFoundError:
        errors.append("Python not found")
    
    # Check Node
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        print(f"[OK] Node.js: {result.stdout.strip()}")
    except FileNotFoundError:
        errors.append("Node.js not found")
    
    # Check npm
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True, shell=True)
        print(f"[OK] npm: {result.stdout.strip()}")
    except FileNotFoundError:
        errors.append("npm not found")
    
    if errors:
        print("\n[ERROR] Missing prerequisites:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)


def check_env():
    """Check that .env file exists."""
    env_file = PROJECT_ROOT / ".env"
    env_example = PROJECT_ROOT / ".env.example"
    
    if not env_file.exists():
        if env_example.exists():
            print("[INFO] No .env file found. Copying from .env.example...")
            import shutil
            shutil.copy(env_example, env_file)
            print("[OK] Created .env from .env.example (mock providers enabled)")
        else:
            print("[WARN] No .env file found. Using default mock configuration.")


def start_backend():
    """Start the FastAPI backend server."""
    print("\n[STARTING] Backend server on http://localhost:8000...")
    
    env = os.environ.copy()
    env["PYTHONPATH"] = str(PROJECT_ROOT)
    
    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "backend.main:app",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
        ],
        cwd=str(PROJECT_ROOT),
        env=env,
    )
    return process


def start_frontend():
    """Start the Vite frontend dev server."""
    frontend_dir = PROJECT_ROOT / "frontend"
    
    if not frontend_dir.exists():
        print("[ERROR] Frontend directory not found!")
        return None
    
    print("[STARTING] Frontend dev server on http://localhost:5173...")
    
    process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(frontend_dir),
        shell=True,
    )
    return process


def main():
    print("=" * 60)
    print("  Voice Prescription Writer - Development Server")
    print("=" * 60)
    print()
    
    check_prerequisites()
    check_env()
    
    backend_proc = start_backend()
    time.sleep(2)
    frontend_proc = start_frontend()
    
    print("\n" + "=" * 60)
    print("  [ONLINE] Development servers running!")
    print("  Frontend Application: http://localhost:5173")
    print("  Backend API:          http://localhost:8000")
    print("  Interactive API Docs: http://localhost:8000/docs")
    print("  Press Ctrl+C to stop all servers")
    print("=" * 60 + "\n")
    
    try:
        while True:
            if backend_proc and backend_proc.poll() is not None:
                print("[WARN] Backend server stopped unexpectedly!")
                break
            if frontend_proc and frontend_proc.poll() is not None:
                print("[WARN] Frontend server stopped unexpectedly!")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n[SHUTDOWN] Stopping all servers...")
    finally:
        if backend_proc:
            backend_proc.terminate()
            try:
                backend_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                backend_proc.kill()
        if frontend_proc:
            frontend_proc.terminate()
            try:
                frontend_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                frontend_proc.kill()
        print("[OK] All servers shut down cleanly.")


if __name__ == "__main__":
    main()
