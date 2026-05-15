import { z } from "zod";

export const setPasswordSchema = z
  .object({
    email: z.string().email(),
    token: z.string().min(10),
    password: z.string().min(10, "Use at least 10 characters."),
    confirmPassword: z.string().min(10),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });
