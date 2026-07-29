import type { ObjectId } from "mongodb";

// Se llama DriveFile porque File ya es un tipo global del DOM que se usa al subir
export interface DriveFile {
  _id: ObjectId;
  name: string;
  owner_id: ObjectId;
  folder_id: ObjectId | null;
  mime_type: string;
  extension: string;
  size_bytes: number;
  storage_key: string;
  current_version: number;
  created_at: Date;
  updated_at?: Date | null;
  favorite: boolean;
  in_trash: boolean;
  tags: string[];
}
