export interface CreateManualDto {
  title: string;
  content: string;
  isPublished?: boolean;
  branchId?: string;
}

export interface UpdateManualDto {
  title?: string;
  content?: string;
  isPublished?: boolean;
  branchId?: string | null;
}
