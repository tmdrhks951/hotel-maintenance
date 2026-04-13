export interface CreateNoticeDto {
  title: string;
  content: string;
  isPublished?: boolean;
  branchId?: string;
}

export interface UpdateNoticeDto {
  title?: string;
  content?: string;
  isPublished?: boolean;
  branchId?: string | null;
}
