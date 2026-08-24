# 40_decisions

> ODYS의 장기적인 제품·아키텍처·기술 결정을 기록하는 Architecture Decision Record(ADR) 디렉터리다.

---

## 01. Purpose

`40_decisions/`는 ODYS에서 쉽게 되돌리기 어렵거나 이후의 설계와 구현에 지속적으로 영향을 주는 결정을 기록한다.

이 디렉터리는 단순한 회의록이 아니다. 각 결정에 대해 다음 내용을 남긴다.

- 어떤 문제가 있었는가
- 어떤 제약과 목표가 있었는가
- 어떤 대안을 검토했는가
- 무엇을 선택했는가
- 선택으로 인해 어떤 장점과 비용이 발생하는가
- 어떤 조건에서 결정을 다시 검토할 것인가

ODYS는 개인용 AI 도구에서 출발하지만 장기적으로는 다양한 분야에 적용 가능한 범용 AI Agent / Operating System을 목표로 한다.

따라서 중요한 결정은 개발자의 기억이나 대화 기록에만 남겨두지 않고 저장소 안에서 추적 가능해야 한다.

---

## 02. ADR Principles

### 2.1 One Decision per ADR

하나의 ADR은 하나의 핵심 결정을 다룬다.

### 2.2 Record the Why

결과만 기록하지 않는다. 결정 당시의 문제, 대안, trade-off와 선택 이유를 함께 기록한다.

### 2.3 Preserve History

승인된 ADR은 과거의 의사결정 기록이다. 결정이 바뀌면 기존 ADR을 조용히 덮어쓰지 않고 새로운 ADR을 작성한다.

### 2.4 Avoid Premature Decisions

쉽게 되돌릴 수 있는 작은 구현 세부사항까지 ADR로 만들지 않는다.

### 2.5 Architecture Must Be Explicit

실수로 만들어진 구현 상태가 아키텍처가 되어서는 안 된다. 중요한 구조는 명시적인 결정으로 관리한다.

---

## 03. ADR Status

| Status     | Meaning                                            |
| ---------- | -------------------------------------------------- |
| Proposed   | 검토 중인 제안                                     |
| Accepted   | 현재 적용되는 결정                                 |
| Deprecated | 더 이상 권장되지 않지만 일부 구조가 남아 있는 결정 |
| Superseded | 새로운 ADR에 의해 대체된 결정                      |
| Rejected   | 검토했지만 채택하지 않은 결정                      |

현재 `ADR-001`부터 `ADR-008`까지는 모두 `Accepted` 상태다.

---

## 04. ADR Index

| ADR     | Title                       | Status   |
| ------- | --------------------------- | -------- |
| ADR-001 | Brand Architecture          | Accepted |
| ADR-002 | Core vs Pack                | Accepted |
| ADR-003 | Modular Monolith            | Accepted |
| ADR-004 | TypeScript Primary          | Accepted |
| ADR-005 | AI SDK / Model Independence | Accepted |
| ADR-006 | Supabase                    | Accepted |
| ADR-007 | Progressive Autonomy        | Accepted |
| ADR-008 | Integrated Agent Execution  | Accepted |

---

## 05. Decision Summary

### ADR-001 — Brand Architecture

- **ODYSSEUS OS**: 전체 플랫폼
- **ODYS AI**: 사용자가 직접 상호작용하는 대표 AI Agent

### ADR-002 — Core vs Pack

범용 실행 능력은 `Core`, 도메인별 기능은 `Pack`으로 분리한다.

### ADR-003 — Modular Monolith

초기 시스템은 Microservices가 아닌 **Modular Monolith**로 구축한다.

### ADR-004 — TypeScript Primary

ODYS 애플리케이션의 기본 언어는 **TypeScript**로 한다.

### ADR-005 — AI SDK / Model Independence

비즈니스 로직이 특정 AI 모델 공급자의 SDK에 직접 종속되지 않도록 한다.

### ADR-006 — Supabase

초기 데이터 플랫폼으로 **Supabase**를 사용하되 핵심 데이터 모델은 PostgreSQL 중심으로 유지한다.

### ADR-007 — Progressive Autonomy

Agent 자율성은 낮은 위험의 관찰과 제안에서 시작하여 사용자 신뢰와 검증 수준에 따라 점진적으로 확대한다.

### ADR-008 — Integrated Agent Execution

Generic Agent execution orchestration은 ODYS Core Agent Runtime이 소유한다.

Agent Runtime은 Model 및 Tool capability를 명시적인 Core-controlled boundary를 통해 composition하며, 현재의 staged runtime seam을 permanent architecture로 고정하지 않는다.

Model execution은 provider-independent Model boundary를 사용하고, Model output은 validation 및 normalization 없이 trusted execution state나 Action authority로 취급하지 않는다.

Agent-originated Tool request는 Agent-specific Tool capability boundary와 Tool Runtime을 통과해야 하며, Model reasoning 또는 Tool request 자체는 user, Workspace, Policy, Approval 또는 production external-Action authority를 생성하지 않는다.

Model / Tool continuation과 retry는 명시적인 execution bound를 가지며, 초기 implementation limitation을 불필요한 장기 architectural restriction으로 고정하지 않는다.

---

## 06. When to Create an ADR

다음과 같은 결정은 ADR로 기록하는 것을 원칙으로 한다.

- 핵심 기술 스택 변경
- 데이터베이스 또는 영속성 전략 변경
- 인증 및 권한 구조 변경
- 배포 구조 변경
- Agent 실행 모델 변경
- Tool 실행 정책 변경
- 모델 공급자 전략 변경
- Core / Pack 경계 변경
- 주요 데이터 모델 변경
- 보안 모델 변경
- 공개 API 계약에 장기 영향을 주는 변경

다음 항목은 일반적으로 ADR 대상이 아니다.

- 변수명 변경
- 단순 리팩터링
- 작은 버그 수정
- 임시 UI 조정
- 쉽게 되돌릴 수 있는 구현 세부사항

---

## 07. Naming Convention

ADR 파일명은 다음 형식을 사용한다.

```text
ADR-XXX-short-title.md
```

규칙:

1. 번호는 순차적으로 증가한다.
2. 삭제된 ADR의 번호를 재사용하지 않는다.
3. 파일명은 lowercase kebab-case를 사용한다.
4. 문서 제목은 사람이 읽기 쉬운 Title Case를 사용한다.

---

## 08. ADR Template

```markdown
# ADR-XXX — Title

- Status: Proposed
- Date: YYYY-MM-DD

## 01. Context

## 02. Decision

## 03. Rationale

## 04. Alternatives Considered

## 05. Consequences

## 06. Constraints

## 07. Revisit Conditions

## 08. Related Documents
```

---

## 09. Review Policy

ADR은 다음 상황에서 재검토할 수 있다.

- 기존 결정이 개발 속도를 지속적으로 저해할 때
- 새로운 제품 요구사항이 기존 가정을 무효화할 때
- 운영 비용이 허용 범위를 벗어날 때
- 보안 또는 규제 요구사항이 변경될 때
- 확장성 문제로 기존 구조의 한계가 명확해질 때
- 팀 규모와 소유권 구조가 크게 달라질 때

기존 결정을 변경해야 한다면 가능한 한 새로운 ADR을 작성해 의사결정의 역사를 보존한다.

---

## 10. Architectural Invariants

1. ODYS Core는 특정 도메인에 종속되지 않는다.
2. Pack은 Core의 공개된 계약을 통해 플랫폼 기능을 사용한다.
3. 특정 AI 모델 또는 공급자가 ODYS 전체를 지배하지 않는다.
4. 중요한 상태 변경과 Tool 실행은 추적 가능해야 한다.
5. 높은 위험의 행동은 명시적인 권한 제어를 거친다.
6. 초기 개발의 단순성을 유지하면서 미래 분리가 가능한 경계를 만든다.
7. 사용자가 최종 통제권을 가진다.
8. 실험적인 기능이 안정된 Core 계약을 무분별하게 변경하지 않는다.

---

## 11. Related Documents

- `../00_foundation/MANIFESTO.md`
- `../00_foundation/PRINCIPLE.md`
- `../20_architecture/SYSTEM_OVERVIEW.md`
- `../20_architecture/ODYS_CORE.md`
- `../20_architecture/AGENT_ARCHITECTURE.md`
- `../20_architecture/TOOL_ARCHITECTURE.md`
- `../20_architecture/MODEL_STRATEGY.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`
- `../20_architecture/TECH_STACK.md`
- `../50_engineering/DEVELOPMENT_WORKFLOW.md`
- `../50_engineering/AI_DEVELOPMENT_WORKFLOW.md`
- `../50_engineering/TEST_STRATEGY.md`

---

## 12. Development Rule

새로운 구현이 기존 ADR과 충돌한다면 구현을 먼저 진행하지 않는다.

1. 충돌하는 ADR을 확인한다.
2. 기존 결정이 여전히 유효한지 검토한다.
3. 필요하면 새로운 ADR을 작성한다.
4. 결정이 확정된 후 구현한다.

**Architecture follows explicit decisions, not accidental implementation.**
