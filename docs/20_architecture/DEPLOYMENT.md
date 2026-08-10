# ODYS Deployment Architecture

## 1. Purpose

이 문서는 ODYS의 build, environment, deployment, migration, rollback, configuration 및 operational deployment 원칙을 정의한다.

ODYS의 초기 deployment architecture는 가능한 한 단순하게 유지한다.

목표는 처음부터 대규모 distributed platform을 만드는 것이 아니라 다음을 만족하는 것이다.

- reproducible builds

- safe deployments

- environment separation

- database migration control

- secret isolation

- rollback capability

- operational visibility

- future portability

---

## 2. Deployment Principle

ODYS deployment의 기본 원칙은 다음과 같다.

> Start with the simplest deployment topology that preserves security, reproducibility, and future portability.

초기에는 Modular Monolith architecture와 일치하는 deployment model을 사용한다.

필요성이 검증되기 전에 application을 여러 microservice로 분리하지 않는다.

---

## 3. Initial Logical Topology

초기 deployment는 개념적으로 다음 구조를 가진다.

```

User

 │

 ▼

Web Application / ODYS Backend

 │

 ├── Supabase

 │   ├── PostgreSQL

 │   ├── Authentication

 │   └── Optional Storage

 │

 ├── Model Providers

 │

 └── External Tool Providers

```

Web Application과 backend가 반드시 별도 deployment unit이어야 하는 것은 아니다.

선택한 Web framework가 server-side capability를 제공한다면 하나의 Application deployment 안에서 시작할 수 있다.

---

## 4. Deployment Units

초기에는 가능한 한 deployment unit 수를 제한한다.

예상되는 주요 unit:

```

ODYS Web Application

Supabase Project

External Providers

```

`services/` 아래에 독립 runtime이 실제로 추가될 경우 별도의 deployment unit이 될 수 있다.

그러나 directory가 존재한다는 이유만으로 별도의 server를 배포하지 않는다.

---

## 5. Modular Monolith Alignment

deployment architecture는 ADR-003의 Modular Monolith 결정과 일치해야 한다.

```

Repository Modules

      │

      ▼

Single or Few Deployable Units

      │

      ▼

Clear Internal Boundaries

```

internal module boundary를 유지하면서 operational topology는 단순하게 시작한다.

---

## 6. Environments

최소한 다음 환경을 구분한다.

```

Local Development

Production

```

프로젝트가 발전하면 다음 환경을 추가할 수 있다.

```

Preview

Staging

```

모든 environment를 첫날부터 운영할 필요는 없다.

---

## 7. Local Development

Local environment의 목적은 빠른 개발과 검증이다.

기본 tooling:

```

Node.js

pnpm

TypeScript

local environment variables

development server

test tooling

```

가능하면 production과 유사한 runtime assumptions를 유지한다.

---

## 8. Production

Production은 실제 사용자 데이터와 external Action을 다루는 환경이다.

Production에서는 다음이 요구된다.

```

secure transport

production credentials

production database

controlled deployment

structured logging

error monitoring

migration discipline

backup strategy

```

development configuration을 그대로 production에 사용하는 것을 피한다.

---

## 9. Preview Environment

Pull Request 또는 branch별 preview deployment는 향후 도입할 수 있다.

장점:

```

UI review

integration review

temporary environment testing

```

그러나 preview environment가 production database 또는 production credential을 공유해서는 안 된다.

---

## 10. Staging

실제 production complexity가 증가하면 staging environment를 도입할 수 있다.

Staging은 다음과 같은 변경에 유용하다.

```

database migrations

new integrations

authentication changes

high-risk Tool changes

deployment architecture changes

```

초기 MVP에서는 운영 complexity가 benefit보다 큰 경우 생략할 수 있다.

---

## 11. Environment Isolation

각 environment는 가능한 한 다음을 분리한다.

```

database

credentials

OAuth configuration

callback URLs

external provider configuration

storage

```

특히 development에서 production credential을 기본으로 사용하지 않는다.

---

## 12. Configuration

환경별 값은 code와 분리한다.

예:

```

database URL

provider credentials

application origin

OAuth configuration

feature configuration

logging settings

```

환경별 값을 source code에 hard-code하지 않는다.

---

## 13. Environment Variables

secret 및 environment-specific configuration은 environment variable 또는 deployment platform의 secret mechanism을 사용할 수 있다.

예:

```

SUPABASE_URL

SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

MODEL_PROVIDER_API_KEY

```

실제 environment variable 이름은 implementation 시점에 정의한다.

중요한 것은 public과 server-only configuration을 구분하는 것이다.

---

## 14. Public and Private Configuration

browser에 포함될 수 있는 configuration과 server secret을 명확히 구분한다.

```

Public Configuration

→ browser에서 알아도 되는 값

Private Configuration

→ server에서만 사용해야 하는 값

```

변수 이름에 `PUBLIC` 같은 prefix가 있다고 해서 자동으로 안전하다고 가정하지 않는다.

내용의 sensitivity를 기준으로 판단한다.

---

## 15. Secret Management

Production secret은 deployment platform 또는 secure secret-management mechanism을 통해 제공한다.

다음 위치에는 저장하지 않는다.

```

Git repository

Markdown document

frontend bundle

committed .env file

```

secret rotation이 가능하도록 provider account와 deployment process를 관리한다.

---

## 16. Build Process

Production deployment는 reproducible build를 사용한다.

대표적인 흐름:

```

Source Commit

      │

      ▼

Dependency Install

      │

      ▼

Quality Checks

      │

      ▼

Build

      │

      ▼

Deploy Artifact

```

dependency installation은 committed lockfile을 기준으로 한다.

---

## 17. Package Installation

repository의 package manager는 pnpm을 사용한다.

CI와 production build에서는 lockfile을 변경하지 않는 installation을 사용한다.

```bash

pnpm install --frozen-lockfile

```

build environment에서 dependency version이 임의로 변경되지 않도록 한다.

---

## 18. Runtime Version

Node.js runtime은 repository의 declared engine policy와 일치시킨다.

현재 repository policy:

```

Node.js >=24.19.0 <25

pnpm >=11.20.0 <12

```

local development, CI 및 production environment 사이에서 major runtime version drift를 최소화한다.

---

## 19. CI

GitHub Actions를 Continuous Integration platform으로 사용한다.

현재 기본 quality workflow는 다음을 수행한다.

```

checkout

pnpm setup

Node.js setup

dependency installation

format check

lint

```

실제 TypeScript source와 test setup이 추가되면 다음 검사를 단계적으로 추가한다.

```

typecheck

unit tests

integration tests

build

```

---

## 20. CI as a Quality Gate

CI가 실패한 commit을 production 배포 대상으로 사용하지 않는 것을 기본 원칙으로 한다.

프로젝트 규모가 증가하면 required status check를 branch policy에 연결할 수 있다.

---

## 21. Continuous Deployment

초기에는 CI와 CD를 개념적으로 구분한다.

```

CI

→ 변경이 품질 기준을 만족하는지 확인

CD

→ 검증된 변경을 environment에 배포

```

자동 production deployment는 테스트 및 rollback capability가 안정화된 이후 적용한다.

---

## 22. Deployment Trigger

deployment는 일반적으로 특정 Git commit을 기준으로 수행한다.

```

Git Commit

    │

    ▼

CI Validation

    │

    ▼

Deployment

```

Production에서 실행 중인 version이 어떤 commit에서 만들어졌는지 추적 가능해야 한다.

---

## 23. Deployment Provider Independence

특정 hosting provider는 architecture invariant로 두지 않는다.

선택 기준:

```

Node.js support

server-side execution

environment management

deployment reproducibility

observability

security

cost

operational simplicity

```

deployment provider를 변경하더라도 ODYS Core domain logic이 대규모로 변경되지 않는 것을 목표로 한다.

---

## 24. Application Build

Application framework가 확정되면 해당 framework의 production build process를 사용한다.

architecture 관점에서는 다음을 요구한다.

```

deterministic build

environment validation

type-safe configuration where practical

failure on invalid required configuration

```

필수 configuration이 없는 상태로 잘못된 production build가 성공하지 않도록 한다.

---

## 25. Database Deployment

Database schema는 application code와 별도로 version-controlled migration을 사용한다.

대표적인 흐름:

```

Schema Change

     │

     ▼

Migration File

     │

     ▼

Review

     │

     ▼

Validation

     │

     ▼

Production Migration

```

production database를 수동으로 변경하고 repository migration history와 불일치한 상태로 두지 않는다.

---

## 26. Migration Ownership

Database migration은 Git repository의 source of truth로 관리한다.

migration 생성과 실행 절차는 engineering workflow가 구체화될 때 정의한다.

---

## 27. Backward-Compatible Migrations

가능하면 application과 database가 짧은 deployment transition 동안 함께 동작할 수 있도록 migration을 설계한다.

예:

```

1. Add new nullable column

2. Deploy application using new column

3. Backfill if required

4. Enforce stronger constraint later

```

production에서 한 번에 destructive schema change를 적용하는 것을 피한다.

---

## 28. Destructive Migration

다음 변경은 높은 주의를 요구한다.

```

column deletion

table deletion

data type narrowing

large data rewrite

constraint strengthening

```

필요한 경우 backup, migration test 및 explicit Approval을 요구한다.

---

## 29. Migration Failure

Migration 실패 시 application deployment를 무조건 계속 진행하지 않는다.

```

Migration

   │

   ├── Success ─────► Application Deployment

   │

   └── Failure ─────► Stop / Investigate

```

database와 application schema가 incompatible한 상태로 production을 실행하지 않는다.

---

## 30. Data Seeding

production seed와 development fixture를 구분한다.

development test data를 production에 자동으로 삽입하지 않는다.

필수 system data가 있다면 idempotent migration 또는 명시적인 bootstrap mechanism을 사용한다.

---

## 31. Rollback Strategy

deployment 실패를 전제로 rollback path를 준비한다.

Application rollback의 기본 개념:

```

New Version

    │

    ▼

Failure Detected

    │

    ▼

Previous Known-Good Version

```

deployment provider가 previous artifact 또는 commit rollback을 지원한다면 활용할 수 있다.

---

## 32. Database Rollback

database rollback은 application rollback보다 어렵다.

특히 migration 이후 새 data가 생성되었다면 단순 reverse migration이 안전하지 않을 수 있다.

따라서 database change는 rollback보다 **forward-compatible migration**을 우선한다.

---

## 33. Feature Flags

고위험 기능을 완전히 배포와 동시에 활성화할 필요가 없다.

향후 필요한 경우 feature flag를 사용할 수 있다.

예:

```

new Agent

new Tool

new autonomous Action

new Model Provider

```

초기에는 dedicated feature flag platform을 도입하지 않아도 된다.

---

## 34. Agent Deployment

Agent Definition이 code/config source of truth인 동안 Agent 변경은 application deployment와 함께 배포할 수 있다.

중요한 Agent behavior 변경은 다음을 고려한다.

```

version tracking

evaluation

controlled rollout

observability

```

---

## 35. Model Configuration Deployment

Model Strategy mapping은 application deployment와 분리 가능한 configuration으로 발전할 수 있다.

초기에는 version-controlled configuration을 우선한다.

production에서 임의로 Model 설정을 변경하고 history가 남지 않는 상태를 피한다.

---

## 36. Tool Deployment

새로운 Tool 또는 Tool permission 변경은 security-sensitive deployment다.

배포 전 확인:

```

input validation

output validation

permissions

risk classification

Approval policy

retry policy

Audit

```

---

## 37. External Integration Deployment

OAuth callback URL이나 external provider 설정은 application deployment와 coordination이 필요할 수 있다.

환경별 provider configuration이 섞이지 않도록 관리한다.

---

## 38. Background Work

향후 long-running Task 또는 monitoring이 필요해지면 background execution mechanism을 추가할 수 있다.

초기에는 실제 use case가 생기기 전에 별도의 distributed queue infrastructure를 구축하지 않는다.

진화 경로:

```

Synchronous Operation

       │

       ▼

Long-Running Need Appears

       │

       ▼

Background Task Boundary

       │

       ▼

Queue / Worker if Justified

```

---

## 39. Scheduled Work

Conference deadline monitoring과 같은 기능은 scheduling capability를 필요로 할 수 있다.

실제 monitoring implementation을 도입할 때 다음을 검토한다.

```

scheduler reliability

duplicate execution

timezone

retry

Task persistence

failure visibility

```

scheduler vendor는 architecture invariant가 아니다.

---

## 40. Service Extraction

현재 `services/` directory는 독립 실행 boundary가 실제로 필요할 때 사용한다.

service extraction criteria:

```

independent scaling

independent runtime

independent deployment

failure isolation

security isolation

```

단순히 codebase가 커졌다는 이유로 microservice로 분리하지 않는다.

---

## 41. Deployment Observability

production deployment 후 최소한 다음을 확인할 수 있어야 한다.

```

deployment version

request failures

application errors

Model failures

Tool failures

database failures

latency

```

실제 observability product는 초기 구현 시점에 선택한다.

---

## 42. Health Checks

독립 backend runtime이 존재할 경우 basic health endpoint를 제공할 수 있다.

Health check는 단순 process alive 여부와 dependency health를 구분할 수 있다.

예:

```

liveness

readiness

```

초기 deployment topology가 이를 필요로 하지 않는다면 불필요하게 구현하지 않는다.

---

## 43. Structured Logs

production log는 가능한 한 structured form을 사용한다.

관찰 가능한 metadata:

```

request id

Task id

Agent id

Tool id

status

latency

error category

deployment version

```

민감한 content는 기록하지 않는다.

---

## 44. Error Monitoring

Unhandled exception과 repeated operational failure를 식별할 수 있어야 한다.

특히 다음 failure를 구분할 수 있어야 한다.

```

application bug

database failure

Model Provider failure

Tool Provider failure

authorization failure

configuration failure

```

---

## 45. Metrics

실제 운영 단계에서 다음 metric을 고려할 수 있다.

```

request success rate

request latency

Agent completion rate

Tool success rate

Model latency

Model usage

Task failure rate

Approval wait time

```

초기부터 모든 metric을 수집하지 않는다.

사용자 가치 및 운영 안정성과 직접 관련된 metric부터 추가한다.

---

## 46. Backup

persistent user data에는 backup strategy가 필요하다.

Supabase/PostgreSQL의 backup capability와 application-level recovery requirement를 함께 검토한다.

Backup 정책은 실제 production data 중요도와 plan에 따라 확정한다.

---

## 47. Restore Testing

Backup이 생성된다는 사실만으로 충분하지 않다.

production maturity가 높아지면 실제 restore procedure를 검증한다.

```

Backup

  │

  ▼

Restore Test

  │

  ▼

Verified Recovery

```

---

## 48. Disaster Recovery

초기 MVP에서는 complex multi-region disaster recovery를 구축하지 않는다.

사용자와 business criticality가 높아지면 다음을 정의한다.

```

RPO

RTO

backup retention

regional recovery

provider outage strategy

```

---

## 49. Provider Outage

External Model 또는 Tool Provider 장애는 정상적인 operational possibility로 취급한다.

대응:

```

retry

fallback

degraded mode

Task failure

user notification

```

provider failure 때문에 authorization 또는 security control을 우회하지 않는다.

---

## 50. Model Provider Deployment Configuration

Model provider credential과 model mapping은 environment별로 관리한다.

development와 production에서 서로 다른 Model을 사용할 수 있다.

단 Model Strategy의 semantic meaning은 유지한다.

---

## 51. Deployment Security

production deployment는 `SECURITY_ARCHITECTURE.md`의 원칙을 따른다.

특히 다음을 보장한다.

```

secret isolation

environment separation

secure transport

least privilege

no debug credential exposure

controlled database access

```

---

## 52. Production Debugging

production 문제를 해결한다는 이유로 다음을 무분별하게 활성화하지 않는다.

```

public debug endpoints

verbose secret logging

database admin access from browser

unrestricted remote shell

```

필요한 debugging capability는 controlled access로 제공한다.

---

## 53. Deployment Permissions

프로젝트가 외부 사용자를 갖게 되면 production deployment 권한을 제한한다.

개념적으로:

```

Source Change Permission

≠

Production Deployment Permission

```

초기 solo workflow에서는 complexity를 최소화하되 확장 시 분리할 수 있는 방향을 유지한다.

---

## 54. Release Identification

각 production deployment는 다음 중 하나 이상으로 식별 가능해야 한다.

```

Git commit SHA

release tag

application version

deployment identifier

```

문제가 발생했을 때 어떤 code가 실행 중인지 확인할 수 있어야 한다.

---

## 55. Release Notes

중요한 user-visible change가 증가하면 `CHANGELOG.md` 및 release process와 연결한다.

Architecture-level deployment decision과 product release note는 구분한다.

---

## 56. Dependency Updates

dependency update도 deployment risk를 가진다.

특히 다음 변경을 검토한다.

```

major version

runtime change

framework change

database client change

Model SDK change

authentication library change

```

lockfile 변경을 자동 생성물이라는 이유로 검토에서 제외하지 않는다.

---

## 57. Runtime Upgrades

Node.js major upgrade는 다음을 확인한 뒤 수행한다.

```

framework compatibility

dependency compatibility

CI compatibility

production platform support

build verification

```

runtime upgrade를 production에서 먼저 실험하지 않는다.

---

## 58. Deployment Testing

deployment 전에 단계적으로 다음 test를 추가한다.

```

format check

lint

typecheck

unit tests

integration tests

build

```

실제 application source가 없는 단계에서는 존재하지 않는 test stage를 형식적으로 강제하지 않는다.

---

## 59. Smoke Test

실제 Application deployment가 시작되면 production 또는 staging 배포 직후 최소 smoke test를 수행한다.

예:

```

application reachable

authentication works

basic API responds

database access works

critical configuration loaded

```

---

## 60. MVP Deployment Strategy

초기 MVP의 deployment 전략은 다음과 같다.

```

GitHub Repository

       │

       ▼

GitHub Actions CI

       │

       ▼

Validated Main Branch

       │

       ▼

Application Deployment

       │

       ├── Supabase

       ├── Model Provider

       └── External Tools

```

deployment provider는 첫 Application 구현 시 운영 단순성과 portability를 기준으로 선택한다.

---

## 61. Deferred Infrastructure

초기에는 다음 infrastructure를 도입하지 않는다.

```

Kubernetes

service mesh

multi-cluster deployment

complex event streaming platform

dozens of microservices

custom container orchestration platform

multi-region active-active architecture

```

실제 scale이나 reliability requirement가 발생하면 다시 평가한다.

---

## 62. Deployment Invariants

ODYS deployment architecture가 발전하더라도 다음 원칙은 유지한다.

1. A deployment maps to an identifiable source revision.

2. Dependency installation is reproducible.

3. Production secrets are not stored in source control.

4. Development and production environments are isolated.

5. Database changes are version-controlled migrations.

6. Deployment complexity follows actual operational need.

7. Modular Monolith remains the default until service extraction is justified.

8. Production configuration does not define Core domain behavior.

9. Security controls remain active during failure and degraded operation.

10. Rollback and recovery are considered before high-risk production changes.

11. Deployment provider choice remains replaceable where practical.

12. Observability grows with operational complexity.

---

## 63. Related Documents

이 문서는 다음 architecture 문서와 함께 사용한다.

- `SYSTEM_OVERVIEW.md`

- `ODYS_CORE.md`

- `DATA_MODEL.md`

- `MEMORY_ARCHITECTURE.md`

- `AGENT_ARCHITECTURE.md`

- `TOOL_ARCHITECTURE.md`

- `MODEL_STRATEGY.md`

- `API_DESIGN.md`

- `SECURITY_ARCHITECTURE.md`

- `TECH_STACK.md`

관련 Engineering 문서:

- `../50_engineering/DEVELOPMENT_WORKFLOW.md`

- `../50_engineering/TEST_STRATEGY.md`

- `../50_engineering/RELEASE_PROCESS.md`

관련 Architecture Decision Record:

- `../40_decisions/ADR-003-modular-monolith.md`

- `../40_decisions/ADR-004-typescript-primary.md`

- `../40_decisions/ADR-005-ai-sdk-model-independence.md`

- `../40_decisions/ADR-006-supabase.md`

- `../40_decisions/ADR-007-progressive-autonomy.md`

---

## 64. Deployment Development Rule

새로운 deployment component나 infrastructure를 추가하기 전에 다음 질문을 확인한다.

1. 어떤 실제 operational problem을 해결하는가?

2. 현재 Modular Monolith로 해결할 수 없는가?

3. 독립 deployment가 실제로 필요한가?

4. 새로운 environment complexity는 정당한가?

5. secret은 어떻게 관리되는가?

6. database migration은 어떻게 수행되는가?

7. 실패 시 rollback 또는 recovery는 가능한가?

8. production version을 추적할 수 있는가?

9. observability는 충분한가?

10. 새로운 provider에 불필요하게 결합되는가?

11. local, CI, production runtime이 일관되는가?

12. 이 infrastructure를 지금 운영할 가치가 있는가?

> Deploy the simplest system that can be reproduced, secured, observed, and recovered.
