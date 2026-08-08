# ODYS Use Cases

## 1. Purpose

이 문서는 ODYS가 해결해야 하는 대표적인 사용자 문제를 정의한다.

Use Case는 제품 방향과 우선순위를 결정하는 입력으로 사용한다.

---

## UC-01 — Persistent Project Context

### Problem

사용자가 장기 프로젝트를 진행하면서 AI에게 매번 프로젝트 설명과 과거 결정을 반복해야 한다.

### ODYS Behavior

ODYS는 project context, 주요 결정, 문서 및 진행 상태를 연결하여 필요한 시점에 활용한다.

### Value

- 반복 설명 감소

- project continuity 향상

- 잘못된 가정 감소

---

## UC-02 — Goal Planning

### Problem

사용자는 장기 목표는 알고 있지만 실제 행동 계획으로 변환하기 어렵다.

### ODYS Behavior

목표를 milestone, task 및 review cycle로 분해한다.

### Value

목표와 일상적인 실행 사이의 거리를 줄인다.

---

## UC-03 — Personal Memory

### Problem

중요한 결정이나 정보를 여러 대화와 문서에서 잃어버린다.

### ODYS Behavior

가치 있는 정보를 memory로 저장하고 관련 작업에서 다시 surface한다.

### Value

장기적인 AI interaction continuity를 제공한다.

---

## UC-04 — Knowledge Retrieval

### Problem

필요한 정보가 여러 문서, 사이트 및 데이터 source에 흩어져 있다.

### ODYS Behavior

관련 knowledge를 검색하고 현재 context에 맞게 정리한다.

### Value

정보 탐색 비용을 줄인다.

---

## UC-05 — Conference Discovery

### Problem

관심 분야의 학회, 행사 및 deadline을 지속적으로 직접 확인해야 한다.

### ODYS Behavior

Conference Agent가 source를 탐색하고 event를 구조화하며 관련성을 평가한다.

### Value

중요한 opportunity 누락을 줄인다.

---

## UC-06 — Deadline Monitoring

### Problem

중요한 submission, application 또는 event deadline을 놓칠 수 있다.

### ODYS Behavior

사용자가 선택한 event를 monitoring하고 적절한 시점에 알린다.

### Value

반복적인 수동 확인을 줄인다.

---

## UC-07 — Study Planning

### Problem

여러 과목과 학습 목표의 우선순위를 정하기 어렵다.

### ODYS Behavior

현재 목표, 일정, 진도 및 deadline을 기반으로 학습 계획을 제안한다.

### Value

학습 자원과 시간을 더 효율적으로 배분한다.

---

## UC-08 — Technical Learning

### Problem

새로운 기술을 배울 때 자료와 학습 순서가 분산된다.

### ODYS Behavior

Study Agent가 목표와 현재 수준을 기반으로 learning path를 구성한다.

### Value

학습의 시작 비용을 줄인다.

---

## UC-09 — Coding Assistance With Project Context

### Problem

일반적인 coding assistant는 현재 프로젝트의 architecture와 과거 결정에 대한 장기 context가 부족하다.

### ODYS Behavior

Coding Agent는 repository documentation, architecture decision 및 현재 code context를 함께 사용한다.

### Value

프로젝트와 일관된 구현을 지원한다.

---

## UC-10 — Career Opportunity Discovery

### Problem

인턴, 채용 및 공모전 정보를 여러 사이트에서 반복적으로 확인해야 한다.

### ODYS Behavior

Career Agent가 관련 source를 탐색하고 사용자의 목표와 비교한다.

### Value

관련성이 높은 opportunity를 빠르게 발견한다.

---

## UC-11 — Action Preparation

### Problem

AI가 유용한 결과를 만들어도 사용자가 다시 외부 서비스에서 수동으로 작업해야 한다.

### ODYS Behavior

ODYS는 실제 Action 전에 필요한 내용을 준비한다.

예:

- email draft

- calendar event draft

- task creation proposal

### Value

계획에서 실행까지의 friction을 줄인다.

---

## UC-12 — Approved Action Execution

### Problem

반복적이지만 실제 외부 상태를 변경해야 하는 작업이 존재한다.

### ODYS Behavior

사용자 approval을 받은 뒤 Tool을 통해 Action을 수행한다.

### Value

사용자의 통제를 유지하면서 실행 비용을 줄인다.

---

## UC-13 — Daily Context Brief

### Problem

여러 프로젝트와 일정이 있을 때 현재 가장 중요한 일을 파악하기 어렵다.

### ODYS Behavior

관련 deadline, task, calendar 및 project state를 조합하여 현재 우선순위를 요약한다.

### Value

context switching cost를 줄인다.

---

## UC-14 — Decision Recall

### Problem

몇 달 전 특정 기술이나 방향을 왜 선택했는지 기억하기 어렵다.

### ODYS Behavior

관련 memory와 ADR을 검색하여 결정과 당시의 reasoning context를 제공한다.

### Value

같은 문제를 반복해서 다시 논의하는 비용을 줄인다.

---

## UC-15 — Cross-Domain Pack Expansion

### Problem

하나의 AI assistant가 모든 전문 분야를 동일한 방식으로 처리하면 전문성이 떨어질 수 있다.

### ODYS Behavior

Core를 유지하면서 domain-specific Pack을 추가한다.

### Value

범용 플랫폼과 전문 workflow를 동시에 유지할 수 있다.

---

## Prioritization

초기 MVP에서는 다음 Use Case를 우선한다.

1. Persistent Project Context

2. Personal Memory

3. Knowledge Retrieval

4. Coding Assistance With Project Context

5. Conference Discovery

6. Deadline Monitoring

나머지는 Core 안정화 이후 단계적으로 추가한다.
