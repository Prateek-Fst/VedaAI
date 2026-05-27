# VedaAI — AI-Powered Worksheet & Exam Generator

VedaAI is a premium, high-fidelity Web Application designed for teachers to generate curriculum-aligned exam worksheets, quizzes, and study papers. By leveraging advanced visual AI models, teachers can upload textbooks, handwritten notes, or curriculum documents to instantly construct visually beautiful, highly structured worksheets complete with difficulty badges, answer keys, and instant PDF print layouts.

---

## Technical Stack & Architecture

The application is structured as a decoupled monorepo separating a high-performance Express server and a modern Next.js client.

### Backend Stack
- **Runtime & Language**: Node.js + Express with TypeScript
- **Database**: MongoDB + Mongoose (robust storage for assignments, schemas, and questions)
- **Message Broker & Queues**: BullMQ + Redis (handles heavy visual AI generation jobs asynchronously to prevent API blockages)
- **Real-time Comms**: Socket.io (streams job status from queue workers back to the browser in real-time)
- **Visual AI Processing**: Gemini 1.5 Flash / GPT-4o (multimodal REST processing with strict schema prompt constraints)

### Frontend Stack
- **Framework**: Next.js 14+ (App Router) + TypeScript
- **Styling**: TailwindCSS with curated custom aesthetics (Google Fonts Outfit/Inter, subtle shadows, and premium layout spacing)
- **State Management**: Zustand (extremely light and reactive global store)
- **Real-time Sync**: Socket.io-client
- **PDF Generation**: `html2pdf.js` (A4 margin-adjusted vector rendering)

---

## System Workflow & WebSocket Queuing

```
[Teacher Uploader] ---> (POST /api/assignments) ---> [Express Server]
                                                           |
                                                           v
[Client Socket] <-- (Socket.io Emit) <-- [Queue Worker] <--- [BullMQ Queue (Redis)]
```

1. **Submission**: A teacher enters worksheet parameters (Title, Class, Subject) and uploads a syllabus image.
2. **Database & Queueing**: The server creates a MongoDB record with `status: pending`, then schedules a background task in **BullMQ** managed by **Redis**.
3. **Socket Subscription**: The client connects to Socket.io and enters an `assignmentId` room.
4. **Asynchronous Job Worker**:
   - The worker activates: sets progress to `20%` (broadcasting `"Processing image..."`).
   - The worker invokes visual Gemini/OpenAI models: sets progress to `50%` (broadcasting `"Analyzing content..."`).
   - The AI responds with parsed structural JSON. The worker validates schema compliance: sets progress to `80%` (broadcasting `"Structuring sheet..."`).
   - The worker stores questions in MongoDB, sets state to `completed`, and sends a `100%` signal with final worksheet data.
5. **Worksheet Display**: The Next.js frontend transitions the user directly to a beautiful board-exam printed sheet.

---

## Visual & Aesthetic Highlights

- **Visual Difficulty Badges**: Custom color-coded badges (`Easy` - Green, `Medium` - Yellow, `Hard` - Red) highlight question cognitive loads.
- **Printed A4 Worksheet Layout**: Designed as a physical sheet with school headers, exam guidelines, instructions, and name/roll inputs.
- **Toggleable Answer Key**: One-click toggles a dedicated answers pane showcasing the correct answers and step-by-step AI explanations for study guides.
- **Zero-Config Premium Fallback**: If no LLM API keys are provided in `.env`, the system uses an intelligent theme parser to produce extremely high-fidelity mock worksheets in real-time, ensuring immediate, out-of-the-box evaluation.
- **Asynchronous Dual-Mode Processing**: If a local Redis server is not running, the backend seamlessly bypasses BullMQ and runs the generation in an asynchronous background thread, ensuring Socket.io progress updates continue to work flawlessly.

---

## Installation & Setup Instructions

### Prerequisites
- **Node.js** (v18 or above)
- **MongoDB** (Local instance running on `mongodb://localhost:27017/veda-ai` or Cloud URI)
- **Redis** (Local instance running on `127.0.0.1:6379`, optional — will fallback gracefully if Redis is off)

---

### Step 1: Clone and Configure Environment Variables

Open `/backend/.env` and update configurations as required:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/veda-ai
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

---

### Step 2: Initialize the Backend Server

```bash
cd backend
npm install
npm run dev
```
The server will boot up and start listening on port `5001`.

---

### Step 3: Initialize the Next.js Client

```bash
cd frontend
npm install
npm run dev
```
The client will start running on port `3000`. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Developer Verification Plan

1. **Dashboard Empty State**: Navigate to `http://localhost:3000`. You will see the beautiful illustration and "+ Create Your First Assignment" call-to-action button.
2. **Form Wizard**: Click the creation button, upload a JPEG/PNG document, fill out the metadata, configure MCQ, Short, Diagram, and Numerical counts, and submit.
3. **Queue Progress Bar**: You will witness a beautiful progress overlay syncing WebSockets updates (20% -> 50% -> 80% -> 100%) in real-time.
4. **Visual Sheet View**: View the generated worksheet with Name/Roll lines, Sections, Difficulty tags, and Teacher Answer toggles.
5. **PDF Export**: Click "Download as PDF" to save a clean, margin-adjusted A4 document directly to your downloads.

---

## Architectural Approach & Engineering Decisions

To build an institutional-grade platform, we formulated a highly resilient, performant decoupled approach.

### 1. The Dual-Mode Execution Strategy (No-Fail BullMQ Fallback)
Visual AI models (Gemini 1.5 Flash, GPT-4o) are highly compute-intensive and subject to cold starts and network latency. Blocking a standard Express request-response thread for 10-15 seconds is highly anti-pattern. 
- **Active Mode (Redis Active)**: When a Redis instance is available, tasks are dispatched asynchronously to a high-concurrency **BullMQ queue**. The queue worker consumes the job, calls the AI models, updates MongoDB, and emits real-time progress percentages (20% -> 50% -> 80% -> 100%) back to the client using **Socket.io**.
- **Graceful Fallback Mode (Redis Offline)**: In environments where Redis is not running locally, the system bypasses BullMQ. It initiates a synchronous background execution thread (`process.nextTick`) without blocking the main event loop, ensuring **Socket.io** progress updates and worksheet generations continue to work seamlessly.

### 2. Multi-Level Caching Engine (Premium Performance)
To avoid unnecessary database stress and provide instant, sub-5ms load times for teachers, we implemented active **Redis caching**:
- **Search & Filters Caching**: When listing assignments, search queries, filters, and paginations are cached globally with a 60-seconds TTL (`cache:assignments:search:*:status:*`).
- **Worksheet Details Caching**: The detailed question structures of completed assignments are cached under a 120-seconds TTL (`cache:assignment:<id>`).
- **Intelligent Cache Invalidation**: Whenever a new assignment is created, deleted, or regenerated, a cache cleaner invalidates both the list caches and the specific detail cache, guaranteeing that teachers always see real-time data immediately after any mutation.

### 3. High-Fidelity PDF Vectors
Instead of simple canvas screenshotting (which results in pixelated text), we utilize **`html2pdf.js`** which compiles the DOM into standard PDF vector curves. Standard `@media print` rules ensure:
- Hide all screen controls, sidebars, headers, and quick-action buttons.
- Impose standard A4 print margins.
- Apply `page-break-before: always` and `page-break-inside: avoid` rules to prevent exam sections and questions from awkwardly breaking in the middle.

