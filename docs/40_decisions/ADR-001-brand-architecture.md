# ADR-001 — Brand Architecture

- Status: Accepted
- Date: 2026-08-10

---

## 01. Context

ODYS는 하나의 단일 기능 앱이 아니라 장기적으로 여러 Agent, Pack, Tool, Memory, Workflow를 포괄하는 AI 플랫폼을 목표로 한다.

동시에 사용자는 플랫폼 내부의 모든 기술적 구조보다 하나의 AI와 상호작용하는 일관된 경험을 기대한다.

플랫폼 자체와 사용자가 만나는 AI를 동일한 이름과 개념으로 처리하면 다음 문제가 발생한다.

- 시스템과 Agent의 책임이 혼동된다.
- 여러 Agent 또는 Pack을 추가할 때 제품 구조가 불명확해진다.
- 기술 문서에서 플랫폼 레벨과 Agent 레벨의 개념이 섞인다.
- 향후 외부 개발자용 플랫폼과 최종 사용자 제품을 분리하기 어렵다.

---

## 02. Decision

ODYS의 브랜드와 제품 구조를 다음과 같이 정의한다.

### 2.1 ODYSSEUS OS

ODYS 전체 플랫폼을 의미한다.

포함 범위:

- Core
- Memory
- Agent Runtime
- Tool Runtime
- Model Gateway
- Pack System
- Permission System
- API
- Storage
- Observability
- Deployment Infrastructure



### 2.2 ODYS AI

사용자가 직접 상호작용하는 대표 AI Agent를 의미한다.

ODYS AI는 ODYSSEUS OS 위에서 동작하며 다음 역할을 수행한다.

- 사용자 의도 이해
- 필요한 Agent / Pack / Tool 선택
- Memory 활용
- 실행 계획 수립
- 사용자 확인 요청
- 실행 결과 통합
- 최종 응답 전달

---



## 03. Product Structure

```text
ODYSSEUS OS
│
├── Core
├── Memory
├── Agent Runtime
├── Tool Runtime
├── Model Gateway
├── Permission System
├── Pack System
│   ├── Study Pack
│   ├── Conference Pack
│   ├── Career Pack
│   └── Coding Pack
│
└── ODYS AI
    └── User Interaction Layer
```

ODYS AI는 플랫폼 전체와 동일하지 않다.

---



## 04. Rationale

`ODYSSEUS OS`는 기술적 기반과 실행 환경을 나타내고, `ODYS AI`는 최종 사용자가 경험하는 인터페이스와 대표 Agent를 나타낸다.

이를 분리하면 다음이 가능하다.

- 플랫폼 내부 구조와 사용자 경험을 독립적으로 발전시킬 수 있다.
- 새로운 Agent를 추가할 수 있다.
- Pack을 교체하거나 확장해도 ODYS AI라는 사용자 접점은 유지할 수 있다.
- 장기적으로 ODYSSEUS OS를 별도 플랫폼 또는 개발자 생태계로 확장할 수 있다.

---



## 05. Alternatives Considered



### Alternative A — 모든 것을 ODYS 하나로 통합

장점:

- 이름이 단순하다.
- 초기 설명이 쉽다.

단점:

- 플랫폼과 Agent의 책임이 섞인다.
- 문서와 코드에서 개념적 혼동이 발생한다.
- 제품 확장 시 이름 체계가 불안정해진다.

채택하지 않는다.

### Alternative B — Agent마다 완전히 독립된 브랜드 사용

장점:

- 각 Agent의 개성이 분명하다.

단점:

- 초기 단계에서 브랜드가 과도하게 분산된다.
- 하나의 통합 AI OS라는 정체성이 약해진다.

채택하지 않는다.

---



## 06. Consequences



### Positive

- 플랫폼과 사용자-facing Agent의 책임이 명확해진다.
- 기술 문서와 제품 문서의 용어를 일관되게 유지할 수 있다.
- Pack과 Agent 확장에 유리하다.



### Negative

- 두 개의 핵심 이름을 관리해야 한다.
- 초기 사용자에게 두 이름의 관계를 설명해야 할 수 있다.

---



## 07. Naming Rules

- 시스템 전체: `ODYSSEUS OS`
- 사용자-facing 대표 Agent: `ODYS AI`
- 저장소와 프로젝트 전체를 간단히 지칭: `ODYS`
- 내부 기술 모듈: 기능 중심 이름 사용

데이터베이스, 배포, Core Runtime은 ODYS AI가 아니라 ODYSSEUS OS에 속한다.

---



## 08. Constraints

- ODYS AI를 Core와 동일한 개념으로 취급하지 않는다.
- 특정 Pack이 ODYSSEUS OS 전체를 대표하지 않는다.
- 사용자-facing 명칭과 내부 모듈명을 무조건 동일하게 만들지 않는다.
- 제품 또는 브랜드 구조를 크게 바꾸려면 새로운 ADR을 작성한다.

---



## 09. Revisit Conditions

- ODYS AI 외에 여러 동등한 최상위 사용자 Agent가 제품의 중심이 될 때
- ODYSSEUS OS가 외부 개발자를 위한 독립 플랫폼으로 분리될 때
- 제품 포트폴리오가 여러 독립 제품군으로 확장될 때

---



## 10. Related Documents

- `README.md`
- `ADR-002-core-vs-pack.md`
- `../00_foundation/MANIFESTO.md`
- `../20_architecture/SYSTEM_OVERVIEW.md`
- `../20_architecture/ODYS_CORE.md`

---



## 11. Development Rule

브랜드 이름은 단순한 마케팅 문자열이 아니라 시스템의 개념적 경계를 나타낸다.

**ODYSSEUS OS is the platform. ODYS AI is the agent.**