# Multi-Container Application Using Docker

A production-ready, multi-container DevOps application built with **Node.js**, **Express**, **MongoDB**, **Nginx**, **Docker Compose**, **Terraform**, **Ansible**, and **GitHub Actions**.

Based on the [roadmap.sh Multi-Container Application DevOps Project](https://roadmap.sh/projects/multi-container-application).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Docker & Containerization](#docker--containerization)
- [CI/CD Pipeline](#cicd-pipeline)

---

## Overview

This project demonstrates the complete end-to-end lifecycle of a stateful, multi-container cloud application. It bridges the gap between single-container local scripting and automated cloud deployment by combining:
- A RESTful **Node.js & Express** backend connected to **MongoDB 7.0**.
- **Docker Compose** multi-container orchestration with persistent named storage volumes.
- An **Nginx** reverse proxy gateway managing HTTP routing and security headers.
- **Infrastructure as Code (Terraform)** for automated cloud virtual machine provisioning.
- **Configuration Management (Ansible)** for automated system hardening and Docker runtime deployment.
- A **GitHub Actions CI/CD pipeline** automating test suites, Docker Hub image publication, and zero-downtime remote deployment.
- A modern, responsive **Web Dashboard** built with Tailwind CSS and Be Vietnam Pro typography.

---

## Key Features

- **Full RESTful Todo API:** Complete CRUD endpoints (`GET /todos`, `POST /todos`, `GET /todos/:id`, `PUT /todos/:id`, `DELETE /todos/:id`).
- **Resilient MongoDB Persistence:** Mongoose connection manager with an exponential backoff retry loop; persistent state backed by Docker named volumes (`mongodb_data`).
- **Health Check & Diagnostics:** `/health` endpoint returning real-time uptime, API memory metrics, and MongoDB connection status.
- **Reverse Proxy Gateway:** Nginx terminating public HTTP traffic, enforcing security headers (`X-Frame-Options`, `X-Content-Type-Options`), and routing upstream traffic to internal container DNS.
- **Responsive Web Dashboard:** Clean, interactive UI with live cluster connection pills, dynamic metrics (Total, Pending, Completed), scope tag selectors, and instant state toggling.
- **Automated Infrastructure as Code:** Terraform scripts provisioning cloud virtual machines, VPC security rules, and firewall port restrictions.
- **Ansible Configuration Automation:** Agentless bootstrap playbooks installing Docker Engine, UFW firewall, and launching container stacks.
- **Automated CI/CD:** GitHub Actions running unit and integration tests against real MongoDB service containers and publishing images to Docker Hub.

---

## System Architecture

```
                       Public Internet
                              │
                    Port 80 (HTTP) / 443 (HTTPS)
                              ▼
            ┌───────────────────────────────────┐
            │   Nginx Reverse Proxy Container   │
            │          (Port 80 / 443)          │
            └─────────────────┬─────────────────┘
                              │
               Internal Network: 'todo_network'
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
  ┌───────────────────────────────┐   ┌───────────────────────────────┐
  │     Node.js Express API       │   │      MongoDB Database         │
  │     Container (Port 5000)     │◄──┤     Container (Port 27017)    │
  │     (No host port exposure)   │   │     (Internal network only)   │
  └───────────────────────────────┘   └───────────────┬───────────────┘
                                                      │
                                                      ▼
                                      ┌───────────────────────────────┐
                                      │     Docker Named Volume       │
                                      │   'mongodb_data' (/data/db)   │
                                      └───────────────────────────────┘
```

---

## Project Structure

```text
c:\AAE\
├── api/                                # Backend Express API service
│   ├── src/
│   │   ├── config/db.js               # Mongoose connection with exponential backoff
│   │   ├── controllers/               # Todo & Health business logic controllers
│   │   ├── middleware/                # Validation & centralized error handlers
│   │   ├── models/todo.model.js       # Mongoose document schema definition
│   │   ├── routes/                    # Express routing declarations
│   │   └── app.js                     # Express app setup and middleware chain
│   ├── public/                        # Static UI assets bundled with API
│   ├── test/api.test.js               # Automated integration test suite
│   ├── server.js                      # Entrypoint with graceful shutdown hooks
│   ├── Dockerfile                     # Multi-stage production container build
│   └── Dockerfile.dev                 # Hot-reloading development container
├── proxy/                             # Nginx reverse proxy configuration
│   ├── nginx.conf                     # Reverse proxy routing & security headers
│   └── Dockerfile                     # Nginx Alpine container definition
├── client/public/                     # Standalone frontend dashboard source
│   ├── index.html                     # Responsive Tailwind CSS dashboard
│   ├── style.css                      # Custom styles and design tokens
│   └── app.js                         # Reactive API fetch client
├── terraform/                         # Infrastructure as Code
│   ├── provider.tf                    # Cloud provider definitions (DigitalOcean/AWS)
│   ├── main.tf                        # VM resources, firewall, and SSH keys
│   ├── variables.tf                   # Sizing, region, and SSH parameters
│   └── outputs.tf                     # Public IP address and connection strings
├── ansible/                           # Server configuration management
│   ├── ansible.cfg                    # Ansible runtime defaults
│   ├── inventory.ini                  # Target server host configuration
│   └── playbook.yml                   # Docker installation & app deployment playbook
├── .github/workflows/                 # Continuous Integration & Continuous Deployment
│   ├── test.yml                       # Runs automated tests against live MongoDB
│   └── deploy.yml                     # Builds Docker image, pushes to Docker Hub, deploys via SSH
├── docker-compose.yml                 # Standard multi-container orchestration (API + MongoDB)
├── docker-compose.dev.yml             # Local development orchestration with hot-reloading
├── docker-compose.prod.yml            # Production 3-tier orchestration (Nginx + API + MongoDB)
├── .env.example                       # Documented environment variables template
├── PRD.md                             # Product Requirements Document
├── TECHNICAL_ARCHITECTURE.md          # Comprehensive Technical Architecture Specification
├── SECURITY_AND_ACCESS.md             # Security, Access Controls & Error Handling Spec
├── FRONTEND_SPECIFICATION.md          # UI/UX Design System & API Integration Contract
└── FEATURE_TICKET_LIST.md             # Phase-wise build checklist and tickets
```

---

## Getting Started

### Prerequisites

- [Docker Engine & Docker Compose](https://docs.docker.com/get-docker/)
- [Node.js 20 LTS](https://nodejs.org/) (optional, for running standalone outside containers)

### 1. Run with Docker Compose (Standard Setup)

Spins up the **Node.js API** and **MongoDB database** with persistent volume storage:

```powershell
docker-compose up -d
```

- **Web Dashboard & API:** [http://localhost:5000](http://localhost:5000)
- **Health Diagnostics:** [http://localhost:5000/health](http://localhost:5000/health)
- **Todos Endpoint:** [http://localhost:5000/todos](http://localhost:5000/todos)

### 2. Run with Nginx Reverse Proxy (Production 3-Tier Mode)

Spins up **Nginx Gateway (Port 80) + Node.js API + MongoDB**:

```powershell
docker-compose -f docker-compose.prod.yml up -d --build
```

- **Access Application:** [http://localhost](http://localhost) (Port 80)

### 3. Run in Local Development Mode (Hot-Reloading)

Mounts your local code into the container; edits in `./api/src` immediately reload via nodemon:

```powershell
docker-compose -f docker-compose.dev.yml up
```

### 4. Run Automated Test Suite

Runs all endpoint and validation integration tests using Node's native test runner:

```powershell
cd api
npm test
```

### 5. Stop Containers

```powershell
docker-compose down
```

---

## Environment Variables

Copy `.env.example` to `.env` to configure local settings:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `HOST_PORT` | `5000` | Host port mapped to the API container. |
| `PORT` | `5000` | Internal port on which Express listens. |
| `NODE_ENV` | `production` | Runtime mode (`development`, `production`, `test`). |
| `MONGO_URI` | `mongodb://mongodb:27017/todos_db` | Connection string pointing to internal container DNS. |
| `CLIENT_ORIGIN` | `*` | Allowed CORS origin for cross-domain requests. |

---

## Docker & Containerization

### Multi-Stage Production Dockerfile (`api/Dockerfile`)
- **Stage 1 (Builder):** Uses `node:20-alpine` to install dependencies and prune `devDependencies`.
- **Stage 2 (Runner):** Minimal production image copying only production artifacts; drops root privileges to unprivileged `USER node`.
- **Built-in Healthcheck:** Periodically validates API responsiveness via `curl -f http://localhost:5000/health`.

### Network & Storage Isolation
- **Bridge Network (`todo_network`):** Containers communicate through internal service names (`api`, `mongodb`).
- **Database Perimeter Defense:** Port `27017` is not exposed to the public host network; it is reachable solely by internal containers.
- **Named Volume (`mongodb_data`):** Data written to `/data/db` is persisted permanently on the host filesystem across container removals and restarts.

---

## CI/CD Pipeline

The project includes pre-configured GitHub Actions workflows in `.github/workflows/`:

### 1. Automated Testing (`.github/workflows/test.yml`)
- Triggers on every push and pull request to `main`.
- Spins up an active `mongo:7.0` service container.
- Installs dependencies and executes `npm test`.

### 2. Build & Deploy (`.github/workflows/deploy.yml`)
- Builds the production multi-stage Docker image.
- Authenticates and publishes to Docker Hub (`aditya5005/todo-api:latest`).
- Connects to the remote production server via SSH, pulls the new image, and triggers a zero-downtime restart with `docker compose up -d`.

### Docker Hub Registry
- **Published Image:** [`docker.io/aditya5005/todo-api:latest`](https://hub.docker.com/r/aditya5005/todo-api)
