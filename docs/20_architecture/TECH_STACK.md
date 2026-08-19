# ODYS Tech Stack

## 1. Purpose

이 문서는 ODYS에서 사용하는 주요 기술과 각 기술의 역할, 선택 상태 및 도입 원칙을 정의한다.

Tech Stack 문서의 목적은 가능한 모든 library를 미리 선택하는 것이 아니다.

다음 세 가지를 명확하게 구분한다.

```

Adopted

→ 현재 architecture 또는 repository에서 이미 채택한 기술

Planned

→ architecture상 필요하지만 concrete implementation은 아직 시작되지 않은 기술

Deferred

→ 실제 요구가 발생한 이후 선택할 기술

```

새로운 기술을 단순한 유행이나 가능성 때문에 추가하지 않는다.

---

## 2. Stack Principles

ODYS 기술 선택은 다음 원칙을 따른다.

### TypeScript First

주요 Application, Core 및 Agent code는 TypeScript를 기본 언어로 사용한다.

### Modular Monolith First

초기 backend를 microservice architecture로 구성하지 않는다.

### Provider Independence

Model, persistence 및 external provider detail을 Core domain logic과 분리한다.

### Managed Infrastructure Where Valuable

초기에는 제품 개발 속도와 운영 단순성을 높일 수 있는 managed platform을 적극 활용한다.

### Type Safety

compile-time typing과 runtime validation을 함께 사용한다.

### Incremental Complexity

실제 요구가 발생하기 전까지 새로운 framework나 infrastructure를 추가하지 않는다.

### Replaceable Boundaries

교체 가능성이 높은 external technology는 adapter 또는 contract 뒤에 둔다.

---

## 3. Current Stack Overview

현재 ODYS의 stack 상태는 다음과 같다.

| Area | Technology | Status |

| --- | --- | --- |

| Primary Language | TypeScript | Adopted |

| Runtime | Node.js 24 | Adopted |

| Package Manager | pnpm 11 | Adopted |

| Monorepo | pnpm Workspace | Adopted |

| Formatting | Prettier | Adopted |

| Linting | ESLint | Adopted |

| Source Control | Git | Adopted |

| Repository Hosting | GitHub | Adopted |

| Continuous Integration | GitHub Actions | Adopted |

| Database | PostgreSQL via Supabase | Adopted Architecture |

| Authentication | Supabase Auth | Planned |

| Backend Platform | Supabase | Adopted Architecture |

| AI Integration | Provider-independent Model Layer | Adopted Architecture |

| Web Application | TypeScript-based Web Application | Planned |

| Runtime Validation | Zod 4 for Core Tool input/output contracts | Adopted |

| Test Runner | Vitest | Adopted |

| Deployment Provider | To be selected | Deferred |

| Observability Platform | To be selected | Deferred |

`Adopted Architecture`는 architecture decision이 확정되었지만 concrete provider implementation이 아직 시작되지 않았음을 의미한다.

---

## 4. Primary Language — TypeScript

ODYS의 주요 Application 및 platform code는 TypeScript를 사용한다.

TypeScript를 선택한 이유:

- static typing

- strong Web ecosystem

- shared frontend/backend types

- AI SDK ecosystem

- schema integration

- monorepo suitability

- tooling maturity

TypeScript는 단순한 JavaScript syntax extension이 아니라 ODYS의 domain contract를 표현하는 주요 수단으로 사용한다.

---

## 5. TypeScript Policy

repository는 strict typing을 기본으로 한다.

공통 configuration은 `tsconfig.base.json`에서 관리한다.

현재 주요 policy:

```

strict

noUncheckedIndexedAccess

exactOptionalPropertyTypes

useUnknownInCatchVariables

noImplicitOverride

noFallthroughCasesInSwitch

forceConsistentCasingInFileNames

```

`any`를 architecture shortcut으로 남용하지 않는다.

external input은 TypeScript type만으로 안전하다고 간주하지 않고 runtime validation을 추가한다.

---

## 6. TypeScript Version

현재 repository는 TypeScript 6.x compatible configuration을 사용한다.

TypeScript version은 `typescript-eslint` 및 주요 tooling compatibility를 고려하여 관리한다.

major version upgrade는 dependency compatibility를 확인한 뒤 진행한다.

---

## 7. Node.js

ODYS의 primary server-side JavaScript runtime은 Node.js다.

현재 repository engine policy:

```

Node.js >=24.19.0 <25

```

Node.js major version을 local environment, CI 및 production에서 가능한 한 일치시킨다.

`.nvmrc`는 Node 24 major를 나타낸다.

---

## 8. Package Manager — pnpm

ODYS는 package manager로 pnpm을 사용한다.

현재 repository policy:

```

pnpm >=11.20.0 <12

```

pnpm을 선택한 주요 이유:

- workspace support

- efficient dependency storage

- deterministic lockfile workflow

- monorepo suitability

- strict dependency resolution behavior

---

## 9. pnpm Workspace

ODYS는 pnpm workspace 기반 monorepo를 사용한다.

현재 workspace boundary:

```yaml
packages:
  - 'apps/*'

  - 'services/*'

  - 'packages/*'

  - 'packs/*'

  - 'agents/*'
```

이 구조는 Application, Core package, Pack, Agent 및 향후 독립 service를 하나의 repository에서 관리할 수 있게 한다.

---

## 10. Repository Structure

현재 주요 code boundary는 다음과 같다.

```

odys/

├── apps/

├── agents/

├── packages/

├── packs/

├── services/

├── tests/

├── docs/

└── .github/

```

각 영역의 architecture responsibility는 `SYSTEM_OVERVIEW.md`에서 정의한다.

---

## 11. Application Layer

첫 Application은 Web interface로 개발하는 것을 기본 방향으로 한다.

그러나 Web framework는 아직 architecture-level decision으로 고정하지 않는다.

framework를 선택할 때 다음 기준을 평가한다.

```

TypeScript integration

server-side capability

streaming support

authentication integration

deployment portability

developer experience

ecosystem maturity

testing support

```

framework 선택은 첫 `apps/web` 구현 직전에 확정한다.

---

## 12. Why the Web Framework Is Deferred

framework를 architecture 문서 단계에서 미리 고정하지 않는 이유는 다음과 같다.

```

실제 Application 요구가 아직 구현되지 않음

routing requirement 미확정

rendering strategy 미확정

server/client boundary 미확정

deployment provider 미확정

```

실제 구현 직전에 필요한 정보가 더 많아진 상태에서 선택하는 것이 더 정확하다.

중요한 architecture invariant는 framework 이름이 아니라 **Application이 Core domain logic을 소유하지 않는 것**이다.

---

## 13. Core Package

ODYS의 공통 domain 및 runtime capability는 `packages/core/`에서 시작하는 것을 기본 방향으로 한다.

예상 structure:

```

packages/

└── core/

    └── src/

        ├── identity/

        ├── workspace/

        ├── project/

        ├── context/

        ├── memory/

        ├── agent/

        ├── tool/

        ├── model/

        ├── task/

        ├── policy/

        ├── permission/

        ├── approval/

        ├── audit/

        └── shared/

```

실제 구현에서는 필요하지 않은 module directory를 미리 만들지 않을 수 있다.

---

## 14. Backend Architecture

초기 backend architecture는 Modular Monolith를 사용한다.

```

Web / Backend Runtime

        │

        ├── Core Modules

        ├── Agent Runtime

        ├── Tool Runtime

        └── Integration Adapters

```

각 feature를 별도의 network service로 분리하지 않는다.

---

## 15. Supabase

ODYS의 초기 backend platform으로 Supabase를 사용한다.

Supabase의 주요 역할은 다음과 같다.

```

PostgreSQL

Authentication

Optional Storage

platform integration capabilities

```

Supabase를 사용하더라도 Core domain logic을 Supabase client API 자체에 종속시키지 않는다.

---

## 16. PostgreSQL

ODYS의 primary relational database는 PostgreSQL이다.

PostgreSQL은 다음 종류의 canonical data를 저장한다.

```

users

workspaces

projects

conversations

messages

memories

tasks

Agent executions

Tool executions

approvals

Audit events

```

실제 table design은 `DATA_MODEL.md`를 기반으로 구현한다.

---

## 17. Database Access

Core에서는 가능한 한 repository 또는 service contract를 사용한다.

```

Core Domain

     │

     ▼

Repository Contract

     │

     ▼

Supabase / PostgreSQL

```

database client object를 Agent 또는 Application 전체에 직접 전달하지 않는다.

---

## 18. Database Migrations

schema change는 version-controlled migration으로 관리한다.

production database의 manual-only 변경을 source of truth로 사용하지 않는다.

migration tooling의 concrete workflow는 실제 Supabase project bootstrap 단계에서 확정한다.

---

## 19. Authentication

초기 authentication은 Supabase Auth를 사용할 계획이다.

Application은 provider identity를 ODYS User domain concept로 normalize한다.

```

Supabase Identity

      │

      ▼

ODYS User Identity

```

authentication provider object가 Core domain type 자체가 되지 않도록 한다.

---

## 20. Authorization

authorization은 Supabase Auth만으로 해결하지 않는다.

```

Authentication

+

Workspace Authorization

+

Resource Authorization

+

Permission / Policy

```

database-level access policy는 defense-in-depth로 활용한다.

---

## 21. Object Storage

Document 또는 binary file storage가 실제로 필요해지는 경우 managed object storage를 사용한다.

Supabase Storage를 초기 후보로 사용할 수 있다.

그러나 첫 Core 구현 전에 storage subsystem을 미리 만들지 않는다.

canonical document metadata와 binary storage를 분리한다.

---

## 22. Semantic Search

Memory 또는 Document semantic retrieval을 위해 vector search capability가 필요할 수 있다.

Architecture 원칙:

```

Canonical Memory

      │

      ▼

Derived Embedding

      │

      ▼

Search Index

```

embedding이나 vector representation은 canonical Memory가 아니다.

concrete embedding model 및 index implementation은 Memory MVP를 구현하는 시점에 선택한다.

---

## 23. AI Integration Layer

ODYS는 특정 Model Provider에 직접 종속되지 않는 AI integration layer를 사용한다.

개념적인 구조:

```

Agent Runtime

     │

     ▼

Model Strategy

     │

     ▼

Model Abstraction

     │

     ▼

Provider Adapter

     │

     ▼

Model Provider

```

Model Provider 이름은 Agent domain logic에 hard-code하지 않는 것을 기본으로 한다.

---

## 24. AI SDK Strategy

Model integration은 공통 AI SDK 또는 equivalent abstraction을 사용할 수 있다.

중요한 requirement는 다음과 같다.

```

provider abstraction

Tool Calling support

structured output support

streaming support

TypeScript compatibility

```

특정 SDK의 type이 Core domain 전체의 canonical type이 되지 않도록 한다.

concrete SDK dependency는 Model implementation 시작 시 검증하고 선택한다.

---

## 25. Model Providers

초기에는 하나의 Model Provider로 시작할 수 있다.

Model independence를 증명하기 위해 첫날부터 여러 provider를 연결할 필요는 없다.

```

Stable Contract

       │

       ▼

First Provider

       │

       ▼

Real Usage

       │

       ▼

Second Provider When Needed

```

교체 가능한 architecture boundary가 먼저다.

---

## 26. Runtime Validation

External API input, Model structured output 및 Tool input/output에는 runtime schema validation이 필요하다.

현재 첫 concrete runtime-validation library로 Zod 4를 채택했으며, 구현 범위는 `@odys/core`의 Tool input/output contract validation이다. `ToolDefinition.inputSchema`와 `ToolDefinition.outputSchema`, `parseToolInput()`과 `parseToolOutput()`이 execution-independent boundary를 제공한다. 이 선택은 아직 구현되지 않은 모든 external boundary에 Zod 적용을 확정하지 않는다.

선택 기준:

```

TypeScript inference

runtime validation

structured error support

JSON schema compatibility where useful

AI structured output compatibility

ecosystem maturity

```

이 선택은 Pack, Agent, Model, external API 또는 모든 ODYS validation boundary가 Zod로 migration되었다는 의미가 아니다. 각 후속 boundary는 실제 contract가 구현될 때 검토한다.

---

## 27. Formatting — Prettier

repository formatting은 Prettier를 사용한다.

현재 configuration은 다음 원칙을 사용한다.

```

semicolons

single quotes

2-space indentation

100-character print width

LF line endings

```

formatting discussion을 code review의 주요 논쟁으로 만들지 않는다.

---

## 28. Linting — ESLint

static linting은 ESLint Flat Config를 사용한다.

현재 TypeScript lint stack:

```

ESLint

@eslint/js

typescript-eslint

globals

```

lint rule은 실제 source code가 증가하면서 필요한 rule을 단계적으로 강화한다.

처음부터 매우 복잡한 custom lint policy를 만들지 않는다.

---

## 29. Testing

자동 테스트는 ODYS architecture의 중요한 부분이다.

현재 repository는 Vitest를 TypeScript test runner로 사용한다.

Test Runner 선택 기준:

```

TypeScript support

ESM support

speed

mocking

coverage

workspace support

framework compatibility

```

---

## 30. Test Layers

향후 test stack은 다음 layer를 지원해야 한다.

```

unit tests

contract tests

integration tests

Agent scenario tests

Tool integration tests

API tests

security tests

evaluation tests

```

자세한 전략은 `../50_engineering/TEST_STRATEGY.md`에서 정의한다.

---

## 31. Model Evaluation

AI output quality는 일반 unit test와 별도 evaluation strategy가 필요하다.

평가 대상:

```

structured output validity

Tool selection

Task completion

hallucination

Context relevance

Agent-specific quality

```

concrete evaluation framework는 실제 Agent implementation 이후 결정한다.

---

## 32. Source Control — Git

ODYS는 Git을 source control system으로 사용한다.

Git repository가 다음의 source of truth다.

```

source code

architecture documentation

database migrations

configuration

Agent definitions

engineering workflow

```

production에서만 존재하는 undocumented logic을 만들지 않는다.

---

## 33. Repository Hosting — GitHub

Git repository hosting과 collaboration platform은 GitHub를 사용한다.

GitHub의 주요 역할:

```

remote repository

history

issues

pull requests

CI integration

release history

```

---

## 34. Continuous Integration — GitHub Actions

CI는 GitHub Actions를 사용한다.

현재 workflow는 다음 검사를 수행한다.

```

pnpm install --frozen-lockfile

pnpm format:check

pnpm lint

pnpm typecheck

pnpm test

pnpm build

```

---

## 35. Current Quality Commands

현재 root quality command는 다음과 같다.

```bash

pnpm format

pnpm format:check

pnpm lint

pnpm check

pnpm typecheck

pnpm test

pnpm build

```

`pnpm check`는 formatting, lint, typecheck, test 및 build를 순서대로 실행하는 전체 local quality gate다.

개별 command는 특정 단계만 다시 실행하거나 실패 원인을 진단할 때 사용할 수 있다.

---

## 36. ESM

현재 root project는 ECMAScript Module을 기본 module system으로 사용한다.

`package.json`:

```json
{
  "type": "module"
}
```

새 package는 특별한 이유가 없다면 이 방향과 일관성을 유지한다.

---

## 37. Shared TypeScript Configuration

공통 TypeScript compiler policy는 `tsconfig.base.json`에서 관리한다.

각 package와 Application은 필요에 따라 이를 extend한다.

예:

```json
{
  "extends": "../../tsconfig.base.json"
}
```

각 package가 서로 완전히 다른 strictness policy를 갖지 않도록 한다.

---

## 38. Line Endings

repository의 canonical line ending은 LF다.

`.gitattributes`와 `.editorconfig`를 사용해 운영체제 차이로 인한 불필요한 diff를 줄인다.

Windows-specific script format이 필요한 경우에만 CRLF를 명시할 수 있다.

---

## 39. Deployment Platform

Application hosting provider는 아직 확정하지 않는다.

선택 기준:

```

Node.js compatibility

framework compatibility

streaming

server runtime

environment variables

deployment previews

rollback

observability

cost

portability

```

첫 Web Application framework가 결정된 후 함께 평가한다.

---

## 40. Containerization

Docker는 초기 MVP의 필수 기술이 아니다.

다음과 같은 실제 requirement가 생길 경우 도입할 수 있다.

```

runtime portability

complex local dependencies

independent service deployment

sandbox requirement

deployment provider requirement

```

"backend 프로젝트이기 때문에 Docker가 필요하다"는 식으로 도입하지 않는다.

---

## 41. Kubernetes

Kubernetes는 초기 ODYS stack에 포함하지 않는다.

다음 요구가 실제로 발생하지 않은 동안 사용하지 않는다.

```

many independent services

complex scaling requirements

multi-service operational orchestration

advanced deployment control

```

---

## 42. Background Jobs

초기에는 background job platform을 확정하지 않는다.

실제 use case:

```

monitoring

scheduled checks

long-running Agent Tasks

large document ingestion

```

이 발생했을 때 적절한 execution mechanism을 선택한다.

---

## 43. Scheduling

Conference monitoring 등 scheduled workflow가 구현될 때 scheduling technology를 선택한다.

requirements:

```

reliable execution

timezone handling

duplicate prevention

retry

Task linkage

observability

```

scheduler vendor를 architecture invariant로 두지 않는다.

---

## 44. Cache

초기에는 별도의 distributed cache를 기본 stack에 포함하지 않는다.

실제 measurement에서 반복적인 expensive computation 또는 latency 문제가 확인될 경우 도입한다.

가능한 후보 기술을 미리 architecture requirement로 고정하지 않는다.

---

## 45. Queue

초기에는 message queue를 도입하지 않는다.

다음과 같은 실제 need가 발생할 때 고려한다.

```

long-running background Tasks

high-volume asynchronous processing

service decoupling

retry queues

```

Modular Monolith 안에서 해결 가능한 작업은 먼저 단순하게 구현한다.

---

## 46. Observability

structured logging과 basic execution metadata부터 시작한다.

observability provider는 아직 확정하지 않는다.

선택 기준:

```

error tracking

structured logs

performance traces

cost

TypeScript integration

privacy controls

deployment integration

```

---

## 47. Analytics

Product analytics platform은 초기 architecture dependency로 두지 않는다.

외부 Alpha 이후 user behavior measurement가 필요해지는 시점에 privacy와 product requirement를 검토한 후 선택한다.

---

## 48. API Style

초기 Application API는 domain-oriented HTTP API를 기본 방향으로 한다.

구체적인 route 및 transport는 Web framework 구현과 함께 정의한다.

GraphQL을 초기 requirement로 두지 않는다.

---

## 49. GraphQL

GraphQL은 현재 stack에 포함하지 않는다.

다음과 같은 실제 requirement가 확인될 경우 재평가할 수 있다.

```

complex consumer-specific data selection

multiple external API consumers

graph-oriented API requirements

```

단순히 flexible하다는 이유로 도입하지 않는다.

---

## 50. RPC Framework

TypeScript end-to-end typing을 위한 RPC framework 역시 아직 확정하지 않는다.

Application과 Core API boundary가 구현될 때 다음을 비교한다.

```

plain HTTP contracts

typed RPC

framework-native server actions

other TypeScript-native approaches

```

선택 기준은 architecture simplicity와 runtime validation이다.

---

## 51. API Schema

External request와 structured Model output은 runtime schema를 source of truth로 관리하는 방향을 선호한다.

TypeScript type과 runtime schema가 drift하지 않는 방식을 선택한다.

Tool input/output에는 현재 채택한 Zod 4를 사용한다. External API와 Model output schema의 concrete 적용은 해당 boundary 구현 시 결정한다.

---

## 52. Styling and UI

UI component system과 styling technology는 Web Application 구현 시작 전까지 선택하지 않는다.

선택 기준:

```

accessibility

maintainability

performance

developer productivity

design consistency

```

architecture 문서 단계에서 visual framework를 고정하지 않는다.

---

## 53. State Management

client state management library도 초기에는 선택하지 않는다.

framework built-in capability와 local state만으로 부족하다는 실제 requirement가 확인된 이후 추가한다.

---

## 54. Data Fetching

data-fetching library 역시 Web framework와 API style이 확정된 후 선택한다.

중복 caching layer를 이유 없이 도입하지 않는다.

---

## 55. Code Generation

code generation은 다음 경우에 사용할 수 있다.

```

database types

API contract types

schema-derived types

```

generated file과 hand-written domain model을 구분한다.

generated provider type이 Core domain model의 source of truth가 되지 않도록 한다.

---

## 56. External Integrations

Tool provider SDK는 concrete Tool implementation에 국한한다.

예:

```

Calendar Provider SDK

Email Provider SDK

Model Provider SDK

```

이 dependency를 Core domain module 전체에 퍼뜨리지 않는다.

---

## 57. Security Tooling

초기 security baseline은 architecture 및 CI discipline을 중심으로 한다.

향후 필요에 따라 다음 tooling을 추가할 수 있다.

```

dependency vulnerability scanning

secret scanning

static security analysis

container scanning

```

실제 deployment 형태와 repository visibility에 맞춰 선택한다.

---

## 58. Dependency Policy

새로운 dependency를 추가하기 전에 다음을 평가한다.

```

Does it solve a real problem?

Can platform or standard library solve it?

Is it actively maintained?

What is the bundle/runtime impact?

Does it increase vendor coupling?

Does it affect security?

```

작은 utility 하나를 위해 대형 dependency를 추가하지 않는다.

---

## 59. Version Policy

모든 dependency를 무조건 latest version으로 사용하는 것이 목표가 아니다.

다음 요소를 함께 고려한다.

```

stability

compatibility

security

maintenance

ecosystem support

```

major upgrade는 의도적으로 수행한다.

---

## 60. Lockfile

`pnpm-lock.yaml`은 repository에 commit한다.

CI는 frozen lockfile installation을 사용한다.

이는 local, CI 및 production dependency resolution 차이를 줄인다.

---

## 61. Current Repository Tooling

현재 repository foundation에 포함된 주요 tooling은 다음과 같다.

```

.editorconfig

.gitattributes

.prettierrc.json

.prettierignore

eslint.config.mjs

tsconfig.base.json

.nvmrc

pnpm-lock.yaml

pnpm-workspace.yaml

GitHub Actions CI

```

이 foundation을 유지한 상태에서 실제 source package를 추가한다.

---

## 62. Initial Core Foundation Stack

현재 initial Core foundation에 구현된 stack은 다음과 같다.

```

TypeScript

Node.js

pnpm Workspace

packages/core

Zod 4 for Tool input/output contract runtime validation

Core Pack identity public contract

Core Pack Registry

packs/engineering

test runner

ESLint

Prettier

GitHub Actions

```

Runtime schema validation은 Tool input/output contract에 Zod 4로 처음 적용되었다. 다른 external input과 structured contract에는 실제 boundary를 구현할 때 확장 여부를 결정한다.

현재 foundation 단계에서는 Web UI나 external provider를 구현하지 않는다.

먼저 Core contract를 실행 가능한 code로 만든다.

---

## 63. Context and Memory Stack

Context 및 Memory phase에서는 다음 technology가 필요해질 가능성이 높다.

```

Supabase

PostgreSQL

database migrations

repository adapters

runtime validation

semantic retrieval capability when justified

```

semantic search가 필요하기 전에 embedding infrastructure를 먼저 만들지 않는다.

---

## 64. Agent and Tool Stack

Agent 및 Tool phase에서는 다음 capability가 필요하다.

```

Model abstraction

AI SDK / provider adapter

structured Model output

Tool contract

runtime validation

permission policy

Approval flow

Audit

```

concrete provider SDK는 adapter 내부에 위치한다.

---

## 65. Web Application Stack

Web Application implementation 직전에 다음 결정을 확정한다.

```

Web framework

rendering strategy

API transport

runtime validation integration

styling

component system

client state strategy

deployment provider

```

각 decision이 장기적으로 중요한 경우 새로운 ADR을 작성할 수 있다.

---

## 66. Technologies Explicitly Not Adopted Yet

현재 ODYS architecture는 다음 기술을 채택했다고 가정하지 않는다.

```

specific Web framework

specific UI library

specific CSS framework

additional repository-wide runtime validation standard beyond the current Tool input use

Docker

Kubernetes

Redis

Kafka

GraphQL

specific observability vendor

specific hosting provider

specific job queue

specific scheduler

specific vector database vendor

```

필요가 생겼을 때 평가한다.

---

## 67. Technologies Not Planned for Initial MVP

다음은 초기 MVP에서 사용하지 않는 것을 기본으로 한다.

```

microservice mesh

Kubernetes cluster

distributed event streaming platform

custom foundation model training

large-scale ML infrastructure

multi-region active-active database

complex enterprise IAM

```

---

## 68. Technology Decision Process

새로운 주요 기술은 다음 절차로 선택한다.

```

Real Requirement

      │

      ▼

Constraints

      │

      ▼

Candidate Comparison

      │

      ▼

Small Experiment if Needed

      │

      ▼

Decision

      │

      ▼

ADR if Architecturally Significant

      │

      ▼

Implementation

```

먼저 technology를 선택하고 사용처를 찾는 방식을 피한다.

---

## 69. When an ADR Is Required

다음과 같은 선택은 ADR 작성 후보가 된다.

```

primary Web framework

major persistence change

new architectural runtime

service extraction

new authentication architecture

major Model abstraction change

deployment architecture change

new autonomy model

```

작은 utility library 하나까지 ADR을 작성할 필요는 없다.

---

## 70. Stack Invariants

ODYS Tech Stack이 발전하더라도 다음 원칙은 유지한다.

1. TypeScript remains the primary application language unless explicitly reconsidered.

2. Core domain logic remains independent from replaceable providers.

3. pnpm manages the monorepo workspace.

4. PostgreSQL is the initial canonical relational data store.

5. Supabase is the initial backend platform.

6. Model Providers remain behind an abstraction boundary.

7. TypeScript types do not replace runtime validation.

8. Technology complexity is introduced by real requirements.

9. CI remains the automated quality gate.

10. Lockfiles and migrations remain version controlled.

11. Security-sensitive configuration remains outside source code.

12. Framework choices do not define ODYS domain architecture.

---

## 71. Related Documents

이 문서는 다음 architecture 문서와 함께 사용한다.

- `SYSTEM_OVERVIEW.md`

- `ODYS_CORE.md`

- `DATA_MODEL.md`

- `MEMORY_ARCHITECTURE.md`

- `AGENT_ARCHITECTURE.md`

- `TOOL_ARCHITECTURE.md`

- `MODEL_STRATEGY.md`

- `API_DESIGN.md`

- `SECURITY_ARCHITECTURE.md`

- `DEPLOYMENT.md`

관련 Engineering 문서:

- `../50_engineering/DEVELOPMENT_WORKFLOW.md`

- `../50_engineering/AI_DEVELOPMENT_WORKFLOW.md`

- `../50_engineering/TEST_STRATEGY.md`

- `../50_engineering/CODING_STANDARDS.md`

- `../50_engineering/RELEASE_PROCESS.md`

관련 Architecture Decision Record:

- `../40_decisions/ADR-002-core-vs-pack.md`

- `../40_decisions/ADR-003-modular-monolith.md`

- `../40_decisions/ADR-004-typescript-primary.md`

- `../40_decisions/ADR-005-ai-sdk-model-independence.md`

- `../40_decisions/ADR-006-supabase.md`

- `../40_decisions/ADR-007-progressive-autonomy.md`

---

## 72. Technology Adoption Rule

새로운 technology나 dependency를 채택하기 전에 다음 질문을 확인한다.

1. 어떤 실제 problem을 해결하는가?

2. 현재 stack으로 해결할 수 없는가?

3. architecture complexity를 얼마나 증가시키는가?

4. provider lock-in을 증가시키는가?

5. TypeScript 및 current runtime과 잘 통합되는가?

6. security surface를 증가시키는가?

7. test 및 maintenance가 쉬운가?

8. production deployment를 복잡하게 만드는가?

9. 활발하게 유지보수되고 있는가?

10. 제거하거나 교체하기 쉬운 boundary를 만들 수 있는가?

11. architectural significance가 높다면 ADR이 필요한가?

12. 지금 필요한 기술인가, 미래를 추측해 추가하는 기술인가?

> Use the smallest stack that can express the architecture clearly, ship the product reliably, and evolve without unnecessary lock-in.
