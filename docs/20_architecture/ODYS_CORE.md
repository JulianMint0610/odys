# ODYS Core

## 1. Purpose

ODYS Core는 모든 Application과 Pack이 공통으로 사용하는 범용 AI operating layer다.

Core의 목적은 특정 분야의 문제를 직접 해결하는 것이 아니라 ODYS 전체에서 공통으로 필요한 실행 기반과 안전한 확장 지점을 제공하는 것이다.

Core의 주요 capability는 다음과 같다.

- Identity

- Workspace and Project Context

- Context Assembly

- Memory

- Agent Runtime

- Tool Runtime

- Model Abstraction

- Task Orchestration

- Policy

- Permission

- Approval

- Audit

- Shared Contracts

Engineering, Research, Career, Business와 같은 domain capability는 Core 자체가 아니라 Core 위에서 동작하는 Pack으로 구현한다.

---

## 2. Core Principle

ODYS Core의 가장 중요한 설계 원칙은 다음과 같다.

> Core stays general. Packs become specialized.

Core에는 특정 domain 또는 특정 사용자에게만 필요한 규칙을 넣지 않는다.

다음은 Core에 속하는 대표적인 capability다.

```

memory retrieval

context construction

Agent execution

Tool registration

Tool execution

permission evaluation

approval management

model abstraction

task state management

audit

```

반면 다음과 같은 규칙은 Core에 속하지 않는다.

```

IEEE 학회를 우선 추천한다.

특정 전공 시험은 2주 전부터 복습한다.

특정 산업의 채용 공고에서 특정 keyword를 우선한다.

특정 학교의 curriculum을 분석한다.

특정 채용 사이트의 HTML 구조를 parsing한다.

```

이러한 domain-specific behavior는 Pack, Agent 또는 Tool implementation에 위치한다.

---

## 3. Core Responsibilities

ODYS Core는 다음 책임을 가진다.

### Identity

현재 요청의 사용자 identity를 표현한다.

### Workspace and Project

현재 요청이 어떤 logical context 안에서 수행되는지 표현한다.

### Context

Agent execution에 필요한 정보를 수집하고 구성한다.

### Memory

장기적으로 유지할 가치가 있는 정보를 저장하고 검색할 수 있는 contract를 제공한다.

### Agent Runtime

Agent lifecycle과 execution flow를 관리한다.

### Tool Runtime

Agent가 사용할 수 있는 Tool을 등록하고 안전하게 실행한다.

### Model

특정 provider에 종속되지 않는 model access layer를 제공한다.

### Task

장기 또는 복합 작업의 상태를 관리한다.

### Policy

어떤 행동이 허용되는지를 판단한다.

### Permission

어떤 resource 및 capability에 접근 가능한지를 표현한다.

### Approval

사용자의 명시적인 승인이 필요한 Action을 관리한다.

### Audit

중요한 시스템 행동을 추적 가능하게 기록한다.

---

## 4. Conceptual Core Modules

초기 ODYS Core는 개념적으로 다음 module로 구성한다.

```

ODYS Core

├── identity

├── workspace

├── project

├── context

├── memory

├── agent

├── tool

├── model

├── task

├── policy

├── permission

├── approval

├── audit

└── shared

```

실제 TypeScript directory 구조는 구현 과정에서 조정할 수 있다.

중요한 것은 directory 이름 자체가 아니라 각 module의 responsibility와 dependency boundary다.

---

## 5. Identity Module

Identity module은 현재 작업의 주체를 표현한다.

주요 개념은 다음과 같다.

- User

- Session

- Authentication Identity

Core는 특정 authentication provider에 직접 종속되지 않는 것을 목표로 한다.

개념적인 구조는 다음과 같다.

```

ODYS Core

└── User Identity Contract

External Implementation

└── Supabase Auth Adapter

```

Supabase Auth를 사용하더라도 Core 전체가 Supabase-specific user object에 의존하는 구조는 피한다.

---

## 6. Workspace Module

Workspace는 ODYS resource와 context를 묶는 상위 logical boundary다.

한 사용자는 하나 이상의 Workspace를 가질 수 있다.

예:

```

Personal

University

ODYS Project

Work

```

Workspace는 다음 resource의 scope가 될 수 있다.

- projects

- conversations

- memories

- tasks

- Agent activities

- integrations

- Tool permissions

향후 collaboration 기능이 추가되는 경우 Workspace는 authorization boundary 역할도 할 수 있다.

---

## 7. Project Module

Project는 장기적인 목표나 활동의 보다 구체적인 context boundary다.

예:

```

ODYS Development

Embedded Systems Project

Job Search

Semester Study

Research Project

```

Project에는 다음 resource가 연결될 수 있다.

- goals

- tasks

- documents

- conversations

- memories

- Agent executions

- Tool activity

모든 요청에 Project가 필수인 것은 아니다.

그러나 장기적인 work continuity가 필요한 작업에서는 중요한 scope로 사용한다.

---

## 8. Context Module

Context module은 현재 Agent execution에 필요한 정보를 구성한다.

가능한 모든 정보를 모델에 전달하는 것은 올바른 Context management가 아니다.

Context Builder는 현재 작업과 관련된 정보를 선택하고 우선순위를 정해야 한다.

가능한 Context source는 다음과 같다.

```

Current Request

Current Conversation

User

Workspace

Project

Goals

Tasks

Memory

Knowledge

Documents

Previous Tool Results

Pack Configuration

System Policy

```

Context pipeline의 개념적인 형태는 다음과 같다.

```

Context Sources

      │

      ▼

Candidate Collection

      │

      ▼

Filtering

      │

      ▼

Ranking

      │

      ▼

Budgeting

      │

      ▼

Execution Context

      │

      ▼

Agent Runtime

```

Context Builder는 model context window, latency 및 cost를 함께 고려해야 한다.

---

## 9. Execution Context

Core 내부에서는 Context를 가능한 한 명시적으로 구조화한다.

개념적으로 다음 정보를 포함할 수 있다.

```

Execution Context

├── user

├── workspace

├── project

├── request

├── conversation

├── relevant memories

├── relevant knowledge

├── task

├── Agent

└── policy

```

Core 내부의 structured context와 실제 Model Provider에 전달하는 message format은 동일할 필요가 없다.

Provider adapter가 structured context를 각 provider에 적합한 request 형태로 변환할 수 있다.

---

## 10. Memory Module

Memory module은 session-independent information persistence와 retrieval을 담당한다.

Core는 Memory의 domain contract와 lifecycle을 정의한다.

주요 개념은 다음과 같다.

```

Memory

Memory Candidate

Memory Type

Memory Repository

Memory Search

Memory Policy

Memory Metadata

```

실제 persistence, embedding 또는 vector search 구현은 교체 가능한 외부 구현으로 취급한다.

Core의 business rule 전체가 특정 vector database나 embedding provider에 직접 결합되지 않도록 한다.

---

## 11. Memory Categories

ODYS는 개념적으로 다음 Memory category를 사용할 수 있다.

### Working Memory

현재 Task 또는 execution을 위해 일시적으로 유지되는 정보.

### Semantic Memory

사실, 사용자 선호, 개념 또는 상대적으로 안정적인 지식.

### Episodic Memory

과거 사건, 작업 또는 경험.

### Procedural Memory

반복 가능한 workflow, 방법 또는 수행 절차.

Memory의 실제 data model, lifecycle 및 retrieval 전략은 `MEMORY_ARCHITECTURE.md`에서 정의한다.

---

## 12. Agent Runtime

Agent Runtime은 Agent의 실행 lifecycle을 관리한다.

Agent definition은 최소한 다음 정보를 가질 수 있다.

```

id

name

responsibility

allowed Tools

model strategy

execution policy

```

Agent Runtime은 domain-specific 전문지식 자체를 가지고 있지 않는다.

Runtime의 책임은 서로 다른 Agent를 동일한 실행 모델 위에서 일관되고 안전하게 실행하는 것이다.

---

## 13. Agent Execution Lifecycle

대표적인 Agent lifecycle은 다음과 같다.

```

1. Resolve Agent

       │

       ▼

2. Build Context

       │

       ▼

3. Resolve Model Strategy

       │

       ▼

4. Invoke Model

       │

       ▼

5. Handle Tool Request

       │

       ▼

6. Evaluate Policy and Permission

       │

       ▼

7. Request Approval if Required

       │

       ▼

8. Execute Tool

       │

       ▼

9. Return Tool Result to Agent

       │

       ▼

10. Produce Final Result

       │

       ▼

11. Process Memory Candidates

       │

       ▼

12. Record Audit Events

```

모든 Agent execution이 모든 단계를 필요로 하는 것은 아니다.

---

## 14. Agent Definition and Agent Runtime

Agent definition과 Agent Runtime은 분리한다.

예:

```

Conference Agent

= 무엇을 해야 하는가

Agent Runtime

= Agent를 어떤 절차와 안전장치 아래 실행하는가

```

Conference Agent는 Engineering Pack의 일부다.

Agent Runtime은 ODYS Core에 속한다.

이 분리를 통해 서로 다른 domain Agent가 동일한 execution infrastructure를 공유할 수 있다.

---

## 15. Tool Runtime

Tool Runtime은 Tool registration, discovery 및 execution을 담당한다.

개념적인 Tool contract는 다음 정보를 가질 수 있다.

```

Tool

├── id

├── name

├── description

├── input schema

├── output schema

├── required permissions

├── risk level

└── execute capability

```

실제 TypeScript interface의 세부 형태는 구현 단계에서 정의한다.

Architecture 단계에서는 책임과 contract boundary를 우선한다.

---

## 16. Tool Execution Lifecycle

Tool execution은 다음 흐름을 기본으로 한다.

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

Approval Evaluation

      │

      ▼

Execution

      │

      ▼

Output Validation

      │

      ▼

Audit

      │

      ▼

Tool Result

```

Agent가 임의의 provider SDK 또는 외부 API를 직접 호출하기보다 Tool Runtime을 통해 실제 capability에 접근하게 하는 것을 기본 방향으로 한다.

---

## 17. Model Module

Model module은 AI provider abstraction을 제공한다.

Core는 개념적으로 다음 contract를 제공할 수 있다.

```

Model Client

Model Request

Model Response

Model Capability

Model Router

Model Policy

Model Usage

```

Agent domain logic은 특정 provider SDK에 가능한 한 직접 의존하지 않는다.

---

## 18. Model Independence

다음과 같은 구조는 피한다.

```

Conference Agent

└── directly depends on one Model Provider SDK

```

대신 다음과 같은 dependency를 지향한다.

```

Conference Agent

      │

      ▼

Agent Runtime

      │

      ▼

Model Abstraction

      │

      ▼

Model Router

      │

      ▼

Provider Adapter

```

이를 통해 Model Provider를 교체하더라도 Agent domain logic 변경을 최소화한다.

---

## 19. Model Routing

Model Router는 작업 성격에 따라 적절한 model을 선택할 수 있다.

고려 가능한 기준은 다음과 같다.

- capability

- reasoning quality

- tool support

- latency

- context window

- cost

- reliability

- availability

- privacy requirements

- task risk

초기 버전에서는 복잡한 dynamic routing을 구현하지 않아도 된다.

먼저 provider-independent contract를 안정적으로 구축하고 실제 필요가 확인되면 routing policy를 확장한다.

---

## 20. Task Module

Task는 지속적으로 추적할 수 있는 작업 단위다.

Task와 단일 model request는 구분한다.

예:

```

User Goal

   │

   ▼

Task

├── Agent Execution

├── Tool Execution

├── Approval Wait

└── Follow-up Execution

```

Task는 최소한 다음 상태를 가질 수 있다.

```

pending

running

waiting_for_approval

completed

failed

cancelled

```

향후 실제 요구에 따라 다음 상태를 추가할 수 있다.

```

scheduled

paused

waiting_for_external_event

```

초기부터 불필요하게 복잡한 workflow state machine을 만들지 않는다.

---

## 21. Policy Module

Policy는 시스템이 특정 행동을 수행해도 되는지를 판단하는 규칙 계층이다.

예:

```

Can this Agent use this Tool?

Can this Tool modify external state?

Does this Action require user approval?

Can this Agent access this Workspace resource?

Is this Action allowed at the current autonomy level?

```

중요한 policy를 prompt instruction만으로 구현하지 않는다.

Core에서 deterministic하게 검증할 수 있는 rule은 코드 수준에서 enforce한다.

---

## 22. Permission Model

Permission은 capability와 resource 접근 권한을 표현한다.

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

tasks.read

tasks.write

```

Agent와 Tool에는 필요한 최소 permission만 제공한다.

**Least Privilege** 원칙을 따른다.

---

## 23. Approval Module

Approval module은 사용자의 명시적인 승인이 필요한 Action을 관리한다.

Approval은 다음 상태를 가질 수 있다.

```

not_required

pending

approved

rejected

expired

cancelled

```

대표적인 흐름은 다음과 같다.

```

Agent

  │

  ▼

Prepare Action

  │

  ▼

Approval Request

  │

  ├── Reject ─────────► Stop

  │

  ▼

Approve

  │

  ▼

Tool Execution

```

**Action preparation과 Action execution을 분리하는 것**을 중요한 원칙으로 한다.

---

## 24. Progressive Autonomy

ODYS의 autonomy는 단순한 ON/OFF 설정이 아니다.

개념적으로 다음 단계로 표현한다.

```

Level 0 — Observe

Level 1 — Suggest

Level 2 — Prepare

Level 3 — Ask then Execute

Level 4 — Execute within Policy

Level 5 — Monitor and Act within Policy

```

초기 제품은 낮은 autonomy level을 기본값으로 한다.

실제 사용을 통해 시스템 동작이 충분히 검증되고 사용자가 원하는 경우에만 더 높은 수준의 autonomy를 허용한다.

---

## 25. Autonomy and Risk

Autonomy level만으로 Action 허용 여부를 판단하지 않는다.

Action 자체의 risk도 함께 고려해야 한다.

예:

```

Web search

→ low risk

Read calendar

→ low to moderate risk

Create calendar event

→ external state change

Send email

→ external communication

Delete file

→ destructive potential

Production deployment

→ high-impact action

```

위험도가 높을수록 더 강한 permission, validation 및 approval이 필요하다.

---

## 26. Audit Module

중요한 시스템 행동은 추적 가능해야 한다.

Audit event는 다음 정보를 포함할 수 있다.

```

actor

workspace

project

Agent

Action

Tool

timestamp

status

approval

metadata

```

Audit system은 최소한 다음 질문에 답할 수 있어야 한다.

- 누가 요청했는가?

- 어떤 Agent가 처리했는가?

- 어떤 Tool을 사용했는가?

- 어떤 permission이 적용되었는가?

- 사용자의 승인이 있었는가?

- 실제로 어떤 결과가 발생했는가?

Audit는 일반 debugging log와 동일하지 않다.

---

## 27. Observability

Audit와 별도로 시스템 운영을 위한 observability가 필요하다.

관찰 대상의 예는 다음과 같다.

- request latency

- model latency

- Tool latency

- error rate

- retry count

- model usage

- token usage

- Agent execution duration

- failed Tool calls

- approval wait time

초기에는 복잡한 observability platform을 도입하지 않는다.

Structured logging과 실제 운영에 필요한 핵심 metric부터 구축한다.

---

## 28. Error Model

Core는 가능한 한 일관된 error contract를 사용한다.

대표적인 error category 후보는 다음과 같다.

```

ValidationError

AuthenticationError

AuthorizationError

PermissionDeniedError

ApprovalRequiredError

PolicyViolationError

ToolExecutionError

ModelExecutionError

ExternalServiceError

PersistenceError

```

Provider-specific raw error를 Application에 그대로 노출하지 않는 것을 원칙으로 한다.

외부 구현의 error는 가능한 경우 Core에서 이해할 수 있는 error category로 변환한다.

---

## 29. Shared Contracts

Core module 간 communication은 명시적인 contract를 사용한다.

개념적으로 Agent Runtime은 다음과 같은 capability에 의존할 수 있다.

```

Agent Runtime

├── Context Provider

├── Model Client

├── Tool Registry

├── Policy Evaluator

├── Approval Service

└── Audit Writer

```

가능한 한 concrete implementation보다 contract에 의존한다.

이를 통해 다음 요소를 비교적 독립적으로 교체할 수 있다.

```

Supabase

→ another persistence implementation

Model Provider A

→ Model Provider B

Local Tool

→ Remote Tool

Single-process execution

→ independent service

```

---

## 30. Core and External Implementations

Core는 중요한 contract를 정의한다.

예:

```

Core

├── Memory Repository Contract

├── Model Client Contract

├── Audit Writer Contract

├── Tool Contract

└── Notification Contract

```

실제 provider와 platform implementation은 해당 contract를 구현한다.

예:

```

External Implementations

├── Supabase Memory Repository

├── Model Provider Adapter

├── PostgreSQL Audit Writer

├── Calendar Tool

└── Notification Adapter

```

의존성의 핵심 원칙은 다음과 같다.

> Replaceable external implementations should depend on Core contracts, not define Core domain behavior.

---

## 31. Core and Packs

Pack은 Core capability를 사용한다.

```

Engineering Pack

├── Study Agent

├── Conference Agent

├── Career Agent

└── Coding Agent

          │

          ▼

      ODYS Core

```

Pack은 Core가 제공하는 다음 extension point를 사용할 수 있다.

- Agent registration

- Tool registration

- workflow definition

- policy configuration

- domain Memory metadata

- knowledge source configuration

현재 코드로 구현된 Pack extension point는 Pack identity public contract와 명시적 Pack Registry다. Agent, Tool, workflow, policy, Memory 및 knowledge source 관련 extension point는 계획된 아키텍처이며 아직 runtime으로 구현되지 않았다.

Pack이 새로운 domain 기능을 추가할 때 Core 내부 구현을 직접 수정하는 것을 기본 방식으로 삼지 않는다.

---

## 32. Core Extension Points

새로운 capability가 들어올 때 Core를 직접 수정하지 않고 확장할 수 있는 경계를 제공한다.

주요 extension point 후보는 다음과 같다.

```

Agent

Tool

Model Provider

Memory Repository

Knowledge Source

Policy

Pack

Integration

Notification Channel

```

다만 미래 가능성만을 이유로 모든 부분을 처음부터 generic abstraction으로 만들지는 않는다.

실제 두 번째 또는 세 번째 implementation이 필요해질 때 abstraction을 강화하는 것을 선호한다.

---

## 33. Initial Core Package Boundary

실제 Core 구현은 `packages/core/`에 위치한다. 현재 구현 범위는 Pack identity public contract와 Pack Registry이며, 아래 구조는 후속 capability를 위한 개념적 방향이다.

예상 구조는 다음과 같다.

```

packages/

└── core/

    ├── src/

    │   ├── identity/

    │   ├── workspace/

    │   ├── project/

    │   ├── context/

    │   ├── memory/

    │   ├── agent/

    │   ├── tool/

    │   ├── model/

    │   ├── task/

    │   ├── policy/

    │   ├── permission/

    │   ├── approval/

    │   ├── audit/

    │   └── shared/

    ├── tests/

    ├── package.json

    └── tsconfig.json

```

이 구조는 초기 implementation guide이며 영구적으로 고정된 directory specification은 아니다.

실제 구현을 시작했을 때 더 단순한 구조가 적절하다면 단순하게 시작할 수 있다.

책임 경계가 directory 개수보다 중요하다.

---

## 34. What Does Not Belong in Core

다음과 같은 기능은 기본적으로 Core에 포함하지 않는다.

- 특정 학회 ranking 규칙

- 특정 취업 사이트 scraper

- 특정 학교 curriculum

- 반도체 domain prompt

- 특정 사용자의 개인 일정 규칙

- 특정 Pack 전용 UI

- 특정 산업에만 적용되는 workflow

- provider-specific domain logic

판단 기준은 다음 질문이다.

> 해당 Pack이나 domain이 존재하지 않더라도 대부분의 ODYS 사용자에게 필요한 capability인가?

답이 "아니다"라면 Core가 아닐 가능성이 높다.

---

## 35. Avoiding a God Core

Core가 범용 capability를 담당한다고 해서 모든 코드를 Core에 넣어서는 안 된다.

다음과 같은 징후가 나타나면 Core boundary를 다시 검토한다.

- domain-specific condition이 Core에 계속 추가된다.

- 하나의 module이 거의 모든 module에 의존한다.

- 새로운 Pack을 만들 때마다 Core를 수정해야 한다.

- provider-specific SDK가 Core 여러 영역으로 퍼진다.

- Tool마다 특수한 예외 처리가 Agent Runtime에 계속 추가된다.

Core는 모든 것을 처리하는 거대한 module이 아니라 **공통 execution substrate**여야 한다.

---

## 36. Core Stability

Core의 public contract 변경은 여러 Pack과 Application에 영향을 줄 수 있다.

따라서 다음 contract는 비교적 안정적으로 관리한다.

- Agent contract

- Tool contract

- Memory contract

- Model contract

- Task state model

- Permission model

- Approval model

- Audit event model

중요한 breaking change가 발생하는 경우 관련 architecture 문서와 ADR을 함께 검토한다.

---

## 37. Testing Expectations

Core의 중요한 behavior는 자동 테스트로 보호한다.

특히 다음 영역은 높은 우선순위를 가진다.

- permission enforcement

- policy evaluation

- approval requirements

- Tool input validation

- Tool execution failure handling

- Task state transitions

- Memory contract behavior

- Agent Runtime behavior

- Model Adapter contract

테스트는 implementation detail보다 behavioral contract를 보호하는 것을 우선한다.

---

## 38. Security Expectations

Core는 security를 별도 부가기능으로 취급하지 않는다.

다음 요소를 architecture 단계부터 고려한다.

- least privilege

- input validation

- output validation

- resource authorization

- secret isolation

- user-data isolation

- approval for dangerous Actions

- auditability

- safe failure

- reversible Actions where possible

세부 정책은 `SECURITY_ARCHITECTURE.md`에서 정의한다.

---

## 39. Core Success Criteria

ODYS Core가 성공적으로 설계되었다고 판단하는 기준은 다음과 같다.

1. 새로운 Pack을 만들기 위해 Core를 fork할 필요가 없다.

2. 새로운 Agent를 공통 Runtime에 등록할 수 있다.

3. 새로운 Tool을 공통 contract로 추가할 수 있다.

4. Model Provider를 교체해도 Agent domain logic 변경이 최소화된다.

5. persistence implementation과 Core domain logic이 분리된다.

6. 위험한 Action에 일관된 permission 및 approval policy를 적용할 수 있다.

7. 중요한 실행 흐름을 audit할 수 있다.

8. Core가 특정 domain에 종속되지 않는다.

9. 새로운 Application이 기존 Core capability를 재사용할 수 있다.

10. 실제 필요가 생길 경우 module을 독립 service로 분리할 수 있다.

---

## 40. Related Documents

ODYS Core의 세부 subsystem은 다음 문서에서 정의한다.

- `SYSTEM_OVERVIEW.md`

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

- `../40_decisions/ADR-002-core-vs-pack.md`

- `../40_decisions/ADR-003-modular-monolith.md`

- `../40_decisions/ADR-004-typescript-primary.md`

- `../40_decisions/ADR-005-ai-sdk-model-independence.md`

- `../40_decisions/ADR-006-supabase.md`

- `../40_decisions/ADR-007-progressive-autonomy.md`

---

## 41. Core Development Rule

Core에 새로운 기능을 추가하기 전에 다음 질문을 확인한다.

1. 여러 Pack에서 공통으로 필요한 capability인가?

2. 특정 domain rule이 섞여 있지 않은가?

3. 기존 contract 또는 extension point를 통해 해결할 수 없는가?

4. 새로운 abstraction이 실제로 필요한가?

5. 해당 dependency가 Core의 교체 가능성을 낮추지 않는가?

6. permission과 security boundary는 명확한가?

7. 테스트 가능한 behavior인가?

명확한 이유가 없다면 Core 확장을 서두르지 않는다.

> ODYS Core should remain small enough to understand, general enough to reuse, and strict enough to protect the system.
