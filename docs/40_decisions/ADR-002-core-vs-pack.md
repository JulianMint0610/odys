# ADR-002 — Core vs Pack

- Status: Accepted
- Date: 2026-08-10

---

## 01. Context

ODYS는 처음에는 사용자의 학업, 학회, 취업, 코딩 활동을 지원하지만 장기적으로 특정 분야에 제한되지 않는 범용 AI Agent / Operating System을 목표로 한다.

초기 기능을 빠르게 구현한다는 이유로 학업, 취업, 코딩 등의 도메인 로직을 시스템 핵심부에 직접 넣으면 Core가 특정 사용자와 특정 사용 사례에 종속된다.

---

## 02. Decision

ODYS의 기능을 **Core**와 **Pack**으로 명확하게 분리한다.

### 2.1 Core

모든 도메인에서 공통으로 필요한 플랫폼 능력이다.

예:

- identity
- session
- memory
- agent runtime
- tool runtime
- model gateway
- permission
- workflow orchestration
- event handling
- observability
- API contracts

### 2.2 Pack

특정 도메인 또는 사용자 목적에 특화된 기능 묶음이다.

초기 Pack:

- Study Pack
- Conference Pack
- Career Pack
- Coding Pack

---



## 03. Core Rule

Core에 기능을 넣기 전에 다음 질문을 한다.

> 이 기능이 학업, 취업, 코딩과 무관한 완전히 다른 도메인에서도 필요한가?

답이 `아니오`라면 기본적으로 Core가 아니라 Pack에 위치한다.

Core는 다음과 같은 범용 개념을 알 수 있다.

- User
- Session
- Task
- Agent
- Tool
- Memory
- Permission
- Event
- Workflow

반대로 다음과 같은 도메인 개념을 직접 알아서는 안 된다.

- Course
- Assignment
- Conference
- Resume
- Job Posting
- Coding Challenge

---



## 04. Pack Contract

Pack은 Core의 내부 구현에 직접 의존하지 않는다.

```text
Pack
 │
 │ Public Contract
 ▼
Core API / Runtime
 │
 ▼
Infrastructure
```

Pack은 다음을 정의할 수 있다.

- domain entities
- prompts
- agent capabilities
- tools
- workflows
- policies
- domain memory schema
- UI extensions

---



## 05. Pack Isolation

Pack 간 직접적인 내부 의존성을 최소화한다.

잘못된 예:

```text
Study Pack
   ↓
Career Pack internal service
```

권장되는 예:

```text
Study Pack
   ↓
Core Event / Public Contract
   ↓
Career Pack
```

---



## 06. Rationale

Core / Pack 분리는 ODYS의 범용성을 유지하는 핵심 아키텍처 경계다.

이 구조는 다음 목표를 동시에 만족한다.

1. 실제 사용자에게 필요한 기능을 빠르게 개발한다.
2. 개인용 기능이 플랫폼 전체를 오염시키지 않도록 한다.
3. 새로운 분야에 ODYS를 적용할 수 있다.
4. Pack 단위로 독립적인 테스트와 발전이 가능하다.
5. 향후 외부 Pack 또는 Plugin 생태계로 발전할 수 있다.

---



## 07. Alternatives Considered



### Alternative A — 모든 기능을 하나의 Application Layer에 배치

초기 구현은 빠르지만 시간이 지날수록 도메인 결합이 증가하고 범용 플랫폼으로 확장하기 어렵다.

채택하지 않는다.

### Alternative B — Pack마다 완전한 별도 서비스 구축

강한 격리는 가능하지만 초기 인프라 복잡도가 지나치게 높고 ADR-003의 Modular Monolith 전략과 맞지 않는다.

현재는 채택하지 않는다.

---



## 08. Consequences



### Positive

- Core의 범용성을 보호한다.
- Pack 추가가 쉬워진다.
- 도메인별 변경의 영향 범위를 줄인다.
- 테스트 경계가 명확해진다.



### Negative

- 초기 단계에서도 인터페이스와 경계를 설계해야 한다.
- 지나친 추상화가 발생하지 않도록 주의해야 한다.

---



## 09. Constraints

- Pack은 다른 Pack의 private module을 직접 import하지 않는다.
- Pack은 Core의 public contract만 사용한다.
- Core는 Pack의 domain entity를 직접 참조하지 않는다.
- 특정 Pack만을 위한 요구 때문에 Core API를 성급하게 확장하지 않는다.
- 코드 중복만을 이유로 기능을 Core로 이동하지 않는다.

---



## 10. Revisit Conditions

- 외부 개발자가 Pack을 설치하는 Plugin Ecosystem을 구축할 때
- Pack별 독립 배포가 필요해질 때
- Pack별 보안 경계를 프로세스 수준으로 분리해야 할 때
- 특정 Pack이 독립 제품으로 발전할 때

---



## 11. Related Documents

- `ADR-001-brand-architecture.md`
- `ADR-003-modular-monolith.md`
- `../20_architecture/ODYS_CORE.md`
- `../20_architecture/AGENT_ARCHITECTURE.md`
- `../20_architecture/TOOL_ARCHITECTURE.md`
- `../30_pack/README.md`

---



## 12. Development Rule

새 기능을 추가할 때 가장 먼저 `Core인가, Pack인가`를 판단한다.

**Core provides capability. Pack provides domain meaning.**