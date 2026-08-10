# RELEASE_PROCESS

> ODYS의 변경사항을 검증 가능한 버전으로 묶고 안전하게 배포하기 위한 release 절차다.

---

## 01. Purpose

이 문서는 ODYS의 release 준비, 검증, 버전 결정, 배포, 모니터링, rollback 절차를 정의한다.

목표는 다음과 같다.

- 어떤 코드와 migration이 배포되었는지 추적 가능하게 한다.
- release 전에 핵심 테스트와 보안 검사를 수행한다.
- 데이터베이스와 외부 Tool 변경의 위험을 별도로 검토한다.
- 문제가 발생했을 때 중단하거나 복구할 수 있게 한다.
- 개인 개발 단계에서도 향후 팀과 제품 운영으로 확장 가능한 규칙을 사용한다.

---

## 02. Release Principle

Release는 단순한 `git push`가 아니다.

ODYS의 release는 다음의 묶음이다.

```text
Approved Source
      +
Verified Tests
      +
Known Configuration
      +
Reviewed Migration
      +
Version
      +
Deployment
      +
Post-Release Verification
```

---



## 03. Environments

기본 환경 개념:

```text
Local
  ↓
Preview / Development
  ↓
Staging
  ↓
Production
```

초기에는 모든 환경을 물리적으로 분리하지 않을 수 있다.

그러나 production data와 개발 실험은 논리적으로 분리한다.

특히 다음을 개발 환경과 production에서 무분별하게 공유하지 않는다.

- production secret
- privileged credential
- 실제 사용자 데이터
- destructive test target

---



## 04. Release Types



### 4.1 Patch Release

하위 호환성을 유지하는 bug fix와 작은 개선.

### 4.2 Minor Release

하위 호환성을 유지하면서 새로운 기능을 추가한다.

예:

- 새로운 Pack capability
- 새로운 Tool
- 새로운 API endpoint
- 새로운 Agent workflow



### 4.3 Major Release

호환성을 깨는 변경 또는 큰 구조 변경.

예:

- public API breaking change
- Pack contract breaking change
- 대규모 데이터 모델 변경
- permission model 변경

---



## 05. Versioning

기본적으로 Semantic Versioning 개념을 따른다.

```text
MAJOR.MINOR.PATCH
```

예:

```text
0.1.0
0.2.0
0.2.1
1.0.0
```

초기 `0.x` 단계라도 breaking change를 추적한다.

---



## 06. Pre-Release Entry Criteria

Release candidate가 되기 전에 확인한다.

- 작업이 `main`에 병합되었다.
- 관련 test가 추가되었다.
- 문서가 구현과 일치한다.
- 새로운 environment variable이 문서화되었다.
- migration이 review되었다.
- 알려진 critical bug가 없다.
- secret이 repository에 없다.
- Accepted ADR과 충돌하지 않는다.

---



## 07. Release Candidate

중요한 release는 특정 commit을 release candidate로 고정한다.

```text
main
  ↓
release candidate commit
  ↓
verification
  ↓
tag
  ↓
production
```

검증 후 commit이 바뀌면 필요한 검증을 다시 수행한다.

---



## 08. Required Checks

기본 release 검증:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

프로젝트에 별도 suite가 존재하면 필요에 따라 실행한다.

```bash
pnpm test:integration
pnpm test:e2e
```

실제 command는 repository 설정을 따른다.

---



## 09. Test Gate

Production release 전 최소한 다음을 확인한다.

- authentication
- permission
- core agent execution
- critical tool execution
- model gateway
- database access
- user data isolation
- migration
- main user journey

위험도가 높은 contract를 우선 검증한다.

---



## 10. Architecture Gate

Release가 architecture를 조용히 깨뜨리지 않았는지 확인한다.

- Core / Pack boundary
- Modular Monolith boundary
- Model Gateway boundary
- Supabase adapter boundary
- Progressive Autonomy
- Permission check
- public API contract

Architecture decision 자체가 바뀌었다면 새로운 ADR 또는 기존 ADR supersede가 먼저다.

---



## 11. Security Gate

Production release 전 확인:

- secret hardcoding 없음
- production credential 노출 없음
- authorization regression 없음
- RLS 변경 검토
- destructive Tool permission 검토
- external input validation
- debug bypass 없음
- dependency risk 검토

---



## 12. Database Migration Review

Migration은 application code와 별도 위험 요소로 취급한다.

확인:

- migration이 재현 가능한가
- 기존 데이터와 호환되는가
- downtime 또는 lock 위험은 없는가
- destructive operation이 있는가
- recovery 전략이 있는가
- application deployment 순서와 호환되는가

---



## 13. Expand and Contract

Breaking schema 변경은 가능하면 단계적으로 수행한다.

```text
1. Expand schema
2. Deploy compatible application
3. Backfill data
4. Switch reads/writes
5. Verify
6. Remove old schema later
```

한 release에서 schema 삭제와 application 전환을 동시에 강하게 묶지 않는다.

---



## 14. Data Recovery

데이터 손실 가능성이 있는 migration은 backup 또는 recovery mechanism을 확인한다.

주의 대상:

- column drop
- table drop
- mass update
- destructive transform
- uniqueness constraint 추가
- nullable -> non-null 변경

Migration file이 존재한다는 사실만으로 안전하다고 판단하지 않는다.

---



## 15. Configuration Review

Release에 필요한 configuration을 확인한다.

예:

- environment variable
- feature flag
- provider configuration
- model alias
- timeout
- webhook secret
- OAuth redirect

Code와 configuration은 하나의 release dependency로 취급한다.

---



## 16. Feature Flags

위험하거나 점진 노출이 필요한 기능은 feature flag를 사용할 수 있다.

적절한 예:

- 새로운 Agent workflow
- 새로운 Tool
- model routing policy 변경
- 큰 UI 변경

안정화 후 오래된 flag는 제거한다.

---



## 17. Release Notes

의미 있는 release에는 변경 내용을 기록한다.

기본 분류:

```text
Added
Changed
Fixed
Security
Migration
Known Issues
```

필요한 항목만 사용한다.

---



## 18. Breaking Changes

Breaking change에는 다음을 명시한다.

- 무엇이 바뀌었는가
- 누가 영향을 받는가
- migration 방법
- 필요한 configuration 변경
- 이전 behavior 종료 시점

Internal API라도 여러 module이 의존하면 contract change로 취급한다.

---



## 19. Git Tag

검증된 release commit에 tag를 부여할 수 있다.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Tag는 정확한 release commit을 가리켜야 한다.

---



## 20. Deployment Order

일반적인 예:

```text
Backward-compatible DB migration
        ↓
Application deploy
        ↓
Backfill
        ↓
Verification
        ↓
Cleanup in later release
```

변경 특성에 따라 순서를 조정한다.

---



## 21. Tool Release

새로운 Tool 또는 Tool 변경에는 다음을 별도 검토한다.

- input schema
- output schema
- risk level
- permission
- confirmation
- audit log
- timeout
- retry
- external side effect
- rollback possibility

Write Tool은 Progressive Autonomy 원칙을 따른다.

---



## 22. Agent Release

Agent behavior 변경에는 다음을 확인한다.

- tool selection
- loop limit
- permission boundary
- context use
- failure recovery
- structured output
- user confirmation behavior

Agent 변경을 단순한 텍스트 변경으로 취급하지 않는다.

---



## 23. Model Changes

다음 변경도 release risk다.

- provider 변경
- model alias 변경
- routing policy 변경
- generation option 변경
- tool-calling option 변경

중요한 model change에는 regression evaluation을 수행한다.

---



## 24. Prompt Changes

Prompt는 versioned artifact로 취급한다.

검토:

- tool selection regression
- permission behavior
- structured output success
- hallucination
- refusal behavior
- task completion

작은 문구 변화도 실제 Agent behavior를 바꿀 수 있다.

---



## 25. Deployment

Production deploy는 가능한 한 자동화된 pipeline을 사용한다.

수동 배포 시에도 다음을 추적한다.

- deploy target
- commit
- version
- migration status
- deploy result

어떤 코드가 production에 있는지 알 수 있어야 한다.

---



## 26. Post-Deploy Smoke Test

배포 직후 최소 smoke test:

- application health
- login
- core API
- database connection
- ODYS AI 기본 요청
- 주요 read operation
- 필요한 경우 안전한 Tool flow

---



## 27. Monitoring

배포 직후 다음 신호를 관찰한다.

- error rate
- latency
- failed agent runs
- failed tool executions
- provider errors
- database errors
- authentication failures
- permission anomaly
- resource usage

---



## 28. Verification

Release 직후 확인:

- critical error 없음
- migration 정상
- 주요 user flow 정상
- external provider 정상
- unexpected cost spike 없음
- background job failure 없음

---



## 29. Rollback Principle

Release 전에 다음을 알고 있어야 한다.

- application 이전 version으로 되돌릴 수 있는가
- database schema가 backward compatible한가
- migration이 irreversible한가
- external side effect가 이미 발생했는가
- feature flag로 기능을 끌 수 있는가

---



## 30. Rollback Triggers

다음 상황에서는 rollback 또는 즉시 완화를 검토한다.

- authentication failure
- 사용자 데이터 노출
- destructive action 오작동
- critical workflow failure
- severe regression
- 지속적인 high error rate
- migration corruption
- 예상하지 못한 비용 폭증

---



## 31. Rollback Methods

가능한 순서:

```text
Feature flag off
        ↓
Capability disable
        ↓
Application rollback
        ↓
Forward fix
        ↓
Data recovery when necessary
```

DB destructive change는 application rollback만으로 복구되지 않을 수 있다.

---



## 32. Hotfix

긴급 수정 절차:

1. 문제를 재현하거나 증거를 확보한다.
2. 최소 수정 범위를 정한다.
3. regression test를 추가한다.
4. 필수 검증을 수행한다.
5. 배포한다.
6. 정상 branch history에 반영한다.
7. 사후 원인을 기록한다.

긴급하다는 이유로 security / permission check를 생략하지 않는다.

---



## 33. Failed Release

Release 실패 원인을 기록한다.

예:

- build failure
- missing environment variable
- migration incompatibility
- test regression
- provider configuration error
- permission policy error

같은 실패를 반복하지 않도록 process 또는 automation을 개선한다.

---



## 34. Pre-Release Checklist



### Source

- [ ] release commit 확정
- [ ] unrelated change 없음
- [ ] 관련 문서 업데이트



### Quality

- [ ] lint 통과
- [ ] typecheck 통과
- [ ] tests 통과
- [ ] build 통과
- [ ] 필요한 integration / E2E 통과



### Security

- [ ] secret 없음
- [ ] permission regression 검토
- [ ] RLS / auth 변경 검토
- [ ] destructive action 검토



### Data

- [ ] migration 검토
- [ ] backup / recovery 검토
- [ ] deployment ordering 검토



### Operations

- [ ] configuration 준비
- [ ] release version 결정
- [ ] release notes 준비
- [ ] rollback 경로 확인

---



## 35. Post-Release Checklist

- [ ] deployment 성공
- [ ] health check 정상
- [ ] smoke test 정상
- [ ] migration 정상
- [ ] error rate 확인
- [ ] agent / tool failure 확인
- [ ] 주요 user flow 확인
- [ ] tag / release notes 확인

---



## 36. Automation Roadmap

초기에는 일부 release 절차가 수동일 수 있다.

점진적 자동화 우선순위:

```text
CI checks
  ↓
Automated build
  ↓
Preview deploy
  ↓
Migration validation
  ↓
Release tagging
  ↓
Production deploy
  ↓
Automated smoke tests
```

자동화는 review를 없애는 것이 아니라 반복 실수를 줄이는 것이다.

---



## 37. Release Ownership

Release를 수행한 사람은 다음을 설명할 수 있어야 한다.

- 무엇이 배포되는가
- 어떤 위험이 있는가
- 어떤 migration이 포함되는가
- 어떻게 검증했는가
- 문제가 생기면 어떻게 대응하는가

AI가 command를 제안해도 최종 책임은 사람에게 있다.

---



## 38. Release Frequency

작고 자주 release할 수 있는 구조를 선호한다.

큰 변경을 장기간 쌓으면 다음이 어려워진다.

- 문제 원인 추적
- rollback
- review
- migration
- user impact 분석

---



## 39. Production Rules

금지:

- 검증되지 않은 임의 commit 배포
- production console에서만 수행한 영구 schema 변경
- 기록 없는 configuration 수정
- production에서 destructive test 실행
- production secret의 코드 복사
- release 상태를 모르는 연속 배포

---



## 40. Related Documents

- `DEVELOPMENT_WORKFLOW.md`
- `AI_DEVELOPMENT_WORKFLOW.md`
- `TEST_STRATEGY.md`
- `CODING_STANDARDS.md`
- `../40_decisions/ADR-003-modular-monolith.md`
- `../40_decisions/ADR-005-ai-sdk-model-independence.md`
- `../40_decisions/ADR-006-supabase.md`
- `../40_decisions/ADR-007-progressive-autonomy.md`
- `../20_architecture/DEPLOYMENT.md`
- `../20_architecture/SECURITY_ARCHITECTURE.md`

---



## 41. Final Rule

Release의 목표는 가장 빨리 production에 코드를 올리는 것이 아니다.

검증된 정확한 변경을 추적 가능한 방식으로 배포하고, 문제가 발생했을 때 통제할 수 있는 상태를 유지하는 것이다.

**Release small, verify deeply, observe immediately, recover deliberately.**