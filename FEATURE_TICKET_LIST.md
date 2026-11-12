# Feature Ticket List (Phase-Wise Build Checklist)

**Project Name:** Multi-Container Cloud Application (Todo Platform)  
**Document Version:** 1.0.0  
**Status:** Ready for Incremental Execution  
**Execution Guideline:** Execute tasks sequentially phase by phase. Each ticket is structured as an AI-ready prompt.

---

## Architecture Phase Summary

```
Phase 1: Core API & Database Foundation (Express + Mongoose)
   │
Phase 2: Dockerization & Multi-Container Compose Orchestration
   │
Phase 3: Gateway & Reverse Proxy Layer (Nginx)
   │
Phase 4: Infrastructure as Code (Terraform VPS Provisioning)
   │
Phase 5: Configuration Management (Ansible Server Automation)
   │
Phase 6: CI/CD Continuous Deployment (GitHub Actions)
   │
Phase 7: Web Client Dashboard & Production Verification
```

---

## Phase 1: Core API & Database Foundation

### TICKET-01: Express Application Scaffolding & Configuration
- **Feature Name:** API Scaffolding & Environment Setup
- **Priority:** Must-Have (P0)
- **Dependencies:** None
- **Task Description:**
  Set up the base Node.js project inside the `api/` directory with Express.js, CORS, dotenv, and necessary scripts. Configure `package.json` with scripts for `start`, `dev` (using nodemon), and `test`. Establish an organized folder structure separating routes, controllers, models, config, and middleware.
- **Acceptance Criteria:**
  - [ ] Running `npm install` installs all required packages (`express`, `mongoose`, `cors`, `dotenv`, `morgan`).
  - [ ] Running `npm run dev` starts the Express server listening on the port configured in `.env` (default: 5000).
  - [ ] Base root request `GET /` returns a JSON welcome status.
  - [ ] Missing `.env` file gracefully falls back to sensible defaults.
- **AI Coding Prompt:**
  ```text
  Scaffold a Node.js Express API application inside the api/ directory. Install express, cors, dotenv, morgan, and nodemon. Create an organized directory structure with src/config, src/controllers, src/models, src/routes, and src/middleware. Create a server.js entrypoint that boots the server on process.env.PORT || 5000 and logs startup status. Ensure clean error handling if port is occupied.
  ```

---

### TICKET-02: MongoDB Connection with Resilient Retry Loop
- **Feature Name:** Database Connectivity & Connection State Handling
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-01
- **Task Description:**
  Implement the MongoDB connection manager using Mongoose inside `api/src/config/db.js`. Because MongoDB runs as an independent container that may take several seconds to initialize on startup, implement an exponential backoff retry loop (attempting connection up to 10 times with increasing delay) before failing.
- **Acceptance Criteria:**
  - [ ] Mongoose successfully connects using `process.env.MONGO_URI`.
  - [ ] Connection events (`connected`, `error`, `disconnected`) are logged with timestamps.
  - [ ] If the database is initially unavailable, the process does not immediately crash; it retries every 3 seconds up to 10 attempts.
  - [ ] Graceful disconnection is handled when the Node process receives `SIGINT` or `SIGTERM`.
- **AI Coding Prompt:**
  ```text
  Create api/src/config/db.js to manage Mongoose connection to MongoDB. Implement a connectWithRetry() function that attempts connection every 3 seconds up to 10 times with exponential backoff if MongoDB is not immediately reachable. Export the connection function and hook graceful shutdown to process.on('SIGINT') and process.on('SIGTERM') to disconnect cleanly.
  ```

---

### TICKET-03: Todo Data Model & Schema Validation
- **Feature Name:** Todo Mongoose Model & Request Validator
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-02
- **Task Description:**
  Define the Mongoose schema for Todos inside `api/src/models/todo.model.js` with fields `title`, `description`, `isCompleted`, `createdAt`, and `updatedAt`. Create validation middleware inside `api/src/middleware/validator.js` to ensure the `title` field is a non-empty string under 200 characters before hitting controller logic.
- **Acceptance Criteria:**
  - [ ] Model enforces `title` as required and trimmed.
  - [ ] `isCompleted` defaults to `false`.
  - [ ] Mongoose timestamps automatically populate `createdAt` and `updatedAt`.
  - [ ] Submitting empty or whitespace-only `title` returns HTTP 400 with a descriptive validation error message.
- **AI Coding Prompt:**
  ```text
  Define the Mongoose schema in api/src/models/todo.model.js for a Todo item with title (string, required, trimmed, max 200), description (string, optional, max 2000), and isCompleted (boolean, default false), with timestamps enabled. Create validation middleware in api/src/middleware/validator.js that checks request body on POST and PUT, rejecting blank titles with HTTP 400.
  ```

---

### TICKET-04: Todo CRUD Controllers & Routes Implementation
- **Feature Name:** Complete Todo REST Endpoints
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-03
- **Task Description:**
  Implement the 5 core RESTful endpoints inside `api/src/controllers/todo.controller.js` and route them in `api/src/routes/todo.routes.js`:
  1. `GET /todos` — List all todos sorted by `createdAt: -1`.
  2. `POST /todos` — Create a new todo.
  3. `GET /todos/:id` — Get single todo by ID.
  4. `PUT /todos/:id` — Update an existing todo.
  5. `DELETE /todos/:id` — Delete a todo.
- **Acceptance Criteria:**
  - [ ] `GET /todos` returns 200 with an array of todos.
  - [ ] `POST /todos` creates a record in MongoDB and returns 201 with the created object.
  - [ ] `GET /todos/:id` returns 200 with matching todo or 404 if not found.
  - [ ] `PUT /todos/:id` updates fields and returns 200 with modified document.
  - [ ] `DELETE /todos/:id` removes record and returns 200 with deletion confirmation.
  - [ ] Supplying an invalid 24-character hex ID returns 400 Bad Request instead of a 500 error.
- **AI Coding Prompt:**
  ```text
  Implement the 5 RESTful CRUD controllers in api/src/controllers/todo.controller.js and express routes in api/src/routes/todo.routes.js: GET /todos, POST /todos, GET /todos/:id, PUT /todos/:id, DELETE /todos/:id. Use async/await with clean try/catch blocks. Ensure ObjectId validation is performed before database lookup. Return standardized JSON responses.
  ```

---

### TICKET-05: Global Error Handling Middleware & System Health Endpoint
- **Feature Name:** Error Middleware & `/health` Diagnostic Endpoint
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-04
- **Task Description:**
  Create a global error handling middleware in `api/src/middleware/errorHandler.js` that catches unhandled errors and formats them into a uniform JSON response. Create a `/health` route in `api/src/routes/health.routes.js` that checks both API uptime and active MongoDB ping status.
- **Acceptance Criteria:**
  - [ ] `GET /health` returns HTTP 200 with JSON detailing API status and database state (`connected`).
  - [ ] If MongoDB is down, `GET /health` returns HTTP 503 Service Unavailable.
  - [ ] Any uncaught controller error is trapped by `errorHandler.js` and returns a sanitized JSON error response without exposing internal server stack traces in production.
- **AI Coding Prompt:**
  ```text
  Build api/src/middleware/errorHandler.js for catching all unhandled Express errors, returning a standardized error JSON structure. Build api/src/routes/health.routes.js that pings Mongoose connection (mongoose.connection.readyState === 1) and returns 200 if connected, or 503 if disconnected. Mount this router at /health in app.js.
  ```

---

## Phase 2: Dockerization & Local Multi-Container Orchestration

### TICKET-06: Production Multi-Stage Dockerfile & Dev Dockerfile
- **Feature Name:** Node.js Containerization
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-05
- **Task Description:**
  Create an optimized, secure multi-stage `Dockerfile` in `api/Dockerfile` using `node:20-alpine`. The build stage should install production dependencies and prune dev dependencies. The final runtime stage should run as a non-root user (`USER node`). Create `api/Dockerfile.dev` for local development with nodemon. Create an `.dockerignore` file excluding `node_modules`, `.git`, and local `.env`.
- **Acceptance Criteria:**
  - [ ] `docker build -t todo-api:latest ./api` builds cleanly.
  - [ ] Container image size is under 180MB.
  - [ ] Process runs as user `node` (non-root).
  - [ ] `.dockerignore` prevents copying local `node_modules` into the build context.
- **AI Coding Prompt:**
  ```text
  Write a multi-stage production Dockerfile in api/Dockerfile using node:20-alpine. Stage 1 installs dependencies. Stage 2 copies production artifacts, sets NODE_ENV=production, exposes port 5000, drops root privileges to USER node, and sets CMD ['node', 'server.js']. Also create api/Dockerfile.dev with nodemon, and api/.dockerignore.
  ```

---

### TICKET-07: Docker Compose Multi-Container Orchestration & Volume Persistence
- **Feature Name:** Docker Compose with Persistent MongoDB Volume
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-06
- **Task Description:**
  Write `docker-compose.yml` in the root directory that defines two services: `api` (built from `./api`) and `mongodb` (using `mongo:7.0`). Link both containers on a custom bridge network `todo_network`. Attach a persistent named volume `mongodb_data` to `/data/db` on the MongoDB service. Ensure `api` has `depends_on` configured with a healthcheck condition for `mongodb`.
- **Acceptance Criteria:**
  - [ ] Running `docker compose up -d` boots both MongoDB and the API container.
  - [ ] Visiting `http://localhost:5000/todos` returns 200 OK.
  - [ ] Todos created via POST persist even after running `docker compose down` followed by `docker compose up -d`.
  - [ ] MongoDB container port is only exposed internally to the `todo_network` (not accessible on public host network).
- **AI Coding Prompt:**
  ```text
  Create docker-compose.yml in the repository root. Define services: 'api' and 'mongodb' (mongo:7.0). Configure custom bridge network 'todo_network' and named volume 'mongodb_data' mapped to /data/db. Configure depends_on with mongodb healthcheck. Set environment variables so the API connects to mongodb://mongodb:27017/todos_db. Expose port 5000 for the API.
  ```

---

### TICKET-08: Development Hot-Reloading Configuration
- **Feature Name:** Local Development Workflow with Nodemon & Volume Mounts
- **Priority:** Should-Have (P1)
- **Dependencies:** TICKET-07
- **Task Description:**
  Configure a development override setup (or `docker-compose.override.yml`) that mounts the host `./api` directory into `/app` in the container, overrides the entrypoint to use `npm run dev`, and sets up nodemon so editing any file in `./api/src` immediately reloads the running API without rebuilding the Docker container.
- **Acceptance Criteria:**
  - [ ] Editing code on the host machine triggers nodemon inside the container within 2 seconds.
  - [ ] Container does not require restarting or rebuilding when JavaScript files change.
- **AI Coding Prompt:**
  ```text
  Create docker-compose.dev.yml (or docker-compose.override.yml) that overrides the api service to use api/Dockerfile.dev, mounts ./api:/app with node_modules volume exclusion, and runs npm run dev. Test that code changes on the host hot-reload in the container.
  ```

---

## Phase 3: Gateway & Reverse Proxy (Nginx) Layer

### TICKET-09: Nginx Reverse Proxy Configuration & Security Headers
- **Feature Name:** Nginx Gateway Configuration
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-07
- **Task Description:**
  Create an Nginx configuration file in `proxy/nginx.conf` that listens on port 80. Configure it to forward all traffic targeting `/api/` or `/todos` to `http://api:5000`. Add security headers (`X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`) and configure connection timeouts and client body size limits (100KB).
- **Acceptance Criteria:**
  - [ ] Nginx proxies incoming HTTP requests on port 80 to the internal `api:5000` service.
  - [ ] Client requests to `http://localhost/todos` succeed without requiring the client to know port 5000.
  - [ ] Security headers are present in HTTP response headers.
- **AI Coding Prompt:**
  ```text
  Create proxy/nginx.conf and proxy/Dockerfile using nginx:1.25-alpine. Configure Nginx to reverse proxy /api/ and /todos to upstream http://api:5000 with proxy_set_header Host, X-Real-IP, and X-Forwarded-For. Add security headers (X-Content-Type-Options, X-Frame-Options) and client_max_body_size 100k.
  ```

---

### TICKET-10: Complete Multi-Container Compose Integration (Nginx + API + MongoDB)
- **Feature Name:** 3-Tier Compose Production Stack
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-09
- **Task Description:**
  Create `docker-compose.prod.yml` incorporating the Nginx `reverse-proxy` service alongside `api` and `mongodb`. In this configuration, only Nginx binds to host port 80; the `api` service removes host port 5000 mapping and communicates solely through internal Docker DNS.
- **Acceptance Criteria:**
  - [ ] Running `docker compose -f docker-compose.prod.yml up -d` starts proxy, api, and mongodb.
  - [ ] Only port 80 is listening on host `netstat`/`lsof`. Port 5000 and 27017 are unreachable from outside Docker.
  - [ ] Complete CRUD workflow functions via `http://localhost/todos`.
- **AI Coding Prompt:**
  ```text
  Update or create docker-compose.prod.yml that coordinates three services: reverse-proxy (ports 80:80), api (no host ports, expose 5000), and mongodb (no host ports, expose 27017). Ensure all three share 'todo_network' and restart policies are set to 'unless-stopped'.
  ```

---

## Phase 4: Infrastructure as Code (Terraform) Setup

### TICKET-11: Terraform Cloud Server Provisioning
- **Feature Name:** Automated Cloud VM Infrastructure (AWS / DigitalOcean)
- **Priority:** Must-Have (P0)
- **Dependencies:** None (Can run in parallel with Phase 1-3)
- **Task Description:**
  Write modular Terraform configuration inside `terraform/` to provision an Ubuntu 22.04 LTS virtual machine on a cloud provider (DigitalOcean Droplet or AWS EC2 `t3.micro`/`t2.micro`). Define `provider.tf`, `variables.tf`, `main.tf`, and `outputs.tf`.
- **Acceptance Criteria:**
  - [ ] `terraform validate` and `terraform plan` execute without errors.
  - [ ] `terraform apply` provisions a cloud virtual machine within 3 minutes.
  - [ ] `outputs.tf` exports the public IP address of the provisioned server.
- **AI Coding Prompt:**
  ```text
  Write Terraform files in terraform/ (provider.tf, variables.tf, main.tf, outputs.tf) to provision an Ubuntu 22.04 server on DigitalOcean (or AWS EC2). Use variables for region, instance size, and SSH public key path. Output the public IPv4 address.
  ```

---

### TICKET-12: Cloud Security Groups & Firewall Rules
- **Feature Name:** IaC Perimeter Security & SSH Access Control
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-11
- **Task Description:**
  Configure Terraform security groups / cloud firewall rules that restrict inbound traffic exclusively to:
  - Port 22 (SSH)
  - Port 80 (HTTP)
  - Port 443 (HTTPS)
  Block all direct inbound traffic to ports 5000 and 27017 from the public internet.
- **Acceptance Criteria:**
  - [ ] Firewall allows inbound traffic on ports 22, 80, and 443 only.
  - [ ] All other inbound ports are blocked at the cloud provider hypervisor layer.
  - [ ] Port 27017 (MongoDB) cannot be probed from the public internet.
- **AI Coding Prompt:**
  ```text
  Extend terraform/main.tf with cloud firewall / security group resource definitions. Allow inbound TCP on ports 22, 80, and 443 from 0.0.0.0/0. Block all other inbound ports. Allow all outbound traffic. Attach firewall to the provisioned VM.
  ```

---

## Phase 5: Configuration Management (Ansible)

### TICKET-13: Ansible Inventory & System Hardening
- **Feature Name:** Base Server Bootstrap Playbook
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-11
- **Task Description:**
  Create an Ansible configuration in `ansible/ansible.cfg`, `ansible/inventory.ini`, and `ansible/playbook.yml`. Write a role to update apt packages, configure automatic security updates, create a dedicated `deployer` user with passwordless sudo, and configure the host UFW firewall.
- **Acceptance Criteria:**
  - [ ] `ansible-playbook -i inventory.ini playbook.yml` connects via SSH.
  - [ ] System packages are upgraded cleanly.
  - [ ] UFW firewall is active and configured.
- **AI Coding Prompt:**
  ```text
  Create ansible/playbook.yml and ansible/inventory.ini. Write tasks to update apt cache, upgrade packages, install curl, git, ufw, and htop, create a deployer user with sudo privileges, and enable UFW allowing OpenSSH, 80, and 443.
  ```

---

### TICKET-14: Ansible Docker Engine & Compose Automation
- **Feature Name:** Docker Daemon Provisioning via Ansible
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-13
- **Task Description:**
  Create an Ansible role/tasks to install official Docker Engine and the Docker Compose plugin on Ubuntu 22.04. Add the `deployer` user to the `docker` group so Docker commands can be run without `sudo`. Ensure the Docker systemd service is enabled and started on system boot.
- **Acceptance Criteria:**
  - [ ] Docker Engine and `docker compose` are installed from the official Docker apt repository.
  - [ ] The `deployer` user can execute `docker ps` without sudo.
  - [ ] System reboot starts the Docker daemon automatically.
- **AI Coding Prompt:**
  ```text
  Add an Ansible role in ansible/roles/docker to install official Docker Engine and Docker Compose v2 plugin on Ubuntu. Set up Docker GPG key, repository, install docker-ce and docker-compose-plugin, add deployer user to docker group, and enable docker service.
  ```

---

### TICKET-15: Ansible Application Deployment Playbook
- **Feature Name:** Automated App Deployment via Ansible
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-10, TICKET-14
- **Task Description:**
  Write an Ansible role/task in `ansible/roles/app` that creates the target project directory `/opt/todo-app`, copies `docker-compose.prod.yml` and `.env`, logs into Docker Hub if credentials are provided, pulls the latest images, and executes `docker compose -f docker-compose.prod.yml up -d --remove-orphans`.
- **Acceptance Criteria:**
  - [ ] Running the playbook deploys the entire multi-container stack to the remote server.
  - [ ] Curling `http://<server-ip>/health` returns HTTP 200.
  - [ ] Persistent storage directory and permissions are verified.
- **AI Coding Prompt:**
  ```text
  Create ansible/roles/app/tasks/main.yml to create directory /opt/todo-app, template docker-compose.prod.yml and .env, pull latest container images, and execute docker compose up -d. Verify deployment by making a curl call to http://localhost/health.
  ```

---

## Phase 6: Continuous Integration & Deployment (GitHub Actions)

### TICKET-16: GitHub Actions Automated Lint & Test Workflow
- **Feature Name:** CI Integration Testing Workflow
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-05
- **Task Description:**
  Create `.github/workflows/test.yml` that triggers on every pull request and push to `main`. It checks out code, sets up Node 20, spins up a temporary MongoDB service container inside GitHub Actions, runs linter checks, and executes automated API endpoint integration tests.
- **Acceptance Criteria:**
  - [ ] Workflow triggers automatically on push.
  - [ ] Node tests execute against an active MongoDB service container.
  - [ ] Pull requests with failing tests or syntax errors are blocked from merging.
- **AI Coding Prompt:**
  ```text
  Create .github/workflows/test.yml that runs on push and pull_request. Use services: mongodb (image: mongo:7.0) to provide a real database. Run npm ci, npm run lint (if present), and run integration tests using supertest or npm test.
  ```

---

### TICKET-17: GitHub Actions Image Build & Docker Hub Publication
- **Feature Name:** Container Registry Publishing Workflow
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-06, TICKET-16
- **Task Description:**
  Create a job in `.github/workflows/deploy.yml` that builds the production Docker image for `api` and pushes it to Docker Hub tagged with both the Git commit SHA and `:latest`. Use Docker Buildx and GitHub Actions cache for fast builds.
- **Acceptance Criteria:**
  - [ ] Successfully logs into Docker Hub using secrets `DOCKER_HUB_USERNAME` and `DOCKER_HUB_TOKEN`.
  - [ ] Builds multi-platform or linux/amd64 image.
  - [ ] Pushes `<username>/todo-api:latest` and `<username>/todo-api:<sha>` to Docker Hub.
- **AI Coding Prompt:**
  ```text
  In .github/workflows/deploy.yml, create a build-and-push job using docker/setup-buildx-action, docker/login-action with secrets.DOCKER_HUB_USERNAME and secrets.DOCKER_HUB_TOKEN, and docker/build-push-action targeting api/Dockerfile. Tag with latest and github.sha.
  ```

---

### TICKET-18: GitHub Actions Automated Remote SSH Deployment
- **Feature Name:** Automated Remote CD Pipeline
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-15, TICKET-17
- **Task Description:**
  Add a `deploy` job in `.github/workflows/deploy.yml` that executes after `build-and-push`. Using an SSH private key stored in GitHub Secrets (`SSH_PRIVATE_KEY`), it connects to `SERVER_HOST`, pulls the latest Docker image from Docker Hub, updates the container stack via `docker compose -f docker-compose.prod.yml up -d`, and checks `/health` to verify zero downtime.
- **Acceptance Criteria:**
  - [ ] Pipeline deploys new code to production within 2 minutes of pushing to `main`.
  - [ ] Server successfully pulls new image and recreates the API container.
  - [ ] Healthcheck step validates HTTP 200 before concluding workflow.
- **AI Coding Prompt:**
  ```text
  In .github/workflows/deploy.yml, add a deploy job that runs on ubuntu-latest using appleboy/ssh-action (or native ssh-agent). Connect to secrets.SERVER_HOST using secrets.SSH_PRIVATE_KEY. Run commands to cd /opt/todo-app, docker compose -f docker-compose.prod.yml pull, docker compose -f docker-compose.prod.yml up -d --remove-orphans, and curl -f http://localhost/health.
  ```

---

## Phase 7: Web Client Dashboard & Production Verification

### TICKET-19: Responsive Web Client Dashboard for Todo Operations
- **Feature Name:** Visual Todo Dashboard & Interactive Console
- **Priority:** Should-Have (P1)
- **Dependencies:** TICKET-09
- **Task Description:**
  Create a single-page responsive web dashboard in `client/public/index.html`, `style.css`, and `app.js` following the design system defined in `FRONTEND_SPECIFICATION.md`. Allow users to view all todos, add new items, toggle completion status, edit items inline, and delete items. Display live system health status in the header.
- **Acceptance Criteria:**
  - [ ] UI loads cleanly without external build step (vanilla HTML/CSS/JS or CDN Tailwind).
  - [ ] CRUD interactions update state reactively without full page reload.
  - [ ] Visual indicators reflect live `/health` API connection status.
  - [ ] Mobile responsive layout tested across screen widths ($320\text{px}$ to $1440\text{px}$).
- **AI Coding Prompt:**
  ```text
  Build a responsive, modern dark-themed web client in client/public/ (index.html, style.css, app.js) matching FRONTEND_SPECIFICATION.md. Connect via fetch() to /todos. Implement full CRUD: add todo, toggle isCompleted checkbox, delete todo, and view live /health connection status in the navigation bar.
  ```

---

### TICKET-20: Disaster Recovery Drill & Volume Persistence Verification
- **Feature Name:** End-to-End Resilience & Verification Suite
- **Priority:** Must-Have (P0)
- **Dependencies:** TICKET-18, TICKET-19
- **Task Description:**
  Write an automated verification script (e.g. `scripts/verify-resilience.sh`) that simulates a full disaster recovery scenario: creates test todos via API, executes `docker compose down -v` (preserving named volume) or reboots the container, restarts the stack, and verifies all test todos are retrieved intact with zero data loss.
- **Acceptance Criteria:**
  - [ ] Verification script runs automatically in bash/PowerShell.
  - [ ] Tests all 5 CRUD endpoints and confirms 100% data persistence across container deletion and restart.
- **AI Coding Prompt:**
  ```text
  Write a test script in scripts/verify-resilience.sh (or .ps1) that tests API CRUD endpoints using curl, stops and removes the API and MongoDB containers (keeping the named volume intact), restarts the containers with docker compose, and verifies that previously created todos still exist in MongoDB.
  ```
