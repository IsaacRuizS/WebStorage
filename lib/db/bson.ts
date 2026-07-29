import { Int32, Long, ObjectId } from "mongodb";

// Devuelve null en vez de reventar cuando el id viene malformado desde la petición
export function toObjectId(value: string | null | undefined) {
  return value && ObjectId.isValid(value) ? new ObjectId(value) : null;
}

// Los validadores exigen long e int, y JavaScript envía double por defecto
export function toLong(value: number): number {
  return Long.fromNumber(value) as unknown as number;
}

export function toInt(value: number): number {
  return new Int32(value) as unknown as number;
}
