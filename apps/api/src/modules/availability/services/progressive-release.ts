import type { AvailabilityBlockedReason } from '@starter/shared-types';

export type SlotForProgressiveRelease = {
  startAt: Date;
  endAt: Date;
  isOccupied: boolean;
  isPast?: boolean;
  isBlockedByException?: boolean;
};

export type SlotWithProgressiveRelease<TSlot extends SlotForProgressiveRelease = SlotForProgressiveRelease> = TSlot & {
  available: boolean;
  blockedReason?: AvailabilityBlockedReason;
  releaseBatchIndex?: number;
  releaseBatchActive?: boolean;
};

export type ProgressiveReleaseDebugDetails = {
  candidateSlots: string[];
  batches: string[][];
  activeBatchIndex: number;
  enabledSlots: string[];
  progressiveBlockedSlots: string[];
};

export type ProgressiveReleaseResult<TSlot extends SlotForProgressiveRelease = SlotForProgressiveRelease> = {
  slots: Array<SlotWithProgressiveRelease<TSlot>>;
  debug: ProgressiveReleaseDebugDetails;
};

const slotKey = (slot: SlotForProgressiveRelease): string => `${slot.startAt.getTime()}-${slot.endAt.getTime()}`;

const chunkSlots = <TSlot>(slots: TSlot[], size: number): TSlot[][] => {
  const chunks: TSlot[][] = [];
  for (let index = 0; index < slots.length; index += size) {
    chunks.push(slots.slice(index, index + size));
  }
  return chunks;
};

const sortedCopy = <TSlot extends SlotForProgressiveRelease>(slots: TSlot[]): TSlot[] =>
  [...slots].sort((left, right) => left.startAt.getTime() - right.startAt.getTime());

export const applyProgressiveReleaseBatches = <TSlot extends SlotForProgressiveRelease>(input: {
  slots: TSlot[];
  releaseLimit: number;
}): ProgressiveReleaseResult<TSlot> => {
  const limit = Math.floor(input.releaseLimit);

  if (!Number.isInteger(limit) || limit <= 0) {
    const slots = sortedCopy(input.slots).map((slot) => {
      if (slot.isPast) {
        return { ...slot, available: false, blockedReason: 'past_time' as const };
      }
      if (slot.isBlockedByException) {
        return { ...slot, available: false, blockedReason: 'exception' as const };
      }
      if (slot.isOccupied) {
        return { ...slot, available: false, blockedReason: 'occupied' as const };
      }
      return { ...slot, available: true };
    });

    return {
      slots,
      debug: {
        candidateSlots: slots.map((slot) => slot.startAt.toISOString()),
        batches: [],
        activeBatchIndex: -1,
        enabledSlots: slots.filter((slot) => slot.available).map((slot) => slot.startAt.toISOString()),
        progressiveBlockedSlots: []
      }
    };
  }

  const sortedSlots = sortedCopy(input.slots);
  const eligibleSlots = sortedSlots.filter((slot) => !slot.isPast && !slot.isBlockedByException);
  const batches = chunkSlots(eligibleSlots, limit);
  const activeBatchIndex = batches.findIndex((batch) => batch.some((slot) => !slot.isOccupied));

  const batchIndexBySlot = new Map<string, number>();
  batches.forEach((batch, batchIndex) => {
    batch.forEach((slot) => batchIndexBySlot.set(slotKey(slot), batchIndex));
  });

  const slots = sortedSlots.map((slot): SlotWithProgressiveRelease<TSlot> => {
    if (slot.isPast) {
      return { ...slot, available: false, blockedReason: 'past_time' };
    }

    if (slot.isBlockedByException) {
      return { ...slot, available: false, blockedReason: 'exception' };
    }

    const releaseBatchIndex = batchIndexBySlot.get(slotKey(slot)) ?? -1;
    const releaseBatchActive = releaseBatchIndex === activeBatchIndex;

    if (slot.isOccupied) {
      return {
        ...slot,
        available: false,
        blockedReason: 'occupied',
        releaseBatchIndex,
        releaseBatchActive
      };
    }

    if (releaseBatchActive) {
      return {
        ...slot,
        available: true,
        releaseBatchIndex,
        releaseBatchActive: true
      };
    }

    return {
      ...slot,
      available: false,
      blockedReason: 'progressive_release',
      releaseBatchIndex,
      releaseBatchActive: false
    };
  });

  return {
    slots,
    debug: {
      candidateSlots: eligibleSlots.map((slot) => slot.startAt.toISOString()),
      batches: batches.map((batch) => batch.map((slot) => slot.startAt.toISOString())),
      activeBatchIndex,
      enabledSlots: slots.filter((slot) => slot.available).map((slot) => slot.startAt.toISOString()),
      progressiveBlockedSlots: slots
        .filter((slot) => slot.blockedReason === 'progressive_release')
        .map((slot) => slot.startAt.toISOString())
    }
  };
};
