# ODYS Roadmap

## 1. Roadmap Philosophy

ODYS Roadmap은 고정된 기능 목록이 아니다.

실제 사용과 검증 결과에 따라 변경될 수 있다.

그러나 개발 순서는 다음 원칙을 따른다.

Foundation

→ Core

→ First Useful Workflow

→ Repeated Usage

→ Expansion

→ Productization

---

## Phase 0 — Foundation

### Goal

프로젝트의 철학, architecture 및 engineering foundation을 확립한다.

### Scope

- repository structure

- documentation structure

- Git workflow

- formatting

- linting

- TypeScript policy

- CI

- architecture documents

- ADR system

### Exit Criteria

- repository가 재현 가능하게 구성된다.

- 주요 architecture decision이 기록된다.

- CI quality gate가 동작한다.

---

## Phase 1 — ODYS Core Skeleton

### Goal

ODYS Core의 최소 실행 구조를 만든다.

### Scope

- Core package structure

- shared domain types

- configuration

- logging

- error model

- model abstraction

- Agent interface

- Tool interface

### Exit Criteria

간단한 Agent를 공통 runtime 구조 안에서 실행할 수 있다.

---

## Phase 2 — Context and Memory

### Goal

ODYS가 session-independent context를 사용할 수 있게 한다.

### Scope

- user

- workspace

- project

- conversation

- memory

- memory retrieval

- context builder

- persistence

### Exit Criteria

새로운 session에서도 저장된 context를 실제 Agent 실행에 활용할 수 있다.

---

## Phase 3 — Tool Runtime

### Goal

Agent가 안전하게 외부 capability를 사용할 수 있도록 한다.

### Scope

- Tool registry

- schema validation

- execution

- error handling

- permission policy

- audit logging

### Exit Criteria

최소 하나의 실제 Tool integration이 end-to-end로 동작한다.

---

## Phase 4 — First Useful Agent

### Goal

실제로 반복 사용할 가치가 있는 Agent를 만든다.

초기 후보:

- Conference Agent

- Coding Agent

우선순위는 구현 시점의 실제 사용 요구에 따라 결정한다.

### Exit Criteria

Agent가 실제 개인 workflow에서 반복 사용된다.

---

## Phase 5 — Progressive Autonomy

### Goal

단순 suggestion을 넘어 안전한 Action execution을 지원한다.

### Scope

- approval

- action preview

- execution policies

- reversible action design

- monitoring

### Exit Criteria

최소 하나의 external action workflow가 user approval과 함께 안전하게 동작한다.

---

## Phase 6 — Engineering Pack

### Goal

Engineering domain에서 여러 workflow를 통합한다.

### Agents

- Study Agent

- Conference Agent

- Career Agent

- Coding Agent

### Exit Criteria

Engineering Pack이 Core를 변경하지 않고 독립적인 domain extension으로 동작한다.

---

## Phase 7 — Personal Alpha

### Goal

ODYS를 일상적으로 직접 사용한다.

### Focus

- reliability

- latency

- memory quality

- UX friction

- Agent usefulness

- false automation

- permission experience

### Exit Criteria

ODYS가 실제 daily workflow의 일부가 된다.

---

## Phase 8 — External Alpha

### Goal

개발자 외 소수 사용자에게 제공한다.

### Focus

- onboarding

- multi-user isolation

- privacy

- user feedback

- generalization

- reliability

### Exit Criteria

첫 사용자들이 실제 반복 usage를 보인다.

---

## Phase 9 — Productization

### Goal

ODYS를 외부 사용자에게 제공할 수 있는 제품으로 발전시킨다.

### Scope

- stable onboarding

- deployment

- monitoring

- billing foundation

- support

- security hardening

- product analytics

---

## Phase 10 — Multi-Pack Platform

### Goal

Engineering 이외의 domain으로 확장한다.

가능한 Pack:

- Research

- Career

- Business

- Creator

- Finance

Pack은 실제 demand가 검증된 경우에만 추가한다.

---

## Phase 11 — Ecosystem

### Goal

ODYS가 자체 개발된 기능만 사용하는 제품에서 확장 가능한 platform으로 발전한다.

가능한 미래 영역:

- external Pack

- external Tool

- integration ecosystem

- developer API

이 단계는 초기 제품 성공 이후에만 고려한다.

---

## Current Priority

현재 우선순위는 다음과 같다.

1. Repository Foundation

2. Architecture documentation

3. ODYS Core skeleton

4. Context and Memory

5. First useful Agent

미래 확장성을 이유로 현재 단계를 건너뛰지 않는다.
