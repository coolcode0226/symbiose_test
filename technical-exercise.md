# 🌲 Full-Stack Technical Challenge — Product Hardening & Service Boundary Extraction

## Context

At Symbiose, we build geospatial software products that help users understand, monitor, and value forests using Earth Observation, spatial analytics, and interactive mapping.

In practice, engineers rarely work on a perfectly clean codebase. A large part of the job is to take over an existing system, understand its weaknesses, improve reliability, and evolve the architecture without breaking the product.

This challenge is designed to reflect that reality.

You will receive an existing codebase for a geospatial full-stack application. Your task is to improve it into a more robust and production-minded product prototype, and to implement one bounded transition toward a service-oriented architecture.

---

## Objective

Starting from the provided codebase, improve the application so that it becomes:

- more coherent end-to-end
- more robust from a product and engineering perspective
- better aligned with a production-oriented full-stack architecture
- better structured for future evolution toward microservices

We are **not** evaluating how many features you can produce.

We are evaluating:

- engineering judgment
- ability to understand and improve an existing system
- code quality
- product thinking
- geospatial reasoning
- architectural maturity
- clarity of explanation

---

## Technical Context

The provided codebase is already close to the type of stack we use. Our target environment is broadly based on:

**Frontend**
- TypeScript
- React
- Next.js

**Backend**
- TypeScript
- Node.js
- NestJS

**API**
- GraphQL

**Data / Infra**
- PostgreSQL / PostGIS
- Docker
- geospatial APIs and map-based UI

You are **not** expected to rewrite the project from scratch.

You are expected to:

- improve the existing codebase
- make it more reliable and maintainable
- implement one meaningful bounded extraction toward a service-oriented architecture

---

## What We Provide

You will receive:

- an existing codebase: https://github.com/TALHA017/forest-bd-viewer
- setup instructions
- the original product context and data references if relevant

The codebase is intentionally not perfect. Some parts may be incomplete, inconsistent, or not fully robust. This is expected.

Your role is to improve it intelligently.

---

## Your Mission

Your work is divided into **three required parts**.

---

### Part 1 — Technical Review of the Existing Codebase

Before implementing changes, review the provided codebase and identify the most important strengths, weaknesses, and risks.

Please provide a short written review including:

- what the current codebase already does well
- the main weaknesses or risks you identified
- the **top 3 issues** you believe should be addressed first
- what you intentionally decided **not** to fix in the time available, and why

This review must be included in your README or in a short separate document. We care a lot about your reasoning here.

---

### Part 2 — Improve the Existing Product

You must improve the provided application so that it becomes more robust and coherent.

**Mandatory implementation work** — You must complete **all** of the following:

#### 1. Fix at least one real end-to-end inconsistency

Examples:
- a frontend/backend mismatch
- a broken GraphQL flow
- a state persistence issue between frontend and backend
- a feature that appears implemented but does not actually work correctly

The goal is to make the main user flow more reliable.

#### 2. Improve the geospatial data loading or filtering strategy

Examples:
- reduce unnecessary data transfer
- improve filtering by viewport, administrative area, or other relevant scope
- improve query consistency
- make map behavior more scalable or more coherent

We are not expecting advanced geospatial optimization, but we do expect thoughtful improvements.

#### 3. Improve persisted workspace or user-state behavior

Examples:
- improve saved map state
- improve restoration on login
- improve state shape, typing, reliability, or persistence logic
- improve the overall coherence of the user experience

#### 4. Improve one area of code quality or maintainability

Examples:
- remove fragile hacks
- improve typing
- improve structure or naming
- reduce duplication
- improve module boundaries
- remove dead or misleading code

You do **not** need to fix everything. We are evaluating whether you choose meaningful improvements.

---

### Part 3 — Implement One Service-Boundary Transition

A key part of this challenge is to assess how you think about evolving a product toward a service-oriented architecture.

You must choose **one domain** in the existing codebase and implement a first transition toward a service-oriented boundary.

**Goal**

We do **not** expect a full distributed microservices implementation.

We **do** expect a concrete, implemented step showing that you can:

- identify a meaningful boundary
- reduce coupling
- define a clearer contract
- make future extraction into a real microservice credible

**Examples of acceptable directions** — You may choose a boundary such as:

- geospatial query domain
- workspace state persistence
- administrative area lookup
- polygon analysis
- authentication / session-related logic
- another domain you believe is more relevant

**What your implementation should demonstrate** — Your bounded extraction should show:

- a clearly identified boundary
- better separation of concerns
- a cleaner contract or interface
- reduced coupling with the rest of the application
- a credible path toward future independent evolution

**Acceptable implementation approaches** — Your bounded extraction can take one of the following forms:

**Option A — Service-ready API boundary**
Introduce a dedicated internal API layer or service client abstraction such that the domain could later be moved out of process with minimal change to consumers.

**Option B — Separate runnable service prototype**
Extract one domain into a separately runnable lightweight service, with a simple contract between the main app and that service.

**For this part, please explain briefly:**

- what boundary you chose
- why you chose it
- what coupling problem it solves or reduces
- how this boundary could evolve into an actual service later
- what remains tightly coupled and why

---

## Expected Effort

Recommended effort: **1 to 3 days of focused work**

We do not expect production completeness.

A smaller number of well-chosen, well-executed improvements is better than a broad but shallow rewrite.

---

## Deliverables

Please submit a Git repository containing:

- the updated source code
- any updated Docker / Docker Compose configuration if needed
- any setup or seed scripts required to run the project
- a README including:
  - setup instructions
  - what you changed
  - technical review of the initial codebase
  - explanation of your bounded extraction
  - trade-offs and simplifications
  - what remains unfinished
  - what you would improve next in a production context
  - time spent

Optional but appreciated:
- screenshots
- a short video walkthrough (max 5 minutes)

---

## Important Rules

Please do **not**:

- rewrite the project from scratch
- replace the whole stack with a different one
- add architectural complexity without clear value
- optimize for feature quantity over engineering quality

We want to understand how you think when improving an existing codebase.

---

## 🙋 Questions?

If anything is unclear, feel free to reach out. We're looking forward to seeing how you approach the challenge!
