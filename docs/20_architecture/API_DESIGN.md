# ODYS API Design

## 1. Purpose

이 문서는 ODYS의 Application, Core module 및 외부 integration 사이에서 사용되는 API boundary와 communication 원칙을 정의한다.

ODYS의 API는 단순히 HTTP endpoint 목록을 의미하지 않는다.

API는 시스템 module 사이의 contract이며, 사용자 identity, Workspace scope, validation, permission 및 execution semantics를 명확하게 유지하기 위한 경계다.

이 문서는 다음 질문에 답한다.

- ODYS에는 어떤 종류의 API boundary가 존재하는가?

- Application은 Core capability에 어떻게 접근하는가?

- Modular Monolith 내부 module은 어떻게 통신하는가?

- authentication과 authorization은 어디에서 적용되는가?

- Workspace와 Project scope는 어떻게 전달되는가?

- request와 response는 어떤 contract를 가지는가?

- validation과 error는 어떻게 처리하는가?

- state-changing request의 idempotency는 어떻게 관리하는가?

- Agent, Tool, Task 및 Approval API는 어떤 형태를 가지는가?

- streaming과 asynchronous Task는 어떻게 표현하는가?

- 향후 외부 developer API와 내부 API는 어떻게 구분하는가?

---

## 2. API Design Goals

ODYS API는 다음 목표를 가진다.

### 2.1 Clear Contracts

입력, 출력, error 및 side effect를 명확하게 정의한다.

### 2.2 Domain-Oriented Boundaries

Database table 구조를 그대로 API에 노출하지 않는다.

### 2.3 Authorization by Default

사용자 소유 resource에 대한 모든 접근은 authorization boundary를 통과한다.

### 2.4 Workspace Isolation

Workspace는 주요 resource scope로 사용한다.

### 2.5 Type Safety

서버와 TypeScript consumer 사이에서 가능한 한 type-safe contract를 유지한다.

### 2.6 Stable Evolution

내부 implementation이 변경되어도 consumer contract 변경을 최소화한다.

### 2.7 Explicit Side Effects

외부 상태 또는 persistent state를 변경하는 API는 그 효과가 명확해야 한다.

### 2.8 Observability

중요한 request와 Action을 추적할 수 있어야 한다.

---

## 3. API Categories

ODYS에서는 개념적으로 다음 API category를 구분한다.

```

ODYS APIs

├── Application API

├── Internal Module Contracts

├── Tool Contracts

├── Provider Adapters

└── Future External API

```

각 category는 서로 다른 안정성과 security requirement를 가진다.

---

## 4. Application API

Application API는 Web Application과 ODYS backend 사이의 주요 boundary다.

개념적으로:

```

Web Application

      │

      ▼

Application API

      │

      ▼

ODYS Core / Domain Modules

```

Application이 database schema나 provider implementation을 직접 알아야 하는 구조를 피한다.

---

## 5. Internal Module Contracts

Modular Monolith 내부 module은 불필요하게 HTTP를 통해 통신하지 않는다.

초기에는 TypeScript interface와 function/module boundary를 사용한다.

예:

```

Agent Runtime

      │

      ▼

Tool Registry Interface

```

또는:

```

Memory Service

      │

      ▼

Memory Repository Interface

```

하나의 process 내부 module을 microservice처럼 흉내 내기 위해 불필요한 network boundary를 만들지 않는다.

---

## 6. Tool Contracts

Tool Contract는 Agent Runtime과 실제 capability 사이의 API boundary다.

```

Agent Runtime

      │

      ▼

Tool Contract

      │

      ▼

Tool Implementation

```

Tool API의 상세 lifecycle은 `TOOL_ARCHITECTURE.md`에서 정의한다.

---

## 7. Provider Adapter APIs

External Model Provider, Calendar Provider 또는 다른 service integration은 adapter boundary 뒤에 둔다.

```

ODYS Contract

      │

      ▼

Provider Adapter

      │

      ▼

External Provider API

```

External Provider API structure가 ODYS Application API나 Core domain model을 직접 결정하지 않도록 한다.

---

## 8. Future External API

향후 ODYS가 third-party developer에게 API를 제공할 수 있다.

그러나 초기 Application API를 처음부터 public platform API처럼 과도하게 설계하지 않는다.

```

Internal Product API

       │

       ▼

Real Usage

       │

       ▼

Stable Domain Contracts

       │

       ▼

Future External API

```

외부 API가 실제 product requirement가 될 때 별도의 authentication, quota, versioning 및 developer policy를 정의한다.

---

## 9. Client and Backend Boundary

초기 Web Application은 사용자 interface와 client-side state를 담당한다.

중요한 domain behavior는 backend boundary를 통과하도록 한다.

```

Web Client

├── UI

├── interaction state

└── authentication session handling

Backend

├── authorization

├── Agent Runtime

├── Memory

├── Tool Runtime

├── Task

├── Policy

├── Approval

└── persistent domain operations

```

Client가 security-critical domain rule을 단독으로 enforce하지 않는다.

---

## 10. Supabase Boundary

Supabase는 초기 backend platform으로 사용한다.

Application이 authentication을 위해 provider SDK를 사용할 수 있지만 Core domain behavior 전체를 database client 호출로 분산시키지 않는다.

개념적으로:

```

Web Application

      │

      ├── Authentication Integration

      │

      └── ODYS Application API

                 │

                 ▼

             ODYS Core

                 │

                 ▼

        Repository / Service Contract

                 │

                 ▼

        Supabase / PostgreSQL

```

특히 중요한 state mutation은 ODYS domain policy를 우회하지 않아야 한다.

---

## 11. Resource Model

Application API는 domain resource를 중심으로 설계한다.

초기 주요 resource 후보는 다음과 같다.

```

workspaces

projects

conversations

messages

memories

tasks

Agent executions

Tool executions

approvals

```

Database table name과 API resource가 반드시 일대일일 필요는 없다.

---

## 12. Workspace-Scoped Resources

사용자 데이터 resource는 가능한 한 Workspace scope를 명확하게 표현한다.

개념적인 route structure는 다음과 같을 수 있다.

```http

GET /workspaces/{workspaceId}/projects

GET /workspaces/{workspaceId}/memories

GET /workspaces/{workspaceId}/tasks

```

Project-level resource는 더 좁은 scope를 사용할 수 있다.

```http

GET /workspaces/{workspaceId}/projects/{projectId}

```

실제 route naming은 implementation과 함께 refinement할 수 있다.

---

## 13. Resource Scope Is Not Authorization

URL에 `workspaceId`가 있다고 해서 사용자가 해당 Workspace에 접근할 권한이 있다는 의미는 아니다.

```

Request

   │

   ▼

Authenticated User

   │

   ▼

Workspace Authorization

   │

   ▼

Resource Access

```

Client에서 전달한 identifier를 신뢰하지 않는다.

---

## 14. Authentication

Application API의 protected endpoint는 authenticated identity를 요구한다.

초기 authentication provider는 Supabase Auth를 사용할 수 있다.

개념적으로:

```

Client

  │

  ▼

Authentication Credential

  │

  ▼

API Authentication

  │

  ▼

ODYS User Identity

```

API 내부에서는 provider raw identity를 필요한 domain identity로 normalize한다.

---

## 15. Authentication vs Authorization

Authentication과 Authorization을 구분한다.

```

Authentication

= 사용자가 누구인가?

Authorization

= 이 사용자가 이 resource 또는 Action을 사용할 수 있는가?

```

로그인되었다는 사실만으로 모든 Workspace resource에 접근하도록 허용하지 않는다.

---

## 16. Authorization Flow

대표적인 authorization flow는 다음과 같다.

```

Request

   │

   ▼

Authentication

   │

   ▼

User Resolution

   │

   ▼

Workspace Access Check

   │

   ▼

Resource Authorization

   │

   ▼

Permission / Policy

   │

   ▼

Domain Operation

```

Agent 또는 Tool을 사용하는 API는 추가적인 Agent/Tool permission evaluation을 수행한다.

---

## 17. Request Validation

모든 external API input은 untrusted input으로 취급한다.

request validation은 다음 항목을 포함할 수 있다.

```

path parameters

query parameters

headers

request body

resource identifiers

enum values

date formats

string lengths

nested structures

```

validation은 가능한 한 domain operation 전에 수행한다.

---

## 18. Runtime Schema Validation

TypeScript type은 compile-time safety를 제공하지만 network input의 runtime validity를 보장하지 않는다.

따라서 external request boundary에서는 runtime schema validation을 적용한다.

```

HTTP Request

     │

     ▼

Runtime Validation

     │

     ▼

Typed Domain Input

```

실제 schema library는 `TECH_STACK.md`에서 확정할 수 있다.

---

## 19. Response Contract

API response는 명확하고 일관된 형태를 유지한다.

성공 response는 endpoint 특성에 따라 domain resource 또는 operation result를 반환한다.

예:

```json
{
  "id": "resource-id",

  "status": "completed"
}
```

모든 성공 response를 불필요한 universal wrapper 안에 강제로 넣을 필요는 없다.

중요한 것은 endpoint 간 contract consistency다.

---

## 20. Error Contract

Application API는 일관된 error representation을 사용한다.

개념적인 error response는 다음 정보를 포함할 수 있다.

```json
{
  "error": {
    "code": "permission_denied",

    "message": "You do not have permission to perform this action.",

    "requestId": "request-id"
  }
}
```

필요한 경우 field-level validation detail을 추가할 수 있다.

---

## 21. Error Codes

Application이 programmatically 처리해야 하는 error는 stable error code를 사용한다.

예:

```

validation_error

authentication_required

permission_denied

resource_not_found

conflict

approval_required

policy_violation

rate_limited

external_service_error

internal_error

```

사용자-facing message와 machine-readable code를 구분한다.

---

## 22. HTTP Status Semantics

HTTP API를 사용하는 경우 의미에 맞는 status code를 사용한다.

예:

```

200

→ successful read or operation

201

→ resource created

202

→ accepted for asynchronous processing

204

→ successful operation with no response body

400

→ invalid request

401

→ authentication required or invalid

403

→ authenticated but not authorized

404

→ resource not found or inaccessible

409

→ conflicting state

422

→ semantically invalid input when appropriate

429

→ rate limited

500

→ unexpected server failure

502 / 503

→ upstream or temporary availability failure when appropriate

```

모든 실패를 `200` response 안의 custom error field로 표현하지 않는다.

---

## 23. Resource Not Found and Isolation

multi-user environment에서는 존재 여부 자체가 민감할 수 있다.

다른 사용자의 resource identifier를 요청했을 때 resource 존재 여부를 불필요하게 노출하지 않는 정책을 사용할 수 있다.

```

Unauthorized resource

→ generic not found or access denied policy

```

세부 behavior는 security 요구사항에 맞게 일관되게 정의한다.

---

## 24. API Naming

API naming은 domain terminology를 따른다.

문서 전체에서 canonical term을 사용한다.

예:

```

workspace

project

memory

task

Agent

Tool

approval

```

동일한 concept을 endpoint마다 다른 이름으로 부르지 않는다.

---

## 25. Create, Read, Update, Delete

단순 resource는 일반적인 CRUD semantics를 사용할 수 있다.

예:

```http

POST   /workspaces/{workspaceId}/projects

GET    /workspaces/{workspaceId}/projects/{projectId}

PATCH  /workspaces/{workspaceId}/projects/{projectId}

DELETE /workspaces/{workspaceId}/projects/{projectId}

```

하지만 모든 domain operation을 억지로 CRUD로 표현하지 않는다.

---

## 26. Domain Actions

특정 domain operation은 명시적인 Action endpoint가 더 자연스러울 수 있다.

예:

```http

POST /tasks/{taskId}/cancel

POST /approvals/{approvalId}/approve

POST /approvals/{approvalId}/reject

```

승인이나 취소를 resource field 직접 수정으로만 표현하여 domain semantics를 흐리지 않는다.

---

## 27. PATCH Semantics

partial update가 필요한 resource는 `PATCH`를 사용할 수 있다.

client가 수정할 수 없는 field는 request schema에서 제외한다.

예:

```

Client may update

→ project name

Client may not arbitrarily update

→ owner_user_id

→ audit metadata

→ execution status controlled by runtime

```

API가 database row 전체를 그대로 writable object로 노출하지 않는다.

---

## 28. Conversation API

Conversation은 Application과 Agent Runtime 사이의 주요 user interaction boundary가 될 수 있다.

개념적인 resource flow:

```http

POST /workspaces/{workspaceId}/conversations

POST /workspaces/{workspaceId}/conversations/{conversationId}/messages

```

사용자가 Message를 생성하면 내부적으로 Agent Task가 시작될 수 있다.

API response가 반드시 단순 database Message insert 결과만을 의미하는 것은 아니다.

---

## 29. Agent Invocation

사용자의 요청을 처리할 때 특정 Agent를 명시적으로 요청하는 API가 필요할 수 있다.

개념적인 input은 다음과 같다.

```json
{
  "agentId": "coding",

  "message": "Analyze the current project architecture."
}
```

하지만 Application이 Model 이름, Tool credential 또는 internal execution implementation을 지정하게 하지 않는다.

---

## 30. Automatic Agent Selection

Application이 Agent를 직접 지정하지 않는 request도 지원할 수 있다.

```

Application

    │

    ▼

ODYS Request

    │

    ▼

Agent Selection

```

Agent routing은 backend의 Agent architecture responsibility다.

Client에 Agent selection business logic을 중복 구현하지 않는다.

---

## 31. Task API

비동기 또는 장기 작업은 Task resource로 표현한다.

개념적인 API는 다음과 같다.

```http

GET /workspaces/{workspaceId}/tasks/{taskId}

```

Task response는 다음 정보를 포함할 수 있다.

```json
{
  "id": "task-id",

  "status": "running"
}
```

Task status의 canonical meaning은 `DATA_MODEL.md`와 `ODYS_CORE.md`를 따른다.

---

## 32. Task States

초기 Task state는 다음과 같다.

```

pending

running

waiting_for_approval

completed

failed

cancelled

```

API consumer가 arbitrary string으로 Task state를 변경할 수 있게 하지 않는다.

state transition은 domain operation으로 관리한다.

---

## 33. Asynchronous Operations

작업이 즉시 완료되지 않는 경우 request를 오래 열린 synchronous request로만 유지하지 않는다.

개념적으로:

```

POST Request

     │

     ▼

Task Created

     │

     ▼

202 Accepted

     │

     ▼

Task Processing

     │

     ▼

Client observes Task status

```

실제 transport는 use case에 따라 polling 또는 streaming을 사용할 수 있다.

---

## 34. Streaming

Agent의 사용자-facing response는 streaming을 지원할 수 있다.

Streaming은 다음 목적에 유용하다.

```

progressive text response

long model response

execution progress

```

그러나 streaming transport와 domain Task state를 혼동하지 않는다.

```

Stream disconnected

≠

Task necessarily failed

```

Task의 canonical 상태는 서버가 관리한다.

---

## 35. Streaming Events

향후 streaming event가 필요한 경우 명시적인 event type을 정의할 수 있다.

예:

```

response.delta

Tool.started

Tool.completed

approval.required

Task.completed

Task.failed

```

event type은 UI implementation detail보다 domain execution meaning을 우선한다.

---

## 36. Tool Execution API

일반 Application이 arbitrary Tool을 직접 실행하는 범용 endpoint를 기본값으로 제공하지 않는다.

다음과 같은 API는 위험하다.

```http

POST /tools/execute-anything

```

Tool execution은 일반적으로 Agent Runtime 또는 명시적으로 허용된 user Action을 통해 발생한다.

---

## 37. Tool Execution Visibility

사용자는 자신의 Task와 연결된 Tool execution 상태를 확인할 수 있어야 할 수 있다.

개념적인 read API는 다음과 같이 표현할 수 있다.

```http

GET /workspaces/{workspaceId}/tasks/{taskId}/tool-executions

```

민감한 raw input, secret 또는 provider response 전체를 그대로 노출하지 않는다.

---

## 38. Approval API

Approval은 독립적인 domain resource로 취급한다.

개념적인 endpoint:

```http

GET  /workspaces/{workspaceId}/approvals/{approvalId}

POST /workspaces/{workspaceId}/approvals/{approvalId}/approve

POST /workspaces/{workspaceId}/approvals/{approvalId}/reject

```

Approval response에는 사용자가 무엇을 승인하는지 이해할 수 있는 preview가 포함되어야 한다.

---

## 39. Approval Integrity

승인 후 실행되는 Action은 사용자가 승인한 Action과 동일해야 한다.

```

Approval Snapshot

      │

      ▼

Approved

      │

      ▼

Execution Input Verification

      │

      ▼

Tool Execution

```

중요한 input이 변경되면 기존 Approval을 재사용하지 않는다.

---

## 40. Memory API

사용자는 자신의 Long-Term Memory를 inspect하고 control할 수 있어야 한다.

개념적인 endpoint:

```http

GET    /workspaces/{workspaceId}/memories

GET    /workspaces/{workspaceId}/memories/{memoryId}

PATCH  /workspaces/{workspaceId}/memories/{memoryId}

DELETE /workspaces/{workspaceId}/memories/{memoryId}

```

Memory deletion은 `MEMORY_ARCHITECTURE.md`의 forgetting semantics를 따라야 한다.

---

## 41. Memory Creation

Memory 생성은 두 가지 source를 가질 수 있다.

```

Explicit User Action

Automated Memory Pipeline

```

사용자-facing explicit Memory 생성 API와 internal Memory candidate processing은 동일한 trust level로 취급할 필요가 없다.

automated write는 Memory Policy를 통과해야 한다.

---

## 42. Search API

검색 endpoint는 scope와 resource type을 명확하게 유지한다.

예:

```http

GET /workspaces/{workspaceId}/memories?query=...

```

검색 query가 존재한다고 해서 Workspace authorization을 우회하지 않는다.

```

Authorization

→ Scope Filtering

→ Search

```

순서를 유지한다.

---

## 43. Pagination

목록 endpoint는 데이터가 증가할 수 있으므로 pagination을 고려한다.

초기에는 cursor-based 또는 다른 일관된 pagination strategy를 선택할 수 있다.

API consumer가 전체 Audit Event나 Message history를 한 번에 가져오도록 강제하지 않는다.

---

## 44. Filtering and Sorting

filter와 sort field는 명시적으로 허용한다.

예:

```http

GET /workspaces/{workspaceId}/tasks?status=running

```

client가 arbitrary database expression을 query parameter로 전달하지 못하도록 한다.

API query surface는 domain requirement를 기반으로 확장한다.

---

## 45. Idempotency

state-changing API는 network retry로 duplicate Action이 발생할 가능성을 고려한다.

특히 다음 operation은 중요하다.

```

Tool execution

external Action

Task creation

calendar creation

email sending

```

필요한 endpoint는 Idempotency Key를 받을 수 있다.

개념적으로:

```http

Idempotency-Key: unique-request-key

```

---

## 46. Idempotency Scope

Idempotency Key는 무제한 global key가 아니라 적절한 user 또는 operation scope를 가져야 한다.

```

User / Workspace

+

Operation

+

Idempotency Key

```

동일 key로 다른 Action을 실행하지 않도록 request fingerprint를 함께 검증할 수 있다.

---

## 47. Optimistic Concurrency

동시에 동일 resource를 수정할 가능성이 있는 경우 stale update를 고려한다.

예:

```

Client A reads Memory v1

Client B updates to v2

Client A writes old state

```

필요한 resource에는 version, timestamp 또는 conditional update strategy를 사용할 수 있다.

초기 MVP에서는 실제 conflict 가능성이 높은 resource부터 적용한다.

---

## 48. Request Correlation

각 API request에 correlation identifier 또는 request identifier를 부여할 수 있다.

```

requestId

```

이를 통해 다음을 연결할 수 있다.

```

Application Request

Agent Execution

Tool Execution

Error Log

Audit Event

```

민감한 정보를 request ID 자체에 포함하지 않는다.

---

## 49. Audit Boundary

중요한 domain Action은 API logging과 별도로 Audit Event를 생성할 수 있다.

예:

```

Memory deleted

Approval resolved

external Tool executed

permission-sensitive Action

```

HTTP access log가 Audit Log를 대체하지 않는다.

---

## 50. API Logging

API operation을 관찰하기 위해 다음 metadata를 logging할 수 있다.

```

requestId

route

method

status

latency

authenticated user reference

Workspace reference where appropriate

error category

```

다음은 일반 application log에 직접 기록하지 않는다.

```

access token

refresh token

API key

password

full private document

unnecessary raw prompt

sensitive Tool payload

```

---

## 51. Rate Limiting

외부 사용자 request와 비용이 큰 AI operation에는 적절한 rate limiting을 적용할 수 있다.

rate limit은 다음 범위에서 적용될 수 있다.

```

User

Workspace

endpoint

Model operation

external integration

```

초기에는 실제 abuse 또는 cost requirement가 있는 endpoint부터 적용한다.

---

## 52. Payload Limits

API는 무제한 크기의 request body를 허용하지 않는다.

예:

```

Message size

Document upload size

Tool argument size

structured payload depth

```

대형 파일은 별도의 storage/upload flow를 사용하는 것이 더 적합할 수 있다.

---

## 53. File Upload

향후 Document upload가 필요한 경우 binary content와 domain metadata를 분리한다.

개념적으로:

```

Upload Request

      │

      ▼

Authorized Storage Operation

      │

      ▼

Object Storage

      │

      ▼

Document Metadata

      │

      ▼

PostgreSQL

```

Application이 임의의 storage path를 선택하도록 하지 않는다.

---

## 54. API and Database Boundary

API consumer에게 database row를 그대로 expose하지 않는다.

좋지 않은 구조:

```

HTTP Request

→ generic database table API

→ unrestricted row mutation

```

권장 구조:

```

HTTP Request

→ validation

→ authorization

→ domain operation

→ repository

→ database

```

Database가 API의 business semantics를 대신하지 않는다.

---

## 55. Internal Repository Contract

Core domain module은 persistence를 repository 또는 service contract를 통해 사용할 수 있다.

예:

```

Memory Service

      │

      ▼

Memory Repository

      │

      ▼

Supabase / PostgreSQL Implementation

```

Application API handler가 SQL detail을 직접 관리하는 구조를 피한다.

---

## 56. API Handler Responsibility

API handler는 가능한 한 얇게 유지한다.

주요 책임은 다음과 같다.

```

parse request

authenticate

validate

resolve scope

invoke domain operation

map result

map error

```

domain logic 전체를 route handler에 구현하지 않는다.

---

## 57. Domain Service Responsibility

Domain behavior는 Core module 또는 domain service에서 수행한다.

```

API Handler

    │

    ▼

Domain Operation

    │

    ▼

Core Services / Runtime

```

이 구조는 향후 Web 외 다른 Application이 동일한 Core capability를 재사용할 수 있게 한다.

---

## 58. API Versioning

초기 internal product API는 무조건 `/v1/`을 붙이는 것보다 실제 compatibility requirement를 고려한다.

중요한 원칙은 다음과 같다.

```

breaking changes are intentional

contract changes are reviewed

consumers are updated coherently

```

향후 external public API가 제공되면 명시적인 versioning policy를 도입한다.

---

## 59. Backward Compatibility

API 변경은 가능하면 additive change를 우선한다.

예:

```

optional field 추가

new endpoint 추가

new enum value 추가 시 consumer compatibility 검토

```

field 제거, 의미 변경 또는 response shape 변경은 breaking change로 취급한다.

---

## 60. API Documentation

Application API contract는 implementation과 동기화되어야 한다.

필요한 경우 machine-readable API specification을 생성하거나 관리할 수 있다.

그러나 architecture 문서와 generated API reference의 역할은 다르다.

```

API_DESIGN.md

→ principles and architecture

Generated API Reference

→ concrete routes and schemas

```

---

## 61. Public API Documentation

향후 external API가 생기는 경우 internal implementation detail을 public documentation에 노출하지 않는다.

Public API는 별도의 stable contract와 security review를 요구한다.

---

## 62. Webhooks

Webhook을 제공하거나 사용하는 기능은 초기 MVP의 필수 범위가 아니다.

실제 integration이 webhook delivery를 요구할 경우 다음을 고려한다.

```

signature verification

replay protection

idempotency

retry

delivery ordering

secret management

```

Webhook payload도 untrusted external input으로 취급한다.

---

## 63. External Callbacks

OAuth callback과 같은 external callback endpoint는 일반 Application API보다 추가적인 검증이 필요하다.

예:

```

state validation

redirect validation

provider error handling

credential isolation

```

세부 내용은 `SECURITY_ARCHITECTURE.md`에서 정의한다.

---

## 64. Cross-Origin Access

Web API의 browser access policy는 필요한 Application origin만 허용하는 것을 기본 방향으로 한다.

무분별한 wildcard configuration을 기본값으로 사용하지 않는다.

실제 deployment origin은 environment configuration으로 관리한다.

---

## 65. CSRF Considerations

authentication mechanism이 browser cookie에 의존하는 경우 CSRF risk를 고려한다.

token-based 또는 cookie-based authentication 방식에 따라 방어 전략이 달라질 수 있다.

구체적인 authentication transport가 결정되면 `SECURITY_ARCHITECTURE.md`에서 상세화한다.

---

## 66. Sensitive Response Data

API response는 consumer가 실제로 필요한 정보만 반환한다.

예를 들어 Integration Connection API가 다음 값을 반환해서는 안 된다.

```

raw access token

refresh token

secret

provider credential

```

credential presence나 connection status만 노출할 수 있다.

---

## 67. Server-Side Secrets

External Provider credential은 서버-side Tool Runtime 또는 credential resolver에서 사용한다.

```

Client

  │

  ▼

ODYS API

  │

  ▼

Tool Runtime

  │

  ▼

Credential Resolver

  │

  ▼

Provider

```

server credential을 client에 전달하여 client가 provider를 대신 호출하게 하지 않는다.

---

## 68. API and Progressive Autonomy

API는 Agent autonomy level을 우회하는 직접 실행 경로를 만들어서는 안 된다.

예를 들어 Application에 다음과 같은 unrestricted endpoint를 제공하지 않는다.

```http

POST /execute-arbitrary-action

```

외부 Action은 Tool Runtime, permission 및 Approval rule을 통과해야 한다.

---

## 69. Safe Action API

외부 Action이 필요한 경우 prepare와 execute를 분리할 수 있다.

```

Prepare

   │

   ▼

Preview

   │

   ▼

Approval

   │

   ▼

Execute

```

API도 이러한 lifecycle을 반영할 수 있다.

---

## 70. Example Approval Flow

개념적인 흐름은 다음과 같다.

```

POST user request

       │

       ▼

Agent Task

       │

       ▼

Tool Action prepared

       │

       ▼

Task = waiting_for_approval

       │

       ▼

Approval resource returned

       │

       ▼

User approves

       │

       ▼

Tool Runtime executes

       │

       ▼

Task resumes

```

Application은 Approval UI를 이 domain state 위에 구현한다.

---

## 71. Error Recovery and Retries

Client가 모든 failed request를 자동 retry해서는 안 된다.

특히 state-changing Action은 idempotency semantics를 확인해야 한다.

```

GET

→ 일반적으로 retry 가능

state-changing POST

→ idempotency 여부 확인 필요

external destructive Action

→ blind retry 금지

```

retry responsibility가 client와 server 어디에 있는지 endpoint별로 명확하게 정의한다.

---

## 72. Time Representation

API에서 timestamp는 timezone이 명확한 standard representation을 사용한다.

서버 내부 canonical timestamp와 사용자 display timezone을 구분한다.

사용자의 local timezone을 단순 문자열 parsing으로 추정하지 않는다.

Calendar Tool과 같이 timezone-sensitive한 domain은 특히 명시적으로 처리한다.

---

## 73. Enum Evolution

API enum은 향후 값이 추가될 가능성을 고려한다.

예:

```

Task status

Tool status

Approval status

Memory type

```

canonical enum meaning은 관련 architecture 문서와 일치해야 한다.

같은 상태를 API마다 다른 문자열로 표현하지 않는다.

---

## 74. Type Sharing

TypeScript monorepo에서는 Application과 backend 사이의 일부 contract type을 공유할 수 있다.

하지만 database implementation type을 그대로 공유하지 않는다.

예:

```

Shared API Contract

→ allowed

Raw PostgreSQL row type as public API

→ avoid

```

필요한 경우 shared schema/package를 도입할 수 있다.

---

## 75. Generated Types

Runtime schema에서 TypeScript type을 유도하거나 그 반대 방향의 tooling을 사용할 수 있다.

중요한 원칙은 다음과 같다.

> Runtime validation and compile-time typing must describe the same contract.

두 schema를 수동으로 별도 관리하여 drift가 생기는 구조를 피한다.

구체적인 library와 generation strategy는 구현 단계에서 정한다.

---

## 76. Internal Events

초기 Modular Monolith에서는 모든 module communication을 event bus로 만들지 않는다.

단순한 synchronous domain operation은 direct function call을 사용할 수 있다.

```

Module A

   │

   ▼

Typed Contract

   │

   ▼

Module B

```

실제로 asynchronous decoupling이 필요한 workflow가 나타날 때 event mechanism을 도입한다.

---

## 77. API Performance

API optimization은 실제 measurement를 기준으로 한다.

관찰할 수 있는 지표는 다음과 같다.

```

request latency

database query latency

Agent execution latency

Model latency

Tool latency

payload size

error rate

```

불필요한 endpoint-level complexity를 premature optimization으로 추가하지 않는다.

---

## 78. API Testing

Application API는 다음 test layer를 사용할 수 있다.

### Schema Tests

request와 response contract를 검증한다.

### Authorization Tests

다른 User 또는 Workspace의 resource에 접근할 수 없는지 검증한다.

### Domain Tests

API가 올바른 domain operation을 호출하는지 검증한다.

### Integration Tests

persistence와 provider boundary를 포함한 실제 flow를 검증한다.

### Error Tests

invalid input, permission denial 및 provider failure를 검증한다.

### Idempotency Tests

state-changing API retry가 duplicate Action을 만들지 않는지 검증한다.

---

## 79. API Security Tests

특히 다음 scenario를 검증한다.

```

missing authentication

forged Workspace id

another user's resource id

invalid ownership

oversized input

unexpected field

forbidden state transition

replayed Approval

replayed state-changing request

```

HTTP endpoint 존재 자체를 security boundary로 간주하지 않는다.

---

## 80. Initial API Implementation Direction

초기 구현은 하나의 ODYS backend boundary 안에서 Application API를 제공하는 것을 기본 방향으로 한다.

```

apps/

└── web/

packages/

└── core/

services/

└── only when independently executable responsibility is justified

```

구체적인 web framework와 route location은 `TECH_STACK.md`에서 정의한다.

별도의 API microservice를 필요성이 검증되기 전에 만들지 않는다.

---

## 81. Initial MVP API Scope

초기 API는 다음 capability에 집중한다.

```

Authentication Context

Workspace

Project

Conversation

Message / Agent Request

Memory

Task

Approval

```

실제 첫 Tool이 구현되면 관련 Tool Execution visibility를 추가한다.

처음부터 미래 platform 전체의 endpoint를 만들지 않는다.

---

## 82. Deferred API Capabilities

다음 기능은 초기 MVP의 필수 범위가 아니다.

```

public developer API

API key management

third-party OAuth applications

Pack marketplace API

organization administration API

complex webhook platform

GraphQL federation

microservice gateway

multi-region API routing

```

실제 product demand가 검증된 후 추가한다.

---

## 83. Architectural Invariants

API architecture가 발전하더라도 다음 원칙은 유지한다.

1. API contracts express domain meaning rather than raw database structure.

2. Authentication and authorization are separate concerns.

3. Workspace authorization occurs before resource access.

4. External input is runtime validated.

5. TypeScript compile-time types do not replace runtime validation.

6. Important state changes are explicit.

7. Agent and Tool authority cannot be bypassed through alternate endpoints.

8. Approval applies to the exact Action the user reviewed.

9. Important state-changing operations consider idempotency.

10. API handlers remain thinner than domain services.

11. Provider-specific API details stay behind adapters.

12. Secrets are never returned as normal domain data.

13. Internal modules do not require network APIs without a real reason.

14. Asynchronous Task state is distinct from connection or streaming state.

15. Public API complexity is deferred until an external API is actually required.

---

## 84. Related Documents

이 문서는 다음 architecture 문서와 함께 사용한다.

- `SYSTEM_OVERVIEW.md`

- `ODYS_CORE.md`

- `DATA_MODEL.md`

- `MEMORY_ARCHITECTURE.md`

- `AGENT_ARCHITECTURE.md`

- `TOOL_ARCHITECTURE.md`

- `MODEL_STRATEGY.md`

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

## 85. API Development Rule

새로운 API endpoint 또는 contract를 추가하기 전에 다음 질문을 확인한다.

1. 어떤 실제 user 또는 system use case가 필요한가?

2. 이 operation의 domain meaning은 무엇인가?

3. 어느 Workspace 또는 Project scope에 속하는가?

4. 누가 이 operation을 실행할 수 있는가?

5. runtime input validation이 존재하는가?

6. client가 수정하면 안 되는 field를 노출하고 있지 않은가?

7. state-changing operation인가?

8. Approval 또는 Tool Runtime을 우회하고 있지는 않은가?

9. retry 시 duplicate Action이 발생할 수 있는가?

10. API response에 민감한 정보가 포함되지 않는가?

11. database implementation detail이 API contract로 새고 있지는 않은가?

12. synchronous와 asynchronous semantics가 명확한가?

13. error를 consumer가 안정적으로 처리할 수 있는가?

14. 이 endpoint를 자동 테스트할 수 있는가?

15. 새로운 network boundary가 실제로 필요한가?

> ODYS APIs should expose domain capabilities, enforce ownership, preserve execution safety, and hide replaceable implementation details.
