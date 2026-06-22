# VPSConnect — Tableau de bord de monitoring VPS

> Stack de monitoring auto-hébergé pour VPS : métriques système, logs, terminal SSH intégré et tableau de bord temps réel.

[![Backend](https://img.shields.io/badge/Backend-Fastify%20%2B%20TypeScript%20v1.3-blue)](#)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014%20%2B%20React%2018-black)](#)
[![Metrics](https://img.shields.io/badge/Metrics-VictoriaMetrics-orange)](#)
[![Logs](https://img.shields.io/badge/Logs-Loki%20%2B%20Promtail-yellow)](#)
[![License](https://img.shields.io/badge/License-MIT-green)](#)

---

## Vue d'ensemble

VPSConnect est une solution de monitoring complète pour serveurs Linux auto-hébergés. Elle agrège métriques système, logs applicatifs, et expose un terminal web pour administrer le serveur sans quitter le navigateur.

**Composants :** VictoriaMetrics · Loki · Promtail · Fastify API · Next.js Dashboard · Redis · Terminal xterm.js

---

## Fonctionnalités

### Tableau de bord temps réel
- CPU, RAM, disque, réseau en temps réel via WebSocket
- Graphiques historiques (rétention configurable, défaut 2 jours)
- Alertes sur seuil (CPU > X%, disque > Y%)
- Vue multi-services PM2

### Logs centralisés
- Agrégation des logs via Promtail → Loki
- Recherche full-text dans les logs
- Filtrage par service, niveau (INFO/WARN/ERROR), date

### Terminal web
- Terminal SSH intégré via xterm.js + node-pty
- Authentification requise (JWT)
- Session isolée par utilisateur

### Gestion des processus
- Contrôle des processus PM2 (start, stop, restart, logs)
- Statut et uptime de chaque service
- Redémarrage automatique si crash

### Collecteurs de métriques
- systeminformation (CPU, RAM, disque, réseau, température)
- Jobs de collecte planifiés en arrière-plan

---

## Architecture

```
PureConnect-AppWeb/
├── backend/                    # API Fastify (Node.js / TypeScript)
│   └── src/
│       ├── index.ts            # Entrée serveur Fastify
│       ├── redis.ts            # Client Redis
│       ├── types.ts            # Types TypeScript partagés
│       ├── collectors/         # Collecteurs de métriques (systeminformation, PM2)
│       ├── jobs/               # Tâches planifiées
│       ├── middleware/         # Auth JWT, rate limit
│       └── routes/             # Endpoints REST + WebSocket
├── frontend/                   # Next.js 14 App Router
│   ├── app/
│   │   ├── (dashboard)/        # Pages du tableau de bord (auth requise)
│   │   ├── login/              # Page de connexion
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/             # Composants React
│   ├── hooks/                  # Hooks SWR / WebSocket
│   └── lib/
├── config/
│   ├── loki.yml                # Configuration Loki
│   └── promtail.yml            # Configuration Promtail (scrape logs)
├── scripts/                    # Scripts de déploiement et maintenance
├── docker-compose.yml          # Orchestration complète
└── .env.example
```

---

## Stack technique

### Backend (`backend/`)

| Composant | Technologie |
|-----------|-------------|
| Framework | Fastify 4 + TypeScript |
| Auth | JWT + bcrypt |
| Cache | Redis (ioredis) |
| Métriques système | systeminformation |
| Gestion processus | PM2 API |
| Terminal web | node-pty + WebSocket |
| Rate limiting | @fastify/rate-limit |
| Headers sécurité | @fastify/helmet |

### Frontend (`frontend/`)

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS |
| Graphiques | Recharts |
| Data fetching | SWR |
| Terminal | @xterm/xterm + @xterm/addon-fit |
| Icônes | Lucide React |

### Infrastructure

| Service | Rôle | Port interne |
|---------|------|-------------|
| VictoriaMetrics | Stockage métriques TSDB | 8428 |
| Loki | Stockage et indexation des logs | 3100 |
| Promtail | Collecteur de logs → Loki | — |
| Redis | Cache et pub/sub | 6379 |
| Backend | API REST + WebSocket | 3001 |
| Frontend | Dashboard Next.js | 3000 |

---

## Prérequis

- Docker & Docker Compose v2
- Linux (VPS ou machine locale)
- Node.js 20+ (pour développement local)

---

## Installation

### 1. Cloner

```bash
git clone https://github.com/votre-org/vpsconnect /opt/vpsconnect
cd /opt/vpsconnect
```

### 2. Configurer les secrets

```bash
cp .env.example .env
```

Éditer `.env` :

```env
# JWT — générer avec: openssl rand -hex 32
JWT_SECRET=votre_secret_jwt_ici

# Admin — générer le hash avec:
# node -e "const b=require('bcrypt');b.hash('votre_mdp',12).then(console.log)"
ADMIN_PASSWORD_HASH=$2b$12$votre_hash_bcrypt_ici

# Cookie sécurisé (true uniquement avec HTTPS)
COOKIE_SECURE=false

# Redis — générer avec: openssl rand -hex 24
REDIS_PASSWORD=votre_mot_de_passe_redis

# CORS — URL(s) autorisées (séparées par virgule)
FRONTEND_URL=http://localhost:3000
```

### 3. Lancer

```bash
docker compose up -d

# Vérifier que tout démarre
docker compose ps
docker compose logs -f
```

Accès : `http://localhost:3000`

---

## Développement local

### Backend

```bash
cd backend
npm install

# Variables d'environnement
export JWT_SECRET="dev_secret"
export REDIS_URL="redis://:motdepasse@localhost:6379"

# Mode dev (hot reload)
npm run dev
# → http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install

npm run dev
# → http://localhost:3000
```

---

## Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `JWT_SECRET` | Secret JWT (min 32 chars) | `openssl rand -hex 32` |
| `ADMIN_PASSWORD_HASH` | Hash bcrypt du mot de passe admin | `bcrypt.hash('mdp', 12)` |
| `COOKIE_SECURE` | `true` si HTTPS activé | `false` |
| `REDIS_PASSWORD` | Mot de passe Redis | `openssl rand -hex 24` |
| `FRONTEND_URL` | URL(s) CORS autorisées | `https://votre-domaine.com` |
| `VM_URL` | URL interne VictoriaMetrics | `http://victoriametrics:8428` |
| `LOKI_URL` | URL interne Loki | `http://loki:3100` |
| `REDIS_URL` | URL connexion Redis | `redis://:mdp@redis:6379` |

---

## Configuration Promtail

Promtail collecte les logs des conteneurs Docker et les envoie à Loki.

```yaml
# config/promtail.yml — exemple
server:
  http_listen_port: 9080

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
```

---

## API REST

```
POST   /api/auth/login           # Connexion admin
POST   /api/auth/logout          # Déconnexion
GET    /api/auth/me              # Profil courant

GET    /api/metrics/current      # Métriques système en temps réel
GET    /api/metrics/history      # Historique (query VictoriaMetrics)

GET    /api/logs                 # Logs récents (query Loki)
GET    /api/logs/search          # Recherche dans les logs

GET    /api/processes            # Liste des processus PM2
POST   /api/processes/:name/restart  # Redémarrer un processus

WS     /api/terminal             # Terminal web (xterm + node-pty)
WS     /api/metrics/stream       # Stream métriques en temps réel
```

---

## Déploiement production

```yaml
# docker-compose.yml — extrait configuration mémoire
services:
  promtail:
    deploy:
      resources:
        limits:
          memory: 256M        # Min 256M recommandé

  victoriametrics:
    command:
      - -retentionPeriod=2d   # Adapter selon l'espace disque
      - -httpListenAddr=:8428
    deploy:
      resources:
        limits:
          memory: 256M
```

```bash
# Démarrer en production
docker compose up -d --build

# Mise à jour
git pull && docker compose up -d --build

# Backup données
docker compose exec victoriametrics \
  vmbackup -storageDataPath=/victoria-metrics-data -dst=file:///backup/vm
```

---

## Sécurité

- Un seul compte admin (pas de registration publique)
- JWT httpOnly cookie avec `SameSite=Strict`
- Rate limiting sur `/api/auth/login` (protection brute-force)
- Terminal web accessible uniquement après authentification
- Redis protégé par mot de passe
- Tous les ports internes liés à `127.0.0.1` uniquement

---

## Licence

MIT — Voir [LICENSE](LICENSE) pour les détails.
