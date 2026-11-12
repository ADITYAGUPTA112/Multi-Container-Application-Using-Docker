# Multi-Container Application Using Docker

A production-grade multi-container DevOps application demonstrating container orchestration, persistent database storage, reverse proxy routing, Infrastructure as Code (Terraform), configuration automation (Ansible), and continuous deployment pipelines (GitHub Actions & Jenkins).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [CI/CD & Jenkins Pipeline](#cicd--jenkins-pipeline)
- [Docker & Container Orchestration](#docker--container-orchestration)

---

## Overview

This project implements an end-to-end containerized microservices platform centered around a RESTful Todo service connected to a MongoDB database. It serves as a real-world reference implementation for bridging local containerized development with automated cloud infrastructure and zero-downtime deployment pipelines.

The platform provides:
- A high-throughput Node.js Express REST API with input validation and centralized error handling.
- A persistent MongoDB 7.0 database configured with dedicated Docker named volumes to guarantee zero data loss across container lifecycles.
- An Nginx reverse proxy gateway handling security headers, rate limiting, and traffic routing.
- An interactive, responsive Web Dashboard built with Tailwind CSS and modern design tokens.
- Automated provisioning and configuration via Terraform, Ansible, GitHub Actions, and Jenkins.

---

## Key Features

- **Full RESTful CRUD API:** Complete endpoint coverage for tasks (`GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`).
- **Resilient Database Layer:** Mongoose connection manager with exponential backoff retry logic, ensuring the API survives slow database boots.
- **Zero Data Loss Storage:** Docker named volumes guarantee complete data persistence across container restarts, removals, and recreations.
- **Reverse Proxy Gateway:** Nginx reverse proxy routing port 80 traffic to internal service containers while isolating database ports from public exposure.
- **Production-Hardened Containers:** Multi-stage Docker builds based on Alpine Linux running under unprivileged non-root users (`USER node`).
- **Interactive Web Dashboard:** Modern, responsive dark/light UI with real-time cluster health monitoring, scope tagging, and task filtering.
- **Automated Health Telemetry:** Dedicated `/health` diagnostic endpoint reporting system uptime, memory usage, and live database connection state.
- **Comprehensive Automation:** Dual CI/CD support through GitHub Actions workflows and Jenkins Declarative Pipelines.

---

## System Architecture

```mermaid
flowchart TD
    subgraph PublicInternet ["Public Internet"]
        Client["Web Browser / Client"]
        CI["GitHub Actions / Jenkins Runner"]
    end

    subgraph Host ["Production Host (Docker Engine)"]
        subgraph BridgeNetwork ["Bridge Network: 'todo_network'"]
            Nginx["Nginx Reverse Proxy\n(Port 80)"]
            API["Node.js Express API\n(Internal Port 5000)"]
            DB[("MongoDB 7.0 Database\n(Internal Port 27017)")]
        end

        subgraph Storage ["Persistent Volume Storage"]
            Volume[("Named Volume: 'mongodb_data'\n(/data/db)")]
        end
    end

    subgraph Registry ["Container Registry"]
        DHub["Docker Hub\n(aditya5005/todo-api:latest)"]
    end

    Client -->|HTTP Port 80| Nginx
    Client -.->|Direct Port 5000 (Dev)| API
    Nginx -->|Proxy /todos & /health| API
    API -->|Mongoose Connection| DB
    DB <-->|Read / Write| Volume

    CI -->|Build & Push| DHub
    DHub -.->|Pull Image| Host
```

---

## Project Structure

```text
├── .github/
│   └── workflows/
│       ├── test.yml                   # CI: Automated tests with MongoDB service container
│       └── deploy.yml                 # CD: Build, push to Docker Hub & remote SSH deploy
├── ansible/
│   ├── ansible.cfg                    # Ansible configuration
│   ├── inventory.ini                  # Target server connection inventory
│   └── playbook.yml                   # System updates, UFW firewall, Docker install & deploy
├── api/
│   ├── public/                        # Bundled Web Dashboard static assets (HTML/CSS/JS)
│   ├── src/
│   │   ├── config/db.js               # Database connection with retry mechanism
│   │   ├── controllers/               # Todo and Health controllers
│   │   ├── middleware/                # Validator and centralized error handler
│   │   ├── models/todo.model.js       # Mongoose schema definition
│   │   ├── routes/                    # API route definitions
│   │   └── app.js                     # Express application setup
│   ├── test/api.test.js               # Node native integration test suite (8/8 tests)
│   ├── Dockerfile                     # Multi-stage production container build
│   ├── Dockerfile.dev                 # Development container with nodemon hot-reload
│   ├── package.json                   # Dependencies and npm scripts
│   └── server.js                      # Server entry point with graceful shutdown
├── client/
│   └── public/                        # Standalone frontend client dashboard
├── proxy/
│   ├── Dockerfile                     # Nginx Alpine container definition
│   └── nginx.conf                     # Reverse proxy routing and security headers
├── scripts/
│   ├── verify-resilience.ps1          # PowerShell end-to-end verification script
│   └── verify-resilience.sh           # Bash end-to-end verification script
├── terraform/
│   ├── main.tf                        # Cloud VM and firewall resource definitions
│   ├── provider.tf                    # DigitalOcean / Cloud provider configuration
│   ├── variables.tf                   # Input variables (region, droplet size, keys)
│   └── outputs.tf                     # Public IP and connection outputs
├── docker-compose.yml                 # Primary multi-container setup (API + MongoDB)
├── docker-compose.dev.yml             # Hot-reloading development setup
├── docker-compose.prod.yml            # 3-tier production setup with Nginx reverse proxy
├── Jenkinsfile                        # Declarative Jenkins CI/CD pipeline
├── .env.example                       # Documented environment template
├── .gitignore                         # Git exclusion rules
└── README.md                          # Project documentation
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v24.0+) & [Docker Compose](https://docs.docker.com/compose/) (v2.20+)
- [Node.js](https://nodejs.org/) (v20 LTS) *(for optional local host development)*
- [Git](https://git-scm.com/)

### Step 1: Clone the Repository

```bash
git clone https://github.com/ADITYAGUPTA112/Multi-Container-Application-Using-Docker.git
cd Multi-Container-Application-Using-Docker
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

### Step 3: Run the Application

#### Option A: Standard Multi-Container Stack (Port 5000)

```bash
docker-compose up -d
```
- Open in browser: **http://localhost:5000**
- Health check: **http://localhost:5000/health**

#### Option B: Production 3-Tier Stack with Nginx Gateway (Port 80)

```bash
docker-compose -f docker-compose.prod.yml up -d
```
- Open in browser: **http://localhost**

#### Option C: Local Development with Hot-Reloading

```bash
docker-compose -f docker-compose.dev.yml up
```

### Step 4: Run the Test Suite

```bash
cd api
npm test
```

### Step 5: Stop Containers

```bash
docker-compose down
```
*(Data remains permanently preserved in the `mongodb_data` Docker volume.)*

---

## Environment Variables

The application is configured using environment variables defined in `.env`:

| Variable | Scope | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `HOST_PORT` | Compose | `5000` | Host port mapped to the API container. |
| `PORT` | API | `5000` | Internal port Express listens on inside the container. |
| `NODE_ENV` | API | `production` | Application runtime environment (`development` / `production` / `test`). |
| `MONGO_URI` | API | `mongodb://mongodb:27017/todos_db` | Connection string using internal Docker DNS hostname. |
| `CLIENT_ORIGIN` | API | `*` | Allowed CORS origin header for cross-origin requests. |
| `DOCKER_IMAGE` | CI/CD | `aditya5005/todo-api` | Docker Hub registry repository tag. |

---

## CI/CD & Jenkins Pipeline

The project supports both **GitHub Actions** and a **Jenkins Declarative Pipeline** for continuous integration and delivery.

### 1. GitHub Actions Workflows

- **CI Pipeline (`.github/workflows/test.yml`):**
  Spins up a temporary MongoDB service container, runs dependency validation, and executes the integration test suite on every pull request and push to `main`.
- **CD Pipeline (`.github/workflows/deploy.yml`):**
  Builds multi-platform container images via Docker Buildx, authenticates with Docker Hub, publishes images tagged with commit SHA and `:latest`, and executes an SSH command on the remote server to pull and restart containers with zero downtime.

### 2. Jenkins Declarative Pipeline (`Jenkinsfile`)

The repository includes a production-grade `Jenkinsfile` structured across 6 automated stages:

```groovy
pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'aditya5005/todo-api'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DOCKER_HUB_CREDS = credentials('docker-hub-credentials')
    }

    stages {
        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Install & Test') {
            steps {
                dir('api') {
                    sh 'npm ci'
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} -t ${DOCKER_IMAGE}:latest ./api"
            }
        }

        stage('Push to Docker Hub') {
            steps {
                sh 'echo $DOCKER_HUB_CREDS_PSW | docker login -u $DOCKER_HUB_CREDS_USR --password-stdin'
                sh "docker push ${DOCKER_IMAGE}:${DOCKER_TAG}"
                sh "docker push ${DOCKER_IMAGE}:latest"
            }
        }

        stage('Deploy Multi-Container Stack') {
            steps {
                sh 'docker compose -f docker-compose.prod.yml pull'
                sh 'docker compose -f docker-compose.prod.yml up -d --remove-orphans'
            }
        }

        stage('Verify Health') {
            steps {
                sh 'sleep 5'
                sh 'curl -f http://localhost/health || curl -f http://localhost:5000/health'
            }
        }
    }
}
```

---

## Docker & Container Orchestration

### Docker Architecture Highlights

- **Multi-Stage Build (`api/Dockerfile`):**
  - *Stage 1 (Builder):* Resolves dependencies and prunes dev packages.
  - *Stage 2 (Runner):* Uses minimal `node:20-alpine` footprint (<150MB), drops privileges to `USER node`, and includes container health checks via `/health`.
- **Network Isolation:**
  Containers communicate over a private bridge network (`todo_network`). In production (`docker-compose.prod.yml`), MongoDB port `27017` and API port `5000` are completely unexposed to the host network; only Nginx port `80` accepts ingress traffic.
- **Volume Persistence:**
  MongoDB stores data in `/data/db` mapped to the named volume `mongodb_data`, guaranteeing complete persistence across restarts:
  ```bash
  # Verify volume existence
  docker volume ls | grep mongodb_data
  ```
- **Official Docker Hub Image:**
  The container image is published and pullable from Docker Hub:
  ```bash
  docker pull aditya5005/todo-api:latest
  ```
