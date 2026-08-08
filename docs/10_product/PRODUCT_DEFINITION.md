# ODYS Product Definition

## 1. Product

ODYS는 사용자의 목표, 기억, 지식, 작업, 도구 및 AI Agent를 하나의 지속적인 시스템으로 연결하는 AI-native personal operating system이다.

ODYS는 단순한 챗봇이 아니라 사용자의 장기적인 맥락을 유지하면서 정보를 이해하고, 계획하고, 실행을 준비하고, 필요할 경우 사용자의 승인을 받아 실제 행동까지 수행하는 시스템을 지향한다.

---

## 2. Core Problem

현재 사용자는 여러 디지털 도구 사이에서 스스로 orchestration 역할을 수행한다.

예를 들어 사용자는 직접 다음 작업을 반복한다.

1. 필요한 정보를 찾는다.

2. 여러 출처를 비교한다.

3. 중요한 정보를 기억한다.

4. 할 일을 정리한다.

5. 일정을 등록한다.

6. 문서를 작성한다.

7. AI에게 맥락을 다시 설명한다.

8. 여러 서비스에서 실제 행동을 수행한다.

각 도구는 서로 다른 context를 가지고 있기 때문에 사용자는 매번 시스템 간 연결 역할을 직접 수행해야 한다.

ODYS는 이 orchestration burden을 줄이는 것을 목표로 한다.

---

## 3. Product Proposition

ODYS의 핵심 가치 제안은 다음과 같다.

> One persistent AI system that understands what the user is trying to achieve and coordinates memory, knowledge, agents, tools, and actions around those goals.

ODYS는 사용자에게 별도의 AI 기능들을 제공하는 것이 아니라 하나의 지속적인 operating layer를 제공한다.

---

## 4. Primary Capabilities

ODYS의 핵심 제품 능력은 다음과 같다.

### Context

현재 사용자의 목표, 프로젝트, 상황 및 요청을 이해한다.

### Memory

장기적으로 가치가 있는 정보와 결정을 저장하고 필요할 때 다시 활용한다.

### Knowledge

문서, 데이터 및 외부 정보를 검색하고 연결한다.

### Agents

특정 책임을 가진 Agent가 작업을 분석하고 수행한다.

### Tools

외부 서비스, 데이터 및 실행 환경과 연결된다.

### Planning

복잡한 목표를 여러 단계의 실행 가능한 작업으로 분해한다.

### Action

사용자 승인과 policy에 따라 실제 외부 작업을 수행한다.

### Monitoring

조건이나 상태 변화를 지속적으로 확인하고 필요한 시점에 사용자에게 알려준다.

---

## 5. Product Architecture

ODYS는 크게 두 계층으로 구성된다.

### ODYS Core

모든 사용자와 분야에서 공통적으로 필요한 범용 AI 운영 기능.

예:

- orchestration

- memory

- context

- permissions

- model routing

- tool execution

- agent runtime

- observability

### ODYS Packs

특정 domain의 문제를 해결하는 확장 계층.

예:

- Engineering Pack

- Research Pack

- Career Pack

- Business Pack

Core는 범용적이고 Pack은 전문적이다.

---

## 6. Initial Product Strategy

ODYS의 초기 사용자는 개발자 자신이다.

초기 제품은 실제 일상과 학습, 개발 및 커리어 관리에 직접 사용한다.

이를 통해 다음을 검증한다.

- 어떤 context가 실제로 필요한가

- 어떤 memory가 다시 사용되는가

- 어떤 Agent가 가치가 있는가

- 어떤 Tool integration이 필요한가

- 어떤 automation이 유용한가

- 어느 수준까지 자율성을 허용할 수 있는가

검증된 기능을 점진적으로 일반화한다.

---

## 7. Initial Domain

첫 번째 Pack은 Engineering Pack이다.

초기 사용 사례는 다음 영역을 포함한다.

- Study

- Technical knowledge

- Conferences and events

- Career

- Coding

- Projects

Engineering Pack은 ODYS Core를 실제 환경에서 검증하기 위한 첫 번째 vertical이다.

---

## 8. What ODYS Is Not

ODYS는 다음을 목표로 하지 않는다.

### A ChatGPT Clone

단순한 conversational UI를 복제하는 것이 목적이 아니다.

### A Note App

정보 저장 자체가 제품의 중심이 아니다.

### A Task Manager

할 일 관리만 제공하는 시스템이 아니다.

### A Collection of Independent Agents

Agent 수를 늘리는 것이 목표가 아니다.

### A Model Wrapper

특정 AI API를 감싼 제품이 아니다.

### Fully Autonomous AI

사용자 통제를 제거하는 시스템을 목표로 하지 않는다.

---

## 9. Product Success

ODYS가 성공했다는 것은 단순히 많은 기능이 존재한다는 뜻이 아니다.

사용자가 ODYS를 사용하면서 다음을 경험해야 한다.

- 반복 설명 감소

- 정보 탐색 시간 감소

- 중요한 정보 누락 감소

- 작업 전환 비용 감소

- 계획과 실행 사이의 거리 감소

- 장기 프로젝트 continuity 향상

- 더 나은 의사결정

- 더 높은 실행력

---

## 10. Long-Term Direction

ODYS는 개인 AI assistant에서 시작하지만 궁극적으로 다양한 domain과 user workflow를 지원하는 AI Agent Platform으로 발전한다.

제품 확장은 다음 순서를 따른다.

Personal use

→ Repeated validation

→ Generalization

→ Productization

→ External users

→ Domain Packs

→ Platform ecosystem
