# CODING_STANDARDS

> ODYS 코드베이스의 가독성, 일관성, 안전성, 유지보수성을 보장하기 위한 공통 코딩 표준이다.

---

## 01. Purpose

이 문서는 ODYS에서 작성되는 production code와 주요 test code에 적용되는 기본 코딩 규칙을 정의한다.

목표는 다음과 같다.

- 코드의 의미가 빠르게 읽히도록 한다.
- 사람과 AI coding assistant가 동일한 기준으로 코드를 작성하도록 한다.
- Core / Pack / Infrastructure 경계를 코드 수준에서 유지한다.
- TypeScript의 타입 시스템을 적극적으로 활용한다.
- 오류, 외부 입력, 비동기 작업을 명시적으로 다룬다.
- 장기적으로 리팩터링 가능한 코드베이스를 유지한다.

이 문서는 formatting 규칙만을 다루는 문서가 아니다.

ODYS의 Architecture Decision을 실제 소스 코드에 반영하는 **implementation standard**다.

---

## 02. Scope

기본 적용 대상:

- TypeScript source code
- Backend application
- Web application
- Core modules
- Packs
- Agent Runtime
- Tool Runtime
- Model Gateway
- API contracts
- Internal libraries
- Test code
- Scripts

Python이나 다른 언어를 추가하는 경우에도 ODYS의 공통 아키텍처와 보안 원칙은 동일하게 적용한다.

---

## 03. Source of Truth

코딩 규칙이 충돌할 경우 우선순위는 다음과 같다.

1. Accepted ADR
2. Architecture documents
3. Repository configuration
4. 이 문서
5. 팀 또는 개발자의 개인 취향

Repository 설정의 예:

- `tsconfig.json`
- ESLint configuration
- formatter configuration
- `package.json`
- workspace configuration

개인 취향으로 repository 규칙을 우회하지 않는다.

---

## 04. TypeScript First

ODYS의 기본 애플리케이션 언어는 TypeScript다.

기본 원칙:

```text
Default application language -> TypeScript
Specialized workload         -> Best-fit language when justified
```

TypeScript에서는 strict type checking을 유지한다.

---

## 05. Formatting

Formatting은 자동화된 formatter를 source of truth로 사용한다.

원칙:

- indentation을 파일마다 다르게 사용하지 않는다.
- quote style을 임의로 변경하지 않는다.
- semicolon 여부를 개인 취향으로 결정하지 않는다.
- unrelated formatting을 기능 변경과 섞지 않는다.
- formatting 논쟁보다 architecture와 correctness에 review 시간을 사용한다.

---

## 06. Naming

이름은 짧은 것보다 의미가 명확한 것을 우선한다.

좋은 예:

```ts
const permissionDecision = evaluateToolPermission(input);
const activeSession = await sessionRepository.findActiveByUserId(userId);
```

피해야 할 예:

```ts
const x = check(i);
const data2 = await repo.get(id);
```

---

## 07. Naming Convention

### Variables / Functions

`camelCase`

```ts
userId;
agentRunId;
validateToolInput();
resolveModelProvider();
```

### Types / Classes

`PascalCase`

```ts
AgentRun;
ToolDefinition;
PermissionDecision;
ModelProviderAdapter;
```

### Constants

일반적인 module constant:

```ts
const defaultTimeoutMs = 30_000;
```

명확한 시스템 상수:

```ts
const MAX_AGENT_STEPS = 12;
```

모든 `const`를 무조건 `UPPER_SNAKE_CASE`로 만들지 않는다.

---

## 08. Boolean Names

Boolean은 질문처럼 읽히게 작성한다.

권장:

```ts
isAuthenticated;
hasPermission;
canExecute;
shouldRetry;
wasConfirmed;
```

피해야 할 예:

```ts
auth;
permission;
flag;
check;
```

---

## 09. Function Responsibility

함수는 하나의 주된 책임을 가져야 한다.

다음 책임을 한 함수에 무분별하게 섞지 않는다.

- validation
- authorization
- database access
- external API call
- transformation
- logging
- response formatting

권장 흐름:

```text
validate
  ↓
authorize
  ↓
execute
  ↓
normalize
```

---

## 10. Function Arguments

인자가 많아지면 object parameter를 고려한다.

피해야 할 예:

```ts
executeTool(toolId, userId, sessionId, timeout, retryCount, confirmed);
```

권장:

```ts
executeTool({
  toolId,
  userId,
  sessionId,
  timeoutMs,
  retryCount,
  confirmed,
});
```

---

## 11. Return Types

반환값의 의미가 호출자에게 명확해야 한다.

피해야 할 예:

```ts
return null;
```

필요하면 명시적인 union을 사용한다.

```ts
type ToolExecutionResult =
  | { status: 'success'; output: ToolOutput }
  | { status: 'denied'; reason: string }
  | { status: 'failed'; error: ToolExecutionError };
```

---

## 12. Avoid `any`

`any`는 기본적으로 사용하지 않는다.

외부 값은 `unknown`으로 받고 검증 후 좁힌다.

```ts
function parseResult(value: unknown) {
  return resultSchema.parse(value);
}
```

`any`가 필요한 경우 범위를 최소화하고 이유를 설명할 수 있어야 한다.

---

## 13. Type Assertions

다음 코드는 runtime validation이 아니다.

```ts
const payload = request.body as ToolPayload;
```

외부 입력은 schema validation을 사용한다.

```ts
const payload = toolPayloadSchema.parse(request.body);
```

---

## 14. Non-Null Assertion

`!` 사용은 최소화한다.

피해야 할 예:

```ts
const user = users.get(userId)!;
```

권장:

```ts
const user = users.get(userId);

if (!user) {
  throw new UserNotFoundError(userId);
}
```

---

## 15. Domain Types

외부 시스템의 type을 ODYS Domain Entity와 동일하게 취급하지 않는다.

```text
Supabase Row
    ↓ mapper
ODYS Domain Entity
```

```text
Provider Response
    ↓ adapter
ODYS Model Response
```

Provider 또는 BaaS의 type이 Core 전체로 퍼지지 않도록 한다.

---

## 16. Validation Boundary

다음 값은 기본적으로 신뢰하지 않는다.

- HTTP request
- query parameter
- environment variable
- AI model output
- Tool input
- webhook payload
- third-party API response
- file metadata
- database JSON field

가능한 한 boundary에서 빠르게 검증한다.

---

## 17. Error Types

중요한 실패는 의미 있는 error category를 가진다.

예:

```text
ValidationError
PermissionDeniedError
ToolTimeoutError
ProviderUnavailableError
ModelOutputValidationError
```

최소한 다음을 구분할 수 있어야 한다.

- 사용자 입력 오류
- 권한 오류
- 재시도 가능한 외부 오류
- 재시도 불가능한 오류
- 내부 invariant 위반

---

## 18. Error Messages

사용자-facing 메시지와 내부 debug 정보를 분리한다.

사용자에게 다음을 그대로 노출하지 않는다.

- stack trace
- SQL query
- secret
- 내부 file path
- infrastructure detail

반대로 내부 log에는 추적에 필요한 context를 남긴다.

---

## 19. Async Operations

외부 비동기 호출은 다음 실패를 고려한다.

- timeout
- cancellation
- retry
- fallback
- duplicate execution

중요한 외부 호출을 무기한 대기 상태로 방치하지 않는다.

---

## 20. Retry

모든 실패를 재시도하지 않는다.

재시도 가능한 예:

- temporary network error
- rate limit
- transient provider failure

재시도하면 안 되는 예:

- validation failure
- permission denied
- invalid credential
- deterministic business-rule failure

write operation은 idempotency를 검토한다.

---

## 21. Null and Undefined

`null`과 `undefined`의 의미를 무분별하게 혼용하지 않는다.

필요하면 contract에서 의미를 정한다.

예:

```text
undefined -> value not provided
null      -> explicitly empty
```

---

## 22. Comments

주석은 코드가 무엇을 하는지 반복하기보다 **왜 그렇게 하는지** 설명한다.

피해야 할 예:

```ts
// userId를 가져온다.
const userId = session.userId;
```

좋은 예:

```ts
// Permission is evaluated at execution time because
// an earlier grant may have been revoked.
const decision = await permissionService.evaluate(input);
```

---

## 23. TODO

의미 없는 TODO를 남기지 않는다.

피해야 할 예:

```ts
// TODO: fix later
```

권장:

```ts
// TODO(ODYS-142): remove compatibility path after migration.
```

중요한 장기 작업은 issue 또는 task로 추적한다.

---

## 24. Core / Pack Boundary

ADR-002를 코드에서 지킨다.

```text
Pack
  ↓
Core Public Contract
  ↓
Core
```

금지:

```text
Pack -> Core private implementation
Pack A -> Pack B private implementation
Core -> Pack-specific domain entity
```

---

## 25. Modular Monolith Boundary

ADR-003을 따른다.

물리적으로 하나의 애플리케이션이어도 module boundary를 무너뜨리지 않는다.

금지:

- deep import로 private module 접근
- circular dependency
- infrastructure SDK의 domain 침투
- shared 폴더를 무제한 공용 창고처럼 사용

---

## 26. Imports

가능하면 public entry point를 통해 import한다.

피해야 할 예:

```ts
import { saveMemory } from '../../../core/memory/internal/repository';
```

권장 개념:

```ts
import { memoryService } from '@odys/core-memory';
```

실제 alias는 repository 설정을 따른다.

---

## 27. Model Provider Boundary

Provider SDK는 Model Gateway / Provider Adapter 경계 내부에 제한한다.

피해야 할 구조:

```text
Study Pack -> Provider SDK
Career Pack -> Provider SDK
```

권장:

```text
Pack
 ↓
Model Gateway
 ↓
Provider Adapter
```

---

## 28. Supabase Boundary

Supabase SDK는 data access / infrastructure 영역에 집중시킨다.

- Core Domain이 Supabase Row에 직접 의존하지 않는다.
- service role credential은 server-side에서만 사용한다.
- client code에 privileged credential을 넣지 않는다.

---

## 29. Agent Code

Agent의 판단과 실제 실행 권한을 분리한다.

```text
Agent Plan
   ↓
Tool Input Validation
   ↓
Permission Evaluation
   ↓
Confirmation when required
   ↓
Execution
```

Agent가 행동이 필요하다고 판단했다는 이유만으로 권한이 자동 생성되지 않는다.

---

## 30. Tool Code

각 Tool은 가능한 한 다음 contract를 가진다.

- identifier
- description
- input schema
- output schema
- risk level
- permission requirement
- execution handler
- timeout policy

Tool의 side effect는 명확해야 한다.

---

## 31. Secrets

금지:

```ts
const apiKey = 'real-secret-value';
```

Secret은 환경 또는 secret manager를 통해 주입한다.

`.env.example`에는 실제 값이 아니라 변수 이름만 기록한다.

---

## 32. Logging

구조화된 logging을 선호한다.

유용한 context 예:

```text
requestId
userId
agentRunId
toolExecutionId
provider
latencyMs
errorCode
```

다음은 log에 남기지 않는다.

- API key
- access token
- password
- signing secret
- 불필요한 민감 사용자 데이터

---

## 33. Configuration

magic number와 magic string이 여러 위치에 흩어지지 않도록 한다.

피해야 할 예:

```ts
setTimeout(handler, 30000);
```

권장:

```ts
const timeoutMs = config.toolExecution.timeoutMs;
```

단, 자명한 모든 값을 과도하게 configuration으로 추상화하지 않는다.

---

## 34. Environment Variables

환경 변수는 startup 단계에서 검증하고 typed configuration으로 변환하는 방식을 선호한다.

```text
Environment
   ↓ validate
Typed Config
   ↓
Application
```

잘못된 설정은 가능한 한 빠르게 실패한다.

---

## 35. API Handlers

API handler에는 다음 경계를 명확히 한다.

- input validation
- authentication
- authorization
- application service call
- response mapping
- error mapping

route handler에 business logic 전체를 넣지 않는다.

---

## 36. Database Access

database query를 UI, prompt 또는 Agent reasoning layer에 직접 배치하지 않는다.

Repository 또는 명확한 data-access layer를 사용한다.

Transaction이 필요한 작업은 boundary를 명시한다.

---

## 37. Tests

Test code도 읽기 쉬워야 한다.

좋은 이름:

```text
denies tool execution when permission is revoked
```

피해야 할 이름:

```text
works
test1
caseA
```

Arrange / Act / Assert 구조를 권장한다.

---

## 38. Mocking

Mock은 외부 의존성을 격리하는 데 사용한다.

적절한 대상:

- AI provider
- external API
- email provider
- calendar provider
- clock
- random source

모든 내부 함수를 mock하여 실제 behavior를 잃는 테스트는 피한다.

---

## 39. Dead Code

사용하지 않는 코드와 import는 제거한다.

`나중에 쓸지도 모른다`는 이유만으로 유지하지 않는다.

Git history가 과거 코드를 보존한다.

---

## 40. Duplication

모든 중복이 나쁜 것은 아니다.

공통화는 다음이 같을 때 수행한다.

- 의미
- 변경 이유
- lifecycle
- 책임

두 Pack의 코드가 우연히 비슷하다는 이유만으로 Core로 이동하지 않는다.

---

## 41. Complexity

다음은 리팩터링 신호다.

- 깊은 nested condition
- 지나치게 긴 함수
- 많은 boolean parameter
- 숨겨진 side effect
- 하나의 함수에서 여러 외부 시스템 호출
- 복잡한 conditional chain

복잡성이 실제 domain 복잡성인지 구현이 만든 우발적 복잡성인지 구분한다.

---

## 42. Performance

성능 최적화는 측정 가능한 문제를 해결하기 위해 수행한다.

가능하면 다음을 남긴다.

- baseline
- bottleneck
- change
- result

가독성과 correctness를 추측성 최적화로 희생하지 않는다.

---

## 43. Security-Critical Code

다음 영역은 편의보다 명시성을 우선한다.

- authentication
- authorization
- permission
- user data isolation
- destructive Tool execution
- secret management
- external input validation

---

## 44. AI-Generated Code

AI가 작성한 코드도 동일한 기준을 적용한다.

반드시 확인한다.

- 실제 존재하는 API인가
- type safety를 우회하지 않는가
- architecture boundary를 지키는가
- 불필요한 dependency가 추가되지 않았는가
- 테스트가 있는가
- security regression이 없는가

---

## 45. Required Local Checks

Push 전 전체 local quality gate:

```bash
pnpm check
```

실제 command는 repository의 `package.json`을 source of truth로 한다.

---

## 46. Code Review Checklist

### Readability

- 이름으로 의도가 드러나는가
- 함수 책임이 명확한가
- 불필요한 복잡성이 없는가

### Types

- `any`로 문제를 숨기지 않았는가
- 외부 입력을 검증하는가
- assertion이 과도하지 않은가

### Architecture

- Core / Pack 경계를 지키는가
- Provider / Supabase SDK가 adapter 내부에 있는가

### Reliability

- timeout과 오류가 처리되는가
- retry가 안전한가
- side effect가 명확한가

### Security

- permission을 우회하지 않는가
- secret이 없는가
- 사용자 데이터 격리가 유지되는가

---

## 47. Exceptions

규칙의 예외가 필요한 경우 다음 조건을 만족해야 한다.

1. 실제 문제를 해결한다.
2. 이유를 설명할 수 있다.
3. architecture invariant를 깨지 않는다.
4. 유지보수 비용을 검토했다.

반복적인 예외는 규칙 또는 아키텍처 재검토 신호다.

---

## 48. Related Documents

- `DEVELOPMENT_WORKFLOW.md`
- `AI_DEVELOPMENT_WORKFLOW.md`
- `TEST_STRATEGY.md`
- `RELEASE_PROCESS.md`
- `../40_decisions/ADR-002-core-vs-pack.md`
- `../40_decisions/ADR-003-modular-monolith.md`
- `../40_decisions/ADR-004-typescript-primary.md`
- `../40_decisions/ADR-005-ai-sdk-model-independence.md`
- `../40_decisions/ADR-006-supabase.md`
- `../40_decisions/ADR-007-progressive-autonomy.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`

---

## 49. Final Rule

좋은 ODYS 코드는 단순히 실행되는 코드가 아니다.

다른 개발자와 미래의 자신, 그리고 AI coding assistant가 의도와 경계를 정확히 이해할 수 있어야 한다.

**Write explicit code, preserve boundaries, validate every external assumption.**
