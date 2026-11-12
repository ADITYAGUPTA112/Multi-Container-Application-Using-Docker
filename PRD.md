# Product Requirements Document (PRD)

**Project Name:** Multi-Container Cloud Application (Todo Platform)  
**Document Version:** 1.0.0  
**Status:** Approved & Ready for Architecture Implementation  
**Target Release:** Production Phase 1–5  

---

## 1. Problem Statement

### What problem does this app solve?
Developers, platform engineers, and DevOps practitioners face a critical knowledge gap when moving from single-machine code execution ("it works on my laptop") to resilient, multi-container production environments. Most introductory guides either oversimplify setup with fragile single-container scripts or introduce overwhelming enterprise complexity (e.g., massive Kubernetes clusters, service meshes) that obscures foundational DevOps fundamentals.

### Who faces this problem?
- **Junior to Mid-Level Software Engineers** looking to transition into full-stack and DevOps roles.
- **DevOps Beginners** who need hands-on, end-to-end experience provisioning servers with Infrastructure as Code (IaC), configuring systems with configuration management, and orchestrating multi-container applications via CI/CD.
- **Engineering Teams** seeking a standardized, battle-tested reference blueprint for containerizing stateful backend APIs with dedicated reverse proxies and database volume persistence.

### Why does it matter?
Without robust container orchestration, database volume persistence, reverse proxy routing, and automated CI/CD pipelines, applications suffer from:
1. **Data Loss:** Database data disappears whenever containers restart or recreate if volumes are misconfigured.
2. **Configuration Drift:** Inconsistent staging/production environments cause deployment failures.
3. **Manual Human Errors:** SSHing into production boxes to run manual commands leads to downtime, security vulnerabilities, and untracked changes.
4. **Security Vulnerabilities:** Exposing raw application and database ports directly to the public internet invites attacks.

---

## 2. Target Users & Personas

### Persona 1: The Aspiring DevOps Engineer ("Alex")
- **Profile:** 24–30 years old, proficient in writing basic backend code (JavaScript/Python), comfortable with basic terminal commands, but intimidated by complex cloud deployments.
- **Tech Comfort Level:** Intermediate (familiar with Git and local Node.js, beginner with Docker and Cloud).
- **Core Needs:**
  - A clean, transparent architecture that connects all dots: Code $\rightarrow$ Containers $\rightarrow$ Cloud Server $\rightarrow$ CI/CD.
  - Predictable, repeatable workflows without hidden magic or broken dependencies.
  - Clear separation between local development and cloud production configurations.
- **Frustrations:** Outdated tutorials where `docker-compose` fails, database data disappears on container teardown, or CI/CD scripts fail due to permission errors.

### Persona 2: The Full-Stack Builder ("Sam")
- **Profile:** Solo SaaS builder or startup developer who needs a reliable, cheap, automated foundation to run micro-services and stateful databases on low-cost virtual private servers (DigitalOcean/AWS).
- **Tech Comfort Level:** Advanced in web application development, intermediate in operations.
- **Core Needs:**
  - 1-command deployment and rollback.
  - Automated provisioning so rebuilding infrastructure from scratch takes under 5 minutes.
  - Isolated database containers that cannot be attacked directly from the public web.
- **Frustrations:** High cloud bills for managed databases when a self-hosted Dockerized MongoDB with persistent volumes and backups is sufficient.

---

## 3. Product Vision

> **North Star:** "A battle-tested, production-ready multi-container reference architecture that demonstrates how to reliably package, orchestrate, automate, and continuously deploy a stateful backend service from local development to the cloud with zero manual server intervention."

---

## 4. Core Features & Scope Classification

| Feature ID | Feature Name | Description | Priority |
| :--- | :--- | :--- | :--- |
| **F-01** | **RESTful Todo API** | Express.js API offering complete CRUD functionality for todos (`GET`, `POST`, `PUT`, `DELETE`). | **Must-Have (P0)** |
| **F-02** | **Persistent Database Storage** | MongoDB container integrated with Docker named volumes to ensure zero data loss across container lifecycles. | **Must-Have (P0)** |
| **F-03** | **Multi-Container Compose** | Orchestration of API and DB on an isolated internal bridge network with auto-restart policies. | **Must-Have (P0)** |
| **F-04** | **API Health Check Endpoint** | Dedicated `/health` endpoint reporting uptime, API status, and MongoDB connection status. | **Must-Have (P0)** |
| **F-05** | **Reverse Proxy (Nginx)** | Production gateway terminating HTTP traffic, forwarding `/api` traffic, and protecting raw internal ports. | **Must-Have (P0)** |
| **F-06** | **Infrastructure as Code (Terraform)** | Automated provisioning of remote VPS (AWS EC2 / DigitalOcean Droplet), VPC/security groups, and SSH keys. | **Must-Have (P0)** |
| **F-07** | **Configuration Automation (Ansible)** | Automated playbook installing Docker, Docker Compose, setting up system users, firewalls, and deploying containers. | **Must-Have (P0)** |
| **F-08** | **Automated CI/CD Pipeline** | GitHub Actions pipeline that lints, builds, tests, pushes Docker images to Docker Hub, and triggers remote server deploy. | **Must-Have (P0)** |
| **F-09** | **Responsive Web Dashboard** | Clean, modern user interface for managing todos, testing API operations visually, and monitoring health. | **Should-Have (P1)** |
| **F-10** | **SSL / TLS Termination (Certbot)** | Automatic Let's Encrypt SSL certificate provisioning for production domains. | **Nice-to-Have (P2)** |
| **F-11** | **Prometheus Metrics Exporter** | Application and container metrics telemetry exporter for Grafana monitoring. | **Nice-to-Have (P2)** |

---

## 5. End-to-End Application & User Flows

### Flow 1: Client / Web User Journey (Todo CRUD Lifecycle)
```
[User Browser / API Client]
           │
           ▼
[Nginx Reverse Proxy: Port 80/443]
           │ (Proxies /api or /todos requests)
           ▼
[Node.js Express API Container: Port 5000]
           │ (Validates schema & queries database)
           ▼
[MongoDB Container: Port 27017] ◄──► [Docker Persistent Named Volume: mongodb_data]
```

1. **Access Application:** User or client hits `http://<domain-or-ip>/`. Nginx routes static UI requests or returns API service health.
2. **List Todos (`GET /todos`):** Request enters Nginx $\rightarrow$ forwarded to Express $\rightarrow$ Mongoose fetches active todos from MongoDB $\rightarrow$ JSON array returned to client with HTTP 200.
3. **Create Todo (`POST /todos`):** Client submits `{ "title": "Buy groceries", "description": "Milk, eggs" }` $\rightarrow$ API validates request body $\rightarrow$ writes document to MongoDB $\rightarrow$ returns created todo with ID and timestamps with HTTP 201.
4. **Update Todo (`PUT /todos/:id`):** Client updates title or marks `isCompleted: true` $\rightarrow$ API checks valid ObjectId format $\rightarrow$ executes update $\rightarrow$ returns updated todo with HTTP 200.
5. **Delete Todo (`DELETE /todos/:id`):** Client sends delete request $\rightarrow$ API deletes record from MongoDB $\rightarrow$ returns success confirmation with HTTP 200.

---

### Flow 2: Developer Local Workflow
1. Developer clones the repository.
2. Developer runs `docker compose up --build`.
3. Docker Compose builds the API image, pulls the official MongoDB image, creates the `mongodb_data` volume, links them on a local bridge network, and exposes API on `http://localhost:5000` (or through Nginx on `http://localhost:80`).
4. Nodemon hot-reloads code during active development without requiring image rebuilds.

---

### Flow 3: Continuous Deployment Flow (Git Push to Production)
```
[Developer Git Push to main]
            │
            ▼
[GitHub Actions CI/CD Pipeline]
  ├─ 1. Lint Code & Run Unit/Integration Tests
  ├─ 2. Build Multi-Platform Docker Images
  ├─ 3. Authenticate & Push Images to Docker Hub
  └─ 4. Deploy via SSH to Remote Server
            │
            ▼
[Remote Cloud Server (Provisioned by Terraform)]
  ├─ Pulls latest images from Docker Hub
  ├─ Executes `docker compose up -d --remove-orphans`
  └─ Verifies `/health` endpoint responds HTTP 200
```

---

## 6. Success Metrics

| Metric | Target | Measurement Method |
| :--- | :--- | :--- |
| **Local Spin-up Time** | $< 90$ seconds | Execution time of `docker compose up --build` on fresh clone. |
| **Zero Data Loss** | 100% Data Retention | Data remains intact after running `docker compose down` and `docker compose up`. |
| **API Latency (p95)** | $< 40$ ms | Benchmark tool (Autocannon / k6) against local and remote endpoints. |
| **End-to-End Deployment Time** | $< 3.5$ minutes | Time elapsed from Git push to GitHub Actions production verification. |
| **Infrastructure Provisioning** | $< 4$ minutes | Total time for `terraform apply` to provision server and network. |
| **System Uptime** | $99.9\%$ | Monitored by continuous health check pings to `/health`. |

---

## 7. What We Are Deliberately NOT Building in Version One

To maintain high focus on multi-container orchestration, DevOps automation, and rock-solid architectural foundations, the following items are deliberately excluded from Version 1:
1. **Complex User Authentication & RBAC:** No OAuth2, multi-tenant schemas, or JWT sessions in v1 (per roadmap.sh specification, an unauthenticated clean REST service).
2. **Kubernetes / K8s / Helm Charts:** We strictly focus on Docker Compose and container networking to master fundamentals before adding K8s control plane overhead.
3. **Multi-Region Database Replication:** Single primary MongoDB instance with persistent volume storage; no replica sets or distributed sharding in v1.
4. **Third-Party Payment or SaaS Gateways:** No Stripe, SendGrid, or commercial APIs.
5. **Distributed In-Memory Cache (Redis Cluster):** Caching layers are deferred to post-MVP to keep container dependencies focused and easily auditable.

---

## 8. MVP Definition

The MVP is considered complete and accepted when:
- [x] Node.js + Express REST API executes all 5 required CRUD endpoints against a MongoDB database.
- [x] `docker-compose.yml` spins up the API, MongoDB, and Nginx reverse proxy containers with a single command.
- [x] Database data is persisted on a host-independent Docker named volume.
- [x] Terraform scripts provision a cloud virtual machine with all security rules configured.
- [x] Ansible playbooks automatically configure Docker and bootstrap the application on the remote host.
- [x] GitHub Actions triggers on push to `main`, tests the code, builds the container image, pushes to Docker Hub, and completes zero-downtime deployment on the remote server.
