# ODYS

A personal AI operating system connecting your goals, memory, knowledge, tools, and agents.

ODYS is an AI-native personal operating system designed to understand information, plan work, and coordinate actions around a user's long-term context. It aims to reduce the effort of searching across apps, repeating context, organizing tasks, and moving from plans to execution.

Shared capabilities belong to ODYS Core. Domain-specific capabilities belong to ODYS Packs. The first extension, Engineering Pack, targets learning, technical knowledge, conferences and events, career development, coding, and projects.

> Development status: ODYS is in early development, with the Core library and execution contracts under active construction. A web application and a ready-to-use personal assistant service are not yet available. This README distinguishes implemented capabilities from the broader product direction.

## Contents

- [Product Direction](#product-direction)
- [Current Implementation](#current-implementation)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Development Commands](#development-commands)
- [Repository Structure](#repository-structure)
- [Documentation](#documentation)
- [Development and Contributions](#development-and-contributions)
- [Roadmap](#roadmap)

## Product Direction

ODYS aims to bring the following capabilities into one continuous user experience:

- Context & Memory — Preserve goals, projects, and important decisions for use in future work.
- Knowledge — Retrieve documents and external information, and connect relevant knowledge.
- Agents & Tools — Let specialized agents use models and tools through a shared execution system.
- Planning & Action — Break goals into actionable tasks and execute them according to permissions and user approval.
- Monitoring — Track relevant conditions and notify the user when attention is needed.

Initial development focuses on the developer's own workflows. Capabilities will be generalized as repeated use demonstrates their value. See the [Product Definition](docs/10_product/PRODUCT_DEFINITION.md) and [Vision](docs/00_foundation/VISION.md) for the broader rationale.

## Current Implementation

| Area                       | Implemented capabilities                                                                                                                        |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent                      | Definition validation, registry, runtime, model-backed execution, and per-agent tool allowlists                                                 |
| Tool                       | Definition, registration, execution, Zod-based input/output validation, and permission checks                                                   |
| Model                      | Definition, registration, execution, request/response contracts, response interpretation, and provider adapter interfaces with execution wiring |
| Agent–Model–Tool execution | Handling final responses or tool requests, then passing tool results back to the model                                                          |
| Pack                       | Manifest validation, registry, duplicate identifier checks, and the Engineering Pack's initial manifest                                         |
| Development infrastructure | pnpm workspace, TypeScript configuration, tests, formatting, linting, type checking, builds, and GitHub Actions CI                              |

The current Agent–Model–Tool executor supports one tool execution followed by a model continuation. If the continuation requests another tool, the executor raises a turn-limit error.

The following remain design directions or future implementation work:

- Web UI, user onboarding, and application APIs
- Persistent context and memory storage and retrieval
- Concrete external model providers and external service integrations
- User approval interfaces, persistent audit records, and monitoring workflows
- Domain functionality for Study, Conference, Career, and Coding agents

Engineering Pack currently provides a foundation for validating the extension contract. It does not yet deliver those agents as complete features.

## Architecture

ODYS follows a modular monolith architecture: one repository with clear boundaries between shared execution infrastructure and domain logic.

```text
Applications / Domain Packs
           │
           │ Use Core public APIs
           ▼
       ODYS Core
       ├── Agent definitions · Registry · Runtime
       ├── Tool definitions · Validation · Permissions · Runtime
       ├── Model contracts · Registry · Runtime
       └── Pack manifests · Registry
           │
           │ Executor / adapter boundary
           ▼
  Model providers and external services
```

Applications and concrete external integrations are future implementation work. The current package dependency direction is `@odys/engineering-pack` → `@odys/core`.

- Core owns general-purpose capabilities. Rules specific to a domain, service, or individual user belong in a Pack or integration.
- Packs use Core's public contracts. Core should remain independent of individual Pack implementations.
- Models and external services sit behind replaceable boundaries. Provider types and SDKs should stay isolated from the wider domain model.
- Autonomy grows progressively. Tool permission checks provide a foundation for broader approval and execution policies.

See the [System Overview](docs/20_architecture/SYSTEM_OVERVIEW.md) for the full design and [Architecture Decision Records](docs/40_decisions/README.md) for key decisions.

## Technology Stack

| Category                     | Current technology                         |
| ---------------------------- | ------------------------------------------ |
| Language and modules         | TypeScript, ECMAScript Modules             |
| Runtime                      | Node.js 24 — `>=24.19.0 <25`               |
| Package management           | pnpm `11.20.0`, pnpm workspaces            |
| Tool input/output validation | Zod 4                                      |
| Testing                      | Vitest                                     |
| Code quality                 | ESLint, Prettier, TypeScript type checking |
| CI                           | GitHub Actions                             |

The [root package.json](package.json), individual package manifests, and [pnpm-lock.yaml](pnpm-lock.yaml) are the source of truth for versions. The `.nvmrc` file specifies the major version `24`; check the minimum supported version when installing Node.js.

Supabase and PostgreSQL are the planned initial data platform. They are not required to validate the current Core implementation. A web framework and deployment platform have not yet been selected. See the [Technology Stack](docs/20_architecture/TECH_STACK.md) document for details.

## Getting Started

### 1. Prepare your environment

Install Git, Node.js `>=24.19.0 <25`, and pnpm `11.20.0`. If pnpm is not available after installing Node.js, install it with:

```sh
npm install --global pnpm@11.20.0
node --version
pnpm --version
```

### 2. Clone and install dependencies

Authenticate with an account that has access to the repository. If you already have a checkout, run the dependency installation command from its root.

```sh
git clone https://github.com/JulianMint0610/odys.git
cd odys
pnpm install --frozen-lockfile
```

### 3. Run the quality checks

```sh
pnpm check
```

This runs formatting checks, linting, type checking, tests, and builds in order, stopping at the first failure. The current Core tests and builds do not require external model API keys or database configuration.

The repository does not yet define a root `dev` or `start` command. Tests and builds are the current entry points; there is no application server or local web URL to open.

## Development Commands

Run these commands from the repository root.

| Command              | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `pnpm check`         | Run all quality checks and builds                   |
| `pnpm format:check`  | Check formatting with Prettier                      |
| `pnpm format`        | Apply Prettier formatting; modifies files           |
| `pnpm lint`          | Run ESLint                                          |
| `pnpm typecheck`     | Type-check workspace packages                       |
| `pnpm test`          | Run root `tests/` and workspace package tests       |
| `pnpm build`         | Build workspace packages                            |
| `pnpm dev:status`    | Inspect local Git state                             |
| `pnpm dev:preflight` | Check development branch state against local `main` |

You can also target a specific package:

```sh
pnpm --filter @odys/core test
pnpm --filter @odys/core typecheck
pnpm --filter @odys/engineering-pack test
```

`dev:status` and `dev:preflight` inspect local state without updating remote references. The preflight returns `BLOCKED` when running on `main`, on a detached HEAD, without a local `main`, or on a branch behind local `main`. A `READY` result does not mean tests passed or the checkout is up to date with the remote.

## Repository Structure

```text
odys/
├── packages/
│   └── core/              # @odys/core: Agent, Tool, Model, and Pack contracts and runtimes
├── packs/
│   └── engineering/       # @odys/engineering-pack: initial domain Pack foundation
├── apps/                  # Reserved for applications
├── services/              # Reserved for services
├── agents/                # Reserved for agent packages
├── tests/                 # Repository state, preflight, and Core/Pack boundary tests
├── scripts/               # Development status and preflight scripts
├── docs/
│   ├── 00_foundation/     # Vision, principles, and terminology
│   ├── 10_product/        # Product definition, requirements, use cases, and roadmap
│   ├── 20_architecture/   # Core, Agent, Tool, Model, data, and security design
│   ├── 30_packs/          # Pack standard and Engineering Pack design
│   ├── 40_decisions/      # Architecture Decision Records
│   └── 50_engineering/    # Development, testing, coding standards, and releases
├── graft/                 # Repository context map for code navigation
└── .github/               # CI, issue templates, and pull request template
```

The `apps/`, `services/`, and `agents/` directories currently contain only `.gitkeep` placeholders. Core agent execution code lives in `packages/core/src/agent/`.

## Documentation

| Topic                                      | Documents                                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Product purpose and scope                  | [Product Definition](docs/10_product/PRODUCT_DEFINITION.md), [PRD](docs/10_product/PRD.md)                                       |
| User scenarios                             | [Use Cases](docs/10_product/USE_CASES.md), [User Journey](docs/10_product/USER_JOURNEY.md)                                       |
| System structure and Core responsibilities | [System Overview](docs/20_architecture/SYSTEM_OVERVIEW.md), [ODYS Core](docs/20_architecture/ODYS_CORE.md)                       |
| Agent and Tool execution                   | [Agent Architecture](docs/20_architecture/AGENT_ARCHITECTURE.md), [Tool Architecture](docs/20_architecture/TOOL_ARCHITECTURE.md) |
| Model abstraction and provider boundaries  | [Model Strategy](docs/20_architecture/MODEL_STRATEGY.md)                                                                         |
| Memory and data                            | [Memory Architecture](docs/20_architecture/MEMORY_ARCHITECTURE.md), [Data Model](docs/20_architecture/DATA_MODEL.md)             |
| Permissions and security                   | [Security Architecture](docs/20_architecture/SECURITY_ARCHITECTURE.md)                                                           |
| Pack extensions                            | [Pack Standard](docs/30_packs/PACK_STANDARD.md), [Engineering Pack](docs/30_packs/engineering/README.md)                         |
| Architectural decisions                    | [Architecture Decision Records](docs/40_decisions/README.md)                                                                     |
| Development and validation                 | [Development Workflow](docs/50_engineering/DEVELOPMENT_WORKFLOW.md), [Test Strategy](docs/50_engineering/TEST_STRATEGY.md)       |
| Coding conventions                         | [Coding Standards](docs/50_engineering/CODING_STANDARDS.md)                                                                      |

Design documents also cover planned capabilities. Consult the implementation status above alongside the source code and tests to determine what currently works.

## Development and Contributions

1. Read the relevant design documents and existing tests.
2. Create a focused development branch and keep changes small.
3. Update relevant tests and documentation when behavior changes.
4. Run `pnpm check`, then open a pull request describing the change and its validation.
5. Review the GitHub Actions CI results for pull requests targeting `main`.

Preserve the dependency direction between Core and Packs, and validate external input at runtime. Keep API keys, tokens, credentials, and personal data out of the repository.

See the [Development Workflow](docs/50_engineering/DEVELOPMENT_WORKFLOW.md) for the full process and the [AI Development Workflow](docs/50_engineering/AI_DEVELOPMENT_WORKFLOW.md) for guidance on AI-assisted development.

## Roadmap

Development progresses through practical use and validation:

1. Foundation & Core — Establish repository quality tooling and shared execution contracts.
2. Context & Memory — Preserve user context and data across sessions.
3. Useful Workflows — Connect real tools and build agents worth using repeatedly.
4. Progressive Autonomy — Add user approval, execution policies, and monitoring.
5. Engineering Pack & Personal Alpha — Integrate learning, development, and career workflows, then validate them in daily use.
6. External Alpha & Platform — Validate with external users, develop the product, and expand into additional Packs.

These stages describe the product direction, not completion status or a release schedule. See the [detailed Roadmap](docs/10_product/ROADMAP.md) for stage goals and exit criteria.
