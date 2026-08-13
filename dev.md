# Démarrer le projet en local

4 processus à lancer : NATS, root-worker, backend, dashboard.

## Prérequis

- Node.js 20.19+ or 22.12+, pnpm
- Go ≥ 1.25
- Docker (pour NATS)

## 1. Dépendances

```bash
pnpm install
```

## 2. Base de données

```bash
pnpm --filter @app/database db:push
pnpm --filter @app/database db:seed   # crée admin / admin
```

## 3. Variables d'environnement backend

```bash
cat > apps/backend/.env << 'END'
JWT_SECRET=dev-secret
NATS_URL=nats://127.0.0.1:4222
NATS_USER=backend
NATS_PASS=backend-dev
END
```

## 4. NATS (terminal 1)

```bash
docker compose up
```

## 5. Root worker (terminal 2 — nécessite root)

```bash
cd apps/root-worker
go build -o root-worker .
sudo NATS_URL=nats://127.0.0.1:4222 NATS_USER=worker NATS_PASS=worker-dev ./root-worker
```

## 6. Backend (terminal 3)

```bash
pnpm -F @app/backend dev
# écoute sur http://localhost:9001
```

## 7. Dashboard (terminal 4)

```bash
pnpm -F @app/dashboard dev
# écoute sur http://localhost:5173
```

---

Login : `admin / admin`
