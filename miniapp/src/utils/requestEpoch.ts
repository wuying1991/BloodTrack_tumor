export interface RequestEpoch {
  begin(): number;
  capture(): number;
  isCurrent(epoch: number): boolean;
  invalidate(): void;
}

export function createRequestEpoch(): RequestEpoch {
  let current = 0;

  return {
    begin() {
      current += 1;
      return current;
    },
    capture() {
      return current;
    },
    isCurrent(epoch) {
      return epoch === current;
    },
    invalidate() {
      current += 1;
    },
  };
}
