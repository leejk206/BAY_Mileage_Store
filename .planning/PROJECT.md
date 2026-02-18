# BAY Mileage Store

## What This Is

BAY Mileage Store는 학회 내부에서 사용하는 **Solana testnet 기반 마일리지 교환 실험 프로젝트**다.  
학회원은 BAY 토큰을 소각하여 구매 사실을 온체인에 남기고, 해당 트랜잭션을 근거로 오프체인에서 실물 상품을 교환한다.

## Core Value

**온체인에 기록된 ‘사실’ 하나만으로 오프체인 교환이 성립될 수 있음을 직접 경험한다.**

## Requirements

### Validated

<!-- 출시되어 가치가 검증된 기능. -->

(None yet — ship to validate)

### Active

<!-- 현재 빌드 중인 범위. 이 요구사항들을 향해 나아가고 있음. -->

- [ ] BAY(SPL Token, decimals=6)를 결제 수단으로 사용한다
- [ ] 결제는 SPL Token burn으로 처리한다
- [ ] 상품 가격은 온체인에 단일 진실로 저장한다

### Out of Scope

<!-- 명시적 경계. 나중에 다시 추가하지 않도록 이유 포함. -->

- 사용자 인증 / 멤버십 관리 — 오프체인 교환 구조상 필요 없음
- 중복 교환 방지 — 임원진의 오프라인 판단에 위임
- 자동 환불 / 자동 정산 — 실험 프로젝트 범위를 초과함
- 보안 강화 및 공격 대응 — 학습·장난 목적 프로젝트

## Context

- 본 프로젝트는 **상업 서비스가 아닌 학회 내부 실험**이다
- Solana testnet을 사용하며, SOL faucet 의존을 감수한다
- 가격은 온체인, 교환은 오프체인이라는 명확한 경계를 전제로 한다
- 해킹·복사 가능성은 실패가 아닌 학습 결과로 간주한다

## Constraints

- **Tech stack**: Solana + Anchor + SPL Token — 학회원들이 직접 체험 가능한 블록체인 환경
- **Environment**: Testnet only — 실험 목적, 실자산 리스크 회피
- **Operations**: Off-chain fulfillment — 실물 교환은 사람에 의해 처리
- **Security**: Minimal — 분쟁·악용 방지는 범위 외

## Key Decisions

<!-- 향후 작업에 영향을 미치는 중요한 결정들. 프로젝트 전반에 걸쳐 추가. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SPL Token 사용 | Solana 표준, 구현 단순 | Decided |
| 결제 방식: burn | 교환 완료를 명확히 표현 | Decided |
| 가격 온체인 고정 | 단일 진실 보장 | Decided |
| 상품 오프체인 | 운영 단순화 | Decided |
| 프로그램 upgradeable | 실험 프로젝트 특성 | Decided |
| 사용자 인증 미구현 | 오프체인 교환 구조 | Decided |

---
*Last updated: 2026-02-18 after initialization*