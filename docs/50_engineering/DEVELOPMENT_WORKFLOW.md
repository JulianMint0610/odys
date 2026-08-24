# DEVELOPMENT_WORKFLOW

> ODYS 코드베이스를 안전하고 일관되게 변경하기 위한 기본 개발 절차다.

---

## 01. Purpose

이 문서는 ODYS의 일반적인 개발 흐름을 정의한다.

목표는 다음과 같다.

- 변경의 목적을 명확히 한다.
- 작은 단위로 구현한다.
- 아키텍처 경계를 보호한다.
- 테스트되지 않은 변경이 `main`에 들어가는 것을 줄인다.
- 사람이 작성한 코드와 AI가 작성한 코드에 동일한 품질 기준을 적용한다.
- 모든 중요한 변경을 Git에서 추적 가능하게 만든다.

---

## 02. Core Principle

ODYS 개발의 기본 단위는 `코드 작성`이 아니라 `검증 가능한 변경`이다.

모든 변경은 가능하면 다음 속성을 가져야 한다.

- 목적이 하나다.
- 범위가 작다.
- 테스트 가능하다.
- 되돌릴 수 있다.
- 리뷰 가능하다.
- 관련 문서와 일치한다.

---

## 03. Branch Strategy

초기 단계에서는 단순한 trunk-based workflow를 사용한다.

기본 branch:

```text
main
```

작업 branch 예:

```text
feat/memory-retrieval
feat/study-pack-task
fix/tool-timeout
refactor/model-gateway
docs/agent-architecture
chore/update-dependencies
```

원칙:

- `main`은 실행 가능한 상태를 유지한다.
- 기능 작업은 짧게 유지한다.
- 장기간 유지되는 거대한 branch를 만들지 않는다.
- 하나의 branch는 하나의 주된 목적을 가진다.

---

## 04. Work Item Types

| Prefix     | Meaning                      |
| ---------- | ---------------------------- |
| `feat`     | 새로운 기능                  |
| `fix`      | 버그 수정                    |
| `refactor` | 동작 변경 없는 구조 개선     |
| `test`     | 테스트 추가 또는 개선        |
| `docs`     | 문서 변경                    |
| `chore`    | 빌드, 설정, 의존성, 유지보수 |
| `perf`     | 성능 개선                    |
| `security` | 보안 관련 변경               |

---

## 05. Development Flow

```text
Understand
   ↓
Scope
   ↓
Design
   ↓
Implement
   ↓
Local Quality Check
   ↓
Review
   ↓
Document
   ↓
Commit
   ↓
Push
   ↓
Pull Request
   ↓
GitHub Actions CI
   ↓
Merge
```

---

## 06. Step 1 — Understand

코드를 수정하기 전에 먼저 문제를 이해한다.

확인 항목:

- 무엇을 바꾸려는가
- 왜 필요한가
- 어떤 사용자 또는 시스템 문제를 해결하는가
- 어떤 모듈이 영향을 받는가
- 기존 문서나 ADR과 충돌하지 않는가

아키텍처 결정과 충돌하는 경우 구현보다 결정 검토가 먼저다.

---

## 07. Step 2 — Scope

작업 범위를 가능한 한 작게 제한한다.

좋은 작업:

```text
Add timeout handling to model gateway
```

나쁜 작업:

```text
Improve AI system
```

하나의 변경에서 unrelated cleanup을 무분별하게 함께 수행하지 않는다.

---

## 08. Step 3 — Design

다음 변경은 구현 전에 설계를 검토한다.

- 새로운 Core module
- 새로운 Pack
- public API 변경
- database schema 변경
- permission 변경
- agent execution 흐름 변경
- 새로운 infrastructure dependency
- 새로운 외부 Provider
- destructive migration

필요한 경우 ADR을 먼저 작성한다.

---

## 09. Step 4 — Implement

### 9.1 Small Changes

한 번에 가능한 한 작은 변경을 만든다.

### 9.2 Respect Boundaries

Core / Pack / Infrastructure의 책임을 섞지 않는다.

### 9.3 Prefer Explicit Code

지나치게 영리한 코드보다 이해 가능한 코드를 선호한다.

### 9.4 Avoid Premature Abstraction

한 번만 사용하는 코드 때문에 복잡한 추상화를 만들지 않는다.

### 9.5 Validate External Input

사용자 입력, API 응답, AI 출력, webhook payload 등 외부 입력은 신뢰하지 않는다.

### 9.6 Handle Failure

외부 API와 AI 모델 호출은 실패할 수 있다고 가정한다.

timeout, retry, fallback 또는 명시적 오류 처리를 설계한다.

---

## 10. Step 5 — Verify

Push 전에 repository root에서 전체 local quality gate를 실행한다.

```bash
pnpm check
```

`pnpm check`는 formatting, lint, typecheck, test 및 build를 순서대로 검증하며 어느 단계든 실패하면 non-zero exit code로 종료한다.

기능 성격에 따라 다음 테스트를 추가한다.

- unit test
- integration test
- contract test
- E2E test
- manual verification

세부 원칙은 `TEST_STRATEGY.md`를 따른다.

### 10.1 Read-Only Repository Status

로컬 검증을 시작하기 전에 다음 command로 현재 repository 사실을 확인할 수 있다.

```bash
corepack pnpm dev:status
```

Implemented:

- 로컬 repository root, branch/분리된 HEAD, HEAD와 local `main` commit을 조회한다.
- modified tracked file, untracked file과 local `main` 기준 ahead/behind count를 읽기 전용으로 보고한다.

Not implemented:

- readiness policy 또는 state-machine transition
- 자동 검증 또는 `pnpm check` 실행
- AI orchestration
- commit, push, Pull Request, CI polling, merge 또는 branch cleanup 자동화
- source bundle synchronization 또는 smoke-test 자동화

이 command는 local Git state만 수집하며 commit, merge, push, release 또는 다음 작업 진행 가능 여부를 판단하지 않는다.

---

## 11. Step 6 — Review

### Correctness

- 요구한 동작을 실제로 수행하는가
- edge case를 놓치지 않았는가
- 오류 처리가 있는가

### Architecture

- Core / Pack 경계를 지키는가
- private implementation을 침범하지 않는가
- 새로운 coupling을 만들지 않는가

### Security

- secret이 노출되지 않는가
- 사용자 권한을 확인하는가
- 외부 입력을 검증하는가
- destructive action이 안전한가

### Maintainability

- 이름이 명확한가
- 함수와 모듈의 책임이 과도하지 않은가
- 불필요한 복잡성이 없는가
- 테스트가 변경 의도를 설명하는가

---

## 12. Step 7 — Documentation

다음 변경은 문서 업데이트를 함께 검토한다.

- architecture 변경
- API 변경
- database schema 변경
- environment variable 추가
- setup 과정 변경
- Pack 구조 변경
- Tool / Agent contract 변경
- 새로운 운영 절차

코드와 문서가 충돌하면 문서를 방치하지 않는다.

---

## 13. Commit Convention

권장 형식:

```text
<type>(<scope>): <summary>
```

예:

```text
feat(memory): add semantic retrieval service
fix(tool): handle execution timeout
refactor(model): isolate provider adapters
docs(architecture): document pack boundaries
test(agent): add execution permission cases
```

본문이 필요한 경우 변경 이유와 중요한 trade-off를 기록한다.

---

## 14. Commit Rules

- 의미 없는 `update`, `fix`, `changes` 같은 메시지를 피한다.
- 서로 관계없는 변경을 하나의 commit에 넣지 않는다.
- secret, token, credential을 commit하지 않는다.
- generated file은 필요할 때만 commit한다.
- 테스트가 깨진 상태를 의도적으로 `main`에 넣지 않는다.
- 대규모 formatting 변경과 기능 변경을 가능하면 분리한다.

---

## 15. Pull Request

협업 단계에서는 Pull Request를 기본 병합 단위로 사용한다.

작업 branch를 push하고 Pull Request를 생성하거나 업데이트한 뒤 GitHub Actions 결과를 확인한다.

PR에는 최소한 다음 정보가 있어야 한다.

```text
What
Why
How
Test
Risk
```

---

## 16. Merge Rule

`main` 병합 전 확인한다.

- local `pnpm check` 통과
- GitHub Actions CI 통과
- 관련 문서 업데이트
- migration 검토
- secret 없음
- architecture rule 위반 없음

초기 개인 개발 단계에서는 직접 commit할 수 있지만 동일한 체크리스트를 적용한다.

---

## 17. Database Change Workflow

```text
Model change
   ↓
Migration
   ↓
Local apply
   ↓
Test
   ↓
Review
   ↓
Commit
   ↓
Production apply
```

원칙:

- schema 변경은 migration으로 남긴다.
- production에서만 존재하는 수동 변경을 만들지 않는다.
- destructive migration은 backup / rollback 전략을 검토한다.
- 데이터 migration과 schema migration의 위험을 구분한다.

---

## 18. Dependency Change Workflow

새 dependency를 추가하기 전에 확인한다.

- 직접 구현보다 명확한 가치가 있는가
- 유지보수되고 있는가
- license가 적절한가
- bundle / runtime 비용이 과도하지 않은가
- 보안 위험은 없는가
- 이미 같은 기능의 dependency가 존재하지 않는가

추가:

```bash
pnpm add <package>
```

개발 dependency:

```bash
pnpm add -D <package>
```

---

## 19. Configuration and Secrets

환경별 설정과 secret을 구분한다.

```text
Configuration
- timeout
- feature flag
- model alias

Secret
- API key
- service role key
- signing secret
```

Secret 규칙:

- Git commit 금지
- `.env.example`에는 값이 아니라 변수 이름만 기록
- client bundle에 server secret 포함 금지
- 필요 최소한의 권한만 사용

---

## 20. Error Handling

오류를 숨기지 않는다.

좋은 오류 처리는 다음을 포함한다.

- 의미 있는 error type
- 사용자-facing 메시지와 내부 디버그 정보 분리
- correlation / request context
- retry 가능 여부 구분
- 원인 보존

외부 Provider 오류를 그대로 전체 시스템에 노출하지 않고 내부 공통 오류 형태로 변환한다.

---

## 21. Observability

중요한 실행 경로에는 필요한 관찰 가능성을 추가한다.

예:

- request id
- agent run id
- tool execution id
- latency
- model usage
- error
- permission decision

개인정보와 secret을 log에 남기지 않는다.

---

## 22. Definition of Done

작업은 다음 조건을 만족할 때 완료된 것으로 본다.

- 요구사항이 구현되었다.
- local `pnpm check`가 통과한다.
- Pull Request를 병합하는 경우 GitHub Actions CI가 통과한다.
- 필요한 테스트가 추가되었다.
- 문서가 현재 동작과 일치한다.
- 보안 영향을 검토했다.
- 관련 ADR과 충돌하지 않는다.
- commit 단위가 명확하다.
- 불필요한 debug code가 제거되었다.

---

## 23. Related Documents

- `../40_decisions/README.md`
- `../40_decisions/ADR-003-modular-monolith.md`
- `../40_decisions/ADR-004-typescript-primary.md`
- `AI_DEVELOPMENT_WORKFLOW.md`
- `TEST_STRATEGY.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`
- `../20_architecture/DEPLOYMENT.md`

---

## 24. Final Rule

개발 속도는 중요하지만 추적 가능성과 복구 가능성을 희생해서 얻지 않는다.

**Make small changes, verify them, document the important decisions, and keep** `main` **trustworthy.**
