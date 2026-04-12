import { Role, Position } from '@prisma/client';

// ================================================================
// User DTOs
// ================================================================

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: Role;
  position?: Position;
  branchId?: string;
}

export interface UpdateUserDto {
  name?: string;
  role?: Role;
  position?: Position;
  branchId?: string | null;
  isActive?: boolean;
}

export interface ListUsersQuery {
  role?: Role;
  branchId?: string;
  isActive?: boolean;
}
