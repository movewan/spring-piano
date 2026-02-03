# SaaS 확장 작업 진행 상황

> **마지막 작업일**: 2026-02-02
> **상태**: 기획 완료, 구현 대기

## 다음 세션에서 이어서 할 작업

Claude 실행 후 다음 명령어로 시작하세요:
```
/Users/dongwan/.claude/plans/luminous-sprouting-oasis.md 파일 읽고 SaaS 확장 작업 이어서 진행해줘
```

## 완료된 작업
- [x] 현재 프로젝트 구조 분석
- [x] 외부 서비스 연동 가능 여부 검토
- [x] SaaS 확장 아키텍처 설계
- [x] 구현 로드맵 작성

## 확정된 사항
1. **Notion 데이터**: 마이그레이션 필요
2. **카카오 채널**: 없음 → 개설 필요
3. **우선순위**: 이화피아노 기능 먼저 완성

## 구현 순서
1. Notion MCP로 기존 데이터 마이그레이션
2. Google Drive 연동 (원생별 폴더 자동 생성)
3. 카카오 비즈 채널 개설 + 알림톡 연동
4. 관리자 설정 페이지
5. (향후) SaaS 멀티테넌트 전환

## 관련 파일
- **상세 계획**: `/Users/dongwan/.claude/plans/luminous-sprouting-oasis.md`
- **프로젝트 루트**: `/Users/dongwan/vibecode/spring-piano`

## 사용자 질문 요약
- Notion MCP → 가능, 원장님 계정으로 연동
- PlayMCP(카카오) → 알림톡에 부적합, 카카오 비즈메시지 API 권장
- 구글 드라이브 폴더 규칙 → `YYMMDD_부모폰뒷4자리_이름` 적합
- SaaS 가격 → 월 4-5만원 (Basic 39,000원 / Pro 49,000원 제안)
