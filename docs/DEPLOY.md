# Deploy PRAHARI (web app)

One public entry: the gateway serves the dashboard, proxies the ML service,
persists to a JSON file. No database to operate for a demo deployment.

## Option A — Docker Compose (any VPS with Docker)

```bash
cd robit/infra
docker compose up --build
# open http://SERVER:3000/ → "Load demo data" → click a complaint
```

Compose runs 2 services (`gateway`, `ml-service`); UI + terminal data are baked
into the gateway image. Store is ephemeral — mount a volume on
`/app/data/gateway_store.json` if restarts must keep history.

## Option B — two processes (laptop / VM without Docker)

```bash
cd robit/ml-service && pip install -r requirements.txt && python -m uvicorn app:app --port 8000 &
cd robit/gateway && npm install && node server.js &
# open http://localhost:3000/ → "Load demo data"
```

Or `python hold_demo.py` from `robit/` (boots + seeds + holds).

## Option C — PaaS (Render / Railway / Fly)

Deploy `ml-service/` (Python, `uvicorn app:app --port $PORT`) and `gateway/`
(Node, `node server.js`) as two services; set on gateway:
`ML_URL=<ml-service URL>`, `DATA_DIR` only if data lives elsewhere.
Seed after deploy: `curl -XPOST <gateway>/api/demo/seed`.

## Env vars

`PORT` · `ML_URL` · `MODEL_VERSION` · `STORE_FILE` · `DATA_DIR` ·
`TERMINALS_FILE` · `ML_TERMINALS` · `ML_CONFIG` · `FRONTEND_DIR`.
See README for what each does.

## Production notes (not demo scope)

File store → Postgres; add auth/RBAC in front of `/api/actions/*`;
map tiles + Leaflet CDN need internet (panels work offline);
thresholds in `data/config.json` must be recalibrated per city —
see `docs/RESULTS.md`.
