# AI Customer Service Manager

Aplikasi web full-stack untuk mengelola AI Agent WhatsApp Customer Service.

## Arsitektur

- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: Next.js 14 + TailwindCSS + Shadcn UI
- **Database**: PostgreSQL 16 + pgvector
- **Cache/Queue**: Redis + BullMQ
- **AI**: SumoPod (OpenAI-compatible)
- **WhatsApp**: KirimDev API

## Quick Start

```bash
# 1. Clone dan setup environment
cp .env.example .env

# 2. Jalankan dengan Docker Compose
docker-compose up -d

# 3. Jalankan migrasi database
cd backend && npx prisma migrate dev

# 4. Seed data awal
cd backend && npm run seed

# 5. Jalankan development server
# Terminal 1 - Backend
cd backend && npm run start:dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Akses

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Swagger Docs**: http://localhost:3001/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Default Login

- **Email**: admin@example.com
- **Password**: admin123

## Environment Variables

Lihat `.env.example` untuk daftar lengkap environment variables.

## Docker

```bash
# Build dan jalankan semua service
docker-compose up -d --build

# Lihat logs
docker-compose logs -f

# Stop semua service
docker-compose down

# Reset database
docker-compose down -v
```

## Struktur Proyek

```
├── backend/          # NestJS API Server
├── frontend/         # Next.js Admin Panel
├── docker-compose.yml
├── .env.example
└── README.md
```

## Dokumentasi

- [API Documentation](http://localhost:3001/api/docs)
- [Deployment Guide](docs/deployment.md)
- [Configuration Guide](docs/configuration.md)
