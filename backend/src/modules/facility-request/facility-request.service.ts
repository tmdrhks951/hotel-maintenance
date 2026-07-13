// ================================================================
// facility-request.service — 배럴(barrel) 파일
//
// 기존 1,800줄+ 단일 서비스를 책임별 서브모듈로 분할:
//  • facility-request.shared.ts           — 상태 전이 규칙 / 권한 유틸 / 공용 select
//  • facility-request.query.service.ts    — 조회 계열 (큐/대시보드/이력/달력/상세/중복체크)
//  • facility-request.workflow.service.ts — 상태 전이 계열 (생성/검토/일정/배정/완료/확인/재오픈/보고)
//
// 기존 import 경로(`./facility-request.service`)는 그대로 동작한다.
// ================================================================

export * from './facility-request.shared';
export * from './facility-request.query.service';
export * from './facility-request.workflow.service';
