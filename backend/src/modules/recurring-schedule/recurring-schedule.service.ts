import { RecurrenceType, RequestCategory, FacilityRequestStatus } from '@prisma/client';
import { prisma } from '@/config/prisma';
import { AppError } from '@/common/errors/AppError';

// ================================================================
// Types
// ================================================================

export interface CreateScheduleDto {
  title: string;
  description?: string;
  category: RequestCategory;
  recurrence: RecurrenceType;
  recurrenceDay?: number;
  recurrenceTime?: string;
  branchId: string;
  locationId?: string;
}

export interface UpdateScheduleDto {
  title?: string;
  description?: string;
  category?: RequestCategory;
  recurrence?: RecurrenceType;
  recurrenceDay?: number;
  recurrenceTime?: string;
  isActive?: boolean;
  branchId?: string;
  locationId?: string;
}

// ================================================================
// CRUD
// ================================================================

export async function listSchedules(branchId?: string) {
  return prisma.recurringSchedule.findMany({
    where: {
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    },
    include: {
      branch: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getScheduleById(id: string) {
  const schedule = await prisma.recurringSchedule.findFirst({
    where: { id, deletedAt: null },
    include: {
      branch: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!schedule) throw new AppError('스케줄을 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  return schedule;
}

export async function createSchedule(dto: CreateScheduleDto, userId: string) {
  validateRecurrence(dto.recurrence, dto.recurrenceDay);
  return prisma.recurringSchedule.create({
    data: {
      title: dto.title,
      description: dto.description ?? '',
      category: dto.category,
      recurrence: dto.recurrence,
      recurrenceDay: dto.recurrenceDay ?? null,
      recurrenceTime: dto.recurrenceTime ?? '09:00',
      branchId: dto.branchId,
      locationId: dto.locationId ?? null,
      createdById: userId,
    },
    include: {
      branch: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function updateSchedule(id: string, dto: UpdateScheduleDto) {
  if (dto.recurrence !== undefined) {
    validateRecurrence(dto.recurrence, dto.recurrenceDay);
  }
  const existing = await prisma.recurringSchedule.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('스케줄을 찾을 수 없습니다', 404, true, 'NOT_FOUND');

  return prisma.recurringSchedule.update({
    where: { id },
    data: {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.recurrence !== undefined && { recurrence: dto.recurrence }),
      ...(dto.recurrenceDay !== undefined && { recurrenceDay: dto.recurrenceDay }),
      ...(dto.recurrenceTime !== undefined && { recurrenceTime: dto.recurrenceTime }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.branchId !== undefined && { branchId: dto.branchId }),
      ...(dto.locationId !== undefined && { locationId: dto.locationId }),
    },
    include: {
      branch: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function deleteSchedule(id: string) {
  const existing = await prisma.recurringSchedule.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new AppError('스케줄을 찾을 수 없습니다', 404, true, 'NOT_FOUND');
  return prisma.recurringSchedule.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

// ================================================================
// 자동 생성 로직 — 앱 시작 시 또는 cron에서 호출
// ================================================================

export async function generateScheduledRequests() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay();     // 0(일) ~ 6(토)
  const dayOfMonth = now.getDate();   // 1 ~ 31

  const schedules = await prisma.recurringSchedule.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
  });

  let createdCount = 0;

  for (const schedule of schedules) {
    // 오늘 이미 생성했으면 스킵
    if (schedule.lastGeneratedAt && schedule.lastGeneratedAt >= today) {
      continue;
    }

    // 주기 확인
    const shouldGenerate = checkShouldGenerate(schedule.recurrence, schedule.recurrenceDay, dayOfWeek, dayOfMonth);
    if (!shouldGenerate) continue;

    // 설정된 생성 시각(HH:mm) 이전이면 스킵 — 다음 주기 실행에서 생성됨
    if (!isPastRecurrenceTime(schedule.recurrenceTime, now)) continue;

    // FacilityRequest 자동 생성
    await prisma.$transaction(async (tx) => {
      await tx.facilityRequest.create({
        data: {
          title: `[정기점검] ${schedule.title}`,
          description: schedule.description || `반복 점검 스케줄에 의해 자동 생성됨`,
          category: schedule.category,
          status: FacilityRequestStatus.REQUESTED,
          branchId: schedule.branchId,
          locationId: schedule.locationId,
          createdById: schedule.createdById,
        },
      });

      await tx.recurringSchedule.update({
        where: { id: schedule.id },
        data: { lastGeneratedAt: now },
      });
    });

    createdCount++;
  }

  return { createdCount, checkedCount: schedules.length };
}

// ================================================================
// Helpers
// ================================================================

function isPastRecurrenceTime(recurrenceTime: string, now: Date): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(recurrenceTime);
  if (!match) return true; // 형식이 잘못된 값은 시각 조건 없이 생성
  const minutesOfDay = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  return now.getHours() * 60 + now.getMinutes() >= minutesOfDay;
}

function checkShouldGenerate(
  recurrence: RecurrenceType,
  recurrenceDay: number | null,
  dayOfWeek: number,
  dayOfMonth: number,
): boolean {
  switch (recurrence) {
    case 'DAILY':
      return true;
    case 'WEEKLY':
      return recurrenceDay !== null && recurrenceDay === dayOfWeek;
    case 'MONTHLY':
      return recurrenceDay !== null && recurrenceDay === dayOfMonth;
    default:
      return false;
  }
}

function validateRecurrence(recurrence: RecurrenceType, recurrenceDay?: number | null) {
  if (recurrence === 'WEEKLY') {
    if (recurrenceDay === undefined || recurrenceDay === null || recurrenceDay < 0 || recurrenceDay > 6) {
      throw new AppError('주간 반복 시 요일(0~6)을 지정해야 합니다', 400, true, 'VALIDATION_ERROR');
    }
  }
  if (recurrence === 'MONTHLY') {
    if (recurrenceDay === undefined || recurrenceDay === null || recurrenceDay < 1 || recurrenceDay > 31) {
      throw new AppError('월간 반복 시 일자(1~31)를 지정해야 합니다', 400, true, 'VALIDATION_ERROR');
    }
  }
}
