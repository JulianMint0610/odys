# PACK_[STANDARD.md](http://STANDARD.md)

## 1. Purpose

이 문서는 ODYS에서 사용하는 모든 Pack의 공통 구조, 책임, 확장 규칙, 의존성 원칙을 정의한다.

Pack은 특정 사용자 집단이나 업무 영역에 필요한 전문 기능을 ODYS Core 위에 추가하는 확장 단위다.

ODYS Core는 범용 실행 환경을 제공하고, Pack은 특정 Domain에 필요한 Agent, Workflow, Tool, Policy, Memory Schema 등을 제공한다.

개념적으로 ODYS는 다음과 같이 구성된다.

ODYS

├── Core

└── Packs

    ├── Engineering Pack

    ├── Research Pack

    ├── Business Pack

    └── ...

초기 ODYS에서는 사용자가 직접 첫 번째 고객으로 시스템을 사용하고 검증하기 위해 Engineering Pack을 첫 번째 Pack으로 개발한다.

---

## 2. Core Principle

Pack Architecture의 가장 중요한 원칙은 다음과 같다.

> Core는 Pack을 알지 않아도 동작할 수 있어야 하며, Pack은 Core가 제공하는 공개 Interface를 통해서만 시스템 기능을 사용해야 한다.

의존성 방향은 다음과 같다.

Pack → Core

반대 방향의 직접 의존은 허용하지 않는다.

즉, Core 내부에 다음과 같은 코드가 존재해서는 안 된다.

- Study Agent 전용 처리

- Conference Agent 전용 처리

- Career Agent 전용 처리

- Coding Agent 전용 처리

- Engineering 분야 전용 Business Logic

이러한 기능은 모두 Pack 영역에 존재해야 한다.

---

## 3. Definition

Pack은 하나의 Domain 또는 사용 목적에 특화된 ODYS 확장 모듈이다.

Pack은 필요에 따라 다음 요소를 포함할 수 있다.

- Agent

- Workflow

- Tool

- Domain Schema

- Domain Memory

- Prompt

- Policy

- Integration

- Configuration

- Evaluation

- UI Extension

모든 Pack이 위 구성 요소를 전부 가져야 하는 것은 아니다.

필요한 기능만 선택적으로 구성할 수 있다.

---

## 4. Core vs Pack

ODYS Core는 Domain과 관계없이 모든 사용자에게 필요한 범용 기능을 담당한다.

대표적인 Core 기능은 다음과 같다.

- Identity

- User Context

- Goal

- Task

- Planning

- Agent Runtime

- Tool Runtime

- Memory Runtime

- Model Routing

- Permission

- Approval

- Scheduling

- Notification

- Audit

- Observability

- Security

- Pack Registry

반대로 Pack은 특정 Domain에서 필요한 전문성을 담당한다.

예를 들어 Engineering Pack은 다음과 같은 기능을 제공할 수 있다.

- 전공 학습

- 학회 탐색

- 연구 기회 추적

- 취업 및 인턴 탐색

- 개발 프로젝트 지원

- Embedded 개발 지원

Core는 이러한 Domain Logic을 직접 구현하지 않는다.

---

## 5. Pack Structure

Pack은 논리적으로 다음 구조를 가진다.

Pack

├── Manifest

├── Agents

├── Workflows

├── Tools

├── Schemas

├── Policies

├── Prompts

├── Evaluations

└── Tests

초기 구현에서는 모든 요소를 물리적으로 분리하지 않을 수 있다.

그러나 논리적인 책임 경계는 유지해야 한다.

---

## 6. Manifest

모든 Pack은 Pack 자체를 설명하는 Manifest를 가져야 한다.

Manifest에는 최소한 다음 정보가 포함되어야 한다.

- Pack ID

- Pack Name

- Version

- Description

- Core Compatibility

- Capabilities

- Registered Agents

- Registered Tools

- Required Permissions

- Optional Dependencies

- Configuration Schema

위 항목은 Pack Manifest의 전체 목표 contract를 정의한다.

IMPLEMENTATION-003에서 도입된 초기 Core Pack public contract는 Pack identity를 위한 `Pack ID`, `Pack Name`, `Version`, `Description`만 먼저 구현한다.

나머지 Manifest 항목은 전체 Pack 표준의 목표 contract이며, 실제 Pack capability와 runtime이 구현되는 단계에서 점진적으로 추가한다.

예를 들어 Engineering Pack의 개념적 식별자는 다음과 같이 정의할 수 있다.

- Pack ID: `engineering`

- Pack Name: `Engineering Pack`

구체적인 TypeScript Interface는 구현 단계에서 정의한다.

---

## 7. Agent Registration

Pack은 하나 이상의 Agent를 Core Agent Runtime에 등록할 수 있다.

각 Agent는 최소한 다음 항목을 정의해야 한다.

- Agent ID

- Name

- Purpose

- Responsibility

- Supported Tasks

- Required Capabilities

- Allowed Tools

- Memory Scope

- Input Contract

- Output Contract

- Autonomy Policy

- Failure Behavior

Agent는 자신의 Runtime을 직접 구현하지 않는다.

실제 실행은 ODYS Core의 Agent Runtime이 담당한다.

---

## 8. Workflow

Pack은 반복 가능한 Domain 업무를 Workflow로 정의할 수 있다.

예를 들어 Engineering Pack에서는 다음 Workflow를 정의할 수 있다.

- 학습 계획 생성

- 시험 대비 계획 생성

- 학회 탐색

- CFP 추적

- 취업 기회 탐색

- 프로젝트 개발 지원

Workflow는 여러 Agent와 Tool을 조합할 수 있다.

그러나 Workflow의 실행 상태와 Task Lifecycle은 Core가 관리한다.

---

## 9. Tool Usage

Pack은 Domain-specific Tool을 추가할 수 있다.

그러나 모든 Tool 실행은 반드시 Core Tool Runtime을 통과해야 한다.

기본 실행 흐름은 다음과 같다.

Agent

→ Tool Request

→ Input Validation

→ Permission Check

→ Policy Check

→ Approval Check

→ Tool Execution

→ Output Validation

→ Audit Log

Pack이 Tool Runtime을 우회하여 직접 외부 Side Effect를 발생시키는 것은 허용하지 않는다.

---

## 10. Memory

Pack은 Domain에 필요한 Memory Schema를 정의할 수 있다.

예를 들어 Engineering Pack은 다음과 같은 Namespace를 사용할 수 있다.

- `engineering.study`

- `engineering.conference`

- `engineering.career`

- `engineering.coding`

Pack은 어떤 정보가 해당 Domain에서 의미 있는지를 정의한다.

그러나 다음 기능은 Core Memory Architecture가 담당한다.

- 저장

- 검색

- 삭제

- Lifecycle

- Permission

- Privacy

- Audit

Pack이 별도의 독립 Memory System을 만드는 것은 허용하지 않는다.

---

## 11. Routing

모든 사용자 요청의 최상위 Routing 권한은 Core에 있다.

Pack 또는 Agent가 전체 ODYS 요청을 직접 가로채서는 안 된다.

예를 들어 다음 요청이 들어온다고 가정한다.

> 이번 학기 회로이론2 공부 계획을 만들어줘.

실행 흐름은 다음과 같다.

User Request

→ Core

→ Intent Resolution

→ Capability Resolution

→ Engineering Pack

→ Study Agent

→ Result

Pack은 자신이 제공하는 Capability를 Core에 알리고, Core가 적절한 Agent를 선택할 수 있도록 한다.

---

## 12. Cross-Pack Collaboration

하나의 Goal 또는 Task에 여러 Pack이 참여할 수 있다.

예를 들어 사용자가 AI Conference에 참가하기 위한 프로젝트를 만들고 이를 취업 Portfolio로 연결하려 한다면 다음과 같은 흐름이 가능하다.

Conference Capability

→ Coding Capability

→ Career Capability

향후 이 Capability들이 서로 다른 Pack에 존재하더라도 직접적인 내부 구현 의존은 피해야 한다.

권장 구조:

Pack A

→ Core Orchestrator

→ Pack B

비권장 구조:

Pack A

→ Pack B Internal Implementation

Pack 간 협업은 가능한 한 Capability와 Core Orchestration을 통해 수행한다.

---

## 13. Dependency Rules

허용되는 의존성은 다음과 같다.

- Pack → Core Public Interface

- Pack → Shared Domain-independent Package

- Pack → 명시적으로 정의된 Capability Contract

- Core Pack Runtime → Pack Interface

금지되는 의존성은 다음과 같다.

- Core → 특정 Pack Internal Logic

- Core → 특정 Agent 구현

- Pack → Core Internal Implementation 수정

- Pack → Permission System 우회

- Pack → Tool Runtime 우회

- Pack → Audit System 우회

- Pack 간 Circular Dependency

- Pack별 독립 Core Runtime 생성

---

## 14. Isolation

하나의 Pack에서 발생한 오류가 전체 ODYS 장애로 확산되지 않도록 설계한다.

Pack 장애는 다음 데이터를 손상해서는 안 된다.

- Core State

- Global Memory

- 다른 Pack State

- Permission

- Credential

- Audit Log

Pack 오류는 가능한 한 구조화된 Error 형태로 Core에 반환한다.

Core는 상황에 따라 다음 행동을 결정한다.

- Retry

- Fallback

- Abort

- User Notification

- Alternative Agent Routing

---

## 15. Permission

Pack은 필요한 Permission을 명시적으로 선언해야 한다.

예:

- Web Access

- File Access

- Calendar Access

- Email Access

- GitHub Access

- Code Execution

- External API Access

- Notification

- Write Operation

Pack 설치 또는 활성화 자체가 Permission을 부여하지 않는다.

실제 권한은 다음에 의해 결정된다.

- User Policy

- Core Security Policy

- Progressive Autonomy Level

- Runtime Approval

---

## 16. Progressive Autonomy

모든 Pack과 Agent는 ODYS의 Progressive Autonomy 정책을 따른다.

### Level 0 — Observe

정보를 읽고 관찰한다.

### Level 1 — Suggest

사용자에게 행동을 제안한다.

### Level 2 — Prepare

실행 가능한 결과물을 준비하지만 실제 행동은 수행하지 않는다.

### Level 3 — Ask then Execute

사용자 승인을 받은 뒤 행동한다.

### Level 4 — Execute within Policy

사전에 승인된 Policy 범위 안에서 자동 실행한다.

### Level 5 — Monitor and Act within Policy

조건을 지속적으로 확인하고 허용된 범위 안에서 자동으로 대응한다.

Pack과 Agent는 자신의 Autonomy Level을 임의로 높일 수 없다.

최종 권한은 항상 사용자와 Core Policy에 있다.

---

## 17. Model Independence

Pack은 특정 AI Model Provider에 불필요하게 종속되어서는 안 된다.

Agent는 가능한 한 필요한 Model Capability를 선언해야 한다.

예:

- reasoning

- coding

- vision

- long-context

- structured-output

- low-latency

실제 Model과 Provider 선택은 Core Model Router가 담당한다.

Pack 내부에서 특정 Model을 직접 지정하는 것은 기술적으로 반드시 필요한 경우에만 허용한다.

---

## 18. Versioning

모든 Pack은 독립적인 Version을 가져야 한다.

Pack Version 변경 대상은 다음과 같다.

- Agent

- Workflow

- Tool

- Schema

- Prompt

- Policy

- Configuration

Persisted Data의 구조를 변경하는 Breaking Change에는 Migration Strategy가 필요하다.

Pack은 자신이 지원하는 Core Version Range를 명시해야 한다.

---

## 19. Testing

모든 Pack은 Core와 독립적으로 검증 가능한 테스트 구조를 가져야 한다.

최소 테스트 범위는 다음과 같다.

- Manifest Validation

- Agent Registration

- Routing

- Workflow

- Tool Integration

- Permission

- Memory

- Policy

- Failure Handling

- Core Compatibility

LLM 기반 Agent의 품질은 일반 Unit Test만으로 충분하지 않을 수 있다.

필요한 경우 Evaluation Dataset과 Scenario Test를 함께 사용한다.

---

## 20. Initial Engineering Pack

ODYS의 첫 번째 Pack은 Engineering Pack이다.

초기 Engineering Pack에는 다음 Agent를 포함한다.

1. Study Agent

2. Conference Agent

3. Career Agent

4. Coding Agent

이 Agent들은 ODYS Core 구성 요소가 아니다.

Engineering Pack이 제공하는 최초의 Domain Agent다.

Engineering Pack은 사용자에게 실질적인 가치를 제공하는 동시에 Pack Architecture를 실제 사용 환경에서 검증하는 역할을 한다.

---

## 21. Anti-Patterns

다음 설계는 허용하지 않는다.

### Core Pollution

특정 Pack에서 필요하다는 이유만으로 Domain Logic을 Core에 추가하는 것.

### Pack Forking

특정 Pack을 위해 Core를 복제하고 수정하는 것.

### Hidden Execution

Core Tool Runtime을 거치지 않고 외부 행동을 수행하는 것.

### Hidden Memory

Core가 관리하지 않는 독립 Memory System을 만드는 것.

### Provider Lock-in

기술적 이유 없이 특정 AI Provider에 Pack 전체를 종속시키는 것.

### Permission Bypass

Pack 설치를 무제한 실행 권한으로 간주하는 것.

### Agent Monolith

하나의 Agent가 Domain 전체 기능을 무제한으로 담당하는 것.

### Pack Coupling

Pack끼리 서로의 Internal Implementation을 직접 참조하는 것.

### Premature Core Generalization

하나의 Pack에서만 필요한 기능을 미리 범용 Core 기능으로 만드는 것.

---

## 22. Core Promotion Rule

여러 Pack을 실제로 개발하면서 동일한 Capability가 반복될 수 있다.

이 경우 해당 Capability를 Core로 승격할 수 있다.

그러나 범용성을 미리 예상해서 Core 기능을 확장하지 않는다.

원칙은 다음과 같다.

> 범용성은 예상해서 만드는 것이 아니라 실제 반복되는 사용 사례에서 발견한다.

동일한 기능이 여러 Pack에서 독립적으로 반복되고 Domain에 종속되지 않는다는 충분한 근거가 생겼을 때 Core 승격을 검토한다.

---

## 23. Final Principle

ODYS Core는 범용 실행 능력을 제공한다.

Pack은 Domain 전문성을 제공한다.

Agent는 Pack의 전문성을 실제 Task 수행으로 연결한다.

그리고 최종 권한은 사용자에게 있다.

> Core provides capability.

> Pack provides specialization.

> Agent performs domain work.

> User retains authority.
