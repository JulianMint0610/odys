# ODYS Product Requirements Document

## 1. Purpose

이 문서는 ODYS 초기 제품의 요구사항과 MVP 범위를 정의한다.

ODYS의 장기 비전 전체를 한 번에 구현하지 않는다.

MVP의 목적은 가장 중요한 Core 가정을 실제 사용을 통해 검증하는 것이다.

---

## 2. MVP Goal

MVP는 사용자의 목표와 작업 context를 유지하고, 필요한 memory와 knowledge를 활용하며, 하나 이상의 Agent가 Tool을 사용하여 실제로 유용한 결과를 제공할 수 있어야 한다.

핵심 검증 질문은 다음과 같다.

> Persistent context + memory + tool-using agents가 일반적인 단일 AI chat보다 실제 사용에서 더 큰 가치를 제공하는가?

---

## 3. Primary User

MVP의 첫 번째 사용자는 개발자 자신이다.

초기 사용 환경은 다음과 같다.

- 개인 학습

- 소프트웨어 개발

- 기술 정보 탐색

- 프로젝트 관리

- 커리어 정보

- 일정 및 행사 추적

이 사용 경험을 통해 향후 일반 사용자 요구사항을 도출한다.

---

## 4. MVP Scope

### 4.1 User Workspace

사용자는 하나 이상의 workspace 또는 project context를 가질 수 있다.

각 workspace에는 다음이 연결될 수 있다.

- goals

- tasks

- memories

- documents

- conversations

- agents

- tool activity

---

### 4.2 Conversation

사용자는 ODYS와 자연어로 상호작용할 수 있어야 한다.

Conversation은 단순 메시지 기록이 아니라 context 생성의 한 source로 사용된다.

---

### 4.3 Memory

MVP는 최소한 다음 memory lifecycle을 지원해야 한다.

1. Memory candidate 생성

2. 저장 여부 결정

3. 저장

4. 검색

5. Context에 활용

6. 수정 또는 삭제

초기에는 memory 자동 저장보다 명시적이고 검증 가능한 동작을 우선한다.

---

### 4.4 Agent

MVP는 Agent abstraction을 제공해야 한다.

Agent는 최소한 다음 정보를 가진다.

- identifier

- responsibility

- allowed tools

- model strategy

- execution policy

초기에는 필요 이상의 Agent를 만들지 않는다.

---

### 4.5 Tool

Agent는 등록된 Tool을 호출할 수 있어야 한다.

Tool invocation은 최소한 다음을 가져야 한다.

- validated input

- permission check

- execution result

- error handling

- audit information

---

### 4.6 Model Abstraction

애플리케이션 domain logic은 특정 model provider에 직접 결합하지 않는다.

모델 호출은 공통 abstraction을 통해 이루어진다.

---

### 4.7 Approval

외부 상태를 변경하는 중요한 Action은 실행 전 사용자의 승인을 요구할 수 있어야 한다.

예:

- 이메일 전송

- 일정 생성

- 데이터 삭제

- 외부 게시

- 중요한 파일 수정

---

### 4.8 Auditability

중요한 Agent 및 Tool 실행에 대해 최소한 다음을 추적할 수 있어야 한다.

- request

- agent

- tool

- outcome

- timestamp

- approval state

---

## 5. Initial Engineering Pack

초기 Engineering Pack은 다음 Agent 후보를 가진다.

### Study Agent

학습 계획, 자료 정리 및 학습 context 지원.

### Conference Agent

학회, 컨퍼런스, 행사 및 관련 deadline 탐색과 추적.

### Career Agent

인턴, 채용, 공모전 및 커리어 opportunity 지원.

### Coding Agent

코드 이해, 개발 workflow 및 기술 문제 해결 지원.

모든 Agent를 첫 MVP에서 동시에 완성할 필요는 없다.

---

## 6. MVP Functional Requirements

### FR-01

사용자는 ODYS와 대화할 수 있어야 한다.

### FR-02

시스템은 conversation을 workspace 또는 project context와 연결할 수 있어야 한다.

### FR-03

시스템은 memory를 저장하고 조회할 수 있어야 한다.

### FR-04

Agent는 필요한 context와 memory를 받을 수 있어야 한다.

### FR-05

Agent는 허용된 Tool을 호출할 수 있어야 한다.

### FR-06

Tool input은 실행 전에 validation되어야 한다.

### FR-07

위험한 Action은 approval policy를 적용할 수 있어야 한다.

### FR-08

모델 provider를 교체할 수 있어야 한다.

### FR-09

Agent와 Tool execution 결과를 기록할 수 있어야 한다.

### FR-10

Pack이 Core를 수정하지 않고 domain capability를 추가할 수 있어야 한다.

---

## 7. Non-Functional Requirements

### Reliability

중요한 작업 실패 시 오류 상태를 명확히 제공해야 한다.

### Security

Tool과 Agent는 최소 권한 원칙을 따른다.

### Privacy

사용자 데이터를 필요 이상으로 수집하지 않는다.

### Maintainability

Module boundary를 명확히 유지한다.

### Testability

Core domain behavior는 자동 테스트 가능해야 한다.

### Observability

중요한 실행 흐름을 추적할 수 있어야 한다.

### Portability

특정 model vendor 또는 backend capability에 과도하게 결합하지 않는다.

---

## 8. Out of Scope for Initial MVP

다음 항목은 초기 MVP의 필수 범위가 아니다.

- 완전한 autonomous operation

- dozens of independent agents

- marketplace

- third-party Pack ecosystem

- enterprise organization management

- complex billing

- mobile native applications

- microservice architecture

- custom foundation model training

---

## 9. MVP Exit Criteria

MVP는 다음 조건을 만족하면 첫 번째 검증 단계가 완료된 것으로 본다.

- 실제 사용 가능한 interface가 존재한다.

- persistent user context가 동작한다.

- memory 저장과 retrieval이 동작한다.

- 최소 하나의 Agent가 실제 Tool을 사용할 수 있다.

- permission 또는 approval flow가 존재한다.

- 실제 개인 workflow에서 반복적으로 사용된다.

- 사용 과정에서 개선할 데이터를 수집할 수 있다.

---

## 10. Product Development Rule

MVP 이후의 기능은 가능한 한 다음 근거 중 하나를 가져야 한다.

- 실제 반복 사용에서 발견된 문제

- 사용자 feedback

- reliability/security requirement

- 명확하게 측정된 performance bottleneck

- documented architecture requirement

단순히 구현할 수 있다는 이유만으로 기능을 추가하지 않는다.
