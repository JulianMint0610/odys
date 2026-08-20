# PACK_STANDARD

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

IMPLEMENTATION-004는 이 identity contract를 변경하지 않고 Core의 명시적 Pack Registry와 `packs/engineering/`의 첫 실제 Engineering Pack workspace package에 적용한다.

IMPLEMENTATION-006은 Pack contract를 변경하지 않고 Core에 최소 Agent Definition과 Agent Registry foundation을 추가한다.

IMPLEMENTATION-007도 Pack contract를 변경하지 않고 Core에 non-executable 최소 Tool Definition과 Tool Registry foundation을 추가한다.

IMPLEMENTATION-013은 Pack contract를 변경하지 않고 Core Tool Definition에 required Zod 4 input schema를 추가하며, execution-independent Tool input parsing과 ODYS-level validation error foundation을 제공한다.

IMPLEMENTATION-014도 Pack contract를 변경하지 않고 Core Tool Definition에 required Zod 4 output schema를 추가하며, execution-independent Tool output parsing과 ODYS-level validation error foundation을 제공한다. Engineering Pack에 실제 Tool을 추가하거나 Pack lifecycle을 Tool Registry에 연결하지 않으며 Tool Runtime, permission, policy, Approval 또는 execution authority를 구현하지 않는다.

IMPLEMENTATION-015도 Pack contract를 변경하지 않고 Core `ToolDefinition`에 required declarative `requiredPermissions`를 추가하며 canonical identifier validation과 Registry-owned frozen permission-list snapshot을 제공한다. 이 Tool-level declaration은 permission grant/evaluation이 아니며 Pack Manifest의 conceptual `Required Permissions`, Pack-to-Tool lifecycle, Tool Runtime 또는 execution authority를 구현하지 않는다.

IMPLEMENTATION-008은 Pack contract를 변경하지 않고 Core에 runtime request validation, registered-Agent resolution, provider-neutral executor dispatch 및 opaque result return만 제공하는 첫 Common Agent Runtime foundation을 추가한다.

나머지 Manifest 항목, `Registered Agents`, `Registered Tools`, Pack Manifest의 `Required Permissions`, Pack-to-Agent 및 Pack-to-Tool registration semantics는 전체 Pack 표준의 목표 contract이며, 실제 Pack capability와 runtime이 구현되는 단계에서 점진적으로 추가한다. `ToolDefinition.requiredPermissions`와 Pack Manifest의 future `Required Permissions`는 서로 다른 contract다.

예를 들어 Engineering Pack의 개념적 식별자는 다음과 같이 정의할 수 있다.

- Pack ID: `engineering`

- Pack Name: `Engineering Pack`

현재 TypeScript contract는 `@odys/core`의 `PackManifest`와 `PackDefinition`으로 공개되며, Engineering Pack은 이 package의 public entry point만 사용한다.

현재 `definePack()`은 네 필드 manifest contract(`id`, `name`, `version`, optional `description`)를 검증하지만 ownership을 이전하지 않는다. 유효한 caller-owned `PackDefinition`과 nested manifest를 그대로 반환하며 둘을 clone하거나 freeze하지 않는다.

성공한 `PackRegistry.register()`는 validation과 duplicate detection을 마친 뒤 현재 네 필드만 명시적으로 복사한 새 manifest snapshot과 이를 포함하는 새 `PackDefinition` snapshot을 해당 Registry entry의 canonical state로 소유한다. Registry는 새 manifest와 outer Pack을 각각 freeze하며 caller의 Pack과 manifest를 freeze하거나 변경하지 않는다. 이는 현재 scalar-only manifest contract에 필요한 명시적 nested freeze이며 미래의 임의 구조에 대한 generic deep-freeze 보장은 아니다.

`get()`은 entry의 동일한 canonical Pack snapshot을 반복해서 반환한다. `list()`는 호출마다 새 frozen array를 반환하되 각 element에는 `get()`과 동일한 canonical Pack snapshot reference를 담고 insertion order를 보존한다. Registry instance마다 같은 caller Pack에서도 서로 다른 outer Pack과 manifest snapshot을 소유하므로 이후 caller mutation은 Registry-visible state를 변경할 수 없다.

현재 Pack registration은 Pack을 activate하지 않고 Agent, Tool 또는 Model을 등록하지 않으며 Permission을 부여하거나 execution authority를 만들지 않는다. Pack lifecycle/composition과 확장된 Manifest capability는 후속 아키텍처로 남는다.

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

현재 구현된 첫 단계 Core `AgentDefinition`은 `id`, `name`, `version`, `description`, `responsibility`만 제공하며, `AgentRegistry`는 이 definition의 검증, 등록 및 조회만 담당한다. 첫 Common Agent Runtime foundation은 valid request가 Registry에 등록된 Agent만 provider-neutral executor seam으로 dispatch하도록 제한하지만 Pack을 Agent Registry에 자동 연결하지 않는다. 위의 supported tasks, capability, Tool, Memory, input/output, autonomy 및 failure contract와 Pack-to-Agent registration은 관련 Core contract와 완전한 execution lifecycle이 구현될 때 점진적으로 추가한다. Agent registration과 Runtime dispatch eligibility는 Tool 또는 external Action authority를 의미하지 않는다.

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

현재 Core는 `id`, `name`, `description`, 선언적 `risk`, required `inputSchema`, `outputSchema`와 declarative `requiredPermissions`로 구성된 non-executable Tool definition, instance-local registration 및 unknown input/output validation foundation을 공개한다. Registry는 caller permission array와 분리된 frozen nested snapshot을 소유한다. Engineering Pack에는 아직 실제 Tool implementation이 없으며 Pack lifecycle과 Tool Registry의 integration도 구현되지 않았다. Permission declaration, input/output validation 성공이나 Registry 등록은 실행 권한을 부여하지 않고 Tool을 실행하지도 않는다.

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

IMPLEMENTATION-009는 Core에 최소 Model Definition과 instance-local Model Registry foundation을 추가했고, IMPLEMENTATION-010은 registered logical Model ID를 exact definition으로 resolve하여 provider-independent injected executor seam으로 dispatch하는 최소 Model Runtime foundation을 추가한다. 두 단계 모두 Pack contract를 변경하지 않는다. Engineering Pack은 Model을 등록하거나 선택하거나 호출하지 않으며 Provider를 직접 선택하거나 호출하지도 않는다. Registry membership은 staged Runtime composition의 dispatch eligibility일 뿐 concrete Provider execution capability나 authority가 아니다.

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

현재 구현 범위의 테스트는 Manifest validation, Pack Registry behavior, 최소 Agent Definition validation, Agent Registry behavior, registered-Agent Runtime dispatch와 failure behavior, Tool Definition의 required-permission declaration과 input/output schema validation, Tool Registry ownership behavior, 최소 Model Definition validation, Model Registry behavior, registered-Model Runtime dispatch와 failure behavior, Engineering Pack contract 및 Core와 Pack 사이의 package boundary를 검증한다. Permission evaluation, Pack-to-Agent, Pack-to-Tool 및 Pack-to-Model registration, Tool execution, routing, provider execution, Model/Agent/Tool integration 및 나머지 runtime 테스트는 해당 capability가 구현될 때 추가한다.

LLM 기반 Agent의 품질은 일반 Unit Test만으로 충분하지 않을 수 있다.

필요한 경우 Evaluation Dataset과 Scenario Test를 함께 사용한다.

---

## 20. Initial Engineering Pack

ODYS의 첫 번째 Pack은 Engineering Pack이다.

현재 `packs/engineering/`에는 Engineering Pack의 identity definition만 구현되어 있으며 Pack-owned Agent Runtime, domain Agent, 실제 Tool implementation 또는 Model registration/invocation은 포함하지 않는다. Core의 staged Agent 및 Model Runtime foundation이 존재하더라도 Engineering Pack은 Agent Registry나 Model Registry에 자동 연결되지 않는다.

Engineering Pack의 후속 capability 후보는 다음과 같다.

1. Study Agent

2. Conference Agent

3. Career Agent

4. Coding Agent

이 Agent들은 아직 구현되지 않았으며, 구현될 때에도 ODYS Core 구성 요소가 아니다.

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
