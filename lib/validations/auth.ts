import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Correo electrónico inválido"),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "La contraseña actual es obligatoria"),
  new_password: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});
