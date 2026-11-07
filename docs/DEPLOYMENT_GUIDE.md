# Deployment Guide

This is how to run Voice Prescription Writer on a real machine (a hospital PC/server on the LAN, or a small cloud VM) without installing Python or Node on that machine. Docker builds the backend image and the frontend/nginx image from the Dockerfiles in this repo, then Compose starts Postgres, the backend, and nginx together.

If you only want to try it on your laptop, `docker compose up --build` with the regular `docker-compose.yml` is enough. This guide is for the production-style stack.

## What gets started

There are three services:

- **db** — PostgreSQL. Prescriptions are stored here so they are not lost when the backend container restarts.
- **backend** — FastAPI. It stays on the Docker network at port 8000. That port is not published on the host, so you should not expect http://localhost:8000 to work.
- **frontend** — nginx. This is the process bound to **port 80** on the host. It serves the React app and proxies `/api`, `/health`, `/docs` and `/ws` through to the backend.

So the URL to open is always **http://localhost** (or `http://<server-ip>` if you are on another computer on the same network).

Postgres data, uploaded audio and generated PDFs are stored in Docker volumes (`voice_rx_pg`, `voice_rx_uploads`, `voice_rx_pdf`). Stopping the stack does not delete that data unless you pass `-v`.

## The two compose files

| File | When to use it |
| --- | --- |
| `docker-compose.yml` | Day-to-day local run while developing |
| `docker-compose.prod.yml` | Server / demo / hospital box |

They use the same Dockerfiles. The prod file adds `restart: unless-stopped` (containers come back after a reboot), turns off debug, and caps container logs at 10MB × 5 files so uvicorn output cannot fill the disk.

## Before you start

You need Docker Desktop (Windows/Mac) or Docker Engine with Compose v2 (Linux), Git, and a free port 80. If something else is already using port 80, Compose will fail to bind the frontend.

Copy the example env file once. Do not commit the real `.env`.

```bash
cp .env.example .env
```

Leave `STT_PROVIDER=mock` and `LLM_PROVIDER=mock` if you just want the app to boot. Put Deepgram / OpenAI / Gemini keys in `.env` only on the server that is allowed to have them.

## On-prem / hospital machine

From the repo root:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

The first build takes a few minutes. `-d` runs it in the background.

On Linux you can use the script instead, which copies `.env` if it is missing and waits until `/health` responds:

```bash
chmod +x deploy/production-deploy.sh
./deploy/production-deploy.sh
```

That script is meant for a Linux VM. On Windows, run the `docker compose ...` command above in PowerShell.

When it is up:

```bash
curl http://localhost/health
```

You should get a successful response, then open http://localhost in a browser.

To stop:

```bash
docker compose -f docker-compose.prod.yml down
```

Add `-v` only if you really want to wipe the database and uploaded files.

If the frontend container is restarting, check `docker compose -f docker-compose.prod.yml logs backend`. The frontend waits until the backend healthcheck passes, so a backend crash looks like the website never comes up.

## HTTPS

Compose itself only serves HTTP on port 80. That is fine on a closed hospital LAN.

If the machine has a public hostname, put Caddy in front and let it get a Let's Encrypt certificate. Point DNS at the server first, then:

```bash
export SITE_ADDRESS=rx.yourhospital.org
caddy run --config deploy/Caddyfile
```

Leave Docker on port 80. Caddy listens on 443 and forwards to `127.0.0.1:80`. There is a template at `deploy/Caddyfile`.

## Cloud VMs (Lightsail, DigitalOcean, Railway)

The idea is the same on every provider: create a small Ubuntu VM, install Docker, clone this repo, copy `.env`, run the prod compose file. 2 GB RAM is enough.

### AWS Lightsail

1. Create an Ubuntu instance. In the firewall, open HTTP (and HTTPS if you will use Caddy).
2. SSH in and install Docker using the official Ubuntu instructions: https://docs.docker.com/engine/install/ubuntu/
3. Clone the repo, `cp .env.example .env`, then `./deploy/production-deploy.sh`.

### DigitalOcean Droplet

Same steps as Lightsail. A Droplet with Docker is the simple option.

DigitalOcean App Platform is built around one buildpack / one Dockerfile per service, not this two-container Compose file. If you still want App Platform, you would have to wire `Dockerfile.backend` and `Dockerfile.frontend` as two apps and copy the environment variables from `docker-compose.prod.yml`. A Droplet is less work.

### Railway

Railway is also happier with a single service. Easiest path is still a VM that can run Compose. If you split it on Railway:

- one service from `Dockerfile.backend`
- one service from `Dockerfile.frontend`, public port 80
- the same env vars as `.env.example`
- persistent volumes for `/app/data`, `/app/uploads` and `/app/pdf_output`

## Keys and GitHub Actions

API keys belong in the server `.env` only (`DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `SECRET_KEY`).

GitHub Actions CI already runs with mock STT/LLM, so it does not need those secrets. Add them as GitHub Actions secrets only if a later workflow starts calling live providers.

## Database

Docker Compose and Render use **PostgreSQL**, not SQLite. That is so prescriptions survive a container restart. Compose starts a `db` service (`postgres:16-alpine`) and sets `DATABASE_URL` on the backend. Render creates a Postgres instance (`voice-rx-db`) and injects the same kind of URL.

`python start.py` without Docker can still use SQLite from `.env.example`. Pytest in GitHub Actions also stays on SQLite so CI does not need a cloud database.

Do not put a `sqlite://` URL in Docker or Render env vars. If `DATABASE_URL` starts with `postgresql://`, the app will not fall back to SQLite.

## Render (optional public demo)

Render does not run `docker-compose.yml` as one stack. It builds the same Dockerfiles as two free web services (`render.yaml`): backend from `Dockerfile.backend`, frontend from `Dockerfile.frontend`.

Local compose is unchanged. On Render, the frontend container reads `PORT` and `BACKEND_UPSTREAM` and points nginx at the public backend URL. Free web services cannot talk over Render’s private network, which is why that public URL is used.

The site will sleep after about 15 minutes with no traffic. A ping to the frontend `/health` (and the backend `/health` if you want both warm) can wake it. Prescriptions live in Render Postgres, so a web-service sleep should not wipe the database. The free Postgres plan can still expire later; if Render asks you to upgrade the database, that is separate from the web services.

## Quick check that it worked

```bash
docker compose -f docker-compose.prod.yml ps
curl -fsS http://localhost/health
```

Both containers should be running / healthy. If `ps` shows the frontend waiting and the backend unhealthy, look at backend logs before rebuilding nginx.
