BAY Mileage Store Frontend UI Spec (Devnet dApp)

목적: 출결/활동 점수로 지급된 BAY 토큰을 소각(Burn)하여 굿즈/뱃지를 교환하는 최소 웹 dApp.
범위: Catalog(/), My Purchases(/my-purchases), Admin(/admin) 3개 화면 + 지갑 연결.
제약: 온체인 로직/Anchor 호출/환경변수 계약은 변경하지 않고, UI/UX와 스타일 시스템만 일관되게 적용한다.

1. 글로벌 환경
1-1. 폰트/렌더링

Sans: Geist (--font-geist-sans)

Mono: Geist_Mono (--font-geist-mono)

body

font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif

text-rendering: optimizeLegibility

-webkit-font-smoothing: antialiased

background: var(--background)

color: var(--foreground)

overflow-x: hidden

overflow-y: auto

1-2. 테마 토큰 (globals.css)
:root {
  --background: #0a0a0f;
  --foreground: #ffffff;
  --surface: #1a1a2e;

  --primary: #8b5cf6;
  --secondary: #a855f7;
  --accent: #c084fc;

  --glass: rgba(139, 92, 246, 0.08);
  --glass-border: rgba(139, 92, 246, 0.15);

  --gradient-primary: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
  --gradient-purple: linear-gradient(135deg, #8b5cf6 0%, #c084fc 100%);
  --gradient-dark: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #2d1b69 100%);
}
2. 공통 유틸리티 스타일
2-1. Glass / Neon / Card
Glass (.glass)

background: rgba(139, 92, 246, 0.08)

backdrop-filter: blur(20px)

border: 1px solid rgba(139, 92, 246, 0.15)

box-shadow: 0 8px 32px rgba(0,0,0,0.4)

Glass Hover (.glass-hover:hover)

background: rgba(139, 92, 246, 0.12)

border-color: rgba(139, 92, 246, 0.25)

transform: translateY(-2px)

box-shadow: 0 12px 40px rgba(0,0,0,0.5)

Modern Card (.modern-card)

기본: transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)

Hover: transform: translateY(-6px) scale(1.01) + 보라 glow 강화

Neon Text (.neon-text)

line-height: 1.2

text-shadow: 0 0 4px rgba(168,85,247,0.3), 0 0 8px rgba(168,85,247,0.2)

Neon Glow (.neon-glow)

box-shadow: 0 0 8px rgba(139,92,246,0.2), 0 0 16px rgba(139,92,246,0.1)

2-2. 전역 레이아웃 기본값

Page container:

container mx-auto px-4 sm:px-6 lg:px-8

Section spacing:

py-6 sm:py-8

“블록 내부 텍스트가 보더에 닿지 않도록” 기본 패딩 토큰 고정:

Card/Panel 기본: p-5 sm:p-6

Table/List 기본: p-4 sm:p-5

Empty State 기본: p-8

규칙: glass/modern-card를 쓰는 블록은 반드시 padding을 기본 제공한다.
예외가 필요하면 padding="none" 같은 명시적 override를 허용.

2-3. 스크롤바

폭 8px

track: rgba(255,255,255,0.05)

thumb: linear-gradient(45deg, #667eea, #764ba2)

3. 헤더 (Global Header)
3-1. 헤더 래퍼

header.sticky top-0 w-full glass border-b border-white/10

z-index: 40

3-2. 헤더 구성 (BAY Mileage Store용)

Left: 브랜드

아이콘: w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-700 neon-glow

텍스트: BAY Mileage + .neon-text

Center nav (desktop only): Catalog / My Purchases / Admin

Right: 지갑 영역

WalletMultiButton

네트워크 pill: Devnet

(옵션) RPC 표시 pill

3-3. 모바일

md:hidden 햄버거 버튼

토글 메뉴는 glass 패널로 드롭다운 (세로 링크 + 지갑 버튼)

4. 버튼 (Button)

컴포넌트: Button (CVA 기반)

4-1. 기본

inline-flex items-center justify-center

rounded-xl font-semibold

transition-all duration-300

focus-visible:ring-2 focus-visible:ring-offset-2

disabled:opacity-50 disabled:pointer-events-none

relative overflow-hidden + .btn-modern (shimmer)

4-2. 사이즈

sm: h-9 px-4 text-sm rounded-lg

md: h-11 px-6 text-base rounded-xl

lg: h-13 px-8 text-lg

xl: h-16 px-12 text-xl rounded-2xl

4-3. variant

primary: bg-gradient-to-r from-purple-500 to-purple-700 text-white + hover glow

secondary: glass glass-hover text-white border border-white/20

outline: border-2 border-purple-500/50 bg-transparent text-purple-200 hover:bg-purple-500/10

ghost: text-gray-300 hover:bg-white/10

destructive: from-red-500 to-pink-600 text-white

success: from-emerald-500 to-teal-600 text-white

neon: from-cyan-400 via-purple-500 to-pink-500 text-white neon-glow

5. 입력 컴포넌트 (Admin 중심)

대상: /admin의 Add/Update Item 폼

5-1. Input/Textarea/Select 공통

rounded-xl

glass + border border-white/20

padding: px-4 py-3

focus: ring-2 ring-cyan-400 border-cyan-400

error: border-red-400 ring-red-400

option background: #111827, text #ffffff

6. 카드/배지/패널
6-1. Card / Panel 기본 규칙

둥근 모서리: rounded-2xl

기본 배경: glass

보더: border border-white/10 또는 border-white/20

기본 패딩: p-5 sm:p-6 (필수)

hover: .modern-card (카드형에만)

6-2. Badge (상태 표현)

마일리지 샵에 맞는 상태만 정의한다.

available: 기본/secondary (glass)

soldOut: destructive (핑크/레드)

admin: outline (purple)

devnet: info 느낌 (blue/indigo 또는 cyan)

6-3. Stat Pill (상단 지표)

Catalog 상단에 노출:

BAY Balance

SOL Balance

Store Config PDA (short + copy)

Program ID (optional, short + copy)

표현:

glass pill + monospace 일부(--font-geist-mono)

값은 우측 정렬

7. 페이지 스펙
7-1. Catalog (/)
목적

사용자가 BAY 잔액 확인 → 아이템 선택 → 구매(소각) → Tx 서명 확인까지 한 화면에서 끝낸다.

섹션 구성

Hero/Stats Panel (glass)

Title: Mileage Shop (neon-text)

Subtitle: Burn BAY to redeem items (Devnet)

Stats: BAY / SOL / StoreConfig PDA

Catalog Grid

grid gap-6 md:grid-cols-2 lg:grid-cols-3

Item Card:

name + price badge + stock badge

stock 0이면 Sold out badge, Buy disabled

Buy 버튼: primary/neon

hover: modern-card

Last Tx Panel

구매 성공 시만 표시

Tx signature short + Explorer 링크 + Copy 버튼

가격/수량 표기

UI에서는 raw가 아닌 “BAY” 단위로 표시 (1 BAY = 1_000_000 raw)

내부 로직은 기존 그대로 유지

7-2. My Purchases (/my-purchases)
목적

사용자가 내 구매 영수증(Receipt) 목록을 보고, 행사장에서 증빙으로 제시할 수 있게 한다.

구성

Header: My Receipts

List/Table Panel (glass)

Item Name

Burned (BAY)

Time

Purchase Index

Empty state: glass + 중앙 정렬 + 안내 문구

7-3. Admin (/admin)
목적

운영자(authority) 지갑만 접근 가능한 상품 관리 콘솔.

접근 제어 UI

unauthorized:

glass warning panel + “Not authorized” 문구

authorized:

2개 패널:

Add Item

Update Item

각 액션 실행 후:

inline 결과 패널(성공/실패) + tx 링크

운영 정책: 이름은 ID이며 변경 불가 (UI에 명시).

8. 모션/애니메이션

hover transition: 0.3s cubic-bezier(0.4,0,0.2,1)

shimmer: 버튼 hover 시 0.5s 좌→우 하이라이트

pulse-glow: 강조 컴포넌트(네온 배지/CTA)에만 제한적으로

9. 구현 원칙 (중요)

기능/데이터 흐름 변경 금지:

Anchor 호출, 지갑 연결, env 계약, PDA 로직 유지

“padding 누락” 재발 방지:

glass/card/panel은 반드시 기본 padding 포함

페이지에서 임의로 p-*를 흩뿌리지 말고, 재사용 컴포넌트로 통일

Next.js 빌드/배포 용이성:

NEXT_PUBLIC_*는 브라우저 공개 값이므로 안전한 값만 사용