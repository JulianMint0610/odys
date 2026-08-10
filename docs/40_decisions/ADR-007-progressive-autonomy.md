# ADR-007 — Progressive Autonomy

- Status: Accepted
- Date: 2026-08-10

---

## 01. Context

ODYS는 단순한 질의응답 챗봇이 아니라 사용자를 대신해 계획하고, Tool을 사용하고, 외부 시스템에 변화를 만들 수 있는 Agent를 목표로 한다.

Agent의 자율성이 높아질수록 유용성은 증가할 수 있지만 잘못된 행동, 데이터 손실, 비용 발생, 권한 오남용, 원치 않는 메시지 전송과 같은 위험도 함께 증가한다.

---

## 02. Decision

ODYS는 Agent 자율성을 **Progressive Autonomy** 방식으로 확장한다.

```text
Level 0 — Observe
Level 1 — Suggest
Level 2 — Prepare
Level 3 — Confirm & Execute
Level 4 — Scoped Autonomous
```

---

## 03. Autonomy Levels

### Level 0 — Observe

정보를 읽고 분석할 수 있지만 외부 상태를 변경하지 않는다.

### Level 1 — Suggest

다음 행동을 제안할 수 있지만 실행하지 않는다.

### Level 2 — Prepare

이메일 draft, calendar event 초안, code patch 등 실행 가능한 작업 초안을 준비한다.

### Level 3 — Confirm & Execute

사용자의 명시적 확인을 받은 뒤 행동을 실행한다.

### Level 4 — Scoped Autonomous

사용자가 미리 정의한 범위 안에서 반복적인 행동을 자동 수행할 수 있다.

이 단계에서도 범위, 시간, 대상, 비용, 권한을 제한할 수 있어야 한다.

---



## 04. Risk-Based Permission

Autonomy Level만으로 실행 여부를 결정하지 않는다. 각 Tool action은 별도의 위험 수준을 가진다.


| Risk     | Example                              | Default Behavior |
| -------- | ------------------------------------ | ---------------- |
| Low      | public data read                     | 자동 허용 가능         |
| Medium   | private data read                    | 권한 확인            |
| High     | external write                       | 사용자 확인 기본        |
| Critical | delete, payment, irreversible action | 강한 확인 또는 금지      |


---



## 05. Confirmation Boundary

다음 행동은 초기 버전에서 기본적으로 사용자 확인을 요구한다.

- 메시지 또는 이메일 전송
- 일정 생성 / 수정 / 삭제
- 파일 삭제
- 외부 시스템의 데이터 변경
- 비용이 발생하는 작업
- 계정 권한 변경
- 공개 게시
- production 배포
- 되돌리기 어려운 작업

---



## 06. Rationale

Progressive Autonomy는 다음 목표를 동시에 만족한다.

1. Agent의 실질적인 실행 능력을 확보한다.
2. 초기 시스템의 실수를 제한한다.
3. 사용자 신뢰를 단계적으로 구축한다.
4. Tool별 위험도에 맞는 권한 모델을 적용한다.
5. 향후 자동화를 확장할 수 있는 구조를 만든다.

ODYS의 목표는 `최대한 많이 자동화`가 아니라 `사용자가 통제할 수 있는 범위에서 최대한 유용하게 자동화`하는 것이다.

---



## 07. Alternatives Considered



### Alternative A — Always Ask

안전하지만 반복 작업에서 사용성이 크게 떨어지고 Agent의 자동화 가치가 제한된다.

### Alternative B — Full Autonomy by Default

자동화 효과는 크지만 잘못된 행동의 피해가 크고 사용자 통제 원칙과 충돌한다.

채택하지 않는다.

---



## 08. Auditability

실행 가능한 행동은 가능한 한 다음 정보를 기록한다.

- user
- agent
- tool
- action
- timestamp
- input
- permission decision
- confirmation
- result
- error
- rollback information when available

---



## 09. Revocation

사용자는 허용한 자율 권한을 철회할 수 있어야 한다.

Scoped Autonomous 권한에는 최소한 다음 정보가 포함되어야 한다.

- 허용 대상
- 허용 행동
- 허용 범위
- 시작 시점
- 만료 조건
- 비용 제한
- 취소 방법

무기한 포괄 권한을 기본값으로 사용하지 않는다.

---



## 10. Consequences



### Positive

- 사용자 신뢰를 유지하면서 자동화를 확장할 수 있다.
- 위험한 Tool 실행을 통제할 수 있다.
- Agent 행동을 감사 가능하게 만들 수 있다.
- 사용자별로 다른 자율성 수준을 지원할 수 있다.



### Negative

- Permission System이 복잡해진다.
- 확인 UI와 실행 상태 관리가 필요하다.
- 일부 작업의 사용자 경험이 느려질 수 있다.

---



## 11. Constraints

- 모델의 자연어 판단만으로 높은 위험 행동을 자동 승인하지 않는다.
- 권한 검사는 Tool 실행 직전에 다시 수행한다.
- 확인 요청에는 대상과 영향이 명확히 표시되어야 한다.
- 승인되지 않은 범위로 Agent가 권한을 확대할 수 없다.
- high-risk action은 audit log를 남긴다.
- 가능한 경우 destructive action보다 reversible action을 선호한다.
- 자동화에는 stop / revoke 경로가 있어야 한다.

---



## 12. Revisit Conditions

- Tool 실행 정확도가 충분히 검증된 경우
- 사용자별 신뢰 설정이 필요해진 경우
- enterprise policy가 추가되는 경우
- reversible execution / sandboxing이 강화된 경우
- 장기간의 운영 데이터로 안전성이 확인된 경우

---



## 13. Related Documents

- `ADR-005-ai-sdk-model-independence.md`
- `../00_foundation/PRINCIPLE.md`
- `../20_architecture/AGENT_ARCHITECTURE.md`
- `../20_architecture/TOOL_ARCHITECTURE.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`
- `../50_engineering/TEST_STRATEGY.md`

---



## 14. Development Rule

자율성은 기능이 아니라 권한이다. 권한은 신뢰와 검증 수준에 따라 점진적으로 확대한다.

**Autonomy is earned, scoped, observable, and revocable.**