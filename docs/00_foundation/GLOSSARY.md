# ODYS Glossary

ODYS에서 반복적으로 사용하는 핵심 용어를 정의한다.

용어의 의미가 변경되는 경우 관련 Architecture 문서 및 ADR도 함께 검토한다.

---

## ODYS

전체 제품 및 플랫폼의 이름.

AI-native personal operating system이자 범용 AI Agent Platform을 지향한다.

---

## ODYS Core

모든 ODYS 사용 사례에서 공통으로 필요한 핵심 기능 계층.

예:

- orchestration

- context management

- memory interfaces

- agent runtime

- tool execution

- policy

- permissions

- model abstraction

Core는 특정 도메인 지식을 직접 포함하지 않는 것을 원칙으로 한다.

---

## Pack

특정 업무, 직업, 산업 또는 사용 목적을 위한 ODYS 확장 단위.

Pack은 Core 위에서 동작하며 도메인별 Agent, Tool, workflow, prompt, policy 및 knowledge configuration을 포함할 수 있다.

---

## Engineering Pack

ODYS의 첫 번째 주요 Pack.

학습, 기술 정보, 커리어, 코딩 및 엔지니어링 관련 workflow를 지원한다.

---

## Agent

명확한 책임을 가지고 목표를 수행하는 실행 단위.

Agent는 필요한 context를 받고 model 및 tool을 사용하여 작업을 수행한다.

---

## Agent Runtime

Agent의 실행 lifecycle을 관리하는 시스템.

예:

- context preparation

- model invocation

- tool invocation

- permission check

- execution state

- retry

- logging

---

## Tool

Agent가 외부 시스템 또는 deterministic functionality를 사용하기 위한 인터페이스.

예:

- Web Search

- Calendar

- Files

- Database

- Email

- Code execution

- External API

---

## Tool Call

Agent가 특정 Tool을 실제로 실행하도록 요청하는 행위.

---

## Memory

과거의 사용자 정보, 작업, 결정, 경험 또는 지식을 향후 활용하기 위해 구조화하여 보존하는 정보.

---

## Working Memory

현재 작업을 수행하기 위해 일시적으로 유지되는 context.

---

## Long-Term Memory

세션이나 작업이 끝난 이후에도 재사용할 가치가 있는 지속적 memory.

---

## Episodic Memory

사용자의 과거 사건이나 작업 경험을 나타내는 memory.

---

## Semantic Memory

사실, 개념, 선호 또는 구조화된 지식을 나타내는 memory.

---

## Procedural Memory

특정 작업을 수행하는 방법, workflow 또는 반복 가능한 절차를 나타내는 memory.

---

## Context

현재 요청을 올바르게 이해하고 수행하기 위해 모델 또는 Agent에 제공되는 정보 집합.

Context는 Memory와 동일하지 않다.

Memory는 저장된 정보이고 Context는 현재 작업에 선택되어 제공된 정보다.

---

## Knowledge Base

ODYS가 참조할 수 있는 구조화 또는 비구조화 지식의 집합.

Memory가 사용자 경험 중심이라면 Knowledge Base는 외부 또는 도메인 지식까지 포함할 수 있다.

---

## Model

추론, 생성, 분류, 요약 등의 작업을 수행하는 AI model.

ODYS는 특정 모델 vendor에 종속되지 않는 것을 목표로 한다.

---

## Model Provider

AI model을 제공하는 외부 또는 내부 시스템.

---

## Model Strategy

작업 유형, 품질, latency, 비용 및 capability에 따라 적절한 model을 선택하는 정책.

---

## Orchestrator

하나 이상의 Agent, Tool 및 workflow 사이의 실행 흐름을 조정하는 구성 요소.

---

## Workflow

목표를 달성하기 위해 정의된 일련의 단계 또는 상태 전이.

---

## Task

사용자 또는 시스템이 수행해야 하는 구체적인 작업 단위.

---

## Action

외부 상태에 영향을 주는 실제 실행.

예:

- 이메일 전송

- 일정 생성

- 파일 수정

- 데이터 변경

- 코드 배포

---

## Autonomy

사용자의 개별 승인 없이 시스템이 어느 정도까지 판단하고 행동할 수 있는지를 나타내는 수준.

---

## Progressive Autonomy

신뢰, 위험 및 사용자 설정에 따라 시스템의 자율성을 단계적으로 확대하는 원칙.

---

## Approval

특정 Action 수행 전에 사용자가 명시적으로 허용하는 과정.

---

## Policy

Agent 또는 Tool이 어떤 조건에서 무엇을 할 수 있는지 정의하는 규칙.

---

## Permission

특정 resource 또는 action에 접근하거나 실행할 수 있는 권한.

---

## Audit Log

중요한 시스템 행동과 변경 이력을 추적하기 위해 기록한 데이터.

---

## Modular Monolith

하나의 배포 가능한 애플리케이션 안에서 명확한 내부 module boundary를 유지하는 architecture.

ODYS의 초기 서버 아키텍처 기본 전략이다.

---

## Service

독립적인 책임을 가진 실행 또는 integration boundary.

초기에는 모든 기능을 별도 microservice로 만들지 않는다.

독립적인 배포나 확장이 필요한 경우에만 분리를 고려한다.

---

## Application

최종 사용자가 직접 사용하는 실행 가능한 ODYS interface.

예:

- Web application

- Desktop application

- Mobile application

---

## Supabase

ODYS 초기 backend platform으로 채택된 기술.

주요 용도는 PostgreSQL 기반 데이터 저장, authentication 및 필요한 platform capabilities 제공이다.

ODYS의 domain logic 자체는 Supabase에 과도하게 결합하지 않는 것을 원칙으로 한다.

---

## ADR

Architecture Decision Record.

중요한 기술적 또는 구조적 결정을 context, alternatives, decision 및 consequences와 함께 기록하는 문서.

---

## CI

Continuous Integration.

코드 변경 시 format, lint, test 및 기타 품질 검사를 자동으로 수행하는 프로세스.

---

## Source of Truth

특정 정보에 대해 가장 권위 있는 기준 위치.

ODYS 코드 및 version history의 source of truth는 Git repository다.

Architecture decision의 source of truth는 관련 ADR이다.
