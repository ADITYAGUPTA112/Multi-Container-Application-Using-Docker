# Frontend & API Specification Document

**Project Name:** Multi-Container Cloud Application (Todo Platform)  
**Document Version:** 1.0.0  
**Status:** Approved UI/UX Design System & API Integration Contract  

---

## 1. Design System & Visual Foundations

The application interface represents a modern, clean, developer-focused dashboard. It prioritizes clarity, high contrast, zero clutter, and immediate visual feedback.

### Color Palette

| Token Name | Hex Code | Tailwind Equivalent | Usage / Application |
| :--- | :--- | :--- | :--- |
| **Primary Brand** | `#6366F1` | `indigo-500` | Primary action buttons, active navigation, focus rings. |
| **Primary Hover** | `#4F46E5` | `indigo-600` | Button hover and pressed states. |
| **Primary Subtle** | `#EEF2FF` | `indigo-50` | Active selection backgrounds, subtle pill tags. |
| **Background (Main)**| `#0F172A` | `slate-900` | Main application background (Dark theme default). |
| **Surface / Card** | `#1E293B` | `slate-800` | Todo item cards, modals, navigation headers, containers. |
| **Surface Elevate** | `#334155` | `slate-700` | Card hover states, dropdown menus, input backgrounds. |
| **Border / Divider** | `#475569` | `slate-600` | Card borders, table dividers, input borders. |
| **Text Primary** | `#F8FAFC` | `slate-50` | Headings, primary task titles, high-emphasis copy. |
| **Text Secondary** | `#94A3B8` | `slate-400` | Subtitles, descriptions, timestamps, secondary labels. |
| **Text Muted** | `#64748B` | `slate-500` | Placeholders, disabled states, metadata captions. |
| **Success** | `#10B981` | `emerald-500` | Completed status pills, healthy API badges, toast success. |
| **Warning** | `#F59E0B` | `amber-500` | Pending states, slow response alerts. |
| **Error / Destructive**| `#EF4444` | `red-500` | Delete buttons, error alerts, failed connection badges. |

---

### Typography Scale

- **Primary Font Family:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace Font Family:** `JetBrains Mono, "Fira Code", monospace` (Used for IDs, JSON previews, endpoint pills)

| Role | Font Size | Line Height | Weight | Letter Spacing | CSS Equivalent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | `30px (1.875rem)` | `38px` | `700 (Bold)` | `-0.025em` | `text-3xl font-bold tracking-tight` |
| **Section H2** | `22px (1.375rem)` | `28px` | `600 (Semibold)`| `-0.015em` | `text-xl font-semibold` |
| **Subheading H3**| `18px (1.125rem)` | `24px` | `600 (Semibold)`| `normal` | `text-lg font-semibold` |
| **Body (Default)** | `15px (0.9375rem)`| `22px` | `400 (Regular)` | `normal` | `text-base font-normal` |
| **Body Emphasized**| `15px (0.9375rem)`| `22px` | `500 (Medium)`  | `normal` | `text-base font-medium` |
| **Small / Caption**| `13px (0.8125rem)`| `18px` | `400 (Regular)` | `+0.01em`| `text-sm font-normal text-slate-400` |
| **Code / Micro** | `12px (0.75rem)`  | `16px` | `500 (Medium)`  | `normal` | `font-mono text-xs` |

---

## 2. Component Design Specifications

### 1. Buttons
- **Primary Button (`Create Task`, `Save`):**
  - Background: `#6366F1`, Text: `#FFFFFF`, Radius: `8px (rounded-lg)`, Padding: `10px 18px`.
  - Hover: Background `#4F46E5`, Transition: `all 150ms ease-in-out`.
  - Focus Ring: `2px solid #818CF8`, offset `2px`.
  - Loading State: Shows spinner, text dimmed, disabled cursor.
- **Secondary / Ghost Button (`Cancel`, `Refresh`):**
  - Background: `transparent`, Border: `1px solid #475569`, Text: `#F8FAFC`.
  - Hover: Background `#334155`.
- **Destructive Button (`Delete`):**
  - Background: `#EF4444` (or transparent with `#EF4444` icon on hover), Text: `#FFFFFF`.
  - Hover: Background `#DC2626`.

### 2. Form Inputs & Textareas
- **Input Field:**
  - Background: `#1E293B`, Border: `1px solid #475569`, Text: `#F8FAFC`.
  - Padding: `10px 14px`, Radius: `8px`.
  - Placeholder: `#64748B`.
  - Focus: Border `#6366F1`, Outline: `none`, Box Shadow: `0 0 0 3px rgba(99, 102, 241, 0.25)`.
  - Error: Border `#EF4444`, Subtext in `#EF4444` with warning icon.

### 3. Todo Item Card
- **Structure:**
  - Card container: Background `#1E293B`, Border: `1px solid #334155`, Radius: `10px`, Padding: `16px`.
  - Left side: Checkbox (Round, emerald on checked state) + Title + Timestamp.
  - Right side: Action group (Edit button, Delete button).
- **Completed State:** Title displayed with `line-through text-slate-500`, background dimmed.
- **Hover State:** Border transitions to `#6366F1`, subtle shadow elevation (`0 4px 12px rgba(0,0,0,0.2)`).

### 4. System Health Pill (Status Banner)
- Located in header bar to show live connection state:
  - **Online / Connected:** Emerald dot + text `"API & DB Connected (Docker Compose)"`
  - **Degraded / Reconnecting:** Amber pulsing dot + text `"Database Reconnecting..."`
  - **Offline:** Red dot + text `"Service Disconnected"`

---

## 3. Spacing & Layout Grid Rules

- **Base Grid Unit:** Strict 8-point spatial system ($4\text{px}, 8\text{px}, 12\text{px}, 16\text{px}, 24\text{px}, 32\text{px}, 48\text{px}, 64\text{px}$).
- **Container Max-Width:**
  - Dashboard Container: `max-w-4xl` ($896\text{px}$) centered horizontally (`mx-auto`).
  - Margins: `px-4` on mobile, `px-8` on desktop.
- **Component Gaps:**
  - Between list cards: `gap-3` ($12\text{px}$).
  - Form field groupings: `space-y-4` ($16\text{px}$).
  - Section separation: `my-8` ($32\text{px}$).

---

## 4. API & Integration Specification

All endpoints are accessed either directly at `http://localhost:5000` (development) or through the reverse proxy at `http://<domain-or-ip>/api` (production).

### Base URLs:
- **Local Dev:** `http://localhost:5000`
- **Reverse Proxy / Production:** `http://<server-ip>/api` (or `/todos` via root proxy rewrite)

---

### Endpoint 1: Retrieve All Todos
- **Method:** `GET`
- **Path:** `/todos`
- **Description:** Returns an array of all todo documents stored in MongoDB, sorted by creation date descending.
- **Query Parameters (Optional):**
  - `completed` (boolean, optional): Filter by completion status (`true` / `false`).
- **Request Headers:**
  - `Accept: application/json`
- **Response Status:** `200 OK`
- **Response Body Schema:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6640abcde123456789012345",
      "title": "Set up multi-container docker compose",
      "description": "Orchestrate Node.js and MongoDB with persistent volumes",
      "isCompleted": false,
      "createdAt": "2026-11-13T00:00:00.000Z",
      "updatedAt": "2026-11-13T00:00:00.000Z"
    },
    {
      "_id": "6640abcde123456789012344",
      "title": "Write Terraform cloud scripts",
      "description": "Automate VM provisioning",
      "isCompleted": true,
      "createdAt": "2026-11-12T22:30:00.000Z",
      "updatedAt": "2026-11-12T23:15:00.000Z"
    }
  ]
}
```

---

### Endpoint 2: Create a New Todo
- **Method:** `POST`
- **Path:** `/todos`
- **Description:** Validates request payload, inserts a new todo document into MongoDB, and returns the persisted record.
- **Request Headers:**
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Request Body Schema:**
```json
{
  "title": "Configure Ansible Playbook",
  "description": "Automate Docker engine installation on target VM"
}
```
- **Validation Rules:**
  - `title`: String, required, trimmed, min length 1, max length 200.
  - `description`: String, optional, max length 2000.
- **Response Status:** `201 Created`
- **Response Body Schema:**
```json
{
  "success": true,
  "data": {
    "_id": "6640abcde123456789012346",
    "title": "Configure Ansible Playbook",
    "description": "Automate Docker engine installation on target VM",
    "isCompleted": false,
    "createdAt": "2026-11-13T00:10:00.000Z",
    "updatedAt": "2026-11-13T00:10:00.000Z"
  },
  "message": "Todo created successfully"
}
```
- **Error Responses:**
  - `400 Bad Request`: If `title` is missing or empty.

---

### Endpoint 3: Get a Single Todo by ID
- **Method:** `GET`
- **Path:** `/todos/:id`
- **Description:** Fetches one specific todo document by its 24-character hexadecimal MongoDB ObjectId.
- **URL Parameters:**
  - `id`: MongoDB ObjectId string (e.g. `6640abcde123456789012346`).
- **Response Status:** `200 OK`
- **Response Body Schema:**
```json
{
  "success": true,
  "data": {
    "_id": "6640abcde123456789012346",
    "title": "Configure Ansible Playbook",
    "description": "Automate Docker engine installation on target VM",
    "isCompleted": false,
    "createdAt": "2026-11-13T00:10:00.000Z",
    "updatedAt": "2026-11-13T00:10:00.000Z"
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: If `:id` is not a valid 24-char ObjectId.
  - `404 Not Found`: If no todo with that ID exists.

---

### Endpoint 4: Update a Single Todo by ID
- **Method:** `PUT`
- **Path:** `/todos/:id`
- **Description:** Updates properties of an existing todo (e.g., toggling completion or modifying title/description).
- **URL Parameters:**
  - `id`: MongoDB ObjectId string.
- **Request Body Schema:**
```json
{
  "title": "Configure Ansible Playbook (Completed)",
  "description": "Tested successfully on Ubuntu 22.04 LTS",
  "isCompleted": true
}
```
- **Response Status:** `200 OK`
- **Response Body Schema:**
```json
{
  "success": true,
  "data": {
    "_id": "6640abcde123456789012346",
    "title": "Configure Ansible Playbook (Completed)",
    "description": "Tested successfully on Ubuntu 22.04 LTS",
    "isCompleted": true,
    "createdAt": "2026-11-13T00:10:00.000Z",
    "updatedAt": "2026-11-13T00:25:00.000Z"
  },
  "message": "Todo updated successfully"
}
```
- **Error Responses:**
  - `400 Bad Request`: If ID or body is invalid.
  - `404 Not Found`: If todo does not exist.

---

### Endpoint 5: Delete a Single Todo by ID
- **Method:** `DELETE`
- **Path:** `/todos/:id`
- **Description:** Permanently deletes a todo document from the MongoDB database.
- **URL Parameters:**
  - `id`: MongoDB ObjectId string.
- **Response Status:** `200 OK`
- **Response Body Schema:**
```json
{
  "success": true,
  "message": "Todo deleted successfully",
  "data": {
    "_id": "6640abcde123456789012346"
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: If `:id` is malformed.
  - `404 Not Found`: If todo does not exist.

---

### Endpoint 6: Health & System Diagnostics
- **Method:** `GET`
- **Path:** `/health`
- **Description:** Used by Docker container health checks, CI/CD validation steps, and load balancers to verify service availability.
- **Response Status:** `200 OK` (when healthy) or `503 Service Unavailable` (when database is down).
- **Response Body Schema:**
```json
{
  "status": "UP",
  "timestamp": "2026-11-13T00:30:00.000Z",
  "services": {
    "api": {
      "status": "healthy",
      "uptimeSeconds": 1420
    },
    "database": {
      "status": "connected",
      "host": "mongodb:27017",
      "name": "todos_db"
    }
  }
}
```

---

## 5. External Services & Third-Party Integrations

| Service Name | Purpose / Responsibility | Integration Mechanism | Configuration Required |
| :--- | :--- | :--- | :--- |
| **Docker Hub** | Public/Private container registry hosting production API images. | Docker CLI / GitHub Actions action `docker/build-push-action`. | Secrets: `DOCKER_HUB_USERNAME`, `DOCKER_HUB_TOKEN`. |
| **Cloud Provider (DigitalOcean / AWS)** | Virtual private server hosting the Docker Compose runtime. | Terraform Provider (`digitalocean/digitalocean` or `hashicorp/aws`). | Cloud API token (`DIGITALOCEAN_TOKEN` or `AWS_ACCESS_KEY_ID`). |
| **GitHub Actions** | Automated CI runner executing test suite and remote deployment. | GitHub Secrets & SSH Action (`appleboy/ssh-action` or direct SSH). | Secrets: `SSH_PRIVATE_KEY`, `SERVER_HOST`, `SERVER_USER`. |
