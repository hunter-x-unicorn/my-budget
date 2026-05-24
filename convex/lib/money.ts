const SCALE = 100;

export function toMinorUnits(amount: number): number {
  return Math.round(amount * SCALE);
}

export function fromMinorUnits(minor: number): number {
  return minor / SCALE;
}

export function roundMoney(amount: number): number {
  return fromMinorUnits(toMinorUnits(amount));
}

export function addMoney(current: number, delta: number): number {
  return fromMinorUnits(toMinorUnits(current) + toMinorUnits(delta));
}
