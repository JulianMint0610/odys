# ODYS System Overview

## 1. Purpose

이 문서는 ODYS 전체 시스템의 상위 수준 아키텍처를 정의한다.

이 문서는 세부 구현을 결정하기보다 다음 질문에 대한 공통 기준을 제공한다.

- ODYS는 어떤 주요 구성 요소로 나뉘는가?

- 각 구성 요소는 어떤 책임을 가지는가?

- ODYS Core와 Pack은 어떻게 분리되는가?

- Agent, Tool, Memory, Model은 어떤 관계를 가지는가?

- 사용자 요청은 시스템 내부에서 어떻게 처리되는가?

- 외부 시스템과의 상호작용은 어떤 경계를 통해 이루어지는가?

- 시스템은 장기적으로 어떤 방식으로 확장되는가?

세부 설계는 `docs/20_architecture/`의 각 전문 문서에서 정의한다.

---

## 2. Architectural Goals

ODYS 아키텍처는 다음 목표를 동시에 만족해야 한다.

### 2.1 Fast Initial Development

초기에는 한 명 또는 소수의 개발자가 빠르게 기능을 구현하고 변경할 수 있어야 한다.

### 2.2 Clear Boundaries

하나의 저장소와 비교적 단순한 배포 구조를 사용하더라도 각 모듈의 책임과 의존성 방향은 명확해야 한다.

### 2.3 Long-Term Extensibility

새로운 Agent, Tool, Pack, Model provider 및 Application을 기존 Core의 대규모 수정 없이 추가할 수 있어야 한다.

### 2.4 Model Independence

특정 AI 모델이나 provider가 ODYS 전체 제품 구조를 결정해서는 안 된다.

### 2.5 Security and User Control

Agent가 실제 외부 행동을 수행할수록 permission, approval, policy 및 audit가 함께 강화되어야 한다.

### 2.6 Operational Simplicity

실제 필요가 발생하기 전까지 microservice, distributed messaging 및 복잡한 infrastructure를 도입하지 않는다.

---

## 3. Architectural Style

ODYS의 초기 아키텍처는 **Modular Monolith**를 기본으로 한다.

Modular Monolith는 하나의 거대한 코드 덩어리를 의미하지 않는다.

하나의 repository와 단순한 실행 구조를 유지하면서 내부적으로 명확한 module boundary를 정의하는 방식이다.

개념적으로 ODYS는 다음 영역으로 나뉜다.

```

ODYS

├── Applications

├── Packs

├── Agents

├── Core

├── Services

└── External Integrations

```

필요성이 실제 사용을 통해 검증된 module만 향후 독립 service로 분리한다.

서비스 분리는 다음과 같은 요구가 있을 때 고려한다.

- independent scaling

- independent deployment

- security isolation

- failure isolation

- different runtime requirements

- independently managed lifecycle

기술적으로 분리할 수 있다는 이유만으로 서비스를 분리하지 않는다.

---

## 4. High-Level Architecture

ODYS의 논리적 구조는 다음과 같다.

```

                     ┌──────────────────────┐

                     │        User          │

                     └──────────┬───────────┘

                                │

                                ▼

                     ┌──────────────────────┐

                     │    Applications      │

                     │  Web / Future Apps   │

                     └──────────┬───────────┘

                                │

                                ▼

                ┌──────────────────────────────┐

                │          ODYS Core           │

                │                              │

                │ Context    Memory    Task    │

                │ Agent      Tool      Model   │

                │ Policy  Permission Approval  │

                │ Audit & Shared Contracts     │

                └───────┬──────────────┬───────┘

                        │              │

                        ▼              ▼

                ┌──────────────┐ ┌──────────────┐

                │    Packs     │ │ Integrations │

                └──────┬───────┘ └──────┬───────┘

                       │                │

                       ▼                ▼

                ┌──────────────┐ ┌──────────────┐

                │    Agents    │ │    Tools     │

                └──────┬───────┘ └──────┬───────┘

                       └────────┬────────┘

                                │

                     ┌──────────┴──────────┐

                     ▼                     ▼

              ┌──────────────┐      ┌──────────────┐

              │ Model Layer  │      │  Data Layer  │

              └──────────────┘      └──────────────┘

```

이 구조는 **logical architecture**를 나타낸다.

각 영역이 반드시 독립 process, server 또는 microservice라는 의미는 아니다.

---

## 5. Applications

Application은 사용자가 ODYS와 직접 상호작용하는 interface다.

가능한 Application 유형은 다음과 같다.

- Web application

- Desktop application

- Mobile application

- CLI

- API client

초기 제품에서는 Web application을 우선한다.

Application의 주요 책임은 다음과 같다.

- 사용자 입력 수집

- 결과 표시

- authentication state 처리

- workspace 및 project navigation

- Agent 실행 상태 표시

- approval 요청 표시

- Task 상태 표시

- Tool 실행 결과 표시

Application 계층에는 가능한 한 Core domain logic을 직접 구현하지 않는다.

Application은 ODYS Core가 제공하는 capability를 사용하는 consumer 역할을 한다.

---

## 6. ODYS Core

ODYS Core는 모든 Application과 Pack이 공유하는 범용 AI operating layer다.

Core의 주요 책임은 다음과 같다.

- identity context

- workspace and project context

- context assembly

- memory coordination

- Agent runtime

- Tool runtime

- model abstraction

- task orchestration

- policy enforcement

- permission evaluation

- approval flow

- audit

- shared domain contracts

Core는 특정 산업, 전공, 직업 또는 개별 사용자에게만 필요한 규칙을 직접 포함하지 않는다.

예를 들어 다음과 같은 기능은 Core의 책임이 아니다.

- 특정 학회 추천 기준

- 특정 전공 학습 전략

- 특정 취업 사이트 parsing rule

- 특정 산업 전용 prompt

- 특정 사용자의 개인 일정 규칙

이러한 기능은 Pack 또는 Integration 계층에서 담당한다.

Core의 세부 설계는 `ODYS_CORE.md`에서 정의한다.

---

## 7. Packs

Pack은 ODYS Core 위에 특정 domain capability를 추가하는 확장 단위다.

Pack은 다음 요소를 포함할 수 있다.

- domain-specific Agents

- prompts

- workflows

- Tool configuration

- domain policies

- knowledge sources

- domain schemas

- domain-specific evaluation rules

첫 번째 주요 Pack은 Engineering Pack이다.

```

Engineering Pack

├── Study Agent

├── Conference Agent

├── Career Agent

└── Coding Agent

```

장기적으로 실제 수요가 검증되면 다른 Pack으로 확장할 수 있다.

예:

```

Research Pack

Business Pack

Creator Pack

Finance Pack

```

Pack은 Core를 복제하거나 fork하지 않는다.

모든 Pack은 동일한 Core contract와 extension point를 사용한다.

현재 `packs/engineering/`에는 첫 번째 실제 Pack workspace package와 identity metadata만 구현되어 있다. 위 Engineering Agent들은 후속 구현 범위이며 아직 구현되지 않았다.

---

## 8. Agents

Agent는 명확한 responsibility를 가진 실행 단위다.

Agent는 AI 모델 자체가 아니다.

Agent는 다음 요소의 조합으로 이해한다.

- responsibility

- context requirements

- model strategy

- allowed Tools

- execution policy

- output expectations

대표적인 Agent 실행 흐름은 다음과 같다.

```

User Request

     │

     ▼

Context Assembly

     │

     ▼

Agent

     │

     ▼

Model Invocation

     │

     ├── Tool 불필요 ─────────► Result

     │

     ▼

Tool Request

     │

     ▼

Policy / Permission / Approval

     │

     ▼

Tool Execution

     │

     ▼

Agent Continuation

     │

     ▼

Final Result

```

Agent는 자체적으로 무제한 권한을 가지지 않는다.

Agent가 사용할 수 있는 Tool과 실제 Action은 Core의 policy와 permission에 의해 제한된다.

세부 설계는 `AGENT_ARCHITECTURE.md`에서 정의한다.

---

## 9. Tools

Tool은 Agent가 deterministic capability 또는 외부 시스템을 사용할 수 있도록 하는 표준 interface다.

예:

- web search

- calendar

- email

- file access

- database query

- code execution

- external API

- notification

Tool execution은 기본적으로 다음 lifecycle을 따른다.

```

Tool Request

     │

     ▼

Input Validation

     │

     ▼

Tool Resolution

     │

     ▼

Permission Evaluation

     │

     ▼

Policy Evaluation

     │

     ▼

Approval Check

     │

     ▼

Execution

     │

     ▼

Result Validation

     │

     ▼

Audit

```

Agent가 외부 서비스를 임의의 방식으로 직접 호출하기보다 Tool abstraction을 통해 접근하는 것을 원칙으로 한다.

세부 설계는 `TOOL_ARCHITECTURE.md`에서 정의한다.

---

## 10. Memory

Memory는 ODYS가 하나의 대화나 session을 넘어 사용자와 작업의 continuity를 유지하도록 하는 핵심 subsystem이다.

Memory는 conversation history와 동일하지 않다.

Conversation은 Memory의 source가 될 수 있지만 모든 conversation이 장기 Memory가 되는 것은 아니다.

ODYS는 개념적으로 다음 Memory 유형을 지원할 수 있다.

- Working Memory

- Semantic Memory

- Episodic Memory

- Procedural Memory

Memory lifecycle의 기본 개념은 다음과 같다.

```

Observe

  │

  ▼

Extract Candidate

  │

  ▼

Validate

  │

  ▼

Store

  │

  ▼

Retrieve

  │

  ▼

Use in Context

  │

  ▼

Update / Archive / Forget

```

세부 설계는 `MEMORY_ARCHITECTURE.md`에서 정의한다.

---

## 11. Context

Context는 현재 Agent execution에 실제로 제공되는 정보 집합이다.

Memory와 Context는 명확하게 구분한다.

```

Memory

= 시스템에 보존되어 있는 정보

Context

= 현재 작업을 수행하기 위해 선택된 정보

```

Context Builder는 다음 source에서 정보를 가져올 수 있다.

- current request

- current conversation

- user

- workspace

- project

- goals

- tasks

- relevant Memory

- relevant Knowledge

- documents

- previous Tool results

- Pack configuration

- system policy

가능한 모든 정보를 model context에 넣는 것이 목적이 아니다.

현재 작업과 관련성이 높은 정보를 선택하고 context budget을 관리한다.

---

## 12. Model Layer

ODYS는 특정 AI model provider에 종속되지 않는다.

Agent domain logic이 provider-specific SDK를 직접 사용하는 구조를 기본값으로 하지 않는다.

논리적인 model access 구조는 다음과 같다.

```

Agent

  │

  ▼

Model Abstraction

  │

  ▼

Model Router

  │

  ├── Provider A

  ├── Provider B

  ├── Provider C

  └── Future Provider

```

Model Router는 필요에 따라 다음 조건을 고려할 수 있다.

- task type

- model capability

- reasoning quality

- tool support

- context size

- latency

- cost

- reliability

- availability

- privacy requirements

초기 구현에서는 복잡한 dynamic routing보다 provider independence를 위한 안정적인 interface를 먼저 구축한다.

세부 전략은 `MODEL_STRATEGY.md`에서 정의한다.

---

## 13. Data Layer

ODYS의 초기 persistent backend platform은 Supabase를 사용하며, 핵심 데이터 저장소는 PostgreSQL을 기반으로 한다.

주요 persistent entity 후보는 다음과 같다.

- users

- workspaces

- projects

- conversations

- messages

- memories

- tasks

- Agent executions

- Tool executions

- approvals

- audit events

- integration metadata

Supabase는 초기 backend platform으로 채택되지만 ODYS의 domain logic 전체가 Supabase SDK 자체에 직접 결합되지 않도록 한다.

가능한 경우 다음과 같은 경계를 사용한다.

```

Core Domain

     │

     ▼

Repository / Service Contract

     ▲

     │

Supabase / PostgreSQL Implementation

```

세부 entity와 relationship은 `DATA_MODEL.md`에서 정의한다.

---

## 14. Identity, Workspace, and Project

ODYS의 장기 context는 계층적으로 구성될 수 있다.

```

User

└── Workspace

    ├── Project A

    ├── Project B

    └── Project C

```

### User

시스템을 사용하는 identity다.

### Workspace

리소스와 context를 묶는 상위 logical boundary다.

### Project

장기적인 목표나 활동을 표현하는 보다 구체적인 context boundary다.

Memory, Task, Conversation 및 Agent activity는 가능한 경우 명확한 scope와 연결한다.

---

## 15. Tasks and Workflows

단일 model call과 지속적인 Task를 구분한다.

Task는 하나 이상의 Agent execution 또는 Tool execution을 포함할 수 있다.

```

Task

├── Context Build

├── Agent Execution

├── Tool Execution

├── Approval

├── Follow-up Execution

└── Completion

```

Task는 다음과 같은 상태를 가질 수 있다.

```

pending

running

waiting_for_approval

completed

failed

cancelled

```

초기에는 필요 이상의 workflow engine을 도입하지 않는다.

복잡한 workflow가 실제 사용 과정에서 반복적으로 발생할 때 점진적으로 확장한다.

---

## 16. Policy, Permission, and Approval

ODYS에서는 AI의 reasoning capability와 실제 action authority를 분리한다.

### Policy

어떤 조건에서 특정 행동을 허용할지를 정의한다.

### Permission

특정 resource 또는 capability에 접근할 수 있는 권한을 정의한다.

예:

```

calender.read

calendar.write

email.read

email.send

files.read

files.write

memory.read

memory.write

```

### Approval

특정 Action을 실행하기 전에 사용자의 명시적인 승인을 요구하는 mechanism이다.

대표적인 흐름은 다음과 같다.

```

Agent prepares Action

          │

          ▼

   Approval Required

          │

     ┌────┴────┐

     ▼         ▼

  Approve    Reject

     │

     ▼

Tool Execution

```

중요한 authorization rule을 prompt instruction에만 의존하지 않는다.

---

## 17. Progressive Autonomy

ODYS는 처음부터 fully autonomous system으로 동작하지 않는다.

자율성은 점진적으로 확장한다.

```

Level 0 — Observe

Level 1 — Suggest

Level 2 — Prepare

Level 3 — Ask then Execute

Level 4 — Execute within Policy

Level 5 — Monitor and Act within Policy

```

초기 제품은 낮은 autonomy level을 기본값으로 한다.

자율성이 증가할수록 다음 요소도 함께 강화되어야 한다.

- permission

- policy

- approval

- audit

- observability

- reversibility

- user control

---

## 18. Action Safety

ODYS에서는 정보 처리와 외부 상태 변경을 구분한다.

상대적으로 낮은 위험도의 작업 예:

- search

- summarize

- analyze

- classify

- recommend

- prepare a draft

외부 상태를 변경하는 작업 예:

- send email

- create or delete calendar event

- modify external data

- delete files

- publish content

- deploy software

위험도가 높아질수록 더 강한 validation과 approval을 적용한다.

가능하면 reversible action을 우선한다.

예:

```

Delete

→ Archive

Send immediately

→ Prepare draft

Apply change

→ Preview change

```

---

## 19. Audit and Observability

중요한 Agent 및 Tool activity는 추적 가능해야 한다.

Audit record는 다음 정보를 포함할 수 있다.

- actor

- workspace

- project

- Agent

- Action

- Tool

- timestamp

- approval state

- execution status

- relevant metadata

Application logging과 Audit logging은 목적이 다르다.

```

Application Log

→ debugging, performance, operations

Audit Log

→ who did what, when, and under what authority

```

초기에는 복잡한 observability platform보다 structured logging과 핵심 실행 정보부터 구축한다.

---

## 20. Core and External Implementations

Core는 interface와 domain contract를 정의하고 외부 기술은 해당 contract를 구현하는 방향을 지향한다.

예:

```

Core Contracts

├── MemoryRepository

├── ModelClient

├── AuditWriter

├── Tool contract

└── NotificationPort

```

실제 구현은 다음과 같은 형태가 될 수 있다.

```

Concrete Implementations

├── SupabaseMemoryRepository

├── Model Provider Adapter

├── PostgreSQL Audit Writer

├── Calendar Integration

└── Notification Adapter

```

핵심 의존성 원칙은 다음과 같다.

> Core domain logic should not depend directly on replaceable external implementations.

---

## 21. Repository-Level Boundaries

현재 ODYS repository의 상위 구조는 다음과 같다.

```

odys/

├── .github/

├── agents/

├── apps/

├── docs/

├── packages/

├── packs/

├── services/

├── tests/

├── package.json

├── pnpm-workspace.yaml

└── tsconfig.base.json

```

각 주요 directory의 역할은 다음과 같다.

### `apps/`

사용자가 직접 사용하는 Application을 배치한다.

### `agents/`

Agent definition 및 Agent 관련 구현을 배치한다.

### `packages/`

ODYS Core와 여러 Application 또는 Agent가 공유하는 library를 배치한다.

### `packs/`

Core public contract를 사용하는 domain-specific Pack workspace package를 배치한다. 현재 첫 번째 구현은 `packs/engineering/`이다.

### `services/`

독립적인 runtime 또는 integration boundary가 실제로 필요한 경우 사용한다.

### `tests/`

cross-module 및 system-level verification을 배치한다.

### `docs/`

제품, 아키텍처, 의사결정 및 engineering process의 기준 문서를 관리한다.

현재 비어 있는 directory는 향후 역할을 위해 예약된 경계일 수 있다.

필요성이 생기기 전에 불필요한 구현을 채우지 않는다.

---

## 22. Dependency Direction

가능한 dependency direction은 다음을 따른다.

```

Applications

     │

     ▼

Packs / Agents

     │

     ▼

ODYS Core

     │

     ▼

Shared Contracts

```

외부 provider 또는 persistence 구현은 Core가 정의한 contract를 구현하는 방향을 지향한다.

반대로 Core domain logic은 특정 Application이나 특정 Pack에 의존하지 않는다.

Core가 특정 Pack을 알아야만 동작하는 구조는 피한다.

---

## 23. Representative Request Flow

대표적인 사용자 요청은 다음과 같이 처리될 수 있다.

```

1. User Request

       │

       ▼

2. Application

       │

       ▼

3. Identity Resolution

       │

       ▼

4. Workspace / Project Resolution

       │

       ▼

5. Context Assembly

       │

       ▼

6. Agent Selection

       │

       ▼

7. Agent Runtime

       │

       ▼

8. Model Invocation

       │

       ▼

9. Tool Request if Required

       │

       ▼

10. Validation / Policy / Permission

       │

       ▼

11. Approval if Required

       │

       ▼

12. Tool Execution

       │

       ▼

13. Agent Continuation

       │

       ▼

14. Final Result

       │

       ▼

15. Memory Candidate Processing

       │

       ▼

16. Audit

       │

       ▼

17. User Response

```

모든 요청이 모든 단계를 거치는 것은 아니다.

단순한 요청은 Tool이나 Approval 없이 종료될 수 있다.

---

## 24. Representative Monitoring Flow

ODYS는 향후 사용자의 명시적인 요청에 따라 장기 monitoring Task를 수행할 수 있다.

```

User requests monitoring

        │

        ▼

Monitoring Task Created

        │

        ▼

Scheduled / Triggered Check

        │

        ▼

Tool Execution

        │

        ▼

Condition Evaluation

        │

   ┌────┴─────┐

   ▼          ▼

No Change   Relevant Change

   │          │

   ▼          ▼

Wait      Notify / Prepare Action

```

Monitoring 역시 permission, policy 및 audit의 적용 대상이다.

---

## 25. Initial Deployment Model

초기 deployment topology는 가능한 한 단순하게 유지한다.

개념적으로 다음과 같은 형태에서 시작한다.

```

User

 │

 ▼

Web Application

 │

 ▼

ODYS Backend

 ├── Supabase / PostgreSQL

 ├── AI Model Providers

 └── External Tools and APIs

```

초기에는 다음 기술을 기본적으로 도입하지 않는다.

- Kubernetes

- service mesh

- dozens of microservices

- complex distributed event infrastructure

- premature multi-region architecture

실제 bottleneck이나 운영 요구가 확인된 이후 도입 여부를 결정한다.

---

## 26. Evolution Strategy

ODYS architecture는 다음 방식으로 발전한다.

```

Modular Monolith

        │

        ▼

Real Usage

        │

        ▼

Measured Boundary or Bottleneck

        │

        ▼

Stronger Internal Module Boundary

        │

        ▼

Independent Service if Justified

```

미래 규모를 추측해 현재 시스템을 미리 분산시키지 않는다.

---

## 27. Architectural Invariants

ODYS architecture가 발전하더라도 다음 원칙은 가능한 한 유지한다.

1. Core stays domain-neutral.

2. Packs extend Core rather than fork it.

3. Agent authority is controlled outside prompts.

4. Tool inputs and outputs are validated.

5. Important external Actions are auditable.

6. Model providers remain replaceable.

7. Persistent Memory is distinct from current Context.

8. External implementations do not define Core domain rules.

9. User authority remains above Agent autonomy.

10. Complexity must be justified by real requirements.

---

## 28. Related Architecture Documents

이 문서는 전체 architecture의 지도 역할을 한다.

세부 설계는 다음 문서를 참조한다.

- `ODYS_CORE.md`

- `DATA_MODEL.md`

- `MEMORY_ARCHITECTURE.md`

- `AGENT_ARCHITECTURE.md`

- `TOOL_ARCHITECTURE.md`

- `MODEL_STRATEGY.md`

- `API_DESIGN.md`

- `SECURITY_ARCHITECTURE.md`

- `DEPLOYMENT.md`

- `TECH_STACK.md`

관련 Architecture Decision Record:

- `../40_decisions/ADR-001-brand-architecture.md`

- `../40_decisions/ADR-002-core-vs-pack.md`

- `../40_decisions/ADR-003-modular-monolith.md`

- `../40_decisions/ADR-004-typescript-primary.md`

- `../40_decisions/ADR-005-ai-sdk-model-independence.md`

- `../40_decisions/ADR-006-supabase.md`

- `../40_decisions/ADR-007-progressive-autonomy.md`

---

## 29. Source of Truth

이 문서는 ODYS의 **high-level system architecture**에 대한 기준 문서다.

특정 architectural decision이 ADR로 기록되어 있다면 해당 결정의 최종 source of truth는 ADR이다.

구현과 문서가 서로 충돌하는 경우 차이를 방치하지 않는다.

다음 중 하나를 수행한다.

1. 구현을 현재 architecture에 맞게 수정한다.

2. architecture 문서를 실제로 채택한 구조에 맞게 수정한다.

3. 중요한 방향 변경이라면 새로운 ADR을 작성한다.
