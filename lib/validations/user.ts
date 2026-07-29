import { z } from "zod";

export const updateUserSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").optional(),
  role: z.enum(["user", "admin"]).optional(),
  active: z.boolean().optional(),
});
