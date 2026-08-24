# ADR-008 — Integrated Agent Execution

- Status: Accepted
- Date: 2026-08-24

---

## 01. Context

ODYS에서 Agent는 특정 responsibility를 수행하기 위해 Context, Model 및 Tool capability를 사용하는 execution unit이다.

Agent는 AI Model 자체가 아니며, Agent가 무엇을 수행할 것인지는 Agent Definition과 Pack이 표현하고 Agent를 어떤 절차와 안전장치 아래 실행할지는 ODYS Core Agent Runtime이 관리한다.

ODYS가 목표로 하는 대표적인 Agent execution lifecycle은 다음과 같다.

```text
User Request
      │
      ▼
Agent Resolution
      │
      ▼
Context Preparation
      │
      ▼
Model Strategy Resolution
      │
      ▼
Model Invocation
      │
      ├───────────────────┐
      │                   │
      ▼                   ▼
Direct Result        Tool Request
                          │
                          ▼
                 Agent / Tool Guards
                          │
                          ▼
                      Tool Runtime
                          │
                          ▼
                      Tool Result
                          │
                          ▼
                 Agent Continuation
                          │
                          ▼
                     Final Result

```

IMPLEMENTATION-021까지 ODYS Core에는 이 lifecycle을 구성하기 위한 여러 staged foundation이 독립적으로 구현되어 있다.

### Current Agent Runtime Foundation

현재 Common Agent Runtime은:

- runtime request validation
- registered Agent resolution
- Registry-owned immutable `AgentDefinition` snapshot 사용
- injected provider-neutral `AgentRuntimeExecutor` seam으로 exactly-once dispatch
- opaque result return

만을 제공한다.

현재 `AgentRuntimeExecutor`는 Registry lookup 이후의 dispatch behavior를 검증하기 위한 staged seam이다.

이는 final Agent execution architecture나 authority boundary가 아니다.

### Current Model Runtime Foundation

현재 Model Runtime은:

- logical Model ID validation
- registered Model resolution
- Registry-owned immutable Model definition 사용
- provider-independent injected executor dispatch
- opaque output return

을 제공한다.

현재 Model Runtime은:

- complete Model Strategy
- capability-based routing
- normalized provider request / response
- concrete Provider Adapter
- Agent Runtime integration
- Tool integration

을 구현하지 않는다.

### Current Tool Runtime Foundation

현재 Tool Runtime은:

- Tool request validation
- registered Tool resolution
- input parsing
- declared Tool permission-requirement enforcement
- injected execution
- output parsing

을 제공한다.

현재 permission resolver와 requirement guard는 complete Permission System, user authorization, Workspace authorization, Policy, Approval 또는 production external-Action authority를 의미하지 않는다.

### Current AgentToolRuntime Foundation

현재 `AgentToolRuntime`은:

```text
Agent request
      │
      ▼
registered Agent resolution
      │
      ▼
Agent allowedTools guard
      │
      ▼
ToolRuntime

```

의 최소 composition을 제공한다.

Agent allowance가 실패하면 Tool Runtime의 permission resolver 또는 executor에 도달하지 않는다.

Agent `allowedTools`와 Tool `requiredPermissions`는 서로 다른 control axis다.

현재 아직 구현되지 않은 주요 execution capability는 다음과 같다.

- Model Strategy와 Agent execution integration
- normalized Model request / response
- model-generated Tool request handling
- Tool result를 이용한 Agent continuation
- bounded Model / Tool execution
- Context Assembly integration
- user / Workspace authorization
- Policy
- Approval
- Audit
- persistent Task lifecycle
- Memory candidate processing
- real external Tool execution
- production external-Action authority

이 foundation들을 complete Agent execution으로 연결하는 과정에서 implementation convenience가 장기 architecture를 우연히 결정해서는 안 된다.

따라서 ODYS는 Integrated Agent Execution의 ownership, dependency boundary, Model / Tool interaction, authority separation 및 execution bound를 명시적으로 결정한다.

---

## 02. Decision

ODYS의 **generic Agent execution orchestration은 Core Agent Runtime이 소유한다.**

Core Agent Runtime은 Model, Tool 및 향후 Context, Policy, Approval, Audit과 같은 execution capability를 하나의 거대한 concrete implementation에 직접 결합하지 않고 **명시적인 Core-controlled contract를 통해 composition**한다.

개념적인 target architecture는 다음과 같다.

```text
                     Core Agent Runtime
                            │
                            │ owns generic orchestration
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
       Context / Task   Model Boundary   AgentToolRuntime
                           │                 │
                           ▼                 ▼
                    ODYS Model Response   ToolRuntime
                           │                 │
                           ▼                 ▼
                  Execution Decision     Tool Result
                           │                 │
                    ┌──────┴──────┐          │
                    │             │          │
                    ▼             ▼          │
                 Result      Tool Request ───┘
                                      │
                                      ▼
                               Agent Continuation
                                      │
                                      └── bounded

```

이 diagram은 logical responsibility를 나타낸다.

각 box가 별도 process, service 또는 permanent concrete class여야 한다는 의미는 아니다.

---

### 2.1 Core Agent Runtime Owns Generic Orchestration

Agent execution lifecycle의 generic orchestration responsibility는 ODYS Core Agent Runtime에 둔다.

장기적으로 Agent Runtime은 다음 capability를 조정할 수 있다.

```text
Agent resolution
Context preparation
Model strategy resolution
Model invocation
Model response interpretation
Tool request handling
permission / policy coordination
Approval coordination
execution continuation
result construction
Task integration
Memory candidate processing
Audit

```

각 capability의 concrete implementation을 Agent Runtime 내부에 hard-code하는 것을 기본 방향으로 하지 않는다.

가능한 한 explicit Core contract를 통해 composition한다.

Domain-specific Agent 또는 Pack이 별도의 Core Agent execution loop를 구현하지 않는다.

---

### 2.2 Current AgentRuntimeExecutor Is a Staged Seam, Not an Architectural Invariant

현재 `AgentRuntimeExecutor`는 existing Common Agent Runtime foundation의 provider-neutral dispatch seam이다.

초기 Integrated Agent Execution implementation은 기존 contract를 불필요하게 깨지 않기 위해 이 seam을 재사용할 수 있다.

개념적으로 초기 implementation은 다음 형태가 될 수 있다.

```text
Current Common Agent Runtime
            │
            ▼
   AgentRuntimeExecutor
            │
            ▼
  staged integrated composition

```

그러나 다음을 architectural invariant로 규정하지 않는다.

```text
AgentRuntimeExecutor
=
permanent final execution topology

```

향후 complete Agent Runtime contract가 발전하면서 이 seam의 형태, 이름 또는 위치가 변경될 수 있다.

중요한 architectural invariant는 특정 current interface가 아니라 다음이다.

> Core Agent Runtime owns generic orchestration and composes execution capabilities through explicit boundaries.

현재 staged implementation을 이유로 미래 architecture를 고정하지 않는다.

---

### 2.3 Integrated Execution Is Not a Separate Mandatory Runtime Subsystem

ODYS는 `Agent Runtime`과 별개로 반드시 영구적인 `Integrated Execution Runtime`이라는 subsystem을 만들어야 한다고 결정하지 않는다.

구현 과정에서 다음과 같은 composition object가 필요할 수 있다.

```text
Integrated Agent Executor
Agent Execution Coordinator
Agent Model Executor

```

그러나 이러한 이름이나 concrete object는 implementation detail일 수 있다.

장기 logical ownership은 다음과 같다.

```text
Core Agent Runtime
        │
        └── generic Agent execution orchestration

```

따라서 implementation helper가 새로운 독립 architecture authority 또는 parallel Agent Runtime이 되지 않도록 한다.

---

### 2.4 Model Selection Follows Strategy and Capability, Not Caller-Controlled Provider Choice

Agent는 특정 Provider 또는 arbitrary concrete Model identifier에 직접 종속되는 것을 기본으로 하지 않는다.

Target model-selection flow는 다음과 같다.

```text
Agent execution requirement
          │
          ▼
Model Strategy / Required Capability
          │
          ▼
Core-controlled Model Resolution
          │
          ▼
Logical Model
          │
          ▼
Model Runtime / Model Boundary
          │
          ▼
Provider Adapter

```

Agent execution caller가 unrestricted하게 다음 정보를 지정하여 Core model strategy를 우회하도록 하지 않는다.

```text
provider
provider SDK
provider-owned model identifier

```

Model selection은 가능한 한 다음 요구를 기반으로 한다.

- reasoning capability
- Tool capability
- context requirement
- structured-output capability
- latency preference
- cost preference
- reliability requirement
- privacy requirement

현재 staged `AgentDefinition`에는 아직 `modelStrategy` 또는 equivalent contract가 존재하지 않는다.

따라서 complete Model Strategy contract가 구현되기 전까지 construction-time trusted resolver와 같은 narrow seam을 사용하여 logical Model을 선택할 수 있다.

그러나 이러한 temporary resolver는 target Model Strategy architecture를 대체하지 않는다.

현재 placeholder를 추가하여 future Model Strategy contract를 성급하게 고정하지 않는다.

---

### 2.5 Model Execution Uses the Model Boundary

Core Agent Runtime이나 Pack은 Provider SDK를 직접 호출하여 Model execution을 수행하지 않는다.

Model execution은 ODYS Model abstraction boundary를 사용한다.

```text
Core Agent Runtime
        │
        ▼
   Model Boundary
        │
        ▼
 Model Strategy / Router
        │
        ▼
 Provider Adapter
        │
        ▼
 Model Provider

```

초기 implementation에서 current staged Model Runtime을 사용할 수 있다.

그러나 current opaque Model Runtime result 자체가 final normalized Model contract라고 간주하지 않는다.

Provider-specific execution representation이 Agent domain logic이나 generic Core Agent execution contract 전체에 퍼지지 않도록 한다.

---

### 2.6 The Model Boundary Owns Provider-Independent Response Normalization

Provider별 response representation은 서로 다를 수 있다.

예:

```text
Provider A tool call
Provider B tool use
Provider C function invocation

```

이 차이를 generic Agent Runtime의 canonical semantics로 사용하지 않는다.

Target architecture에서 Model boundary는 provider-specific response를 ODYS가 이해할 수 있는 validated, provider-independent Model Response로 normalize한다.

개념적으로 Model Response는 다음 정보를 포함할 수 있다.

```text
ODYS Model Response

├── generated content
├── structured output
├── Tool request information
├── finish reason
├── usage
├── Model metadata
└── provider-neutral execution metadata

```

실제 field와 TypeScript schema는 Model contract implementation 단계에서 결정한다.

특정 Provider SDK type을 ODYS의 canonical Model Response type으로 사용하지 않는다.

---

### 2.7 Agent Execution Interprets Execution-Relevant Model Outcomes

Agent Runtime은 validated ODYS Model Response에서 현재 execution에 필요한 의미를 해석한다.

최소 execution 의미는 다음과 같을 수 있다.

```text
continue without Tool
Tool capability requested
execution completed
execution cannot continue

```

초기 implementation은 의도적으로 더 좁은 형태를 사용할 수 있다.

예:

```text
Final
Tool Request

```

또한 초기 implementation은 Model turn당 하나의 Tool request만 지원할 수 있다.

그러나 다음을 장기 architectural invariant로 규정하지 않는다.

```text
모든 Model Response는 영구적으로
Final | Single ToolRequest
두 종류만 존재한다.

```

향후 실제 requirement가 생기면 다음 capability를 별도 설계할 수 있어야 한다.

- multiple Tool requests
- parallel Tool requests
- richer structured response
- streaming execution events
- additional finish states

초기 contract는 필요한 최소 범위만 구현하되 미래 execution semantics를 불필요하게 차단하지 않는다.

---

### 2.8 Model Output Is Untrusted

Model output은 deterministic Core output이나 trusted authority로 취급하지 않는다.

특히 Model output이 다음 동작으로 이어지는 경우 runtime validation을 수행해야 한다.

```text
Tool execution
database mutation
Memory creation
file write
external communication
structured domain object creation

```

개념적인 boundary는 다음과 같다.

```text
Raw Provider Output
        │
        ▼
Model Boundary Validation / Normalization
        │
        ▼
ODYS Model Response
        │
        ▼
Agent Execution Interpretation

```

모델이 valid-looking JSON을 생성했다는 사실만으로 execution input으로 신뢰하지 않는다.

---

### 2.9 Model Tool Requests Do Not Create Action Authority

Model이 특정 Tool을 사용해야 한다고 판단하거나 Tool request를 생성했다는 사실은 실제 execution authority가 아니다.

다음을 명확히 구분한다.

```text
Model requested Tool
        ≠
Agent may use Tool
        ≠
Tool permission requirements satisfied
        ≠
User authorized Action
        ≠
Workspace authorized Action
        ≠
Policy allows Action
        ≠
Approval satisfied
        ≠
Production external Action authorized

```

Reasoning capability와 Action authority를 분리한다.

Model prompt 또는 provider-native Tool Calling만으로 deterministic Core security boundary를 우회하지 않는다.

---

### 2.10 Agent-Originated Tool Requests Must Pass AgentToolRuntime

Model-generated Tool request를 포함하여 Agent execution에서 발생한 Tool request는 Agent-side Tool allowance boundary를 통과해야 한다.

현재 staged architecture에서는 `AgentToolRuntime`이 이 composition을 담당한다.

```text
Agent execution
      │
      ▼
Tool Request
      │
      ▼
AgentToolRuntime
      │
      ├── registered Agent resolution
      ├── allowedTools guard
      │
      ▼
ToolRuntime

```

Integrated Agent execution implementation이 Agent-side guard를 생략하고 `ToolRuntime`을 직접 호출하는 우회 경로를 기본 execution path로 만들지 않는다.

향후 concrete runtime composition이 변경되더라도 다음 invariant는 유지한다.

> Agent-originated Tool execution must pass an Agent-specific capability boundary before Tool execution authority can be considered.

---

### 2.11 Tool Runtime Remains the Tool Execution Boundary

Agent Runtime은 Tool의 input/output validation이나 actual Tool execution logic을 중복 구현하지 않는다.

Tool execution은 Tool Runtime boundary를 사용한다.

현재 staged Tool Runtime의 ordering은 다음과 같다.

```text
Tool request validation
        │
        ▼
Tool resolution
        │
        ▼
input parsing
        │
        ▼
declared permission-requirement enforcement
        │
        ▼
executor
        │
        ▼
output parsing

```

향후 complete Tool security lifecycle은 다음 capability를 추가할 수 있다.

```text
Authorization
Permission
Policy
Approval
Execution
Output Validation
Audit

```

Integrated Agent execution은 이러한 Tool-side responsibility를 Agent Runtime에 복제하지 않는다.

---

### 2.12 Agent Tool Allowance and Tool Permission Requirements Remain Separate

Agent `allowedTools`와 Tool `requiredPermissions`는 서로 다른 질문에 답한다.

Agent `allowedTools`:

> 이 Agent가 이 Tool capability를 사용할 수 있다고 선언되어 있는가?

Tool `requiredPermissions`:

> 이 Tool이 선언한 permission requirement가 supplied permission identifiers에 의해 충족되는가?

두 declaration은 서로 derive하지 않는다.

```text
Agent allowedTools
        ≠
Tool requiredPermissions

```

Agent allowance 성공으로 Tool permission이 생성되지 않는다.

Tool permission requirement 성공으로 Agent allowance가 생성되지 않는다.

두 guard가 모두 성공해도 user / Workspace authorization, Policy, Approval 또는 production execution authority가 자동 생성되지 않는다.

---

### 2.13 Failure Ordering Must Remain Fail-Closed

Integrated Agent Execution은 earlier guard failure가 later execution-capable dependency에 도달하지 않도록 한다.

대표적인 ordering invariant는 다음과 같다.

```text
invalid Model response
→ Tool request handling에 도달하지 않음

Agent Tool denial
→ Tool permission resolver에 도달하지 않음
→ Tool executor에 도달하지 않음

invalid Tool input
→ Tool executor에 도달하지 않음

unsatisfied Tool permission requirement
→ Tool executor에 도달하지 않음

```

future Policy 또는 Approval boundary가 추가되면 동일한 fail-closed 원칙을 적용한다.

---

### 2.14 Tool Results Can Be Intermediate Agent Execution State

Tool execution result를 항상 최종 사용자 response로 간주하지 않는다.

Tool은 Agent reasoning을 위한 중간 capability일 수 있다.

따라서 Agent execution은 Tool result를 Model continuation에 다시 사용할 수 있어야 한다.

```text
Model
  │
  ▼
Tool Request
  │
  ▼
Agent / Tool Boundary
  │
  ▼
Tool Result
  │
  ▼
Model Continuation
  │
  ▼
Final Result

```

Tool result는 Tool Runtime의 output validation을 통과한 canonical result를 사용한다.

Provider-specific tool-call metadata를 Agent / Pack 전체에 직접 노출하지 않는다.

Continuation representation은 Model boundary와 Agent execution contract를 통해 표현한다.

---

### 2.15 Agent Execution Must Be Bounded

Model과 Tool을 반복적으로 조합할 수 있다는 사실은 unlimited execution authority를 의미하지 않는다.

다음 형태의 unbounded execution을 허용하지 않는다.

```text
Model
  ↓
Tool
  ↓
Model
  ↓
Tool
  ↓
Model
  ↓
...

```

Agent Runtime은 execution을 deterministic하게 제한할 수 있는 Core-controlled bound를 가져야 한다.

bound의 형태는 implementation requirement에 따라 달라질 수 있다.

예:

```text
maximum execution steps
maximum Tool turns
maximum retries
timeout
cost budget

```

ADR에서 특정 숫자를 고정하지 않는다.

초기 implementation은 필요한 최소 bound부터 도입한다.

bound를 초과한 execution은 명시적인 failure로 종료한다.

모델의 natural-language 판단만으로 loop termination을 제어하지 않는다.

---

### 2.16 Retry and Loop Semantics Are Different

Agent continuation loop와 transient failure retry를 동일하게 취급하지 않는다.

Retry가 적합할 수 있는 경우:

- transient provider failure
- temporary network failure
- rate limit
- explicitly recoverable Tool failure

Retry가 적합하지 않은 경우:

- invalid Model response
- invalid Tool input
- Agent Tool denial
- permission denial
- Policy violation
- Approval rejection
- ambiguous destructive Action

Retry에도 명시적인 maximum attempt와 termination rule을 적용한다.

---

### 2.17 Integrated Execution Does Not Grant Authorization

다음 사실은 그 자체로 user 또는 external Action authority를 의미하지 않는다.

- Agent registration
- Model registration
- Tool registration
- successful Agent dispatch
- successful Model invocation
- Model-generated Tool request
- Agent `allowedTools` success
- Tool `requiredPermissions` success
- successful staged runtime composition
- successful Model / Tool continuation

실제 외부 Action authority에는 향후 필요한 범위에서 다음 control이 적용된다.

```text
authenticated identity
user authorization
Workspace authorization
resource scope
Agent capability
Tool permission
Policy
Tool risk
Autonomy level
Approval
Audit

```

특히 high-risk, destructive 또는 irreversible Action은 complete authority boundary가 구현되기 전에 활성화하지 않는다.

---

### 2.18 Integrated Agent Execution Does Not Prematurely Absorb Deferred Subsystems

Integrated Agent Execution을 구현한다는 이유로 다음 subsystem의 incomplete contract를 한 번에 추가하지 않는다.

- Context Assembly
- Memory lifecycle
- persistent Task state
- complete Model Strategy
- advanced Model routing
- Permission grant / persistence
- user / Workspace authorization
- Policy engine
- Approval
- Audit persistence
- Pack lifecycle
- provider retry / fallback
- real external Integration
- multi-agent orchestration

각 capability는 실제 contract가 필요해지는 시점에 명시적으로 설계하고 Agent Runtime에 composition한다.

Future requirement를 추측하여 placeholder API를 추가하지 않는다.

---

## 03. Architectural Invariants

Integrated Agent Execution은 다음 invariant를 유지한다.

### I1 — Core Owns Generic Agent Execution

Generic execution mechanics는 Core가 소유한다.

Pack이나 individual Agent가 독립적인 Core runtime을 구현하지 않는다.

### I2 — Current Staged Seams Are Not Automatically Architecture

현재 `AgentRuntimeExecutor`, opaque Model result 또는 다른 staged interface가 존재한다는 사실만으로 이를 permanent architecture로 간주하지 않는다.

### I3 — Strategy Before Provider

Agent execution은 특정 Provider보다 Model Strategy와 capability requirement를 우선한다.

### I4 — Provider Details Stay Behind the Model Boundary

Provider-specific Model request, response 및 Tool Calling semantics가 generic Agent execution contract를 결정하지 않는다.

### I5 — Model Output Is Untrusted

Model output은 validation과 normalization 없이 execution authority나 trusted Core state가 되지 않는다.

### I6 — Model Tool Request Is Not Authority

Model이 Tool을 요청했다는 사실은 실행 권한이 아니다.

### I7 — Agent Tool Capability Cannot Be Bypassed

Agent-originated Tool request는 Agent-specific Tool capability boundary를 통과한다.

### I8 — Tool Runtime Owns Tool Execution Semantics

Tool input validation, Tool-side security checks, execution 및 output validation은 Tool Runtime boundary에 둔다.

### I9 — Agent Allowance and Tool Permission Are Independent

`allowedTools`와 `requiredPermissions`를 하나의 implicit authority로 합치지 않는다.

### I10 — Earlier Failure Prevents Later Execution

Execution-capable dependency는 preceding validation과 guard가 성공한 경우에만 호출한다.

### I11 — Tool Result May Be Intermediate

Tool result와 final Agent result를 동일하게 취급하지 않는다.

### I12 — Agent Execution Is Bounded

Model / Tool continuation과 retry는 명시적인 upper bound를 가진다.

### I13 — Runtime Composition Does Not Grant Authorization

Runtime wiring, Registry membership 또는 guard success가 user / Workspace / Policy / Approval authority를 생성하지 않는다.

### I14 — Architecture Leaves Room for Future Contract Evolution

초기 single-Tool, narrow outcome 또는 current executor seam을 future architecture의 불필요한 제약으로 고정하지 않는다.

---

## 04. Rationale

### 4.1 Preserve Clear Runtime Responsibilities

ODYS는 Agent, Model 및 Tool foundation을 작은 contract와 단계적인 implementation으로 구축했다.

Integrated Agent Execution을 이유로 이 capability를 하나의 거대한 concrete runtime으로 합치면 responsibility가 다시 불명확해질 수 있다.

Explicit composition은 각 capability의 독립적인 검증과 evolution을 유지한다.

---

### 4.2 Prevent Accidental Architecture

Current implementation에는 staged seam이 존재한다.

Staged seam은 다음 implementation으로 이동하기 위한 검증 지점이지 반드시 장기 architecture가 아니다.

ADR은 현재 코드에 우연히 존재하는 shape보다 장기적으로 유지해야 하는 responsibility와 dependency rule을 기록해야 한다.

---

### 4.3 Keep Agent Runtime General

Agent Runtime은 Study, Career, Coding과 같은 특정 Domain knowledge를 소유하지 않는다.

동일한 generic execution infrastructure를 여러 Pack과 Agent가 공유할 수 있어야 한다.

---

### 4.4 Preserve Model Independence

Provider마다 Tool Calling, structured output 및 continuation protocol이 다를 수 있다.

Provider-specific representation을 Agent execution contract에 직접 노출하면 새로운 Provider 도입 시 Agent Runtime과 Pack까지 변경될 수 있다.

Model boundary에서 provider-specific difference를 normalize하면 higher-level Core execution을 안정적으로 유지할 수 있다.

---

### 4.5 Keep Model Strategy Evolvable

현재 complete Model Strategy가 구현되지 않았다는 이유로 Agent Definition에 premature provider/model contract를 추가하지 않는다.

초기에는 narrow logical-model resolution로 진행할 수 있지만 target architecture는 capability와 strategy 중심으로 유지한다.

---

### 4.6 Enforce Least Privilege

Model은 probabilistic reasoning component다.

Model이 Tool을 사용할 수 있다고 판단해도 deterministic Core guard가 실제 capability를 통제해야 한다.

Agent-specific Tool allowance와 Tool-specific permission requirement를 독립적으로 유지하면 서로 다른 security concern을 명확하게 검증할 수 있다.

---

### 4.7 Preserve Progressive Autonomy

Agent가 Tool을 사용하고 Model continuation까지 수행할 수 있게 되더라도 실제 external Action authority를 별도로 유지하면 execution capability를 안전하게 단계적으로 확장할 수 있다.

이는 다음 원칙을 가능하게 한다.

```text
reason
→ propose
→ prepare
→ authorize
→ approve when required
→ execute

```

---

### 4.8 Support Real Tool-Using Agent Behavior

실제 Tool-using Agent는 Tool result를 단순 반환하는 것보다 이를 해석하여 최종 response를 만들어야 할 수 있다.

Tool result continuation을 first-class execution concept으로 인정해야 일반적인 Agent behavior를 표현할 수 있다.

---

### 4.9 Bound Cost, Latency, and Failure

Model / Tool execution은 비용과 side effect를 포함할 수 있다.

Unbounded execution은 다음 문제를 만든다.

- cost explosion
- excessive latency
- infinite loops
- repeated Tool execution
- difficult debugging
- unclear failure state
- unpredictable external impact

Core-controlled execution bound를 통해 failure radius를 제한한다.

---

### 4.10 Avoid Premature Generalization

초기 implementation에서 하나의 Model turn당 하나의 Tool request만 필요한 경우 이를 먼저 구현할 수 있다.

그러나 아직 검증되지 않은 multi-Tool, parallel Tool 또는 distributed workflow까지 미리 구현하지 않는다.

동시에 초기 limitation을 ADR 수준의 permanent restriction으로 만들지도 않는다.

---

## 05. Alternatives Considered

### Alternative A — Make Common Agent Runtime a Monolithic Execution Engine

구조:

```text
AgentRuntime
├── Agent Registry
├── Context
├── Model Registry
├── Model Router
├── Provider Adapter
├── Tool Registry
├── Tool Runtime
├── Permission
├── Policy
├── Approval
├── Memory
└── Audit

```

장점:

- execution flow를 한 implementation에서 볼 수 있다.
- 초기 wiring이 단순해 보일 수 있다.

단점:

- Agent Runtime responsibility가 지나치게 커진다.
- concrete subsystem coupling이 증가한다.
- isolated testing과 contract replacement가 어려워진다.
- future capability가 추가될수록 monolithic orchestrator로 비대해질 수 있다.

채택하지 않는다.

Agent Runtime은 orchestration을 소유하지만 replaceable capability에는 explicit contract를 사용한다.

---

### Alternative B — Permanently Define AgentRuntimeExecutor as the Final Architecture

장점:

- 현재 구현과 ADR이 정확히 일치한다.
- 당장의 변경이 적다.

단점:

- 현재 staged seam을 미래 architecture로 고정한다.
- complete Agent Runtime contract가 발전할 때 unnecessary compatibility constraint가 생긴다.
- accidental implementation이 architecture가 될 수 있다.

채택하지 않는다.

Current seam은 초기 composition에서 재사용할 수 있지만 architectural invariant는 아니다.

---

### Alternative C — Create a Mandatory Separate Integrated Execution Runtime

구조:

```text
AgentRuntime
    ↓
IntegratedExecutionRuntime
    ↓
Model / Tool

```

장점:

- composition responsibility가 물리적으로 명확해 보인다.

단점:

- Agent Runtime과 Integrated Execution의 responsibility가 중복될 수 있다.
- 새로운 permanent subsystem이 실제 필요보다 먼저 생긴다.
- Agent Runtime이 전체 lifecycle owner라는 existing architecture와 혼동될 수 있다.

채택하지 않는다.

Internal composition object는 허용하지만 permanent subsystem 여부는 실제 implementation requirement에 따라 결정한다.

---

### Alternative D — Let the Caller Select Provider and Concrete Model

예:

```text
run({
  agentId,
  provider,
  providerModelId,
  input
})

```

장점:

- 초기 implementation이 단순하다.
- 특정 Model 시험이 쉽다.

단점:

- Model Strategy를 caller가 우회할 수 있다.
- provider detail이 Agent execution surface로 노출된다.
- Model Independence가 약해진다.

채택하지 않는다.

Model selection은 Core-controlled strategy / capability boundary를 따른다.

---

### Alternative E — Make `Final | SingleToolRequest` the Permanent Model Response Contract

장점:

- 초기 Agent loop 구현이 단순하다.
- exhaustive branching이 쉽다.

단점:

- Model Response의 richer semantics를 표현하기 어렵다.
- multiple Tool request 또는 future execution pattern을 불필요하게 차단한다.
- Model-layer normalization과 Agent execution decision이 혼동될 수 있다.

채택하지 않는다.

초기 implementation limitation으로 사용할 수 있지만 architectural invariant로 고정하지 않는다.

---

### Alternative F — Let Integrated Agent Execution Call ToolRuntime Directly

구조:

```text
Model Tool Request
        │
        ▼
    ToolRuntime

```

장점:

- 호출 path가 짧다.
- composition code가 적다.

단점:

- Agent `allowedTools` enforcement가 우회된다.
- IMPLEMENTATION-019~021에서 확립한 least-privilege boundary가 무력화된다.

채택하지 않는다.

Agent-originated Tool request는 Agent-specific capability boundary를 먼저 통과한다.

---

### Alternative G — Put Provider-Native Tool Calling in Agent Runtime

장점:

- 특정 Provider prototype이 빠르다.

단점:

- Agent Runtime이 Provider API semantics에 종속된다.
- 새로운 Provider마다 generic execution logic을 수정해야 할 수 있다.
- Model Independence와 충돌한다.

채택하지 않는다.

Provider-specific semantics는 Model boundary 뒤에 둔다.

---

### Alternative H — Return Every Tool Result as the Final Agent Result

장점:

- continuation이 필요 없다.
- 구현이 단순하다.

단점:

- Tool result를 해석하거나 종합하는 Agent behavior를 지원하지 못한다.
- deterministic Tool output과 user-facing Agent result의 의미가 섞인다.

일반 execution model로 채택하지 않는다.

특정 operation에서 Tool output 자체가 final result인 경우 higher-level execution decision으로 허용할 수 있다.

---

### Alternative I — Allow Unbounded Model / Tool Execution

장점:

- arbitrary complex task를 제한 없이 수행할 수 있다.

단점:

- cost와 latency를 예측하기 어렵다.
- infinite execution 가능성이 있다.
- side effect가 반복될 수 있다.
- failure와 debugging이 어려워진다.

채택하지 않는다.

Agent execution은 bounded한다.

---

### Alternative J — Let Each Pack Implement Its Own Agent Runtime

장점:

- Pack별 최적화가 자유롭다.

단점:

- Model, Tool, permission 및 safety behavior가 Pack마다 달라질 수 있다.
- duplicate runtime이 생긴다.
- Core / Pack boundary와 common security enforcement가 약해진다.

채택하지 않는다.

Generic execution mechanics는 Core가 소유한다.

---

## 06. Consequences

### Positive

- Agent Runtime의 generic lifecycle ownership이 명확해진다.
- current staged implementation과 future target architecture를 구분할 수 있다.
- existing Agent, Model 및 Tool foundation을 단계적으로 재사용할 수 있다.
- Model Provider independence를 유지할 수 있다.
- Model-generated Tool request에도 deterministic Agent Tool guard를 적용할 수 있다.
- Agent allowance와 Tool permission을 독립적으로 검증할 수 있다.
- Tool result continuation을 지원할 수 있다.
- execution cost와 failure를 bound할 수 있다.
- future Context, Task, Policy, Approval, Audit integration 위치를 열어둘 수 있다.
- 초기 single-Tool implementation을 허용하면서 future multiple-Tool capability를 차단하지 않는다.

### Negative

- direct monolithic implementation보다 contract와 composition이 많아진다.
- normalized Model contract가 별도로 필요하다.
- Model Strategy implementation 이전에 temporary resolution seam이 필요할 수 있다.
- Agent execution state와 continuation semantics를 명시적으로 정의해야 한다.
- execution bound와 related error semantics가 필요하다.
- complete lifecycle은 여러 staged implementation을 거쳐야 한다.

이 비용은 provider independence, authority separation, maintainable module boundary 및 safe execution을 유지하기 위해 받아들인다.

---

## 07. Constraints

- Agent Runtime의 generic orchestration responsibility를 Pack으로 이동하지 않는다.
- current `AgentRuntimeExecutor`를 permanent final architecture라고 가정하지 않는다.
- staged implementation을 이유로 future public contract를 성급하게 고정하지 않는다.
- Agent 또는 Pack에서 Provider SDK를 직접 호출하는 것을 기본 execution path로 사용하지 않는다.
- caller가 unrestricted provider / concrete model selection authority를 갖지 않는다.
- complete Model Strategy가 없다는 이유로 premature `modelStrategy` placeholder를 추가하지 않는다.
- provider-specific Model response type을 generic ODYS Agent contract로 사용하지 않는다.
- Model output을 execution control data로 사용하기 전에 validation / normalization한다.
- model-generated Tool request를 Action authority로 간주하지 않는다.
- Agent-originated Tool execution이 Agent-specific capability boundary를 우회하지 않는다.
- Agent Tool allowance와 Tool required permission을 derive하거나 implicit하게 합치지 않는다.
- Tool input/output execution semantics를 Agent Runtime에 중복 구현하지 않는다.
- earlier validation / guard failure가 later executor에 도달하지 않도록 한다.
- Tool result를 항상 final Agent result라고 가정하지 않는다.
- Agent execution은 explicit bound를 가진다.
- Policy denial, Approval rejection 또는 authority failure를 blind retry하지 않는다.
- runtime composition을 user / Workspace authorization 증거로 취급하지 않는다.
- complete authorization / Policy / Approval boundary가 없는 상태에서 high-risk external Action을 활성화하지 않는다.
- Context, Memory, Task, Policy, Approval, Audit 또는 Pack lifecycle을 placeholder API로 성급하게 추가하지 않는다.
- multiple / parallel Tool execution은 실제 requirement가 생기기 전에 구현하지 않는다.
- 초기 single-Tool limitation을 permanent architectural restriction으로 기록하지 않는다.

---

## 08. Staged Implementation Direction

이 ADR은 exact TypeScript type, factory name 또는 file structure를 고정하지 않는다.

Implementation은 검증 가능한 작은 단계로 진행한다.

현재 foundation에서 complete execution으로의 개념적인 progression은 다음과 같다.

```text
Agent Runtime
     │
     ▼
Model capability composition
     │
     ▼
Provider-independent Model execution contract
     │
     ▼
Validated execution-relevant Model interpretation
     │
     ▼
Model-generated Tool request
     │
     ▼
Agent-specific Tool allowance
     │
     ▼
Tool Runtime execution
     │
     ▼
Tool result continuation
     │
     ▼
Bounded Agent execution

```

초기 implementation은 existing `AgentRuntimeExecutor`, current Model Runtime 및 `AgentToolRuntime` 같은 staged foundation을 재사용할 수 있다.

그러나 각 staged seam은 이후 contract가 성숙하면서 변경될 수 있다.

Implementation은 다음 원칙을 따른다.

```text
small contract
      ↓
deterministic tests
      ↓
composition
      ↓
next capability

```

전체 lifecycle을 하나의 large patch로 구현하지 않는다.

---

## 09. Security Implications

Integrated Agent Execution은 probabilistic Model reasoning과 deterministic Tool capability를 실제로 연결하기 시작하는 중요한 security boundary다.

가장 중요한 구분은 다음과 같다.

```text
Reasoning Capability
        ≠
Action Authority

```

Model은 다음을 생성할 수 있다.

- recommendation
- structured output
- Tool request
- continuation request

그러나 actual Action execution은 Core-controlled deterministic boundary를 통과한다.

현재 staged guard가 존재하더라도 complete authorization은 아직 구현되지 않았다.

High-risk external Action에는 향후 필요한 경우 다음 control을 적용한다.

```text
Authenticated Identity
        │
        ▼
User / Workspace Authorization
        │
        ▼
Agent Capability
        │
        ▼
Tool Permission
        │
        ▼
Policy / Risk
        │
        ▼
Approval when required
        │
        ▼
Execution
        │
        ▼
Audit

```

Model prompt, Tool request 또는 native Provider Tool Calling은 이 sequence를 우회하는 authority가 아니다.

---

## 10. Relationship to Existing ADRs

### ADR-002 — Core vs Pack

Generic Agent execution capability는 Core가 소유한다.

Pack은 domain Agent와 specialization을 제공하지만 자체 Core execution runtime을 만들지 않는다.

### ADR-003 — Modular Monolith

Agent, Model 및 Tool capability는 하나의 process 안에 존재할 수 있다.

그러나 내부 responsibility와 contract boundary를 유지한다.

Integrated Agent Execution을 위해 불필요한 network boundary나 microservice를 만들지 않는다.

### ADR-004 — TypeScript Primary

Core execution contract와 초기 runtime implementation은 TypeScript를 기본으로 한다.

별도 runtime language가 필요한 경우 해당 문제의 requirement가 이를 정당화해야 한다.

### ADR-005 — AI SDK / Model Independence

Agent execution은 Provider SDK에 직접 종속되지 않는다.

Model Strategy, provider-independent abstraction, response normalization 및 Provider Adapter boundary를 유지한다.

### ADR-007 — Progressive Autonomy

Agent reasoning 또는 Model Tool request는 Action authority가 아니다.

Tool risk, permission, Policy, Approval 및 user control은 execution capability와 독립적으로 강화된다.

이 ADR은 기존 Accepted ADR을 supersede하지 않는다.

기존 architectural principle을 Integrated Agent Execution 영역에 구체화한다.

---

## 11. Revisit Conditions

다음 상황에서는 이 결정을 재검토할 수 있다.

- current Agent Runtime contract가 complete execution ownership을 표현하기에 구조적으로 부적절하다고 실제 implementation에서 검증될 때
- persistent durable execution이 필요하여 Task engine이 primary execution owner가 되어야 할 때
- crash recovery와 resumable workflow가 핵심 requirement가 될 때
- multiple concurrent Tool calls가 반복적인 실제 use case가 될 때
- parallel Tool execution이 latency 또는 product value에 중요해질 때
- multi-agent coordination이 single-Agent execution보다 주요 execution pattern이 될 때
- Agent execution이 별도 service / process로 분리되어야 할 operational requirement가 생길 때
- provider-independent Model normalization이 important Provider capability를 지나치게 제한한다고 실제 사용에서 검증될 때
- scoped autonomous execution이 확대되어 새로운 authority architecture가 필요해질 때
- simple bounded Agent execution으로 표현하기 어려운 long-running workflow가 반복적으로 등장할 때

결정을 변경하는 경우 기존 ADR history를 제거하지 않는다.

필요하면 새로운 ADR을 작성하여 이 ADR을 supersede한다.

---

## 12. Related Documents

- `README.md`
- `ADR-002-core-vs-pack.md`
- `ADR-003-modular-monolith.md`
- `ADR-004-typescript-primary.md`
- `ADR-005-ai-sdk-model-independence.md`
- `ADR-007-progressive-autonomy.md`
- `../20_architecture/SYSTEM_OVERVIEW.md`
- `../20_architecture/ODYS_CORE.md`
- `../20_architecture/AGENT_ARCHITECTURE.md`
- `../20_architecture/TOOL_ARCHITECTURE.md`
- `../20_architecture/MODEL_STRATEGY.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`
- `../30_packs/PACK_STANDARD.md`
- `../50_engineering/DEVELOPMENT_WORKFLOW.md`
- `../50_engineering/AI_DEVELOPMENT_WORKFLOW.md`
- `../50_engineering/TEST_STRATEGY.md`

---

## 13. Development Rule

새로운 Agent execution implementation은 다음 질문에 명확하게 답할 수 있어야 한다.

1. Generic execution orchestration은 Core Agent Runtime의 책임으로 유지되는가?
2. Current staged seam을 permanent architecture로 오해하고 있지 않은가?
3. Model은 Provider가 아니라 Strategy / Capability 관점에서 선택되는가?
4. Provider-specific request / response semantics가 generic Agent contract로 유출되지 않는가?
5. Model output은 execution에 사용되기 전에 validation / normalization되는가?
6. Model-generated Tool request가 actual Action authority와 분리되어 있는가?
7. Agent-originated Tool request가 Agent-specific Tool capability boundary를 통과하는가?
8. Tool execution은 Tool Runtime의 validation과 security ordering을 유지하는가?
9. Agent allowance와 Tool permission requirement가 독립적인 control axis로 유지되는가?
10. Earlier failure가 later executor invocation을 차단하는가?
11. Tool result가 필요한 경우 Agent continuation으로 안전하게 돌아가는가?
12. Model / Tool continuation과 retry가 deterministic bound를 가지는가?
13. Runtime composition이 user / Workspace authorization으로 오해되지 않는가?
14. 현재 필요하지 않은 future subsystem이나 multi-Tool capability를 premature하게 고정하지 않았는가?

이 질문에 대한 명확한 답 없이 complete Agent execution flow를 추가하지 않는다.

**Core owns the execution lifecycle. Models provide replaceable intelligence. Tools provide controlled capability. Composition must preserve boundaries, authority, and bounded execution.**
