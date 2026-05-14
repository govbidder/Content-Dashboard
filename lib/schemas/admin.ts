/**
 * Zod schemas for admin API routes.
 */
import { z } from 'zod'

export const GlobalRoleSchema = z.enum(['PENDING', 'MEMBER', 'SUPER_ADMIN'])

export const UpdateUserSchema = z.object({
  globalRole: GlobalRoleSchema.optional(),
  displayName: z.string().min(1).max(120).optional(),
})

export const GrantClientAccessSchema = z.object({
  clientId: z.string().min(1),
})

// slug — lowercase letters, digits, hyphens
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const CreateClientSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().regex(slugRegex).min(1).max(120).optional(),
})

export const UpdateClientSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().regex(slugRegex).min(1).max(120).optional(),
})

export const SetActiveClientSchema = z.object({
  clientId: z.string().min(1),
})

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().min(1).max(120).optional(),
  globalRole: GlobalRoleSchema.default('MEMBER'),
  clientId: z.string().optional(),
})

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}
