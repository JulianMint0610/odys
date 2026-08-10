# ODYS Data Model

## 1. Purpose

이 문서는 ODYS의 핵심 domain entity, 관계, ownership, scope 및 persistence 원칙을 정의한다.

이 문서의 목적은 특정 데이터베이스의 최종 SQL schema를 고정하는 것이 아니다.

대신 다음 질문에 대한 canonical model을 제공한다.

- ODYS에서 어떤 데이터가 핵심 entity인가?

- 각 entity는 어떤 책임을 가지는가?

- User, Workspace, Project는 어떻게 연결되는가?

- Conversation과 Memory는 어떻게 구분되는가?

- Agent, Tool 및 Task 실행 기록은 어떻게 연결되는가?

- Approval과 Audit은 어떤 데이터와 연결되는가?

- 데이터 isolation과 ownership은 어떤 기준으로 설계되는가?

- Supabase/PostgreSQL implementation과 Core domain model의 경계는 어디인가?

실제 SQL schema와 migration은 이 문서를 기반으로 구현하되, implementation detail이 domain model 자체를 결정하지 않도록 한다.

---

## 2. Design Principles

ODYS Data Model은 다음 원칙을 따른다.

### 2.1 Domain Before Database

먼저 domain concept와 관계를 정의하고 그다음 PostgreSQL schema로 변환한다.

Database table 구조가 Core domain model의 의미를 결정하게 하지 않는다.

### 2.2 Workspace-Scoped by Default

사용자 데이터는 가능한 한 명확한 Workspace scope를 가진다.

Project가 필요한 경우 Workspace 아래에서 추가적인 scope를 제공한다.

### 2.3 Explicit Ownership

각 persistent resource가 누구의 데이터인지 명확하게 판단할 수 있어야 한다.

### 2.4 Strong Relationships

가능한 경우 명시적인 identifier와 relationship을 사용한다.

관련성을 추론해야만 ownership을 확인할 수 있는 구조를 피한다.

### 2.5 Minimal Duplication

같은 사실을 여러 table에 독립적인 source of truth로 복제하지 않는다.

### 2.6 Auditable Mutations

중요한 상태 변경과 외부 Action은 추적 가능해야 한다.

### 2.7 Provider Independence

Supabase는 초기 backend platform이지만 domain entity가 Supabase-specific object에 직접 종속되지 않도록 한다.

### 2.8 Privacy by Design

필요 이상의 개인 데이터를 저장하지 않는다.

데이터 접근과 retrieval은 사용자 및 Workspace boundary를 존중해야 한다.

---

## 3. Persistence Strategy

ODYS의 초기 persistence platform은 Supabase를 사용하며 핵심 relational storage는 PostgreSQL을 기반으로 한다.

개념적으로 다음 구조를 따른다.

```

ODYS Domain Model

        │

        ▼

Repository / Service Contracts

        │

        ▼

Persistence Implementation

        │

        ▼

Supabase / PostgreSQL

```

Core business logic에서 database client를 직접 호출하는 패턴을 기본 방식으로 사용하지 않는다.

예:

```

Memory Service

      │

      ▼

Memory Repository

      ▲

      │

Supabase Memory Repository

```

이를 통해 향후 persistence implementation이 변경되더라도 Core domain logic의 변경 범위를 제한한다.

---

## 4. Entity Groups

ODYS persistent data는 개념적으로 다음 영역으로 나눈다.

```

Identity

├── User

└── Workspace

Context

├── Project

├── Conversation

├── Message

└── Document

Memory

└── Memory

Execution

├── Task

├── Agent Execution

├── Tool Execution

└── Approval

Integration

└── Integration Connection

Governance

└── Audit Event

```

모든 개념이 반드시 최초 MVP에서 별도 table을 가져야 한다는 의미는 아니다.

논리적 책임과 persistence 필요성을 구분한다.

---

## 5. High-Level Relationships

ODYS의 주요 entity 관계는 다음과 같다.

```

User

 │

 └── owns

      │

      ▼

  Workspace

      │

      ├── Project

      │

      ├── Conversation

      │     └── Message

      │

      ├── Document

      │

      ├── Memory

      │

      ├── Task

      │     └── Agent Execution

      │            └── Tool Execution

      │                   └── Approval

      │

      ├── Integration Connection

      │

      └── Audit Event

```

Project는 Workspace 내부에서 더 구체적인 context scope를 제공한다.

따라서 다음과 같은 resource는 Project와 연결될 수도 있고 Workspace 수준에만 존재할 수도 있다.

- Conversation

- Document

- Memory

- Task

- Agent Execution

---

## 6. Identifier Strategy

Persistent domain entity는 전역적으로 충돌하지 않는 identifier를 사용한다.

초기 PostgreSQL implementation에서는 UUID 기반 identifier를 기본 선택으로 한다.

개념적으로:

```

User ID

Workspace ID

Project ID

Conversation ID

Message ID

Memory ID

Task ID

Agent Execution ID

Tool Execution ID

Approval ID

Audit Event ID

```

Identifier는 business meaning을 포함하지 않는다.

예를 들어 다음과 같은 identifier를 만들지 않는다.

```

engineering-project-001

user-seoul-123

career-agent-task-45

```

business meaning은 별도의 field로 표현한다.

---

## 7. Time Conventions

Persistent entity의 시간은 가능한 한 명시적으로 저장한다.

일반적인 metadata는 다음과 같다.

```

created_at

updated_at

```

필요한 entity에는 다음 field를 추가할 수 있다.

```

started_at

completed_at

expires_at

archived_at

deleted_at

last_accessed_at

last_verified_at

```

Database에는 timezone-aware timestamp를 저장한다.

사용자에게 표시할 때 사용자의 timezone으로 변환한다.

---

## 8. User

User는 ODYS를 사용하는 identity를 나타낸다.

User domain object와 authentication provider object는 개념적으로 구분한다.

초기 구현에서는 Supabase Auth가 authentication identity를 제공할 수 있다.

```

Supabase Auth Identity

          │

          ▼

       ODYS User

```

User의 주요 정보 후보는 다음과 같다.

```

id

auth_identity

display_name

timezone

locale

created_at

updated_at

```

ODYS User object에 authentication provider의 전체 raw object를 그대로 저장하거나 전달하지 않는다.

필요한 domain 정보만 사용한다.

---

## 9. Workspace

Workspace는 ODYS resource의 기본 isolation 및 context boundary다.

한 User는 하나 이상의 Workspace를 가질 수 있다.

예:

```

Personal

University

Work

ODYS Project

```

Workspace의 주요 field 후보는 다음과 같다.

```

id

owner_user_id

name

description

created_at

updated_at

```

초기 MVP에서는 Workspace가 하나의 User에게 소유되는 단순한 모델로 시작할 수 있다.

향후 collaboration이 실제 요구사항이 되면 별도의 membership model을 도입한다.

예:

```

Workspace

    │

    └── Workspace Membership

            ├── User A

            ├── User B

            └── User C

```

미래 collaboration 가능성만을 이유로 초기 schema를 지나치게 복잡하게 만들지 않는다.

---

## 10. Project

Project는 Workspace 내부의 장기 목표 또는 활동을 표현한다.

Project의 주요 field 후보는 다음과 같다.

```

id

workspace_id

name

description

status

created_at

updated_at

archived_at

```

Project는 다음 resource의 context scope가 될 수 있다.

- Conversation

- Document

- Memory

- Task

- Agent activity

Project는 선택적 scope다.

Workspace 전체에 적용되는 Memory나 Task는 Project 없이 존재할 수 있다.

---

## 11. Conversation

Conversation은 사용자와 ODYS 사이의 대화 context를 나타낸다.

Conversation 자체는 Long-Term Memory와 동일하지 않다.

주요 field 후보는 다음과 같다.

```

id

workspace_id

project_id

title

created_at

updated_at

```

`project_id`는 선택적일 수 있다.

Workspace 전체를 대상으로 하는 Conversation도 존재할 수 있기 때문이다.

---

## 12. Message

Message는 Conversation 내부의 개별 interaction unit이다.

주요 field 후보는 다음과 같다.

```

id

conversation_id

role

content

created_at

```

필요한 경우 다음 metadata를 포함할 수 있다.

```

Agent identifier

model metadata

attachment references

structured content metadata

```

Message history를 Long-Term Memory처럼 무조건 context에 전달하지 않는다.

Message는 Memory candidate 또는 context source가 될 수 있다.

---

## 13. Document

Document는 사용자가 제공하거나 ODYS가 참조할 수 있는 지속적인 content resource를 표현한다.

예:

- Markdown document

- PDF

- text file

- source-code file

- linked external document

- imported knowledge resource

Document metadata의 주요 field 후보는 다음과 같다.

```

id

workspace_id

project_id

name

content_type

source

storage_reference

created_at

updated_at

```

대용량 binary content를 반드시 PostgreSQL row 안에 저장할 필요는 없다.

개념적으로 다음처럼 분리할 수 있다.

```

PostgreSQL

└── Document Metadata

Object Storage

└── Document Content

```

검색을 위한 chunk, embedding 또는 index는 Document의 canonical source가 아니라 **derived search representation**으로 취급한다.

---

## 14. Memory

Memory는 session을 넘어 미래 interaction에 다시 사용할 가치가 있는 정보를 나타낸다.

Memory의 주요 field 후보는 다음과 같다.

```

id

workspace_id

project_id

owner_user_id

type

content

summary

status

confidence

importance

source metadata

created_at

updated_at

last_verified_at

expires_at

```

모든 field가 초기 MVP에서 필수인 것은 아니다.

Memory의 상세 lifecycle과 retrieval 전략은 `MEMORY_ARCHITECTURE.md`에서 정의한다.

---

## 15. Memory Scope

Memory는 최소한 Workspace scope를 가져야 한다.

필요한 경우 Project에 추가적으로 연결된다.

```

Workspace Memory

→ Workspace 전체에서 사용할 수 있음

Project Memory

→ 특정 Project에서 우선적으로 사용할 수 있음

```

개인 사용자 데이터가 다른 사용자의 Workspace retrieval에 포함되어서는 안 된다.

Memory retrieval은 authorization boundary를 통과한 이후에 수행한다.

---

## 16. Memory Provenance

Memory는 가능한 경우 어디에서 유래했는지 추적할 수 있어야 한다.

source 후보는 다음과 같다.

```

explicit user statement

Conversation Message

Document

Task

Agent result

Tool result

manual user entry

```

개념적인 provenance metadata는 다음과 같은 정보를 포함할 수 있다.

```

source_type

source_id

captured_at

extraction_method

```

하나의 Memory가 여러 source를 가질 필요가 생기면 별도의 relation으로 확장할 수 있다.

초기 단계에서 미래의 모든 provenance pattern을 미리 구현하지 않는다.

---

## 17. Task

Task는 지속적으로 상태를 추적할 수 있는 작업 단위다.

Task의 주요 field 후보는 다음과 같다.

```

id

workspace_id

project_id

created_by_user_id

title

description

status

created_at

updated_at

started_at

completed_at

```

초기 canonical status는 다음과 같다.

```

pending

running

waiting_for_approval

completed

failed

cancelled

```

Task는 하나 이상의 Agent Execution을 포함할 수 있다.

---

## 18. Agent Definition and Agent Execution

Agent 자체의 정의와 Agent의 실제 실행 기록을 구분한다.

### Agent Definition

Agent의 behavior와 responsibility를 정의하는 configuration 또는 code artifact다.

예:

```

Conference Agent

Coding Agent

Study Agent

Career Agent

```

Agent Definition을 반드시 database row로 저장할 필요는 없다.

초기에는 repository의 code/config가 source of truth가 될 수 있다.

### Agent Execution

Agent가 실제로 실행된 사건은 persistent execution record가 될 수 있다.

주요 field 후보는 다음과 같다.

```

id

workspace_id

project_id

task_id

agent_id

status

started_at

completed_at

error metadata

execution metadata

```

이 구분은 다음 차이를 명확하게 한다.

```

Agent Definition

= Agent가 무엇인가

Agent Execution

= Agent가 언제 실제로 무엇을 수행했는가

```

---

## 19. Tool Definition and Tool Execution

Tool도 definition과 execution을 구분한다.

### Tool Definition

Tool contract 및 implementation은 repository의 code/config가 source of truth가 될 수 있다.

예:

```

Calendar Tool

Web Search Tool

File Tool

Email Tool

```

### Tool Execution

Tool이 실제로 호출된 사건은 persistent record로 남길 수 있다.

주요 field 후보는 다음과 같다.

```

id

workspace_id

task_id

agent_execution_id

tool_id

status

risk_level

requested_input

result_summary

started_at

completed_at

error metadata

```

민감한 raw Tool input 또는 output을 무조건 영구 저장하지 않는다.

Audit 및 debugging에 필요한 최소한의 metadata만 저장하는 것을 기본으로 한다.

---

## 20. Tool Execution States

Tool Execution은 실행 전 approval을 기다릴 수 있어야 한다.

초기 상태 후보는 다음과 같다.

```

requested

waiting_for_approval

running

succeeded

failed

rejected

cancelled

```

대표적인 상태 흐름은 다음과 같다.

```

requested

   │

   ├── approval 불필요

   │       │

   │       ▼

   │    running

   │       │

   │       ├──► succeeded

   │       └──► failed

   │

   └── approval 필요

           │

           ▼

   waiting_for_approval

           │

       ┌───┴────┐

       ▼        ▼

   approved   rejected

       │        │

       ▼        ▼

    running  rejected

```

실제 상태 machine은 구현과 함께 테스트로 보호한다.

---

## 21. Approval

Approval은 특정 Action을 수행하기 위해 사용자의 명시적인 승인을 기록한다.

Approval은 가능한 경우 실제로 승인 대상이 되는 Tool Execution과 연결한다.

주요 field 후보는 다음과 같다.

```

id

workspace_id

tool_execution_id

requested_by

requested_at

status

resolved_by_user_id

resolved_at

expires_at

reason

```

canonical status 후보는 다음과 같다.

```

pending

approved

rejected

expired

cancelled

```

동일한 Tool Execution에 approval이 재요청될 가능성이 있다면 Approval history를 여러 record로 보존할 수 있다.

---

## 22. Integration Connection

Integration Connection은 ODYS와 외부 서비스 사이의 연결 상태를 표현한다.

예:

```

Google Calendar

Email Provider

GitHub

Cloud Storage

External API

```

주요 metadata 후보는 다음과 같다.

```

id

workspace_id

provider

status

connected_at

updated_at

metadata

```

access token, refresh token 및 API secret 같은 credential은 일반 domain field처럼 취급하지 않는다.

credential storage와 encryption 전략은 `SECURITY_ARCHITECTURE.md`에서 정의한다.

---

## 23. Audit Event

Audit Event는 중요한 시스템 행동에 대한 immutable 또는 append-oriented record를 표현한다.

주요 field 후보는 다음과 같다.

```

id

workspace_id

project_id

actor_type

actor_id

action

resource_type

resource_id

status

timestamp

metadata

```

Audit Event가 답할 수 있어야 하는 질문은 다음과 같다.

- 누가 행동했는가?

- 어떤 Workspace에서 발생했는가?

- 어떤 resource가 영향을 받았는가?

- 어떤 Action이 요청되었는가?

- 결과는 무엇이었는가?

- 사용자의 Approval이 있었는가?

Audit Event는 일반 application log와 분리한다.

---

## 24. Source of Truth vs Derived Data

ODYS에서는 canonical data와 derived data를 구분한다.

예:

```

Canonical

├── Memory content

├── Document metadata

├── Message

├── Task state

└── Approval state

Derived

├── embedding

├── search index

├── ranking score

├── cached summary

└── analytics aggregation

```

Derived data는 재생성할 수 있어야 한다.

검색 index가 손실되더라도 canonical source data가 사라져서는 안 된다.

---

## 25. Search and Embedding Data

Semantic retrieval을 위해 Memory 또는 Document에 embedding을 생성할 수 있다.

개념적인 구조는 다음과 같다.

```

Memory / Document

       │

       ▼

Embedding Generation

       │

       ▼

Search Representation

```

초기 PostgreSQL implementation에서 vector search capability를 사용할 수 있다.

하지만 다음 원칙을 유지한다.

> Vector representation is an index, not the Memory itself.

Core Memory contract는 특정 embedding model이나 vector implementation에 종속되지 않는다.

Embedding model을 변경할 경우 derived representation은 재생성할 수 있어야 한다.

---

## 26. Referential Integrity

가능한 관계는 database-level foreign key로 보호한다.

예:

```

Project

→ Workspace

Conversation

→ Workspace

Message

→ Conversation

Task

→ Workspace

Agent Execution

→ Task

Tool Execution

→ Agent Execution

Approval

→ Tool Execution

```

다만 polymorphic provenance나 Audit reference처럼 다양한 resource를 참조하는 경우에는 domain validation이 추가로 필요할 수 있다.

referential integrity를 단순한 application convention에만 맡기지 않는다.

---

## 27. Deletion and Archival

모든 resource에 동일한 deletion strategy를 강제하지 않는다.

다음 개념을 구분한다.

### Archive

일반적인 사용자 workflow에서 보이지 않지만 복구 가능한 상태.

### Soft Delete

application level에서 삭제된 것으로 취급하지만 일정 기간 보존할 수 있는 상태.

### Hard Delete

persistent storage에서 실제 데이터를 제거하는 작업.

사용자가 Memory를 잊도록 요청한 경우 해당 Memory는 즉시 future retrieval 대상에서 제외되어야 한다.

실제 hard deletion 및 retention 정책은 privacy와 security 요구사항에 따라 별도로 정의한다.

---

## 28. Data Isolation

모든 user-owned resource access는 Workspace boundary를 우선적으로 확인해야 한다.

개념적으로:

```

Authenticated User

       │

       ▼

Workspace Access Check

       │

       ▼

Resource Access

```

Client가 전달한 `workspace_id`만 신뢰해서는 안 된다.

서버 또는 database authorization policy가 실제 사용자의 접근 권한을 검증해야 한다.

Supabase implementation에서는 적절한 database-level access policy를 활용할 수 있다.

세부 사항은 `SECURITY_ARCHITECTURE.md`에서 정의한다.

---

## 29. Sensitive Data

다음 데이터는 일반 metadata보다 더 엄격하게 취급한다.

- authentication information

- API credentials

- OAuth tokens

- private user documents

- personal Memory

- external service content

- Tool outputs containing private data

민감한 데이터를 로그, Audit metadata 또는 error message에 불필요하게 복제하지 않는다.

---

## 30. JSON and Structured Columns

PostgreSQL의 flexible structured data capability는 유용하지만 모든 데이터를 하나의 JSON object로 저장하는 방식은 피한다.

JSON-like structured field는 다음과 같은 경우에 사용할 수 있다.

- provider-specific metadata

- extensible execution metadata

- non-critical auxiliary attributes

- schema가 provider마다 다른 raw metadata

반면 다음과 같은 핵심 관계는 명시적인 column과 foreign key를 선호한다.

```

workspace_id

project_id

task_id

conversation_id

agent_execution_id

tool_execution_id

```

핵심 domain relationship을 JSON 내부에 숨기지 않는다.

---

## 31. Schema Evolution

Database schema는 migration을 통해 version control한다.

production database를 수동으로 변경한 뒤 repository와 불일치한 상태로 두지 않는다.

개념적인 흐름은 다음과 같다.

```

Domain Change

     │

     ▼

Architecture Review

     │

     ▼

Schema Migration

     │

     ▼

Application Change

     │

     ▼

Tests

     │

     ▼

Deployment

```

중대한 domain model 변경은 관련 architecture document 또는 ADR 검토를 요구할 수 있다.

---

## 32. Indexing Strategy

Index는 실제 query pattern을 기준으로 추가한다.

초기부터 가능한 모든 field에 index를 생성하지 않는다.

높은 가능성이 있는 query pattern은 다음과 같다.

```

Workspace별 Project 조회

Workspace별 Conversation 조회

Conversation별 Message 조회

Workspace / Project별 Memory 조회

Task별 Agent Execution 조회

Agent Execution별 Tool Execution 조회

상태별 pending Approval 조회

시간순 Audit Event 조회

```

semantic retrieval이 필요할 경우 별도의 vector/search index를 추가할 수 있다.

---

## 33. Transaction Boundaries

서로 반드시 일관된 상태로 변경되어야 하는 operation은 transaction boundary를 고려한다.

예:

```

Tool Execution 상태 변경

+

Approval resolution

+

관련 Audit Event 기록

```

또는:

```

Task completion

+

final execution status update

```

모든 workflow를 하나의 거대한 database transaction으로 만들지는 않는다.

외부 API 호출은 database transaction과 동일한 atomic boundary를 보장하지 않는다는 점을 명확히 고려한다.

---

## 34. External Action Consistency

외부 시스템을 변경하는 Tool은 database transaction만으로 완전한 atomicity를 보장할 수 없다.

예:

```

ODYS

  │

  ├── PostgreSQL state update

  │

  └── External Calendar API

```

외부 API 호출 성공 후 내부 상태 저장이 실패하거나 그 반대 상황이 발생할 수 있다.

따라서 external Action은 필요에 따라 다음을 고려한다.

- idempotency

- retry policy

- execution status

- reconciliation

- audit

- safe failure

세부 전략은 `TOOL_ARCHITECTURE.md`에서 정의한다.

---

## 35. Model Invocation Data

Model invocation의 모든 raw prompt와 response를 무조건 영구 저장하지 않는다.

운영에 필요한 경우 다음과 같은 metadata를 별도 기록할 수 있다.

```

provider

model

latency

token usage

status

error category

Agent Execution reference

```

사용자 privacy와 debugging 요구 사이의 균형을 유지한다.

필요하다면 향후 별도의 Model Invocation entity를 도입할 수 있다.

초기에는 실제 observability 요구가 검증되기 전에 별도 table을 강제하지 않는다.

---

## 36. MVP Persistent Model

초기 MVP에서 우선적으로 필요한 persistent model은 다음과 같다.

```

User

Workspace

Project

Conversation

Message

Memory

Task

Agent Execution

Tool Execution

Approval

Audit Event

```

Document와 Integration Connection은 실제 첫 workflow에서 필요해지는 시점에 추가할 수 있다.

목표는 전체 미래 platform schema를 첫날부터 구현하는 것이 아니다.

---

## 37. Deferred Models

다음 model은 실제 요구가 검증되기 전까지 반드시 구현할 필요가 없다.

- Workspace Membership

- Organization

- Billing Account

- Subscription

- Pack Marketplace

- Pack Installation

- Complex Workflow Definition

- Model Invocation History

- Multi-tenant Organization Policy

- External Developer Account

미래 확장성을 위해 domain concept을 고려할 수는 있지만 초기 schema complexity를 증가시키지 않는다.

---

## 38. Data Model Invariants

다음 규칙은 Data Model이 발전하더라도 가능한 한 유지한다.

1. User-owned data has an explicit authorization path.

2. Workspace is the primary resource boundary.

3. Project is a narrower optional context boundary.

4. Conversation history is not identical to Long-Term Memory.

5. Agent Definition and Agent Execution are different concepts.

6. Tool Definition and Tool Execution are different concepts.

7. Approval is attached to an actual Action or execution request.

8. Audit data is distinct from application logs.

9. Embeddings and indexes are derived data, not canonical Memory.

10. External provider implementations do not define Core domain meaning.

---

## 39. Related Documents

이 문서는 다음 architecture 문서와 함께 사용한다.

- `SYSTEM_OVERVIEW.md`

- `ODYS_CORE.md`

- `MEMORY_ARCHITECTURE.md`

- `AGENT_ARCHITECTURE.md`

- `TOOL_ARCHITECTURE.md`

- `MODEL_STRATEGY.md`

- `API_DESIGN.md`

- `SECURITY_ARCHITECTURE.md`

- `DEPLOYMENT.md`

- `TECH_STACK.md`

관련 Architecture Decision Record:

- `../40_decisions/ADR-002-core-vs-pack.md`

- `../40_decisions/ADR-003-modular-monolith.md`

- `../40_decisions/ADR-004-typescript-primary.md`

- `../40_decisions/ADR-005-ai-sdk-model-independence.md`

- `../40_decisions/ADR-006-supabase.md`

- `../40_decisions/ADR-007-progressive-autonomy.md`

---

## 40. Implementation Rule

새로운 persistent entity를 추가하기 전에 다음 질문을 확인한다.

1. 이 정보는 실제로 session을 넘어 보존되어야 하는가?

2. 기존 entity의 field 또는 relation으로 표현할 수 없는가?

3. 누가 이 데이터를 소유하는가?

4. 어떤 Workspace 또는 Project scope에 속하는가?

5. 누가 이 데이터를 읽고 수정할 수 있는가?

6. source of truth인가, derived data인가?

7. 삭제와 retention 정책은 무엇인가?

8. Audit이 필요한 변경인가?

9. 새로운 table이 실제 사용 사례에 의해 정당화되는가?

명확한 이유가 없다면 새로운 persistent model을 추가하지 않는다.

> Persist what the system must remember, relate what the system must understand, and isolate what the user must control.
