# ODYS User Journey

## 1. Purpose

이 문서는 사용자가 ODYS와 상호작용하면서 경험하는 핵심 흐름을 정의한다.

ODYS의 목표는 개별 기능의 집합이 아니라 지속적인 user journey를 제공하는 것이다.

---

## 2. Journey Overview

사용자의 일반적인 ODYS journey는 다음 흐름을 가진다.

Discover

→ Configure

→ Connect Context

→ Ask

→ Plan

→ Execute

→ Review

→ Remember

→ Improve

---

## 3. Stage 1 — Discover

사용자는 자신의 정보와 작업이 여러 도구에 분산되어 있고 AI에게 반복적으로 context를 설명해야 하는 문제를 경험한다.

ODYS를 다음과 같은 시스템으로 인식한다.

> A persistent AI workspace that can understand ongoing goals and coordinate tools around them.

초기 기대는 단순한 "더 좋은 chat"이 아니라 지속적인 도움이다.

---

## 4. Stage 2 — Configure

첫 설정에서 사용자는 필요한 수준의 기본 환경을 구성한다.

예:

- account

- timezone

- basic preferences

- privacy settings

- connected services

- autonomy preferences

모든 연결을 처음부터 요구하지 않는다.

필요한 기능을 사용할 때 점진적으로 연결한다.

---

## 5. Stage 3 — Establish Context

사용자는 목표나 project를 ODYS에 알려준다.

예:

> 이번 학기 전공 과목과 개발 프로젝트를 같이 관리하고 싶다.

ODYS는 이를 단일 chat prompt로만 취급하지 않고 지속적인 context로 구성한다.

관련 정보는 다음과 연결될 수 있다.

- goals

- tasks

- documents

- memories

- calendar

- agents

---

## 6. Stage 4 — Ask

사용자는 자연어로 요청한다.

예:

> 이번 주에 내가 가장 먼저 해야 할 일은 뭐야?

ODYS는 현재 대화뿐 아니라 관련 context를 검색한다.

응답은 가능한 경우 다음을 고려한다.

- 현재 goals

- deadlines

- previous decisions

- available time

- related documents

- active projects

---

## 7. Stage 5 — Plan

복잡한 요청의 경우 ODYS는 작업을 단계로 분리한다.

예:

> 다음 학기 임베디드 프로젝트를 준비하고 싶어.

ODYS는 다음과 같은 plan을 만들 수 있다.

1. 목표 정의

2. 현재 skill 확인

3. 필요한 기술 파악

4. 자료 수집

5. 학습 일정 구성

6. 작은 prototype 수행

7. 진행 상태 검토

사용자는 plan을 수정하거나 승인할 수 있다.

---

## 8. Stage 6 — Execute

필요하면 Agent가 Tool을 사용한다.

예:

Conference Agent가:

1. 관련 conference source를 조회한다.

2. 날짜와 deadline을 추출한다.

3. 중복을 제거한다.

4. 사용자 관심 분야와 비교한다.

5. 후보를 제안한다.

외부 상태 변경이 필요하면 approval policy를 적용한다.

---

## 9. Stage 7 — Review

실행 결과는 사용자에게 명확히 보여준다.

사용자는 다음을 확인할 수 있어야 한다.

- 무엇을 수행했는가

- 왜 수행했는가

- 어떤 정보를 사용했는가

- 결과는 무엇인가

- 다음 행동은 무엇인가

중요한 작업일수록 transparency가 높아야 한다.

---

## 10. Stage 8 — Remember

작업 과정에서 장기적으로 가치가 있는 정보가 발생할 수 있다.

예:

- 사용자의 결정

- 프로젝트 목표

- 선호

- 반복 workflow

- 중요한 deadline

ODYS는 이를 memory candidate로 처리한다.

저장된 memory는 미래 context에 재사용된다.

---

## 11. Stage 9 — Improve

ODYS는 반복 사용을 통해 사용자에게 더 적합해진다.

개선은 단순히 모든 데이터를 저장하는 방식이 아니다.

다음을 학습한다.

- 어떤 정보가 반복적으로 필요한가

- 어떤 Agent가 실제 사용되는가

- 어떤 Tool이 유용한가

- 어떤 suggestion이 무시되는가

- 어떤 automation이 가치가 있는가

---

## 12. Example Journey — Conference

사용자:

> 올해 내가 관심 가질 만한 AI와 반도체 학회를 찾아줘.

ODYS:

1. 사용자의 관심 분야를 context에서 확인한다.

2. Conference Agent를 선택한다.

3. 관련 source를 검색한다.

4. event 후보를 구조화한다.

5. 날짜와 submission deadline을 검증한다.

6. 사용자에게 우선순위와 함께 제안한다.

사용자:

> 이 세 개는 계속 추적해줘.

ODYS:

1. 사용자의 선택을 저장한다.

2. monitoring task를 설정한다.

3. 향후 deadline 또는 update 발생 시 알린다.

이것이 단일 Q&A와 ODYS journey의 차이다.

---

## 13. Example Journey — Coding

사용자:

> 이 프로젝트에서 다음으로 뭘 구현해야 하지?

ODYS:

1. 현재 project context를 확인한다.

2. architecture documentation을 참조한다.

3. recent work와 outstanding tasks를 확인한다.

4. Coding Agent가 다음 implementation step을 제안한다.

5. 필요한 경우 codebase를 읽는다.

6. 변경 plan을 제안한다.

7. 승인된 범위에서 작업을 수행한다.

---

## 14. Experience Principles

ODYS user journey는 다음 특성을 가져야 한다.

### Continuous

세션이 끝나도 중요한 context가 사라지지 않는다.

### Explainable

중요한 행동은 이유를 설명할 수 있다.

### Controllable

사용자가 automation 및 autonomy level을 제어할 수 있다.

### Progressive

처음부터 모든 기능과 권한을 요구하지 않는다.

### Useful Before Complex

복잡한 multi-agent behavior보다 실제 가치 있는 단순한 workflow를 우선한다.
