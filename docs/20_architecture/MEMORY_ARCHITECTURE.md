# ODYS Memory Architecture

## 1. Purpose

이 문서는 ODYS Memory subsystem의 역할, lifecycle, retrieval, scope, provenance, conflict handling 및 safety 원칙을 정의한다.

Memory는 ODYS를 일반적인 stateless AI interaction과 구분하는 핵심 capability 중 하나다.

그러나 Memory의 목적은 가능한 모든 정보를 영구 저장하는 것이 아니다.

ODYS Memory의 목표는 다음과 같다.

> Preserve information that remains useful across time and retrieve it only when it improves the current task.

이 문서는 다음 질문에 답한다.

- 무엇을 Memory라고 부르는가?

- Conversation history와 Memory는 어떻게 다른가?

- 어떤 정보를 저장해야 하는가?

- 어떤 정보를 저장하지 않아야 하는가?

- Memory는 어떤 scope를 가지는가?

- Memory는 어떻게 검색되고 Context에 포함되는가?

- 잘못되거나 오래된 Memory는 어떻게 수정되는가?

- 사용자 privacy와 control은 어떻게 유지되는가?

---

## 2. Memory Is Not Conversation History

Conversation과 Memory는 서로 다른 개념이다.

```

Conversation History

= 과거 interaction의 기록

Memory

= 미래 interaction에서 다시 사용할 가치가 있다고 판단된 정보

```

예를 들어 사용자가 다음과 같이 말했다고 가정한다.

```

오늘 점심은 김밥을 먹었다.

```

이 정보는 대화 기록에는 남을 수 있지만 장기 Memory로 저장할 필요는 없을 가능성이 높다.

반면 다음과 같은 정보는 미래에 반복적으로 사용될 수 있다.

```

ODYS 프로젝트에서는 TypeScript를 primary language로 사용한다.

```

이 정보는 장기적으로 유용한 Memory candidate가 될 수 있다.

모든 Message를 Memory로 변환하지 않는다.

---

## 3. Memory Goals

ODYS Memory는 다음 목적을 가진다.

### Continuity

session이 달라져도 장기 목표와 중요한 context를 유지한다.

### Reduced Repetition

사용자가 같은 정보를 반복해서 설명할 필요를 줄인다.

### Better Decisions

과거의 결정, 선호 및 경험을 현재 판단에 활용한다.

### Project Awareness

장기 Project의 목표, 상태 및 주요 결정을 유지한다.

### Personalization

사용자에게 실제로 유용한 범위에서 interaction을 조정한다.

### Recoverability

과거에 왜 특정 결정을 했는지 다시 확인할 수 있게 한다.

---

## 4. Memory Non-Goals

ODYS Memory는 다음을 목표로 하지 않는다.

### Store Everything

모든 interaction을 Long-Term Memory로 만들지 않는다.

### Hidden Profiling

사용자가 예상하기 어려운 방식으로 불필요한 개인 정보를 축적하지 않는다.

### Replace Source Documents

Document 전체를 Memory로 복제하지 않는다.

### Become the Source of Truth for Everything

외부 정보의 authoritative source가 존재한다면 Memory는 그 정보를 대체하지 않는다.

### Guarantee Perfect Recall

Memory retrieval은 probabilistic component를 포함할 수 있으므로 중요한 정보는 검증 가능해야 한다.

---

## 5. Memory Categories

ODYS는 개념적으로 네 가지 Memory category를 사용한다.

```

Memory

├── Working Memory

├── Semantic Memory

├── Episodic Memory

└── Procedural Memory

```

이 category는 모든 경우에 database table을 분리해야 한다는 의미가 아니다.

Memory의 의미와 retrieval 전략을 구분하기 위한 domain classification이다.

---

## 6. Working Memory

Working Memory는 현재 Task 또는 execution을 수행하기 위해 일시적으로 유지되는 정보다.

예:

```

현재 사용자 요청

현재 Conversation context

방금 실행한 Tool 결과

현재 Agent plan

temporary intermediate result

```

Working Memory는 일반적으로 Task 종료 후 영구 보존할 필요가 없다.

필요한 정보만 Long-Term Memory candidate로 승격할 수 있다.

---

## 7. Semantic Memory

Semantic Memory는 상대적으로 안정적인 사실, 선호, 상태 또는 개념을 나타낸다.

예:

```

사용자가 선호하는 개발 방식

프로젝트의 기술 선택

현재 장기 목표

특정 프로젝트의 naming convention

사용자가 명시한 반복적인 preference

```

Semantic Memory는 미래 interaction에서 직접적인 context로 사용될 가능성이 높다.

---

## 8. Episodic Memory

Episodic Memory는 특정 시점에 발생한 중요한 사건이나 경험을 나타낸다.

예:

```

특정 architecture decision을 내린 사건

프로젝트 milestone 완료

중요한 실패와 그 원인

사용자가 중요한 선택을 변경한 시점

특정 workflow가 성공적으로 수행된 경험

```

Episodic Memory는 과거의 상황과 결과를 이해하는 데 사용한다.

---

## 9. Procedural Memory

Procedural Memory는 반복 가능한 방법이나 workflow를 나타낸다.

예:

```

프로젝트 release 전에 수행하는 검증 절차

특정 보고서를 준비하는 workflow

사용자가 반복적으로 수행하는 개발 절차

특정 Tool 조합을 사용하는 작업 순서

```

Procedural Memory가 코드로 자동화할 만큼 안정적이고 중요해진다면 향후 workflow 또는 Tool configuration으로 승격할 수 있다.

즉 Procedural Memory와 executable automation을 동일하게 취급하지 않는다.

---

## 10. Memory Scope

Memory는 명확한 scope를 가진다.

기본 scope hierarchy는 다음과 같다.

```

User

└── Workspace

    └── Project

```

### Workspace Memory

Workspace 전체에서 유용한 정보다.

예:

```

이 Workspace에서는 영어 technical terminology를 유지한다.

```

### Project Memory

특정 Project에서 주로 필요한 정보다.

예:

```

ODYS Core는 특정 domain logic을 포함하지 않는다.

```

Project-specific Memory를 관련 없는 다른 Project에 무조건 주입하지 않는다.

---

## 11. Memory Ownership

Memory는 명확한 owner와 authorization boundary를 가져야 한다.

최소한 다음을 판단할 수 있어야 한다.

- 누구의 Memory인가?

- 어떤 Workspace에 속하는가?

- 특정 Project에 한정되는가?

- 누가 읽을 수 있는가?

- 누가 수정할 수 있는가?

- 누가 삭제할 수 있는가?

Memory retrieval 이전에 authorization을 확인해야 한다.

semantic similarity가 높다는 이유만으로 다른 사용자의 Memory를 반환해서는 안 된다.

---

## 12. Memory Representation

Memory는 단순 raw text 한 줄보다 구조화된 metadata와 함께 저장한다.

개념적인 Memory는 다음 요소를 가질 수 있다.

```

Memory

├── id

├── owner

├── workspace

├── project

├── type

├── content

├── summary

├── status

├── confidence

├── importance

├── provenance

├── created_at

├── updated_at

├── last_verified_at

└── expires_at

```

초기 MVP에서는 모든 metadata를 반드시 구현하지 않는다.

실제 retrieval과 maintenance에 필요한 최소 field부터 시작한다.

---

## 13. Memory Content

Memory content는 미래에 독립적으로 이해할 수 있어야 한다.

좋지 않은 Memory:

```

그거는 저번에 말한 방식으로 한다.

```

더 나은 Memory:

```

ODYS repository는 pnpm workspace를 package manager strategy로 사용한다.

```

Memory는 가능하면 현재 Conversation이 없어도 의미를 이해할 수 있도록 작성한다.

---

## 14. Memory Candidate

새로운 정보가 바로 Long-Term Memory가 되는 것은 아니다.

먼저 Memory Candidate로 판단할 수 있다.

```

Observation

    │

    ▼

Memory Candidate

    │

    ▼

Evaluation

    │

    ├── Reject

    │

    └── Accept

          │

          ▼

        Memory

```

Memory Candidate는 반드시 영구 database table이어야 하는 것은 아니다.

초기에는 runtime object로 처리할 수 있다.

향후 asynchronous review가 필요해지면 persistent candidate model을 도입할 수 있다.

---

## 15. Candidate Sources

Memory Candidate는 다음 source에서 발생할 수 있다.

### Explicit User Request

사용자가 직접 기억하도록 요청한다.

예:

```

이 프로젝트는 pnpm을 사용한다고 기억해.

```

가장 명확한 Memory source다.

### Conversation

대화 과정에서 장기적으로 유용한 정보가 발견될 수 있다.

### Project State

중요한 Project decision 또는 milestone이 발생할 수 있다.

### Document

중요한 project-specific rule 또는 decision을 추출할 수 있다.

### Agent Result

Agent가 작업 과정에서 장기적으로 가치 있는 결과를 만들 수 있다.

### Tool Result

외부 Tool 결과 중 지속적으로 사용할 정보가 있을 수 있다.

---

## 16. What Should Be Remembered

Memory candidate는 다음 질문을 기준으로 평가한다.

1. 미래 interaction에서 다시 필요할 가능성이 높은가?

2. 반복적인 설명을 줄이는가?

3. 장기 목표나 Project continuity에 중요한가?

4. 사용자의 명시적인 preference 또는 decision인가?

5. 다른 authoritative source에서 쉽게 다시 가져올 수 없는가?

6. 저장 비용과 privacy risk보다 미래 utility가 높은가?

하나 이상의 기준을 만족한다고 해서 반드시 저장해야 하는 것은 아니다.

---

## 17. What Should Not Be Remembered

다음 정보는 기본적으로 Long-Term Memory 저장 우선순위가 낮다.

- 일회성 잡담

- 즉시 만료되는 정보

- 쉽게 다시 조회할 수 있는 public fact

- 의미 없는 intermediate reasoning

- 중복 정보

- 불필요한 민감 정보

- 현재 Task에만 필요한 temporary value

- 사용자가 저장하지 않기를 원하는 정보

Memory subsystem의 목표는 최대 storage가 아니라 높은 signal-to-noise ratio다.

---

## 18. Initial Memory Policy

초기 MVP에서는 aggressive automatic memory보다 **explicit and inspectable memory**를 우선한다.

우선순위는 다음과 같다.

```

1. Explicit user memory request

2. Explicit user confirmation

3. High-confidence Project decision

4. Other inferred Memory candidates

```

초기에는 inference만으로 중요한 개인 정보를 자동 저장하는 범위를 제한한다.

시스템이 충분히 검증된 이후 policy를 단계적으로 확장한다.

---

## 19. Memory Lifecycle

Long-Term Memory의 기본 lifecycle은 다음과 같다.

```

Observe

  │

  ▼

Extract Candidate

  │

  ▼

Evaluate

  │

  ▼

Store

  │

  ▼

Index

  │

  ▼

Retrieve

  │

  ▼

Use

  │

  ▼

Review

  │

  ├── Keep

  ├── Update

  ├── Supersede

  ├── Archive

  └── Forget

```

Memory는 한 번 저장되면 영원히 고정되는 immutable fact가 아니다.

---

## 20. Storage Pipeline

대표적인 Memory 저장 pipeline은 다음과 같다.

```

Source Information

       │

       ▼

Candidate Extraction

       │

       ▼

Normalization

       │

       ▼

Duplicate Check

       │

       ▼

Policy Evaluation

       │

       ▼

User Confirmation if Required

       │

       ▼

Persistence

       │

       ▼

Search Index Generation

```

각 단계는 초기 구현에서 모두 별도 module일 필요는 없다.

하지만 책임은 개념적으로 구분한다.

---

## 21. Normalization

Memory를 저장하기 전에 가능한 경우 다음을 정리한다.

- 독립적으로 이해 가능한 문장으로 변환

- 불필요한 Conversation 표현 제거

- scope 결정

- type 결정

- source metadata 연결

- duplicate candidate 확인

예:

```

Raw statement:

"응, 앞으로 그 프로젝트는 pnpm으로 하자."

Normalized Memory:

"ODYS repository uses pnpm as its package manager."

```

원래 source와 normalized Memory를 혼동하지 않는다.

---

## 22. Provenance

Memory는 가능한 경우 source provenance를 유지한다.

개념적으로 다음 정보를 기록할 수 있다.

```

source_type

source_id

captured_at

extraction_method

```

source_type의 예:

```

user_statement

message

document

task

Agent_result

Tool_result

manual_entry

```

중요한 Memory일수록 어디에서 나온 정보인지 확인할 수 있어야 한다.

---

## 23. Confidence

모든 Memory가 동일한 확실성을 가지는 것은 아니다.

예:

```

User explicitly stated

→ high confidence

Agent inferred from behavior

→ lower confidence

External information copied long ago

→ may require verification

```

Confidence는 truth probability를 완벽하게 수치화하는 값이 아니다.

Memory retrieval과 conflict resolution을 돕는 metadata로 사용한다.

초기에는 지나치게 정교한 scoring system을 만들 필요가 없다.

---

## 24. Importance

Memory는 미래 utility가 서로 다를 수 있다.

예:

```

Architecture decision

→ high importance

Temporary preference for one session

→ low importance

```

Importance는 retrieval ranking의 한 signal로 사용할 수 있다.

그러나 importance 하나만으로 Context inclusion을 결정하지 않는다.

---

## 25. Memory Status

Memory는 lifecycle을 표현하기 위한 status를 가질 수 있다.

초기 후보는 다음과 같다.

```

active

superseded

archived

deleted

```

### active

현재 retrieval 대상이다.

### superseded

새로운 Memory가 기존 정보를 대체했다.

### archived

보존은 하지만 일반 retrieval에는 사용하지 않는다.

### deleted

사용자가 삭제하거나 시스템 정책에 따라 삭제 대상으로 처리된 상태다.

실제 hard deletion 정책은 privacy 및 retention 규칙을 따른다.

---

## 26. Updating Memory

사용자 정보와 Project state는 변경될 수 있다.

새로운 정보가 들어오면 무조건 기존 Memory를 덮어쓰지 않는다.

먼저 관계를 판단한다.

```

Same fact, more recent value

→ update or supersede

Additional compatible information

→ enrich

Conflicting information

→ resolve or preserve conflict

Temporary change

→ consider validity period

```

중요한 변경은 provenance를 유지한다.

---

## 27. Superseding Memory

과거 정보가 역사적으로 의미가 있지만 현재는 더 이상 적용되지 않을 수 있다.

예:

```

Old:

ODYS uses npm.

New:

ODYS uses pnpm.

```

이 경우 과거 Memory를 단순히 존재하지 않았던 것처럼 처리할 필요는 없다.

개념적으로:

```

Old Memory

status = superseded

New Memory

status = active

```

현재 Context에는 새로운 active Memory를 우선한다.

---

## 28. Conflict Resolution

Memory끼리 충돌할 경우 단순히 가장 최근 값을 항상 선택하지 않는다.

다음 signal을 고려할 수 있다.

1. Explicit user statement

2. Source authority

3. Scope specificity

4. Confidence

5. Recency

6. Verification status

예:

```

Project-specific decision

```

은 일반적인 오래된 Workspace preference보다 우선할 수 있다.

불확실한 경우 시스템이 임의로 사실을 확정하기보다 사용자에게 확인하는 것이 낫다.

---

## 29. Memory Retrieval

Memory retrieval은 단순 vector similarity search와 동일하지 않다.

대표적인 retrieval pipeline은 다음과 같다.

```

Current Task

     │

     ▼

Scope Resolution

     │

     ▼

Authorization

     │

     ▼

Candidate Retrieval

     │

     ▼

Relevance Ranking

     │

     ▼

Conflict / Duplicate Filtering

     │

     ▼

Context Budgeting

     │

     ▼

Selected Memories

```

semantic search는 candidate retrieval 방법 중 하나일 뿐이다.

---

## 30. Retrieval Signals

Memory ranking에는 다음 signal을 사용할 수 있다.

- semantic relevance

- Workspace match

- Project match

- Memory type

- importance

- confidence

- recency

- last verification

- current Task type

단 하나의 similarity score만으로 최종 Context를 결정하지 않는다.

---

## 31. Scope Before Similarity

Memory retrieval에서 scope는 semantic similarity보다 먼저 고려해야 한다.

잘못된 방식:

```

전체 Memory 검색

→ similarity 높은 것 반환

→ 나중에 ownership 확인

```

권장 방식:

```

Authorized Scope Resolve

        │

        ▼

Allowed Memory Set

        │

        ▼

Relevant Memory Retrieval

```

사용자 isolation과 privacy는 retrieval algorithm 이후가 아니라 이전에 보장해야 한다.

---

## 32. Structured and Semantic Retrieval

Memory retrieval은 두 종류의 접근을 조합할 수 있다.

### Structured Retrieval

명시적인 filter를 사용한다.

예:

```

workspace_id

project_id

type

status

created_at

```

### Semantic Retrieval

현재 요청과 의미적으로 관련된 Memory를 검색한다.

두 방식을 결합하는 것이 일반적인 방향이다.

```

Scope Filter

     │

     ▼

Structured Constraints

     │

     ▼

Semantic Retrieval

     │

     ▼

Ranking

```

---

## 33. Embeddings

Semantic retrieval을 위해 Memory에 embedding을 생성할 수 있다.

```

Memory Content

     │

     ▼

Embedding Model

     │

     ▼

Vector Representation

```

하지만 embedding은 Memory 자체가 아니다.

다음 원칙을 따른다.

> Memory is canonical data. Embedding is derived search data.

embedding model이 변경되면 vector representation은 다시 생성할 수 있어야 한다.

Memory domain contract가 특정 embedding provider에 직접 의존하지 않도록 한다.

---

## 34. Context Budgeting

관련 Memory가 많다고 해서 모두 Model Context에 넣지 않는다.

Context Builder는 제한된 context budget 안에서 가장 유용한 Memory를 선택해야 한다.

개념적으로:

```

100 Candidate Memories

        │

        ▼

Scope + Relevance + Quality Ranking

        │

        ▼

Top Relevant Memories

        │

        ▼

Context Budget Check

        │

        ▼

Final Context

```

Memory quantity보다 task relevance를 우선한다.

---

## 35. Memory Compression

Memory가 길거나 반복되는 경우 summary 또는 consolidation을 사용할 수 있다.

예:

```

Multiple related memories

        │

        ▼

Consolidation

        │

        ▼

Higher-level summary

```

하지만 summary 생성 과정에서 중요한 사실과 provenance가 사라질 수 있다.

따라서 consolidated Memory와 원본 source 사이의 관계를 가능하면 유지한다.

초기에는 aggressive automatic consolidation을 구현하지 않는다.

---

## 36. Memory Deduplication

동일하거나 거의 동일한 Memory가 반복 저장되면 retrieval 품질이 저하된다.

저장 전에 다음을 확인할 수 있다.

```

Exact duplicate?

Semantic duplicate?

Existing Memory enrichment?

Conflicting update?

New independent fact?

```

duplicate라고 판단했다고 해서 무조건 기존 Memory를 자동 변경하지 않는다.

source와 의미가 다를 수 있기 때문이다.

---

## 37. Memory Verification

시간에 따라 변경될 수 있는 정보는 verification 상태를 고려한다.

예:

```

현재 프로젝트의 deployment provider

현재 사용자의 일정 preference

외부 서비스 상태

현재 기술 선택

```

필요한 경우 다음 metadata를 사용할 수 있다.

```

last_verified_at

expires_at

```

오래된 Memory가 중요한 결정을 좌우할 경우 다시 확인하는 것이 안전하다.

---

## 38. Expiring Memory

모든 Memory가 영구적으로 유효한 것은 아니다.

예:

```

이번 학기 수업 일정

현재 진행 중인 application deadline

temporary project constraint

```

이러한 Memory에는 expiration 또는 validity concept을 적용할 수 있다.

만료된 Memory는 일반 Context에서 제외하거나 verification 대상으로 처리한다.

---

## 39. User Control

사용자는 자신의 Memory를 통제할 수 있어야 한다.

장기적으로 다음 capability를 제공하는 것을 목표로 한다.

- Memory 조회

- Memory 수정

- Memory 삭제

- Memory 저장 거부

- 자동 Memory 수준 조정

- 특정 Memory scope 변경

- Memory source 확인

Memory subsystem은 사용자에게 보이지 않는 hidden state만으로 동작해서는 안 된다.

---

## 40. Forgetting

사용자가 특정 정보를 잊도록 요청한 경우 해당 Memory는 future retrieval에서 즉시 제외해야 한다.

개념적인 흐름은 다음과 같다.

```

Forget Request

     │

     ▼

Authorization Check

     │

     ▼

Memory Deactivation

     │

     ▼

Search Index Removal

     │

     ▼

Retention / Hard Delete Policy

```

삭제된 Memory가 embedding index나 cache를 통해 다시 나타나지 않도록 해야 한다.

---

## 41. Sensitive Memory

민감한 정보는 일반 Memory보다 더 엄격하게 처리한다.

Memory subsystem은 다음을 기본 원칙으로 한다.

- 필요한 경우에만 저장

- 최소한의 scope

- 최소한의 retention

- authorization enforcement

- unnecessary logging 금지

- user deletion 존중

- Tool이나 Agent에 불필요한 노출 금지

Memory라고 해서 모든 Agent가 자동으로 접근할 수 있는 것은 아니다.

---

## 42. Agent Access to Memory

Agent는 자신의 작업에 필요한 Memory만 받아야 한다.

예:

```

Career Agent

→ Career-related Project Memory

Coding Agent

→ Code Project Memory

```

Agent가 모든 Workspace Memory를 항상 받는 구조를 피한다.

Memory access도 least privilege와 context relevance 원칙을 따른다.

---

## 43. Memory and Packs

ODYS Core는 범용 Memory mechanism을 제공한다.

Pack은 domain-specific Memory usage를 정의할 수 있다.

예:

```

Engineering Pack

├── Study-related Memory usage

├── Conference preferences

├── Career goals

└── Coding project decisions

```

하지만 Pack이 별도의 독립 Memory system을 만드는 것은 기본 방향이 아니다.

```

One Core Memory System

        │

        ├── Engineering Pack

        ├── Research Pack

        └── Future Packs

```

---

## 44. Memory and Knowledge

Memory와 Knowledge는 구분한다.

```

Memory

→ 사용자 및 작업의 지속적인 context

Knowledge

→ 외부 또는 domain information

```

예:

```

"사용자는 이번 프로젝트에서 PostgreSQL을 선택했다."

→ Memory

"PostgreSQL은 relational database system이다."

→ Knowledge

```

같은 정보가 상황에 따라 두 영역과 관련될 수 있지만 목적은 다르다.

---

## 45. Memory and Documents

Document 전체를 Memory로 복사하지 않는다.

대신 Document가 Memory의 source가 될 수 있다.

```

Document

   │

   ├── Search / Knowledge Retrieval

   │

   └── Important Fact

          │

          ▼

     Memory Candidate

```

Document는 source content의 canonical location을 유지하고 Memory에는 장기적으로 필요한 context만 저장한다.

---

## 46. Memory and Tasks

Task 수행 과정에서 장기적으로 중요한 정보가 발생할 수 있다.

예:

```

Task completed

      │

      ▼

Important outcome detected

      │

      ▼

Memory Candidate

```

그러나 모든 Task result를 Memory로 저장하지 않는다.

Task history와 Long-Term Memory는 별개의 data concern이다.

---

## 47. Memory and Audit

Memory mutation은 경우에 따라 Audit 대상이 될 수 있다.

특히 다음 operation은 추적 가치가 높다.

- Memory 생성

- 중요한 Memory 수정

- supersede

- 사용자 삭제

- automated memory write

Audit log 자체가 Memory content 전체를 복제해서는 안 된다.

필요한 operation metadata만 기록한다.

---

## 48. Failure Handling

Memory subsystem 실패가 전체 Agent 실행을 항상 중단해야 하는 것은 아니다.

예:

```

Memory retrieval failure

→ 가능한 경우 Memory 없이 요청 계속 처리

Memory write failure

→ 사용자 응답은 유지하고 저장 실패 기록

Embedding generation failure

→ canonical Memory는 유지하고 indexing retry 가능

```

Memory availability와 core request availability를 적절히 분리한다.

---

## 49. Search Index Recovery

Search representation은 canonical Memory에서 재생성 가능해야 한다.

```

Canonical Memory

      │

      ▼

Rebuild

      │

      ▼

Search Index

```

vector index 손상이나 embedding model 변경이 Memory 자체의 손실로 이어져서는 안 된다.

---

## 50. Initial MVP Memory Flow

초기 MVP에서는 다음 흐름을 우선한다.

```

User Interaction

      │

      ▼

Explicit or High-Confidence Candidate

      │

      ▼

Memory Evaluation

      │

      ▼

Store Memory

      │

      ▼

Create Search Representation

      │

      ▼

Future User Request

      │

      ▼

Authorized Retrieval

      │

      ▼

Relevant Memory Selection

      │

      ▼

Context Builder

      │

      ▼

Agent

```

첫 버전에서 완전한 autonomous memory management를 구현하지 않는다.

---

## 51. MVP Requirements

초기 Memory subsystem은 최소한 다음 기능을 제공해야 한다.

1. Memory를 저장할 수 있다.

2. Memory에 Workspace scope가 존재한다.

3. 필요한 경우 Project scope를 사용할 수 있다.

4. Memory를 조회할 수 있다.

5. 현재 요청과 관련된 Memory를 검색할 수 있다.

6. 선택된 Memory를 Agent Context에 전달할 수 있다.

7. Memory를 수정할 수 있다.

8. Memory를 삭제하거나 retrieval 대상에서 제외할 수 있다.

9. source 또는 provenance를 확인할 수 있다.

10. 다른 사용자의 Memory가 노출되지 않는다.

---

## 52. Deferred Capabilities

다음 기능은 초기 MVP에 반드시 필요하지 않다.

- fully autonomous memory extraction

- complex memory graph

- temporal knowledge graph

- automatic procedural learning

- multi-user shared organizational memory

- sophisticated memory decay algorithm

- reinforcement-based memory ranking

- automatic large-scale memory consolidation

- provider-specific memory optimization

실제 사용에서 필요성이 확인된 이후 추가한다.

---

## 53. Memory Quality Metrics

향후 Memory subsystem의 품질은 단순 Memory 개수로 평가하지 않는다.

관찰 가능한 지표 후보는 다음과 같다.

### Retrieval Precision

가져온 Memory가 현재 Task에 실제로 관련 있는가?

### Retrieval Recall

필요했던 중요한 Memory를 놓치지 않았는가?

### Stale Memory Rate

현재는 잘못된 오래된 Memory가 얼마나 자주 사용되는가?

### Duplicate Rate

동일한 Memory가 반복 저장되고 있는가?

### User Correction Rate

사용자가 Memory를 얼마나 자주 수정해야 하는가?

### Useful Recall Rate

Memory 때문에 실제로 반복 설명이나 탐색이 줄어들었는가?

Memory가 많아지는 것 자체는 성공 지표가 아니다.

---

## 54. Memory Architecture Invariants

Memory subsystem이 발전하더라도 다음 원칙은 유지한다.

1. Conversation history is not Long-Term Memory.

2. Not everything should be remembered.

3. Memory always has an authorization boundary.

4. Scope is resolved before semantic retrieval.

5. Explicit user information outranks weak inference.

6. Memory can become stale and must be updateable.

7. Embeddings are derived indexes, not canonical Memory.

8. Users can inspect and remove their Memory.

9. Deleted Memory must not reappear through indexes or caches.

10. Agent access to Memory follows least privilege and relevance.

11. Core provides one general Memory system; Packs specialize its use.

12. Memory quality matters more than Memory quantity.

---

## 55. Related Documents

이 문서는 다음 architecture 문서와 함께 사용한다.

- `SYSTEM_OVERVIEW.md`

- `ODYS_CORE.md`

- `DATA_MODEL.md`

- `AGENT_ARCHITECTURE.md`

- `TOOL_ARCHITECTURE.md`

- `MODEL_STRATEGY.md`

- `API_DESIGN.md`

- `SECURITY_ARCHITECTURE.md`

- `DEPLOYMENT.md`

- `TECH_STACK.md`

관련 Architecture Decision Record:

- `../40_decisions/ADR-002-core-vs-pack.md`

- `../40_decisions/ADR-003-modular-monolith.md`

- `../40_decisions/ADR-004-typescript-primary.md`

- `../40_decisions/ADR-005-ai-sdk-model-independence.md`

- `../40_decisions/ADR-006-supabase.md`

- `../40_decisions/ADR-007-progressive-autonomy.md`

---

## 56. Memory Development Rule

새로운 Memory behavior를 추가하기 전에 다음 질문을 확인한다.

1. 이 정보는 실제로 미래에 다시 필요한가?

2. 사용자에게 반복 설명을 줄이는가?

3. 올바른 Workspace와 Project scope를 판단할 수 있는가?

4. source와 provenance를 설명할 수 있는가?

5. 오래되었을 때 어떻게 갱신할 것인가?

6. 사용자가 삭제할 수 있는가?

7. 다른 Agent에 불필요하게 노출되지 않는가?

8. semantic similarity만으로 판단하고 있지는 않은가?

9. canonical data와 derived index를 구분하고 있는가?

10. 자동화 수준이 현재 시스템 신뢰도에 적절한가?

명확한 가치가 없다면 Memory를 추가하지 않는다.

> ODYS should remember less than it observes, retrieve less than it stores, and use only what improves the task.
