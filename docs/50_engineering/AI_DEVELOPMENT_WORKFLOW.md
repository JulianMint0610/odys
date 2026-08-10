# AI_DEVELOPMENT_WORKFLOW

> Cursor, ChatGPT 및 기타 AI coding assistant를 ODYS 개발에 사용할 때 적용하는 공통 작업 규칙이다.

---

## 01. Purpose

ODYS는 AI Agent를 만드는 프로젝트이며 동시에 개발 과정에서도 AI를 적극적으로 활용한다.

AI coding assistant는 코드 탐색, 구현 초안, 리팩터링, 테스트 작성, 문서화, 디버깅을 크게 가속할 수 있다.

하지만 AI가 생성한 코드를 검증 없이 적용하면 다음 위험이 있다.

- 존재하지 않는 API 사용
- 기존 아키텍처와 충돌
- 과도한 코드 수정
- 보안 취약점
- 테스트되지 않은 변경
- 숨겨진 dependency 추가
- 잘못된 가정
- 프로젝트 문서와 다른 구현

따라서 AI는 강력한 개발 도구로 사용하되 최종 의사결정과 검증 책임은 프로젝트 소유자에게 둔다.

---

## 02. Core Principle

좋은 AI 개발 흐름:

```text
Context
  ↓
Task
  ↓
Constraints
  ↓
Plan
  ↓
Patch
  ↓
Review
  ↓
Test
  ↓
Commit
```

나쁜 흐름:

```text
"알아서 전체 고쳐줘"
  ↓
Large uncontrolled patch
  ↓
Commit
```

---



## 03. AI Role

AI는 다음 역할을 수행할 수 있다.

- codebase navigator
- pair programmer
- reviewer
- test generator
- refactoring assistant
- documentation assistant
- debugging assistant

AI는 다음 역할을 최종적으로 소유하지 않는다.

- architecture authority
- security authority
- production approval authority
- irreversible action approver

---



## 04. Source of Truth

AI의 답변보다 다음 소스가 우선한다.

1. 현재 repository code
2. tests
3. accepted ADR
4. architecture documents
5. product documents
6. official external documentation
7. AI의 일반 지식

AI가 프로젝트 구조에 대해 추측하지 않도록 관련 파일을 먼저 읽게 한다.

---



## 05. Before Coding

AI에게 작업을 요청하기 전에 가능한 한 다음 정보를 제공한다.

### 5.1 Goal

무엇을 만들거나 수정할 것인가.

### 5.2 Scope

어떤 파일과 모듈을 변경할 수 있는가.

### 5.3 Constraints

지켜야 하는 아키텍처, 라이브러리, 보안 규칙.

### 5.4 Expected Behavior

입력과 출력 또는 성공 조건.

### 5.5 Verification

어떤 테스트로 완료를 확인할 것인가.

---



## 06. Context Loading

AI가 변경 전 읽어야 하는 파일을 명확히 지정한다.

예:

```text
Read first:
- docs/20_architecture/AGENT_ARCHITECTURE.md
- docs/20_architecture/TOOL_ARCHITECTURE.md
- docs/40_decisions/ADR-007-progressive-autonomy.md
- packages/core/src/agent/*
```

큰 저장소 전체를 무조건 context에 넣는 것보다 관련 범위를 정확히 선택한다.

---



## 07. Planning Rule

중간 이상 크기의 변경은 AI에게 바로 수정하게 하지 않는다.

먼저 다음을 요청한다.

- 현재 구조 요약
- 영향을 받는 모듈
- 변경 계획
- 위험 요소
- 테스트 계획

작은 typo 또는 명확한 단일-line fix는 이 단계를 생략할 수 있다.

---



## 08. Patch Size Rule

AI 변경은 가능한 한 작은 patch 단위로 만든다.

권장:

```text
1. interface 추가
2. implementation 추가
3. tests 추가
4. caller migration
```

비권장:

```text
한 번에 30개 파일 전체 재작성
```

---



## 09. No Blind Rewrite

기존 파일을 전체 재작성하기 전에 이유가 있어야 한다.

기본적으로 AI에게 다음 방식의 변경을 요구한다.

- 필요한 부분만 수정
- 기존 naming 유지
- unrelated formatting 변경 금지
- public API 임의 변경 금지
- 기존 동작 보존

문서 전체 개편처럼 전체 재작성 자체가 작업 목표인 경우는 예외다.

---



## 10. Hallucination Control

AI가 다음을 임의로 가정하지 않도록 한다.

- 존재하지 않는 package
- 존재하지 않는 environment variable
- 존재하지 않는 API
- repository에 없는 file path
- 설치되지 않은 framework
- database table
- external service behavior

확신할 수 없는 부분은 실제 코드, schema 또는 공식 문서를 확인한다.

---



## 11. Dependency Rule

AI가 새로운 dependency를 제안하거나 추가하는 경우 검토한다.

- 정말 필요한가
- 기존 dependency로 해결 가능한가
- maintenance 상태는 어떤가
- license는 적절한가
- 보안 위험은 없는가
- package size / runtime cost는 적절한가

---



## 12. Architecture Guardrails

AI-generated code도 기존 ADR을 따라야 한다.

특히 다음 규칙을 지킨다.

- Core / Pack boundary
- Modular Monolith boundary
- TypeScript primary
- Model Gateway 사용
- Supabase adapter boundary
- Progressive Autonomy
- Permission check before high-risk tool execution

AI가 `빠른 구현`을 이유로 아키텍처 경계를 우회하지 않도록 한다.

---



## 13. Security Guardrails

AI에게 다음 정보는 prompt 또는 code에 불필요하게 제공하지 않는다.

- production API key
- service role key
- private token
- password
- signing secret
- 사용자 민감 데이터

AI-generated code에서 반드시 확인한다.

- secret hardcoding
- SQL injection
- unsafe shell execution
- path traversal
- authorization bypass
- unvalidated input
- prompt injection 영향
- destructive command
- arbitrary code execution

---



## 14. Tool Execution Guardrail

ODYS 자체의 Tool 실행 코드를 AI가 수정할 때는 특히 엄격하게 검토한다.

확인 항목:

- permission check가 유지되는가
- confirmation boundary를 우회하지 않는가
- input schema validation이 있는가
- timeout이 있는가
- retry가 안전한가
- audit log가 남는가
- destructive action이 명확한가

---



## 15. AI Output Validation

AI가 만든 코드를 `그럴듯하다`는 이유로 승인하지 않는다.

최소 검증:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

필요하면:

```bash
pnpm build
```

또한 diff를 직접 읽는다.

---



## 16. Test Generation

AI는 테스트 생성에 적극 활용할 수 있다.

특히 다음 경우 유용하다.

- edge case 찾기
- regression test 작성
- table-driven test
- permission matrix
- error handling
- provider mock
- schema validation

AI가 만든 테스트가 구현을 그대로 복사해 같은 오류를 반복하지 않는지 확인한다.

---



## 17. Debugging Workflow

```text
Reproduce
  ↓
Collect evidence
  ↓
Form hypothesis
  ↓
Inspect code
  ↓
Minimal fix
  ↓
Regression test
  ↓
Verify
```

AI에게 오류 메시지, stack trace, 재현 조건을 제공한다.

---



## 18. Refactoring Workflow

AI refactoring 전에 다음을 확인한다.

- 현재 테스트가 충분한가
- public behavior가 무엇인가
- 바꾸지 말아야 할 contract가 무엇인가

refactor 후에는 behavior-preserving 여부를 테스트한다.

---



## 19. Documentation Workflow

AI는 문서 초안을 작성할 수 있지만 실제 코드와 일치해야 한다.

문서화 시 확인한다.

- 실제 file path
- 실제 command
- 실제 environment variable
- 실제 API contract
- 실제 architecture

존재하지 않는 기능을 미래 계획처럼 써야 한다면 `planned`임을 명확히 표시한다.

---



## 20. Prompt Pattern

권장 요청 형식:

```text
Goal:
<작업 목적>

Read first:
<관련 파일>

Constraints:
<지켜야 하는 규칙>

Task:
<구체적인 변경>

Do not:
<금지 사항>

Verify:
<테스트 방법>
```

---



## 21. AI Review Pass

구현을 만든 AI와 별도로 `review mode`를 사용한다.

리뷰 시 질문:

- 버그 가능성은 무엇인가
- 기존 동작을 깨뜨리는가
- 보안 문제가 있는가
- edge case는 무엇인가
- architecture rule을 어기는가
- 테스트가 충분한가
- 더 단순한 구현이 가능한가

가능하면 생성과 리뷰의 역할을 분리한다.

---



## 22. Human Review Checklist



### Code

- 내가 이 코드의 동작을 설명할 수 있는가
- 불필요한 코드가 없는가
- naming이 프로젝트와 일치하는가



### Architecture

- 책임이 올바른 모듈에 있는가
- 새로운 coupling이 생기지 않았는가



### Security

- 권한 우회가 없는가
- secret이 없는가
- 외부 입력 검증이 있는가



### Operations

- 오류가 관찰 가능한가
- migration 또는 config 변경이 필요한가



### Verification

- 테스트를 실제로 실행했는가

---



## 23. Commit Ownership

AI가 코드를 작성했더라도 commit의 책임은 사람에게 있다.

Commit은 다음 의미를 가진다.

> 이 변경을 이해했고, 검토했고, 현재 프로젝트에 들어가도 된다고 판단했다.

---



## 24. AI Autonomy in Development



### Stage 1

- 설명
- 코드 제안
- diff 제안



### Stage 2

- 제한된 파일 수정
- 테스트 작성



### Stage 3

- 로컬 명령 실행
- 테스트 반복
- refactor 수행



### Stage 4

- 사전에 정의된 범위 안에서 반복 작업 자동화

다음 작업은 높은 주의가 필요하다.

- dependency update
- database migration
- credential 관련 변경
- production deployment
- destructive command
- large-scale rewrite

---



## 25. Prohibited Practices

- AI 결과를 읽지 않고 commit
- 전체 저장소를 이유 없이 재작성
- 테스트 실패를 무시
- architecture document와 충돌하는 구현
- secret을 prompt에 붙여넣기
- production 데이터로 무분별한 실험
- AI가 제안한 command를 이해하지 않고 실행
- 실패 원인을 모른 채 반복적인 random patch 적용

---



## 26. Definition of Done

- 변경 목적이 달성되었다.
- diff를 사람이 이해한다.
- architecture rule을 지킨다.
- security impact를 검토했다.
- lint / typecheck / test가 통과한다.
- 필요한 문서가 업데이트되었다.
- 불필요한 AI-generated code가 제거되었다.
- commit이 하나의 논리적 변경을 표현한다.

---



## 27. Related Documents

- `DEVELOPMENT_WORKFLOW.md`
- `TEST_STRATEGY.md`
- `../40_decisions/README.md`
- `../40_decisions/ADR-002-core-vs-pack.md`
- `../40_decisions/ADR-003-modular-monolith.md`
- `../40_decisions/ADR-007-progressive-autonomy.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`

---



## 28. Final Rule

AI는 ODYS 개발의 속도를 높이기 위한 강력한 도구다.

하지만 속도보다 중요한 것은 **이해 가능한 변경, 검증 가능한 변경, 되돌릴 수 있는 변경**이다.

**AI may write the patch. The developer owns the decision.**