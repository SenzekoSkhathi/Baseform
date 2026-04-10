import { z } from "zod";

const SA_PROVINCES = [
  "Gauteng", "Western Cape", "Eastern Cape", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape",
] as const;

const GUARDIAN_RELATIONSHIPS = ["Parent", "Guardian", "Grandparent", "Sibling", "Other"] as const;

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  profile: z.object({
    full_name: z.string().min(1, "Full name is required").max(120),
    phone: z.string().max(20).nullable().optional(),
    school_name: z.string().max(120).nullable().optional(),
    grade_year: z.number().int().min(10).max(13).nullable().optional(),
    province: z.enum(SA_PROVINCES).nullable().optional(),
    financial_need: z.boolean().nullable().optional(),
    field_of_interest: z.string().max(80).nullable().optional(),
    guardian_name: z.string().min(1, "Guardian name is required").max(120),
    guardian_phone: z.string().min(1, "Guardian phone is required").max(20),
    guardian_relationship: z.enum(GUARDIAN_RELATIONSHIPS),
    guardian_email: z.string().email("Invalid guardian email").nullable().optional(),
    guardian_whatsapp_number: z.string().max(20).nullable().optional(),
  }).optional(),
  subjects: z.array(
    z.object({
      name: z.string().min(1).max(80),
      mark: z.number().int().min(0).max(100),
    })
  ).max(10).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
