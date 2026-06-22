<div align="center">
  <h1>💬 ForgeChat</h1>
  <p><strong>Clone Discord self-hosted — serveurs, salons et messages en temps réel, hébergez votre propre espace de communication.</strong></p>

  ![Version](https://img.shields.io/badge/version-3.0.0-blue)
  ![Stack](https://img.shields.io/badge/stack-Rust%20%2B%20Axum%20%2B%20React%20%2B%20WebSocket-purple)
  ![License](https://img.shields.io/badge/license-MIT-green)
  ![Status](https://img.shields.io/badge/status-production-brightgreen)
</div>

---

## 📋 Description

ForgeChat est une application de messagerie temps réel self-hosted inspirée de Discord. Elle permet de créer des serveurs, des salons textuels et d'échanger des messages instantanément via WebSocket. Conçue avec Rust + Axum pour le backend haute performance et React pour le frontend, elle s'appuie sur une authentification robuste avec cookies HttpOnly et système de tickets WebSocket.

**Production** : [https://forgechat.heiphaistos.org](https://forgechat.heiphaistos.org)

---

## ✨ Fonctionnalités

- **Serveurs et salons** : Création de serveurs multi-salons (texte, annonce) avec gestion des membres
- **Messages temps réel** : WebSocket avec broadcast vers tous les membres connectés du serveur
- **Gestion d'amis** : Demandes d'amitié, liste, notifications
- **Notifications** : Indicateurs de messages non lus, last_read par salon
- **Upload de fichiers** : Images et pièces jointes dans les messages
- **Auth sécurisée** : Cookies HttpOnly + JWT signé + système de tickets ws-ticket pour WebSocket
- **Support WebRTC** : Serveur TURN/STUN coturn intégré pour la voix et la vidéo
- **Interface réactive** : Sidebar serveurs, liste des salons, messages paginés

---

## 🛠️ Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 19 · TypeScript · Vite · TailwindCSS |
| Backend | Rust · Axum · Tokio · tower |
| Base de données | PostgreSQL · SQLx |
| Temps réel | WebSocket (tokio-tungstenite) |
| Auth | JWT · HttpOnly cookies · ws-ticket |
| Médias | coturn 4.6.1 (TURN/STUN) |
| Déploiement | Docker · Docker Compose · nginx |

---

## 🚀 Installation & Déploiement

### Prérequis

- Docker >= 24
- Docker Compose >= 2.x
- Un domaine avec certificat SSL (TURN nécessite TLS)

### Variables d'environnement

Créer un fichier `.env` à la racine :

```env
DATABASE_URL=postgresql://forgechat:password@db:5432/forgechat
JWT_SECRET=votre_secret_jwt_tres_long_minimum_32_chars
JWT_EXPIRES_IN=900
REFRESH_SECRET=votre_secret_refresh_different
TURN_URL=turns:forgechat.heiphaistos.org:5349
TURN_USERNAME=turn_user
TURN_PASSWORD=turn_password
UPLOAD_MAX_SIZE_MB=10
```

### Démarrage

```bash
# Cloner le dépôt
git clone https://github.com/Heiphaistos/PureConnect-AppWeb.git
cd PureConnect-AppWeb

# Lancer les conteneurs (backend, frontend, db, coturn)
docker compose up -d

# Vérifier les migrations
docker compose exec backend sqlx migrate run

# Logs en temps réel
docker compose logs -f backend
```

### Mise à jour production

```bash
docker compose pull
docker compose up -d --force-recreate --no-deps backend frontend
```

### Configuration nginx

```nginx
server {
    listen 443 ssl;
    server_name forgechat.heiphaistos.org;

    location /api {
        proxy_pass http://127.0.0.1:3020;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://127.0.0.1:3021;
    }
}
```

---

## 📁 Structure du projet

```
PureConnect-AppWeb/
├── backend/           # Rust + Axum
│   ├── src/
│   │   ├── routes/    # Endpoints REST (auth, servers, channels, messages)
│   │   ├── ws/        # WebSocket handler + broadcast
│   │   ├── models/    # Structs SQLx
│   │   └── middleware/# Auth JWT, rate limiting
│   └── migrations/    # SQLx migrations PostgreSQL
├── frontend/          # React + TypeScript
│   ├── src/
│   │   ├── components/# ServerList, ChannelList, MessageList
│   │   ├── hooks/     # useWebSocket, useAuth, useMessages
│   │   └── pages/     # Login, App principale
└── docker-compose.yml
```

---

## 🔌 API Reference

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/register` | Créer un compte |
| `POST` | `/api/auth/login` | Connexion (retourne cookie) |
| `POST` | `/api/auth/logout` | Déconnexion |
| `GET` | `/api/servers` | Serveurs de l'utilisateur |
| `POST` | `/api/servers` | Créer un serveur |
| `GET` | `/api/servers/:id/channels` | Salons d'un serveur |
| `GET` | `/api/channels/:id/messages` | Messages paginés |
| `GET` | `/api/ws?ticket=...` | Connexion WebSocket |

---

## 📸 Aperçu

![screenshot](./docs/screenshot.png)

---

## 🔐 Sécurité

- Cookies HttpOnly + Secure + SameSite=Strict pour les tokens JWT
- Système de tickets à usage unique pour l'authentification WebSocket
- Validation de la propriété des ressources (IDOR prevention)
- Rate limiting sur les endpoints d'authentification
- Mots de passe hashés bcrypt cost 12
- Timeouts Axum (30s) + DefaultBodyLimit (1MB)

---

## 📝 Licence

MIT — © 2026 Heiphaistos
