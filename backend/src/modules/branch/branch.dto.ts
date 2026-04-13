// ================================================================
// Branch DTOs
// ================================================================

export interface CreateBranchDto {
  name: string;
  code: string;
  address?: string;
}

export interface UpdateBranchDto {
  name?: string;
  address?: string;
  isActive?: boolean;
}

export interface ListBranchesQuery {
  /** isActive 필터. 미전달 시 전체 조회 */
  isActive?: boolean;
  /**
   * 담당 지점 목록 필터 (복수).
   * 컨트롤러에서 req.user.branchIds 기반으로 주입하며, 클라이언트가 직접 전달하지 않는다.
   */
  branchIdsFilter?: string[];
}
