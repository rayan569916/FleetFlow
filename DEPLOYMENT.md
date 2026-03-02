# FleetFlow Deployment (Ubuntu + Nginx + Gunicorn, no Docker)

## 1) Prerequisites
- Ubuntu server with `nginx`, `python3`, `python3-venv`, `pip`, `node`, `npm`.
- Domain DNS for `app.captaincargo.co` pointing to the droplet.
- MySQL DigitalOcean managed database credentials.

## 2) Environment Variables
Create a `.env` file in project root (do not commit it), based on `.env.example`:

```env
SECRET_KEY=replace_with_secure_secret
DB_HOST=your-db-host
DB_PORT=25060
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=fleetflow_db
```

## 3) Frontend Build
From `fleetflow-dashboard/`:

```bash
npm ci
npm run build -- --configuration production
```

Production build uses:
- `src/environments/environment.prod.ts`
- `apiBaseUrl: "/api"`
- Angular service worker enabled in production.

Build output is under:
- `fleetflow-dashboard/dist/fleetflow-dashboard/browser`

Copy build artifacts to Nginx web root:

```bash
sudo mkdir -p /var/www/frontend
sudo rsync -av --delete fleetflow-dashboard/dist/fleetflow-dashboard/browser/ /var/www/frontend/
```

## 4) Backend Setup + Gunicorn
From project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

Run backend with Gunicorn:

```bash
gunicorn --bind 127.0.0.1:5000 backend.app:app
```

Recommended: run Gunicorn as a `systemd` service for auto-restart.

## 5) Nginx Configuration
Use:
- `deployment/nginx/captaincargo.conf`

Deploy:

```bash
sudo cp deployment/nginx/captaincargo.conf /etc/nginx/sites-available/captaincargo.conf
sudo ln -sf /etc/nginx/sites-available/captaincargo.conf /etc/nginx/sites-enabled/captaincargo.conf
sudo nginx -t
sudo systemctl reload nginx
```

Notes:
- SPA fallback is configured (`try_files ... /index.html`).
- `/api` is proxied to Gunicorn (`127.0.0.1:5000`).
- `ngsw.json` and `ngsw-worker.js` are set to no-cache headers.

## 6) Security Checklist
- No secrets in frontend code.
- No DB credentials hardcoded in backend.
- No wildcard CORS.
- `debug=False` in backend run configuration.
- Keep `.env` out of git.

## 7) Quick Verification
- Frontend loads from `https://app.captaincargo.co`.
- API calls resolve via `/api/...` and return 200/401/403 as expected.
- Gunicorn process is healthy on `127.0.0.1:5000`.
- Nginx serves SPA routes and backend proxy correctly.

