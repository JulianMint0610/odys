# TEST_STRATEGY

> ODYS의 기능, Agent, Tool, Memory, API와 인프라 변경을 검증하기 위한 테스트 전략이다.

---

## 01. Purpose

ODYS는 일반적인 CRUD 애플리케이션과 달리 다음과 같은 비결정적 요소와 외부 의존성을 포함한다.

- AI models
- tool execution
- external APIs
- user permissions
- background workflows
- memory retrieval
- provider failures
- structured model outputs

따라서 단순히 많은 테스트를 작성하는 것보다 위험에 맞는 테스트 계층을 설계하는 것이 중요하다.

---

## 02. Testing Principles

### 2.1 Test Behavior, Not Implementation

내부 구현 세부사항보다 외부에서 관찰되는 동작을 테스트한다.

### 2.2 Risk-Based Testing

모든 코드에 같은 수준의 테스트를 요구하지 않는다. 실패했을 때 영향이 큰 영역에 더 강한 테스트를 적용한다.

### 2.3 Deterministic by Default

가능한 테스트는 결정적으로 만든다. 실제 AI 모델과 외부 네트워크에 의존하는 테스트는 제한한다.

### 2.4 Fast Feedback

대부분의 테스트는 로컬에서 빠르게 실행되어야 한다.

### 2.5 Production-Like Integration

데이터베이스, 인증, Tool 실행처럼 계약 오류가 중요한 부분은 실제와 가까운 환경에서 integration test를 수행한다.

---

## 03. Test Pyramid

```text
           E2E
          /   \
     Integration
       /       \
  Unit / Contract
```

테스트 수는 아래 계층이 가장 많고 위로 갈수록 적게 유지한다.

---

## 04. Unit Tests

대상:

- pure functions
- domain rules
- parser
- validator
- permission logic
- routing rules
- transformation
- state transition
- retry policy

좋은 unit test는 외부 네트워크와 실제 DB에 의존하지 않는다.

---

## 05. Integration Tests

대상:

- repository + database
- API + service
- Agent + Tool Registry
- Model Gateway + Provider Adapter mock server
- Auth + permission
- Storage integration
- workflow execution

---

## 06. Contract Tests

ODYS는 모듈 경계를 중요하게 관리하므로 contract test를 적극적으로 사용한다.

대상:

- Core public API
- Pack contract
- Tool schema
- Model Gateway response
- external provider adapter
- webhook payload
- API request / response

---

## 07. End-to-End Tests

E2E test는 사용자의 핵심 흐름을 검증한다.

```text
User Login
  ↓
Send Request
  ↓
Agent Plan
  ↓
Tool Confirmation
  ↓
Tool Execution
  ↓
Result
```

대표 journey:

- authentication
- ODYS AI 기본 대화
- Pack activation
- permission confirmation
- Tool execution
- memory save / retrieve
- critical user settings

---

## 08. Architecture Tests

Modular Monolith의 경계를 자동으로 보호한다.

검증 예:

- Pack이 Core private module을 import하지 않는가
- Pack 간 forbidden dependency가 없는가
- domain layer가 infrastructure SDK를 import하지 않는가
- Provider SDK가 Model Adapter 외부에 퍼지지 않는가

가능한 경우 lint rule 또는 dependency graph test로 자동화한다.

---

## 09. Database Tests

Database 관련 변경에서는 다음을 검증한다.

- migration 적용 가능
- schema constraint
- foreign key
- unique constraint
- transaction behavior
- RLS policy
- data isolation
- rollback 또는 forward recovery

특히 사용자별 데이터 격리는 반드시 테스트한다.

---

## 10. Permission Tests

Permission System은 높은 우선순위 테스트 대상이다.

각 Tool action에 대해 최소한 다음 경우를 검증한다.

```text
Allowed
Denied
Confirmation Required
Expired Permission
Revoked Permission
Wrong User
Wrong Scope
```

권한 테스트는 AI 모델 결과와 독립적으로 수행할 수 있어야 한다.

---

## 11. Tool Tests

### Input

- valid input
- invalid input
- missing field
- boundary value

### Execution

- success
- timeout
- provider error
- retry behavior

### Permission

- authorized
- unauthorized
- confirmation required

### Output

- schema validation
- error normalization
- audit event

Destructive Tool은 추가적인 safety test가 필요하다.

---

## 12. Agent Tests

Agent 테스트는 단순한 자연어 문자열 일치에 의존하지 않는다.

검증 대상:

- 올바른 Tool 후보 선택
- permission boundary 준수
- required context 사용
- invalid tool call rejection
- loop limit
- failure recovery
- result structure

가능한 부분은 deterministic policy와 mock model을 사용한다.

---

## 13. Model Gateway Tests

테스트 대상:

- provider routing
- model alias resolution
- normalized request
- normalized response
- timeout
- retry
- fallback
- structured output validation
- usage accounting
- provider error normalization

실제 모델 호출 없이 대부분을 테스트할 수 있도록 adapter를 mock 가능하게 유지한다.

---

## 14. AI Output Tests

AI 모델 출력은 비결정적이므로 일반 함수와 동일하게 테스트하지 않는다.

### 14.1 Schema Tests

출력 구조가 요구 schema를 만족하는지 확인한다.

### 14.2 Invariant Tests

절대 깨지면 안 되는 규칙을 검증한다.

예:

- 승인되지 않은 Tool을 호출하지 않는다.
- 허용되지 않은 field를 생성하지 않는다.
- critical action을 자동 실행하지 않는다.

### 14.3 Evaluation Set

대표 입력과 기대 behavior를 가진 evaluation dataset을 관리할 수 있다.

### 14.4 Threshold-Based Evaluation

정확히 같은 문장을 요구하지 않고 품질 기준을 정의한다.

---

## 15. Prompt Regression Tests

중요한 prompt 또는 Agent instruction이 변경되면 regression을 확인한다.

평가 예:

- tool selection accuracy
- refusal behavior
- structured output success rate
- task completion
- hallucination rate
- unnecessary tool call
- permission compliance

Prompt 변경도 코드 변경과 동일하게 regression 가능성이 있다고 본다.

---

## 16. Mock Strategy

다음 외부 의존성은 기본 테스트에서 mock 또는 fake를 사용할 수 있다.

- AI provider
- email provider
- calendar provider
- external search API
- payment-related service
- notification service

단, mock만으로 실제 integration을 완전히 대체하지 않는다.

---

## 17. Network Tests

일반 unit test suite는 외부 네트워크 없이 실행 가능해야 한다.

실제 네트워크를 사용하는 테스트는 구분한다.

```text
test
test:integration
test:e2e
test:live
```

실제 script 이름은 프로젝트 설정에 맞춘다.

---

## 18. Test Data

- production 개인정보를 사용하지 않는다.
- 필요한 최소 데이터만 만든다.
- deterministic fixture를 선호한다.
- 테스트 간 상태 공유를 줄인다.
- 각 테스트는 가능한 한 독립적으로 실행 가능해야 한다.

---

## 19. Security Tests

보안상 중요한 영역은 명시적인 테스트를 작성한다.

예:

- unauthorized data access
- RLS bypass
- IDOR
- invalid token
- expired session
- secret exposure
- malicious input
- prompt injection boundary
- unsafe Tool arguments
- path traversal
- command injection

---

## 20. Failure Tests

성공 경로만 테스트하지 않는다.

중요한 실패 시나리오:

- model timeout
- provider unavailable
- malformed model output
- database unavailable
- tool timeout
- external API rate limit
- permission denied
- partial workflow failure
- duplicate event
- retry exhaustion

실패가 사용자에게 어떻게 전달되고 시스템 상태가 어떻게 보존되는지 확인한다.

---

## 21. Retry and Idempotency Tests

재시도가 가능한 작업은 중복 실행 위험을 테스트한다.

특히 다음 작업은 idempotency가 중요하다.

- message send
- event creation
- background job
- webhook processing
- external write
- payment-like operation

재시도로 동일한 외부 작업이 여러 번 실행되지 않도록 한다.

---

## 22. Observability Tests

필요한 경우 다음을 테스트한다.

- error code
- request id
- agent run id
- tool execution id
- audit record
- latency metric
- provider information

로그 자체의 정확한 문구보다 필요한 정보가 기록되는지를 검증한다.

---

## 23. Test Naming

좋은 예:

```text
denies tool execution when permission is revoked
returns timeout error when provider exceeds deadline
does not expose another user's memory
```

나쁜 예:

```text
test1
works
permission test
```

---

## 24. Test Structure

가능하면 Arrange / Act / Assert 구조를 사용한다.

```text
Arrange
  테스트 상태 준비

Act
  검증할 행동 실행

Assert
  기대 결과 확인
```

---

## 25. Coverage Policy

숫자 coverage 자체를 목표로 삼지 않는다.

높은 coverage보다 중요한 것은 다음이다.

- critical path가 테스트되는가
- 위험한 권한 경계가 테스트되는가
- regression 가능성이 높은 로직이 테스트되는가
- failure mode가 테스트되는가

Coverage는 누락을 찾는 보조 지표로 사용한다.

---

## 26. CI Test Order

```text
Install
  ↓
Formatting
  ↓
Lint
  ↓
Typecheck
  ↓
Unit Tests
  ↓
Integration Tests
  ↓
Build
  ↓
Selected E2E
```

비용이 큰 live AI evaluation은 모든 commit마다 실행하지 않고 별도 workflow로 운영할 수 있다.

---

## 27. Local Verification

기본 로컬 검증:

```bash
pnpm check
```

이 command는 formatting, lint, typecheck, test 및 build를 포함한다.

실제 integration, E2E 또는 live suite가 추가된 경우 변경 위험에 따라 해당 script를 추가로 실행한다.

---

## 28. Bug Fix Rule

버그를 수정할 때 가능하면 먼저 재현 테스트를 만든다.

```text
Reproduce bug
   ↓
Add failing test
   ↓
Fix
   ↓
Test passes
   ↓
Commit
```

---

## 29. Release Gate

release 또는 production 배포 전에 최소한 다음을 확인한다.

- lint
- typecheck
- unit test
- critical integration test
- build
- migration review
- permission regression
- secret scan
- critical E2E flow

---

## 30. What Not to Test

다음 항목은 과도하게 테스트하지 않는다.

- framework 자체의 동작
- third-party library 내부 구현
- 단순 getter / setter
- 의미 없는 snapshot
- 내부 private 함수의 모든 줄

테스트는 ODYS의 계약과 위험에 집중한다.

---

## 31. Definition of Tested

기능은 다음 조건을 만족할 때 충분히 검증된 것으로 본다.

- 핵심 성공 경로가 테스트된다.
- 중요한 실패 경로가 테스트된다.
- 권한 경계가 테스트된다.
- 외부 입력 검증이 테스트된다.
- 관련 모듈 계약이 보호된다.
- regression test가 필요한 버그 수정에는 테스트가 추가되었다.
- 필요한 수준의 integration 또는 E2E 검증이 있다.

---

## 32. Related Documents

- `DEVELOPMENT_WORKFLOW.md`
- `AI_DEVELOPMENT_WORKFLOW.md`
- `../40_decisions/ADR-003-modular-monolith.md`
- `../40_decisions/ADR-005-ai-sdk-model-independence.md`
- `../40_decisions/ADR-006-supabase.md`
- `../40_decisions/ADR-007-progressive-autonomy.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`
- `../20_architecture/AGENT_ARCHITECTURE.md`
- `../20_architecture/TOOL_ARCHITECTURE.md`

---

## 33. Final Rule

테스트의 목적은 숫자를 높이는 것이 아니라 **잘못된 변경이 사용자와 시스템에 도달하기 전에 발견하는 것**이다.

**Test the contracts, the risks, the failures, and the behavior that matters.**
