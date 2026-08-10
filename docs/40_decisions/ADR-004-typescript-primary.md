# ADR-004 — TypeScript Primary

- Status: Accepted
- Date: 2026-08-10

---

## 01. Context

ODYS는 웹 애플리케이션, Agent Runtime, API, Tool Integration, 데이터 처리, AI 모델 연결을 포함한다.

AI 생태계에는 Python 기반 라이브러리가 많지만 ODYS의 핵심 제품은 ML 실험 코드만이 아니라 Web UI, API, Tool 실행, 인증, 데이터베이스, background job, type-safe contract를 함께 다룬다.

초기부터 여러 언어를 동등한 1급 언어로 사용하면 개발 환경과 배포 구조의 복잡도가 불필요하게 증가할 수 있다.

---

## 02. Decision

ODYS의 기본 애플리케이션 언어를 **TypeScript**로 한다.

TypeScript는 다음 영역의 기본 선택이다.

- Web application
- Backend application
- API
- Agent orchestration
- Tool integration
- Shared types
- Validation schema
- Product logic
- Internal SDK

Python은 금지하지 않는다. Python이 명확히 더 적합한 영역에서는 독립적인 도구, worker 또는 실험 환경으로 사용할 수 있다.

---



## 03. Language Selection Rule

```text
Default choice      -> TypeScript
Specialized need    -> Best-fit language
```

다음과 같은 경우 TypeScript를 우선한다.

- API 서버
- Agent Runtime
- Tool Registry
- Model Gateway
- Permission Logic
- Web UI
- Shared domain types
- Pack implementation
- 일반적인 외부 API 연동

---



## 04. Python Exception

Python 사용이 정당화될 수 있는 예:

- Python 전용 과학 계산 라이브러리
- ML / Data Science 실험
- 특정 Python SDK만 제공되는 도구
- 복잡한 수치 계산
- 별도 분석 Worker
- Research Notebook

Python을 도입할 때는 다음 질문을 확인한다.

1. TypeScript로 구현할 수 없는가?
2. Python을 사용했을 때 실질적인 이점이 있는가?
3. 별도 프로세스로 격리할 수 있는가?
4. TypeScript Core와의 계약을 명확히 정의할 수 있는가?

---



## 05. Rationale



### 5.1 End-to-End Type Safety

Frontend와 Backend에서 타입을 공유하기 쉽다.

### 5.2 Product Development Speed

웹 제품 개발과 API 개발을 하나의 생태계에서 수행할 수 있다.

### 5.3 AI Integration

주요 AI Provider와 AI SDK의 TypeScript 지원이 제품 레벨 통합에 충분하다.

### 5.4 Reduced Context Switching

초기 개발자가 여러 언어와 빌드 시스템을 동시에 관리하는 부담을 줄인다.

### 5.5 Monorepo Compatibility

pnpm workspace와 TypeScript 기반 모듈 구성에 적합하다.

---



## 06. Alternatives Considered



### Alternative A — Python Primary

AI / ML과 데이터 처리에는 강하지만 Web frontend와 타입을 직접 공유하기 어렵고 ODYS 전체 제품을 하나의 언어 경험으로 유지하기 어렵다.

기본 언어로는 채택하지 않는다.

### Alternative B — TypeScript + Python Equal Primary

각 생태계의 장점을 동시에 사용할 수 있으나 초기 개발 복잡성과 빌드·테스트·배포 비용이 증가한다.

현재는 채택하지 않는다.

---



## 07. Runtime and Package Management

기본 개발 환경:

- Node.js LTS
- TypeScript
- pnpm
- workspace 기반 package 관리
- strict type checking
- ESLint / formatter
- 명시적인 build / test scripts

세부 버전은 `TECH_STACK.md`와 실제 프로젝트 설정을 따른다.

---



## 08. Type Safety Rules

- `strict` TypeScript 설정을 기본으로 한다.
- `any` 사용은 예외로 취급한다.
- 외부 입력은 runtime validation을 수행한다.
- API request / response contract는 명시적으로 정의한다.
- Domain entity와 database row type을 무조건 동일하게 취급하지 않는다.
- AI 모델 출력도 신뢰하지 않고 schema validation을 적용한다.

---



## 09. Consequences



### Positive

- 전체 제품 코드의 일관성이 높아진다.
- 타입 기반 리팩터링이 쉬워진다.
- Frontend / Backend 계약을 관리하기 쉽다.
- 개발 환경과 CI가 단순해진다.



### Negative

- 일부 AI / Data 라이브러리는 Python이 더 강하다.
- 수치 계산이나 ML 워크로드에서 추가 런타임이 필요할 수 있다.

---



## 10. Constraints

- 단순한 취향 때문에 새로운 언어를 추가하지 않는다.
- Python 코드가 TypeScript Core의 내부 구현에 직접 결합하지 않도록 한다.
- 언어 경계에는 명시적인 API, message 또는 process contract가 있어야 한다.
- 공통 도메인 규칙을 여러 언어에 중복 구현하지 않도록 한다.

---



## 11. Revisit Conditions

- ML / Data Processing이 제품의 핵심 워크로드가 될 때
- Python 기반 Agent Runtime이 명확한 성능 또는 생태계 우위를 제공할 때
- 일부 기능이 별도 서비스로 분리되고 독립적인 언어 선택이 합리적일 때

---



## 12. Related Documents

- `ADR-003-modular-monolith.md`
- `ADR-005-ai-sdk-model-independence.md`
- `../20_architecture/TECH_STACK.md`
- `../20_architecture/DEPLOYMENT.md`
- `../50_engineering/DEVELOPMENT_WORKFLOW.md`

---



## 13. Development Rule

TypeScript는 ODYS의 기본 언어이지 유일한 언어가 아니다.

**Use TypeScript by default. Introduce another language only when the problem justifies it.**