# ADR-005 — AI SDK / Model Independence

- Status: Accepted
- Date: 2026-08-10

---

## 01. Context

ODYS는 여러 AI 모델을 활용하는 Agent 시스템이다.

AI 모델 시장은 빠르게 변화하며 모델마다 reasoning quality, latency, price, context window, tool calling, multimodal capability, structured output, availability가 다르다.

특정 모델이나 공급자 SDK를 애플리케이션 전체에 직접 사용하면 ODYS의 비즈니스 로직이 해당 공급자에 강하게 종속된다.

---

## 02. Decision

ODYS는 특정 AI Provider 또는 단일 모델에 직접 종속되지 않는다.

모델 호출은 내부의 **Model Gateway / Provider Adapter Layer**를 통해 수행한다.

```text
Application / Agent / Pack
          ↓
      Model Gateway
          ↓
 Provider Adapter Layer
   ├── OpenAI
   ├── Anthropic
   ├── Google
   └── Future Providers
```

가능한 경우 통합 AI SDK를 활용하되 SDK 자체도 ODYS의 최종 아키텍처 계약으로 취급하지 않는다.

---



## 03. Model Gateway Responsibilities

- provider selection
- model selection
- request normalization
- response normalization
- structured output validation
- tool calling integration
- timeout / retry policy
- usage measurement
- error normalization
- fallback policy
- observability hooks

---



## 04. Capability-Based Selection

코드에서 특정 모델명을 직접 참조하는 대신 가능한 한 필요한 capability를 표현한다.

예:

```text
Task requires:
- strong reasoning
- structured output
- tool calling
- medium latency tolerance
```

Model Strategy가 이 요구에 적합한 모델을 선택한다.

---



## 05. Direct Provider Access

기본적으로 다음 구조를 금지한다.

```text
Study Pack -> OpenAI SDK
Career Pack -> Anthropic SDK
```

대신 다음 구조를 사용한다.

```text
Study Pack -> Model Gateway
Career Pack -> Model Gateway
```

---



## 06. Rationale

목적은 모든 모델을 완전히 동일하게 취급하는 것이 아니라 모델별 차이가 애플리케이션 전체로 확산되지 않도록 하는 것이다.

이를 통해 다음이 가능하다.

- 기능별 최적 모델 선택
- 모델 가격 변화 대응
- 공급자 장애 시 fallback
- 새로운 모델 실험
- 테스트에서 mock provider 사용
- 특정 공급자 lock-in 감소

---



## 07. Alternatives Considered



### Alternative A — One Provider Only

구현은 단순하지만 lock-in이 크고 가격, 정책, 장애 변화에 취약하다.

채택하지 않는다.

### Alternative B — Provider SDK를 기능마다 직접 사용

prototype은 빠르지만 모델 관련 코드가 전체 시스템에 퍼지고 테스트와 교체가 어려워진다.

채택하지 않는다.

---



## 08. Prompt Ownership

Prompt는 가능한 한 다음 위치에서 관리한다.

- Agent definition
- Pack
- Prompt registry
- Workflow

Provider Adapter는 비즈니스 의미를 가진 prompt를 소유하지 않는다.

---



## 09. Structured Output

AI 모델 출력은 신뢰된 내부 데이터로 간주하지 않는다.

구조화된 출력이 필요한 경우:

1. schema 정의
2. model structured output 요청
3. runtime validation
4. validation failure 처리
5. 필요하면 retry 또는 fallback

모델 출력이 데이터베이스 변경이나 Tool 실행으로 이어지는 경우 별도의 permission 검사를 수행한다.

---



## 10. Consequences



### Positive

- 모델 교체와 실험이 쉬워진다.
- Provider lock-in을 줄일 수 있다.
- 공통 observability와 usage tracking이 가능하다.
- 테스트에서 모델 호출을 쉽게 대체할 수 있다.



### Negative

- 추상화 계층을 관리해야 한다.
- Provider 고유 기능을 완전히 추상화하기 어렵다.
- 가장 단순한 prototype보다 초기 코드가 증가한다.

---



## 11. Constraints

- 비즈니스 로직에서 provider SDK를 직접 import하지 않는다.
- 모델명과 provider명은 가능한 한 configuration에 집중시킨다.
- 모델 호출에는 timeout을 둔다.
- 모델 오류를 내부 공통 오류 형태로 변환한다.
- usage / latency / error 정보를 observability에 기록한다.
- fallback은 무한 반복되지 않도록 제한한다.
- 중요한 실행 결과는 모델의 자연어 응답만으로 결정하지 않는다.

---



## 12. Revisit Conditions

- 특정 Provider의 고유 기능이 ODYS의 핵심 기능이 될 때
- 모델 라우팅 계층이 불필요한 복잡성을 만든다고 검증될 때
- 자체 호스팅 모델이 주요 실행 방식이 될 때
- Model Gateway가 별도 서비스로 분리될 필요가 생길 때

---



## 13. Related Documents

- `ADR-004-typescript-primary.md`
- `ADR-007-progressive-autonomy.md`
- `../20_architecture/MODEL_STRATEGY.md`
- `../20_architecture/AGENT_ARCHITECTURE.md`
- `../20_architecture/TOOL_ARCHITECTURE.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`

---



## 14. Development Rule

ODYS는 모델을 사용하지만 모델에 종속되지 않는다.

**Models are replaceable capabilities, not the architecture itself.**