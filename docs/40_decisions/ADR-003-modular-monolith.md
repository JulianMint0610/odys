# ADR-003 — Modular Monolith

- Status: Accepted
- Date: 2026-08-10

---

## 01. Context

ODYS는 Agent, Memory, Tool, Model, Pack 등 여러 논리적 컴포넌트를 가진다.

초기부터 Microservices로 분리하면 네트워크 통신, 배포 단위, 분산 로깅, 데이터 일관성, 로컬 개발, DevOps 비용이 빠르게 증가한다.

현재 ODYS는 제품과 기능 경계를 빠르게 검증해야 하므로 운영 복잡도를 최소화하면서 내부 구조를 명확히 하는 방식이 필요하다.

---

## 02. Decision

ODYS의 초기 백엔드 아키텍처는 **Modular Monolith**로 구축한다.

하나의 애플리케이션 또는 제한된 수의 배포 단위를 유지하되 내부적으로는 명확한 모듈 경계를 강제한다.

```text
Application
│
├── core
│   ├── agent
│   ├── memory
│   ├── tool
│   ├── model
│   ├── permission
│   └── workflow
│
├── packs
│   ├── study
│   ├── conference
│   ├── career
│   └── coding
│
└── infrastructure
    ├── database
    ├── external-api
    └── observability
```

---

## 03. Module Boundary

각 모듈은 다음을 가진다.

- 명시적인 책임
- public API
- private implementation
- 자체 테스트
- 허용된 의존성 방향

외부 모듈은 public API만 사용한다.

---

## 04. Dependency Direction

```text
Pack / Application
        ↓
Core Contracts
        ↓
Domain Logic
        ↓
Infrastructure Adapters
```

Supabase SDK, AI Provider SDK, HTTP Client 같은 인프라 구현이 비즈니스 로직 전체에 직접 퍼지지 않도록 한다.

---

## 05. Rationale

Modular Monolith는 현재 ODYS에 다음 이점을 제공한다.

- 하나의 저장소에서 시스템 전체를 이해하기 쉽다.
- 로컬 개발 환경이 단순하다.
- 리팩터링 속도가 빠르다.
- 디버깅과 테스트가 쉽다.
- 트랜잭션 처리가 단순하다.
- 향후 서비스 분리에 필요한 논리적 경계를 미리 구축할 수 있다.

핵심은 `Monolith`보다 `Modular`에 있다.

---

## 06. Alternatives Considered

### Alternative A — Microservices from Day One

독립 배포와 확장이 가능하지만 현재 규모에서는 운영 비용이 이익보다 크고 서비스 경계가 검증되기 전에 고정될 위험이 있다.

채택하지 않는다.

### Alternative B — Unstructured Monolith

가장 빠르게 시작할 수 있지만 시간이 지날수록 의존성 구조가 붕괴하고 Core / Pack 경계를 유지하기 어렵다.

채택하지 않는다.

---

## 07. Consequences

### Positive

- 개발과 배포가 단순하다.
- 코드 탐색과 디버깅이 쉽다.
- 초기 실험과 리팩터링에 유리하다.
- 미래의 서비스 분리 가능성을 유지한다.

### Negative

- 모듈 경계를 개발 규칙과 테스트로 강제해야 한다.
- 관리가 느슨하면 Big Ball of Mud로 퇴화할 수 있다.
- 일부 모듈만 독립 확장하기 어렵다.

---

## 08. Extraction Rule

특정 모듈을 별도 서비스로 분리하는 것은 다음 조건이 실제로 발생했을 때 검토한다.

- 독립적인 확장 요구가 명확하다.
- 별도 보안 경계가 필요하다.
- 배포 주기가 크게 다르다.
- 장애 격리가 중요하다.
- 팀 소유권이 독립적으로 분리된다.
- 특정 모듈의 부하가 전체 시스템과 크게 다르다.

`언젠가 커질 수 있다`는 이유만으로 Microservice로 분리하지 않는다.

---

## 09. Constraints

- 모듈 간 circular dependency를 허용하지 않는다.
- private implementation deep import를 금지한다.
- 인프라 SDK가 domain layer로 침투하지 않는다.
- Pack은 Core의 public contract를 사용한다.
- module boundary를 lint 또는 architecture test로 점진적으로 자동화한다.

---

## 10. Revisit Conditions

- 사용자 규모 증가로 독립 확장이 필요한 경우
- 특정 컴포넌트의 장애가 전체 서비스에 치명적인 경우
- 독립적인 배포가 사업적으로 중요해진 경우
- 팀이 모듈별로 독립 운영 가능한 규모로 성장한 경우
- 보안 또는 규제 요구가 별도 실행 환경을 요구하는 경우

---

## 11. Related Documents

- `ADR-002-core-vs-pack.md`
- `ADR-004-typescript-primary.md`
- `ADR-006-supabase.md`
- `../20_architecture/SYSTEM_OVERVIEW.md`
- `../20_architecture/API_DESIGN.md`
- `../20_architecture/DEPLOYMENT.md`
- `../50_engineering/DEVELOPMENT_WORKFLOW.md`

---

## 12. Development Rule

서비스 분리는 실제 문제를 해결하기 위해 수행한다.

**Start simple, keep boundaries strong, extract only when justified.**
