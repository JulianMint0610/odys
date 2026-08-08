# ODYS Principles

이 문서는 ODYS의 제품, 아키텍처 및 개발 과정에서 반복적으로 적용되는 핵심 원칙을 정의한다.

세부 구현은 변경될 수 있지만 이 원칙들은 주요 의사결정의 기준점으로 사용한다.

---

## P1. User Sovereignty

사용자는 자신의 데이터, 목표, 권한 및 자동화 수준에 대한 최종 통제권을 가진다.

ODYS는 사용자의 의도를 대신 결정하지 않는다.

---

## P2. Context Before Intelligence

좋은 모델보다 정확한 맥락이 더 중요할 수 있다.

ODYS는 모델 호출 전에 필요한 사용자, 작업, 기억 및 환경 맥락을 구성한다.

---

## P3. Memory With Purpose

기억은 목적 없이 축적하지 않는다.

각 Memory는 저장 이유와 사용 가능성을 가져야 한다.

---

## P4. Explicit Boundaries

Core, Pack, Agent, Tool, Service 및 Application의 책임을 명시적으로 구분한다.

경계가 불분명하면 먼저 책임을 정의한 뒤 코드를 작성한다.

---

## P5. Core Stays General

ODYS Core에는 특정 산업이나 개인 상황에만 필요한 규칙을 넣지 않는다.

도메인별 동작은 Pack 또는 그 하위 구성 요소에서 구현한다.

---

## P6. Packs Extend, Not Fork

Pack은 Core를 복제하거나 변형한 별도 제품이 아니다.

Pack은 공통 Core 위에서 도메인 기능을 추가한다.

---

## P7. Model Independence

비즈니스 로직이 특정 LLM provider의 API 구조에 직접 종속되지 않도록 한다.

모델 선택은 전략 계층에서 관리한다.

---

## P8. Progressive Autonomy

Agent의 자율성은 위험도와 신뢰 수준에 따라 단계적으로 확대한다.

되돌리기 어려운 작업일수록 더 명시적인 승인을 요구한다.

---

## P9. Least Privilege

Agent와 Tool은 작업 수행에 필요한 최소한의 권한만 가진다.

권한은 convenience가 아니라 risk 기준으로 설계한다.

---

## P10. Observable Actions

중요한 Agent 행동과 Tool 실행은 추적할 수 있어야 한다.

가능한 경우 다음 정보를 남긴다.

- 누가 요청했는가

- 어떤 Agent가 처리했는가

- 어떤 Tool이 실행되었는가

- 어떤 입력이 사용되었는가

- 어떤 결과가 발생했는가

- 어떤 승인이 있었는가

---

## P11. Fail Safely

실패를 완전히 제거할 수 있다고 가정하지 않는다.

대신 실패 시 피해를 제한하고 복구할 수 있도록 설계한다.

---

## P12. Validate External Information

외부 데이터와 모델 출력은 기본적으로 신뢰하지 않는다.

필요한 경우 schema validation, permission check, source validation 및 user confirmation을 적용한다.

---

## P13. Prefer Reversible Actions

동일한 가치를 제공한다면 되돌릴 수 있는 작업을 우선한다.

삭제보다 archive, 즉시 실행보다 draft, 영구 변경보다 preview를 우선한다.

---

## P14. Simple Before Distributed

초기에는 Modular Monolith를 기본으로 한다.

서비스 분리는 독립적인 확장, 배포 또는 장애 격리가 실제로 필요해질 때 수행한다.

---

## P15. Type Safety by Default

TypeScript를 주요 애플리케이션 개발 언어로 사용하고 strict typing을 기본값으로 한다.

타입을 문서화와 검증의 일부로 취급한다.

---

## P16. Tests Protect Behavior

테스트의 목적은 구현 세부사항을 고정하는 것이 아니라 중요한 동작과 계약을 보호하는 것이다.

---

## P17. Documentation Is Part of the System

문서는 코드와 분리된 부속물이 아니다.

Architecture, ADR, workflow 및 product specification은 시스템의 일부로 관리한다.

코드와 문서가 충돌하면 둘 중 하나는 반드시 수정되어야 한다.

---

## P18. Decisions Need History

중요한 기술 및 구조적 의사결정은 ADR로 기록한다.

결정뿐 아니라 결정 당시의 context, alternatives 및 consequences도 보존한다.

---

## P19. Automate Repetition

반복적이며 규칙이 명확한 작업은 자동화한다.

하지만 자동화의 비용이 작업 자체보다 커지는 경우에는 자동화를 만들지 않는다.

---

## P20. Build From Real Usage

가상의 확장성을 위해 현재 시스템을 지나치게 복잡하게 만들지 않는다.

실제 사용에서 발생한 문제를 기반으로 확장한다.

---

## P21. Security Is Architectural

보안은 배포 직전 추가하는 기능이 아니다.

데이터 모델, Agent 권한, Tool 호출, API 및 인프라 설계 단계부터 고려한다.

---

## P22. Privacy by Default

필요 이상의 사용자 데이터를 수집하거나 보존하지 않는다.

민감한 데이터일수록 수집, 접근, 저장 및 삭제 정책을 더 엄격하게 적용한다.

---

## P23. Prefer Open Interfaces

내부 모듈 간 계약을 명확하게 유지한다.

특정 구현을 교체하더라도 상위 계층 전체를 다시 작성하지 않아도 되는 구조를 선호한다.

---

## P24. Optimize After Measurement

성능이나 비용 문제는 측정한 후 최적화한다.

추측에 기반한 premature optimization을 피한다.

---

## P25. Product Value Over Technical Novelty

새로운 기술 자체는 목표가 아니다.

사용자에게 더 나은 결과를 제공하지 못한다면 기술적 새로움은 채택 이유가 되지 않는다.
