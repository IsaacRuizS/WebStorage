import { Int32, Long } from "mongodb";

// Los validadores exigen long e int, y JavaScript envía double por defecto
export function toLong(value: number): number {
  return Long.fromNumber(value) as unknown as number;
}

export function toInt(value: number): number {
  return new Int32(value) as unknown as number;
}
