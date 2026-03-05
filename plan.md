BAY Mileage Store — Phase 3 Implementation Plan

1. Project Goal

BAY Mileage Store는 BAY SPL 토큰을 소각하여 상품을 교환하는 온체인 마일리지 샵이다.

사용자는 BAY 토큰을 사용하여 상품을 구매하고,
구매 기록은 온체인 PurchaseReceipt 계정으로 남는다.

오프라인 교환은 트랜잭션 서명(Transaction Signature) 을 증빙으로 사용한다.

본 Phase의 목표는:

온체인 프로그램을 기반으로

최소 웹 dApp(MVP) 을 구현하여

실제 학회 행사에서 운영 가능한 상태로 만드는 것이다.

2. Confirmed Business Rules

다음 정책은 프로젝트 오너에 의해 확정되었다.

Purchase Policy

동일 상품 중복 구매 허용

현재 온체인 구조 (buyer, item) PDA는 1회 구매만 허용하므로
Receipt PDA 구조 변경이 필요

Item Identity

상품 이름 = 상품 ID

상품 이름 변경 불가

Stock Policy

재고 0인 상품은 숨기지 않고 "품절" 표시

Proof of Purchase

오프라인 교환 시 사용자가 제시해야 할 증빙:

Transaction Signature

운영자는 Solana Explorer에서 해당 트랜잭션을 확인한다.

Admin Policy

단일 운영자 지갑 (StoreConfig.authority)

운영자가 상품 등록 및 관리

Item Management

운영자는 다음을 수정할 수 있어야 한다.

상품 가격

상품 재고

Token Distribution

BAY 토큰은 다음 방식으로 배포된다.

운영자가 수동 에어드랍

기준: 학회 출결 점수

토큰 발급은 별도 스크립트 또는 CLI로 처리한다.

Network

Solana Devnet

dApp은 Vercel에 배포

Client Type

Minimal Web dApp

기능:

상품 목록 조회

구매 실행

사용자 구매 기록 조회

관리자 상품 관리

Purchase History

구매 기록 조회는 두 방식 모두 제공

사용자: 자신의 구매 기록 조회

관리자: 전체 구매 기록 조회

3. Current Implementation State

현재 레포에서 구현된 것:

On-chain Program

구현 완료

Accounts:

StoreConfig

StoreItem

PurchaseReceipt

Instructions:

initialize_store

add_item

purchase

검증:

잔액 확인

재고 확인

BAY token burn

영수증 생성

Test Coverage

tests/smoke.ts

테스트 포함:

스토어 초기화

상품 등록

정상 구매

잔액 부족 에러

4. Required On-chain Changes

다음 변경이 필요하다.

4.1 Allow Multiple Purchases

현재 Receipt PDA:

seeds = [
  "receipt",
  buyer,
  item
]

이 구조는 한 번만 구매 가능하다.

변경 필요:

seeds = [
  "receipt",
  buyer,
  item,
  purchase_index
]

또는

seeds = [
  "receipt",
  buyer,
  item,
  timestamp
]

목표:

동일 상품 무제한 구매 허용

4.2 Item Update Instruction

새 인스트럭션 추가 필요:

update_item

기능:

price 변경

stock 변경

권한:

store_config.authority
4.3 Optional (Recommended)

다음 기능은 선택적으로 추가 가능.

Item Deactivation

상품 비활성화

필드 추가:

is_active: bool
5. Client (Web dApp) — Phase 3

웹 클라이언트는 다음 기능을 제공해야 한다.

5.1 Wallet Connection

지원 지갑

Phantom

Solflare

기능:

connect wallet

show wallet address

read BAY token balance

5.2 Item Catalog Page

페이지:

/

표시:

상품 이름

가격 (BAY)

재고

상태

상태 표시:

Available

Out of Stock

데이터 소스:

getProgramAccounts(StoreItem)
5.3 Purchase Flow

사용자가:

상품 선택

Purchase 클릭

클라이언트는:

program.methods.purchase()

실행 후

사용자에게 표시:

Transaction Signature
5.4 User Purchase History

페이지:

/my-purchases

조회 방식:

getProgramAccounts(PurchaseReceipt)

필터:

buyer == wallet.publicKey

표시:

상품

시간

tx signature

5.5 Admin Panel

페이지:

/admin

권한:

wallet == authority

기능:

상품 추가

가격 변경

재고 변경

6. Token Distribution Tool

운영자가 BAY 토큰을 배포하기 위한 도구 필요.

방법:

CLI Script

예:

scripts/airdrop-bay.ts

기능:

wallet list 입력

amount 지정

SPL token transfer 실행

입력 예:

wallet,points
wallet,points
wallet,points
7. Off-chain Operations

행사 운영 절차:

사용자가 dApp에서 상품 구매

BAY token burn

transaction signature 획득

현장에서 signature 제시

운영자가 explorer 확인

상품 교환

8. Deployment
Network
Solana Devnet
Frontend
Vercel

환경 변수 예:

NEXT_PUBLIC_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=<program id>
NEXT_PUBLIC_BAY_MINT=<mint>
9. Phase Roadmap
Phase 2.5

온체인 수정

receipt 구조 수정

update_item 추가

Phase 3

Client MVP

wallet connection

catalog

purchase

history

Phase 4

Operations

BAY distribution tool

admin panel

event operation guide

10. Out of Scope

현재 MVP에서 제외

Refund

Purchase cancellation

Multi-sig admin

Anti-double-redeem system

Mainnet deployment

Security hardening