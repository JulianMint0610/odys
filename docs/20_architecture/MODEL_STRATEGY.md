# ODYS Model Strategy

## 1. Purpose

이 문서는 ODYS가 AI Model과 Model Provider를 선택하고 사용하는 architecture 원칙을 정의한다.

ODYS는 AI model을 핵심 capability로 사용하지만 특정 model이나 provider 자체를 제품의 중심 architecture로 취급하지 않는다.

Model은 교체 가능한 intelligence provider다.

이 문서는 다음 질문에 답한다.

- ODYS에서 Model은 어떤 역할을 가지는가?

- Agent와 Model은 어떻게 분리되는가?

- 특정 provider 종속성을 어떻게 제한하는가?

- Agent는 어떤 방식으로 Model을 요청하는가?

- Model Router는 어떤 기준으로 Model을 선택하는가?

- Model capability 차이는 어떻게 표현하는가?

- fallback과 retry는 어떻게 처리하는가?

- 비용, latency, quality 및 privacy를 어떻게 균형 있게 관리하는가?

- Model output은 어느 수준까지 신뢰할 수 있는가?

- 새로운 Model Provider는 어떤 방식으로 추가하는가?

---

## 2. Core Principle

ODYS의 Model architecture는 다음 원칙을 따른다.

> Models are replaceable capabilities, not the architecture of the product.

ODYS의 Agent, Memory, Tool, Task 및 domain logic이 특정 Model Provider의 API 구조에 직접 종속되지 않도록 한다.

다음 구조를 피한다.

```

Coding Agent

    │

    ▼

Specific Provider SDK

    │

    ▼

Specific Model

```

대신 다음 구조를 지향한다.

```

Coding Agent

    │

    ▼

Model Strategy

    │

    ▼

ODYS Model Abstraction

    │

    ▼

Model Router

    │

    ▼

Provider Adapter

    │

    ▼

Selected Model

```

---

## 3. Model Is Not an Agent

Model과 Agent는 서로 다른 개념이다.

```

Model

= reasoning, generation, classification 등의 intelligence capability

Agent

= 특정 responsibility를 수행하도록 구성된 execution unit

```

Agent는 다음 요소를 함께 사용한다.

```

Agent

├── Context

├── Model

├── Tools

├── Policy

└── Execution Runtime

```

따라서 Agent behavior 전체를 특정 Model의 behavior와 동일하게 취급하지 않는다.

---

## 4. Design Principles

Model architecture는 다음 원칙을 따른다.

### 4.1 Provider Independence

Core domain logic이 특정 provider SDK에 직접 결합되지 않도록 한다.

### 4.2 Capability-Based Selection

Model 이름보다 필요한 capability를 기준으로 선택한다.

### 4.3 Strategy Before Provider

Agent는 가능한 한 Model Provider가 아니라 Model Strategy를 요청한다.

### 4.4 Structured Contracts

Model request와 response는 가능한 한 공통 contract를 사용한다.

### 4.5 Validate Model Output

Model output은 deterministic system output처럼 신뢰하지 않는다.

### 4.6 Tools Remain Controlled

Model의 Tool Call 요청은 실제 Action authority가 아니다.

### 4.7 Measure Before Optimize

비용과 latency optimization은 실제 usage data를 기반으로 수행한다.

### 4.8 Graceful Degradation

특정 Model 또는 Provider 장애가 전체 ODYS의 완전한 장애로 이어지지 않도록 가능한 범위에서 fallback을 지원한다.

---

## 5. Model Layer Responsibilities

ODYS Model Layer는 개념적으로 다음 책임을 가진다.

```

Model Layer

├── Model Contract

├── Model Strategy

├── Model Registry

├── Model Router

├── Provider Adapters

├── Request Normalization

├── Response Normalization

├── Usage Tracking

├── Error Normalization

└── Fallback Policy

```

Model Layer는 domain-specific Agent responsibility를 직접 수행하지 않는다.

---

## 6. Model Contract

Core는 provider-independent Model contract를 사용한다.

개념적으로 다음 요소를 포함할 수 있다.

```

Model Request

├── messages or structured prompt

├── system instructions

├── Tool definitions

├── output schema

├── generation options

├── capability requirements

└── metadata

```

Model Response는 다음 요소를 포함할 수 있다.

```

Model Response

├── generated content

├── structured output

├── Tool requests

├── finish reason

├── usage

├── provider metadata

└── model metadata

```

실제 TypeScript interface는 implementation 단계에서 정의한다.

---

## 7. AI SDK Boundary

ODYS는 Model Provider integration을 공통 AI SDK 또는 Model abstraction layer 뒤에 둔다.

목적은 provider API의 차이를 ODYS Core와 Agent implementation 전체에 퍼뜨리지 않는 것이다.

개념적으로:

```

Agent Runtime

      │

      ▼

ODYS Model Contract

      │

      ▼

AI SDK / Model Integration Layer

      │

      ▼

Provider Adapter

      │

      ▼

Model Provider

```

AI SDK 자체도 ODYS domain model의 source of truth가 아니다.

SDK-specific type이 Core 전체에 퍼지지 않도록 한다.

---

## 8. Model Provider Adapter

Provider Adapter는 provider-specific API를 ODYS Model Contract와 연결한다.

Adapter의 주요 책임은 다음과 같다.

```

ODYS request

→ provider request conversion

provider response

→ ODYS response normalization

provider error

→ ODYS error normalization

Tool definition

→ provider Tool representation

usage information

→ ODYS usage metadata

```

Provider Adapter 내부에서는 provider-specific SDK를 사용할 수 있다.

그러나 해당 dependency를 Agent와 domain module까지 확산시키지 않는다.

---

## 9. Model Registry

Model Registry는 ODYS에서 사용 가능한 Model과 capability metadata를 관리할 수 있다.

개념적인 entry는 다음 정보를 가질 수 있다.

```

Model Entry

├── id

├── provider

├── provider model identifier

├── capabilities

├── context limits

├── Tool support

├── structured output support

├── availability

└── policy metadata

```

Registry는 실제 implementation에 따라 configuration 또는 code로 관리할 수 있다.

초기에는 database 기반 dynamic registry가 반드시 필요한 것은 아니다.

### 9.1 Current Staged TypeScript Definition

현재 `@odys/core`에는 provider-independent Model identity와 discovery, registered-Model dispatch를 위한 staged foundation이 구현되어 있다.

`ModelDefinition`은 stable logical `id`, ODYS-side `provider` identifier, provider-owned opaque `providerModelId`만 포함한다. `defineModel()`은 이 metadata를 runtime에서 검증하고 accepted caller-owned definition을 normalize하거나 교체하지 않으므로 definition construction은 ownership을 이전하지 않는다. 성공한 `ModelRegistry.register()`는 현재 scalar metadata를 새 object에 복사하고 freeze하여 해당 Registry entry의 canonical immutable snapshot으로 소유한다. Caller object 자체는 freeze하지 않으며, 같은 caller object를 별도 Registry instance에 등록해도 registered-definition reference는 공유되지 않는다. `get()`과 insertion order를 보존하는 frozen `list()` snapshot은 이 canonical definition을 재사용하므로 등록된 Provider-selection metadata는 entry lifetime 동안 안정적이다.

`ModelRuntime`은 request의 canonical logical Model ID를 검증하고 injected `ModelRegistry`에서 Registry-owned exact immutable `ModelDefinition` snapshot을 resolve한 뒤, definition을 다시 clone하지 않고 opaque input과 함께 provider-independent injected `ModelRuntimeExecutor` seam으로 정확히 한 번 dispatch하며 opaque output을 반환한다. 이 ownership hardening은 concrete Provider execution 도입 전에 `provider`와 `providerModelId`가 caller mutation으로 바뀌지 않도록 보장한다. Registry membership과 definition immutability는 이 staged Runtime composition에서 dispatch eligibility만 제공하며, 그 자체로 concrete Provider authority, Provider SDK 또는 network execution을 제공하지 않는다.

IMPLEMENTATION-022는 existing Common Agent Runtime의 executor seam을 구현하는 model-backed adapter를 추가한다. Trusted construction-time `AgentModelIdResolver`가 Registry-owned Agent definition과 original opaque input을 받아 logical ODYS Model ID를 선택하면 adapter가 같은 executor request object를 `ModelRuntime.input`으로 전달한다. Existing Model Runtime은 request와 logical ID validation, Model Registry resolution 및 provider-independent executor dispatch를 계속 소유한다. Agent input의 `modelId`, `provider` 또는 `providerModelId` field는 selection authority가 아니며 Model result는 해석 없이 opaque data로 반환된다. 이 temporary resolver는 final Model Strategy나 capability-based Model Router가 아니다.

IMPLEMENTATION-023은 opaque Model output에 명시적으로 적용할 수 있는 provider-independent `parseModelOutcome()` validation primitive를 추가한다. 이 parser는 own required property와 exact discriminant를 검증하여 opaque `output`을 가진 `final` 또는 canonical Tool ID와 opaque `input`을 가진 하나의 `tool-request`로 해석하고, arbitrary extra top-level field를 버린 새 frozen canonical outer object를 반환한다. Nested payload reference는 clone하거나 freeze하지 않는다. Tool ID syntax는 existing Tool identifier helper를 재사용하지만 Tool Registry를 조회하지 않으므로 unknown-but-canonical Tool ID도 syntactically valid하다. Validated `tool-request`는 Tool existence, Agent allowance, permission, authorization, Policy, Approval 또는 execution authority가 아니다.

이 narrow `ModelOutcome`은 complete ODYS Model Response가 아니며 initial execution-relevant interpretation contract다. `ModelRuntimeResult.output`은 계속 `unknown`이고 `ModelRuntime`과 existing opaque model-backed Agent executor는 parser를 자동 호출하지 않는다. 별도의 bounded Agent Model/Tool executor만 initial 및 continuation output에 parser를 명시적으로 적용하고 parsed Tool request 하나를 `AgentToolRuntime`에 연결한다. 이 staged composition은 complete Model Response나 general execution loop가 아니다.

Normalized provider Model request/response, Model Gateway, concrete Provider Adapter와 Provider SDK integration, Model Capability, complete Model Strategy, Model Router, complete integrated Agent execution, Tool calling integration, structured output, timeout, retry, fallback 및 usage accounting은 아직 구현되지 않았다.

---

## 10. Stable ODYS Model Identifier

Provider의 raw model name을 application 전체에서 직접 사용하는 것을 피한다.

예를 들어 Agent configuration이 다음과 같이 provider model name을 직접 가지는 구조는 장기적으로 결합도를 높일 수 있다.

```

model = provider-specific-model-name

```

대신 Model Strategy 또는 ODYS 내부 logical identifier를 사용하는 것을 선호한다.

예:

```

strategy = general_reasoning

strategy = fast_classification

strategy = coding_reasoning

```

실제 provider model mapping은 Model Layer에서 관리한다.

---

## 11. Model Strategy

Model Strategy는 특정 task에서 필요한 intelligence characteristics를 정의한다.

예:

```

general_reasoning

fast_response

structured_extraction

coding_reasoning

long_context

tool_using

```

Strategy는 특정 Model 이름과 동일하지 않다.

개념적으로:

```

coding_reasoning

       │

       ▼

Model Router

       │

       ▼

Current Best Matching Model

```

모델 환경이 변경되더라도 Agent definition을 대규모로 수정하지 않는 것이 목적이다.

---

## 12. Strategy Requirements

Model Strategy는 다음 requirement를 표현할 수 있다.

```

reasoning capability

structured output

Tool support

context requirement

latency preference

cost preference

reliability requirement

privacy requirement

```

모든 Strategy가 모든 requirement를 사용할 필요는 없다.

초기에는 소수의 명확한 Strategy부터 시작한다.

---

## 13. Model Capability

Model마다 지원 capability가 다를 수 있다.

예:

```

text generation

reasoning

structured output

Tool calling

vision

long context

code understanding

streaming

```

Model Router는 현재 task가 요구하는 capability와 Model capability를 비교한다.

필수 capability를 지원하지 않는 Model을 단순히 저렴하다는 이유로 선택하지 않는다.

---

## 14. Model Routing

Model Router는 Model Strategy를 실제 Model로 resolve한다.

대표적인 흐름은 다음과 같다.

```

Agent

  │

  ▼

Model Strategy

  │

  ▼

Required Capabilities

  │

  ▼

Model Router

  │

  ▼

Candidate Models

  │

  ▼

Policy / Availability Evaluation

  │

  ▼

Selected Model

```

초기에는 복잡한 machine-learning 기반 router를 만들지 않는다.

명확한 configuration과 deterministic rule부터 시작한다.

---

## 15. Routing Criteria

Model Router는 필요에 따라 다음 요소를 고려할 수 있다.

```

required capability

quality

latency

cost

context size

Tool support

structured output support

provider availability

privacy requirements

task risk

historical reliability

```

모든 요청에 모든 criteria를 사용할 필요는 없다.

---

## 16. Capability Requirements Before Optimization

Model selection 순서는 대체로 다음 원칙을 따른다.

```

Required Capability

      │

      ▼

Policy Eligibility

      │

      ▼

Reliability

      │

      ▼

Quality / Latency / Cost Trade-off

```

필요한 기능을 지원하지 않는 Model을 cost optimization 때문에 선택하지 않는다.

---

## 17. Agent and Model Strategy

Agent Definition은 Model Strategy를 선언할 수 있다.

예:

```

Study Agent

→ general_reasoning

Conference Agent

→ structured_extraction

Career Agent

→ general_reasoning

Coding Agent

→ coding_reasoning

```

이는 초기 예시이며 실제 usage를 바탕으로 조정할 수 있다.

Agent가 provider-specific Model 이름을 직접 hard-code하는 것을 기본 방식으로 하지 않는다.

---

## 18. Per-Task Override

같은 Agent라도 Task 특성에 따라 다른 Strategy가 필요할 수 있다.

예:

```

Coding Agent

simple classification

→ fast_response

architecture analysis

→ coding_reasoning

large repository summary

→ long_context

```

override는 Core Model Policy가 허용하는 범위에서 수행한다.

---

## 19. Model Context

Model에는 Agent Runtime이 구성한 필요한 Context만 전달한다.

```

Core Context

      │

      ▼

Context Selection

      │

      ▼

Model-specific Representation

      │

      ▼

Model Request

```

Model Provider가 큰 context window를 지원한다고 해서 모든 Memory와 Document를 무조건 전달하지 않는다.

Context quality가 Context quantity보다 중요하다.

---

## 20. Context Window Management

Context budget은 다음 요소가 경쟁한다.

```

system instructions

user request

conversation

Memory

Knowledge

Tool results

response budget

```

Context Builder와 Model Layer는 현재 Model limit을 고려하여 request를 구성한다.

필요한 경우 다음 전략을 사용할 수 있다.

```

filtering

ranking

summarization

chunk selection

history compression

```

단순한 truncation으로 중요한 instruction이나 authorization context가 손실되지 않도록 한다.

---

## 21. Prompt Construction

Prompt는 하나의 거대한 문자열보다 책임별 component로 관리하는 것을 지향한다.

개념적으로:

```

Model Input

├── Core Instructions

├── Agent Instructions

├── Policy-relevant Context

├── User Request

├── Retrieved Context

└── Tool Definitions

```

provider adapter는 이를 해당 provider request format으로 변환할 수 있다.

---

## 22. Instruction Boundaries

다음 source는 동일한 authority를 가지지 않는다.

```

Core System Instructions

Agent Configuration

User Instruction

Memory

Document Content

Web Content

Tool Result

```

외부 Document나 Tool Result 안의 문장이 Core security rule보다 높은 authority를 얻어서는 안 된다.

instruction boundary에 대한 세부 정책은 `SECURITY_ARCHITECTURE.md`에서 정의한다.

---

## 23. Tool Calling

Model이 Tool Call을 생성할 수 있다.

하지만 다음 두 개념은 분리한다.

```

Model Tool Request

≠

Authorized Tool Execution

```

대표적인 흐름은 다음과 같다.

```

Model

  │

  ▼

Tool Request

  │

  ▼

Agent Runtime

  │

  ▼

Tool Runtime

  │

  ▼

Validation / Permission / Policy / Approval

  │

  ▼

Execution

```

Model Provider의 native Tool Calling 기능을 사용하더라도 ODYS Tool Runtime을 우회하지 않는다.

---

## 24. Structured Output

후속 program logic에 사용되는 Model 결과는 가능한 한 structured output을 사용한다.

예:

```

Classification Result

Conference Candidate

Memory Candidate

Task Plan

Tool Argument

```

Model이 JSON 형태로 응답했다고 해서 valid한 것으로 간주하지 않는다.

schema validation을 통과해야 한다.

---

## 25. Model Output Is Untrusted

Model output은 probabilistic output이다.

따라서 다음 용도로 사용될 때 검증이 필요하다.

```

database mutation

Tool arguments

Memory writes

permission-related decisions

external Action

structured domain object

```

모델이 자신 있게 출력했다는 이유만으로 validation을 생략하지 않는다.

---

## 26. Deterministic Logic vs Model Logic

가능한 경우 deterministic logic을 Model에게 맡기지 않는다.

예:

```

permission check

→ code

schema validation

→ code

Task state transition

→ code

authorization

→ code

```

Model이 더 적합한 영역:

```

natural-language understanding

summarization

classification with ambiguity

planning

reasoning

content generation

```

모델은 모든 문제를 해결하는 범용 application runtime으로 사용하지 않는다.

---

## 27. Model Fallback

Primary Model을 사용할 수 없는 경우 fallback을 사용할 수 있다.

```

Primary Model

      │

      ├── success ─────► Continue

      │

      ▼

Unavailable / Recoverable Failure

      │

      ▼

Fallback Evaluation

      │

      ▼

Fallback Model

```

fallback은 필수 capability를 만족해야 한다.

단순히 아무 Model이나 선택하지 않는다.

---

## 28. Fallback Restrictions

다음 상황에서는 fallback이 적절하지 않을 수 있다.

```

required capability 없음

privacy requirement 불충족

Tool support 불충족

critical structured output incompatibility

policy restriction

```

fallback 때문에 security 또는 product contract를 낮추지 않는다.

---

## 29. Retry

Model request는 transient failure에 대해 제한적으로 retry할 수 있다.

retry 가능한 예:

```

temporary network failure

rate limit

provider transient error

temporary service unavailable

```

retry에 적합하지 않은 예:

```

invalid request

unsupported capability

policy violation

invalid structured output 반복

```

무한 retry를 허용하지 않는다.

---

## 30. Structured Output Retry

Model output이 schema validation에 실패한 경우 제한적인 repair 또는 retry를 시도할 수 있다.

개념적으로:

```

Model Output

     │

     ▼

Schema Validation

     │

     ├── valid ─────► Continue

     │

     ▼

Invalid

     │

     ▼

Repair / Retry if Allowed

```

반복 실패 시 정상적인 error로 처리한다.

---

## 31. Timeout

Model invocation은 명시적인 timeout을 가져야 한다.

긴 reasoning request와 간단한 classification request에 동일한 timeout을 강제할 필요는 없다.

timeout policy는 Model Strategy 또는 request type에 따라 조정할 수 있다.

---

## 32. Streaming

사용자-facing response에서는 streaming을 지원할 수 있다.

```

Model

  │

  ▼

Streaming Response

  │

  ▼

Application

```

그러나 streaming token 자체를 persistent final result로 취급하지 않는다.

Task state, Tool Request 및 최종 structured result는 명확한 execution lifecycle을 따라야 한다.

---

## 33. Usage Tracking

Model usage는 운영과 비용 관리에 필요한 범위에서 추적할 수 있다.

대표적인 metadata는 다음과 같다.

```

provider

model

strategy

Agent

Task

latency

input usage

output usage

status

```

모든 raw prompt와 response를 usage tracking 목적으로 저장할 필요는 없다.

---

## 34. Cost Management

Model cost optimization은 다음 순서로 접근한다.

```

Measure Usage

     │

     ▼

Identify Expensive Workload

     │

     ▼

Evaluate Lower-Cost Alternative

     │

     ▼

Quality Validation

     │

     ▼

Routing Change

```

저렴한 Model을 사용한다는 이유만으로 결과 품질을 검증하지 않고 교체하지 않는다.

---

## 35. Latency Management

모든 Task가 최대 reasoning quality를 필요로 하는 것은 아니다.

예:

```

simple classification

→ latency-sensitive

architecture reasoning

→ quality-sensitive

```

Model Strategy는 이러한 차이를 표현할 수 있다.

---

## 36. Quality Management

Model 품질은 provider marketing이나 benchmark 하나만으로 결정하지 않는다.

실제 ODYS workflow를 기반으로 evaluation한다.

예:

```

Tool selection accuracy

structured output validity

Task completion quality

hallucination rate

reasoning usefulness

Agent-specific evaluation

```

---

## 37. Model Evaluation

Model 변경 전후를 비교할 수 있는 evaluation set을 유지할 수 있다.

개념적으로:

```

Representative Tasks

       │

       ▼

Candidate Models

       │

       ▼

Evaluation

       │

       ├── quality

       ├── latency

       ├── cost

       └── reliability

```

초기에는 작은 representative scenario set으로 시작할 수 있다.

---

## 38. Model Change Policy

Model Provider 또는 특정 Model version 변경은 Agent behavior에 영향을 줄 수 있다.

따라서 중요한 변경은 다음 절차를 고려한다.

```

Model Change

     │

     ▼

Compatibility Check

     │

     ▼

Evaluation

     │

     ▼

Controlled Rollout

     │

     ▼

Observation

```

모델 이름 하나를 변경한 뒤 production behavior가 동일할 것이라고 가정하지 않는다.

---

## 39. Provider Outage

특정 provider가 장애를 일으킬 수 있음을 전제로 한다.

가능한 대응은 다음과 같다.

```

retry

fallback

temporary degradation

user-visible failure

queue or Task retry

```

모든 request에 high-availability routing을 구현할 필요는 없다.

Task importance에 따라 적절한 전략을 선택한다.

---

## 40. Privacy Requirements

Model Provider로 전송되는 Context는 필요한 최소 범위로 제한한다.

특히 다음 정보를 불필요하게 포함하지 않는다.

```

secrets

credentials

unrelated Memory

unrelated private documents

another Workspace data

internal security metadata

```

Model Strategy는 향후 privacy requirement를 routing constraint로 사용할 수 있다.

---

## 41. Sensitive Tasks

민감한 Context를 사용하는 Task는 일반 Task보다 엄격한 Model policy를 적용할 수 있다.

예:

```

allowed providers

logging restrictions

data retention requirements

regional requirements

```

세부 정책은 `SECURITY_ARCHITECTURE.md`에서 정의한다.

---

## 42. Provider Logging

ODYS 내부 logging 정책과 Model Provider의 데이터 처리 정책은 별개의 문제다.

ODYS가 raw prompt를 저장하지 않더라도 provider로 request가 전송될 수 있다.

따라서 provider selection 시 privacy와 data handling requirement를 고려해야 한다.

---

## 43. Model Metadata and Persistence

모든 Model invocation을 별도 persistent domain entity로 저장하는 것은 초기 MVP의 필수 조건이 아니다.

필요한 observability metadata는 Agent Execution 또는 structured logging에 연결할 수 있다.

실제 요구가 증가하면 별도의 Model Invocation entity를 도입할 수 있다.

이는 `DATA_MODEL.md`의 deferred model 원칙을 따른다.

---

## 44. Model Error Model

Model Layer는 provider-specific error를 가능한 한 공통 category로 변환한다.

예:

```

ModelUnavailableError

ModelTimeoutError

ModelRateLimitError

ModelAuthenticationError

ModelCapabilityError

ModelInvalidResponseError

ModelContextLimitError

ModelExecutionError

```

Agent와 Application이 모든 provider의 raw error format을 알아야 하는 구조를 피한다.

---

## 45. Provider-Specific Features

특정 provider가 고유 기능을 제공할 수 있다.

예:

```

specialized reasoning mode

provider-specific caching

provider-specific search

provider-specific file handling

```

이러한 기능을 사용할 수 있지만 Core architecture 전체를 해당 기능에 결합하지 않는다.

provider-specific optimization은 adapter 또는 제한된 integration boundary 안에 둔다.

---

## 46. Escape Hatch

완전한 provider abstraction이 모든 기능 차이를 숨길 수 있다고 가정하지 않는다.

실제 제품 가치가 명확한 provider-specific capability가 존재할 경우 controlled escape hatch를 허용할 수 있다.

단 다음을 명확히 한다.

```

Why is it needed?

Where is provider coupling contained?

What is the fallback behavior?

Can the feature be removed later?

```

provider-specific behavior가 여러 Core module에 무분별하게 퍼지는 것은 허용하지 않는다.

---

## 47. Multimodal Capability

향후 ODYS가 image, audio 또는 다른 modality를 사용할 수 있다.

Model capability metadata는 이러한 확장을 수용할 수 있어야 한다.

예:

```

text

vision

audio input

audio output

```

초기 MVP에서 사용하지 않는 modality를 미리 구현하지 않는다.

---

## 48. Local and Hosted Models

Model abstraction은 장기적으로 hosted provider뿐 아니라 다른 execution model도 수용할 수 있어야 한다.

개념적으로:

```

ODYS Model Contract

       │

       ├── Hosted Provider Adapter

       ├── Future Local Adapter

       └── Future Specialized Adapter

```

그러나 초기 MVP를 위해 local inference infrastructure를 미리 구축하지 않는다.

---

## 49. Model Configuration

Model configuration은 code와 environment의 책임을 구분한다.

예:

```

Code / Versioned Configuration

→ Model Strategy definitions

Environment / Secret Management

→ provider credentials

```

API key를 repository에 commit하지 않는다.

---

## 50. Development and Production

development environment와 production environment에서 동일한 provider configuration을 강제할 필요는 없다.

다만 Model Strategy의 의미는 환경 사이에서 유지한다.

예:

```

general_reasoning

```

이라는 strategy가 development와 production에서 서로 다른 concrete Model로 resolve될 수 있다.

---

## 51. Testing Model-Dependent Code

Model-dependent behavior는 deterministic unit test와 evaluation을 구분한다.

### Unit Tests

Model adapter와 request normalization을 mock하여 deterministic하게 검증한다.

### Contract Tests

Provider Adapter가 ODYS Model Contract를 만족하는지 검증한다.

### Evaluation Tests

실제 Model quality를 representative scenario로 측정한다.

### Integration Tests

실제 provider connection을 제한된 환경에서 검증한다.

---

## 52. Mock Model

Core와 Agent test에서 매번 실제 provider를 호출하지 않는다.

```

Agent Runtime Test

       │

       ▼

Mock Model Client

```

Mock Model은 다음을 deterministic하게 검증하는 데 사용한다.

```

Tool Request handling

structured response flow

error handling

Task transitions

```

---

## 53. Initial Implementation Direction

Model identity/Registry foundation과 현재의 staged Model Runtime 및 provider-independent executor seam은 `packages/core/`의 model module에 위치하며, 향후 normalized provider-independent execution contract도 같은 경계에 두는 것을 기본 방향으로 한다.

예:

```

packages/

└── core/

    └── src/

        └── model/

```

concrete provider adapter의 실제 위치는 implementation 단계에서 결정한다.

별도의 service가 필요하지 않은 동안 Modular Monolith 내부에 유지한다.

현재는 이 위치에 최소 `ModelDefinition`, definition/runtime request validation, Registry-owned immutable definition snapshot을 보관하는 instance-local `ModelRegistry`, registered-Model dispatch를 위한 `ModelRuntime` request/result contract와 provider-independent injected executor seam, opaque Model output을 narrow canonical `final | tool-request` execution meaning으로 명시적으로 검증하는 standalone `parseModelOutcome()` primitive가 구현되어 있다. Agent module의 existing staged adapter는 exact Agent executor request를 trusted logical Model resolver와 Model Runtime에 연결하고 exact opaque `ModelRuntimeResult`를 해석 없이 반환한다. 별도의 IMPLEMENTATION-024 bounded executor는 resolver를 invocation당 한 번 호출하고 같은 logical Model ID로 최대 두 번 Model Runtime을 사용한다. 각 opaque output은 parser를 통과하며 initial Tool request는 `AgentToolRuntime`을 통해 실행되고 canonical Tool result가 frozen outer continuation으로 같은 Model에 반환된다. 두 번째 Tool request는 실행하지 않고 명시적으로 실패하며 retry는 없다. 이 one-Tool-turn bound는 current staged implementation limitation이지 permanent Model architecture가 아니다. Normalized provider execution request/response, complete Model Response, Model Gateway 및 concrete Provider Adapter는 후속 단계다.

---

## 54. Initial Model Strategy

초기 MVP에서는 복잡한 automatic Model optimization을 구현하지 않는다.

우선 목표는 다음과 같다.

```

Provider-Independent Contract

          │

          ▼

One Provider Adapter

          │

          ▼

Small Model Strategy Set

          │

          ▼

Agent Integration

          │

          ▼

Usage Measurement

          │

          ▼

Second Provider or Routing When Needed

```

처음부터 여러 provider를 연결하는 것이 model independence의 필수 조건은 아니다.

**교체 가능한 경계를 만드는 것**이 우선이다.

현재 staged Agent-to-Model adapter와 bounded Agent Model/Tool executor는 위 target progression의 final Agent Integration을 구현한 것이 아니다. 둘은 complete Model Strategy 이전의 trusted logical Model ID resolver를 재사용하는 temporary seam이며 capability-based routing, fallback 또는 provider selection을 대체하지 않는다. Bounded executor는 resolver를 한 번만 사용하고 continuation에서도 같은 logical Model을 유지한다.

---

## 55. Deferred Capabilities

다음 capability는 실제 필요가 검증되기 전까지 초기 구현에 필수적이지 않다.

```

ML-based Model Router

automatic benchmark-driven switching

complex cost optimizer

multi-provider load balancing

local inference cluster

automatic fine-tuning pipeline

custom foundation model training

per-token provider arbitration

```

미래 가능성을 위해 현재 architecture를 과도하게 복잡하게 만들지 않는다.

---

## 56. Architectural Invariants

Model architecture가 발전하더라도 다음 원칙은 유지한다.

1. Agent is not a Model.

2. Agents prefer Model Strategies over provider-specific names.

3. Core domain logic does not directly depend on provider SDKs.

4. Provider-specific behavior stays behind controlled boundaries.

5. Model output is validated before affecting system state.

6. Model Tool Requests do not bypass Tool Runtime.

7. Capability requirements are evaluated before cost optimization.

8. Fallback models must satisfy required capability and policy.

9. Sensitive Context is minimized before provider transmission.

10. Model usage is measurable without requiring storage of every raw prompt.

11. Model changes are evaluated against real ODYS workflows.

12. Provider failure is treated as a normal operational possibility.

13. Model abstraction enables replacement without pretending all models are identical.

---

## 57. Related Documents

이 문서는 다음 architecture 문서와 함께 사용한다.

- `SYSTEM_OVERVIEW.md`

- `ODYS_CORE.md`

- `DATA_MODEL.md`

- `MEMORY_ARCHITECTURE.md`

- `AGENT_ARCHITECTURE.md`

- `TOOL_ARCHITECTURE.md`

- `API_DESIGN.md`

- `SECURITY_ARCHITECTURE.md`

- `DEPLOYMENT.md`

- `TECH_STACK.md`

관련 Architecture Decision Record:

- `../40_decisions/ADR-003-modular-monolith.md`

- `../40_decisions/ADR-004-typescript-primary.md`

- `../40_decisions/ADR-005-ai-sdk-model-independence.md`

- `../40_decisions/ADR-007-progressive-autonomy.md`

- `../40_decisions/ADR-008-integrated-agent-execution.md`

---

## 58. Model Development Rule

새로운 Model, Provider 또는 Model Strategy를 추가하기 전에 다음 질문을 확인한다.

1. 어떤 실제 Task가 이 capability를 요구하는가?

2. 기존 Strategy로 해결할 수 없는가?

3. Agent가 provider-specific Model을 알아야 할 이유가 있는가?

4. 필요한 capability는 무엇인가?

5. structured output과 Tool Calling을 지원해야 하는가?

6. privacy requirement를 만족하는가?

7. fallback은 가능한가?

8. provider failure를 어떻게 처리할 것인가?

9. quality, latency 및 cost를 어떻게 측정할 것인가?

10. 변경 전후를 비교할 evaluation scenario가 있는가?

11. provider-specific dependency가 Core 전체로 확산되지 않는가?

12. Model output이 system authority처럼 사용되고 있지는 않은가?

> ODYS should choose models by the capabilities it needs, isolate the providers it uses, and measure the outcomes it receives.
