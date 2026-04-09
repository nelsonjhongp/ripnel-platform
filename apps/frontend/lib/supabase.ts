type LegacyQueryResult<T = unknown> = {
  data: T | null
  error: Error
}

type LegacyQueryBuilder = LegacyQueryResult<unknown> & {
  select: (..._args: unknown[]) => LegacyQueryBuilder
  order: (..._args: unknown[]) => LegacyQueryBuilder
  update: (..._args: unknown[]) => LegacyQueryBuilder
  insert: (..._args: unknown[]) => LegacyQueryBuilder
  delete: (..._args: unknown[]) => LegacyQueryBuilder
  eq: (..._args: unknown[]) => LegacyQueryBuilder
  single: () => LegacyQueryBuilder
}

function buildLegacyError() {
  return new Error(
    "Legacy Supabase client is disabled. Use backend APIs instead of direct Supabase access."
  )
}

function createLegacyQueryBuilder(): LegacyQueryBuilder {
  const baseResult: LegacyQueryResult<unknown> = {
    data: null,
    error: buildLegacyError(),
  }

  return {
    ...baseResult,
    select: () => createLegacyQueryBuilder(),
    order: () => createLegacyQueryBuilder(),
    update: () => createLegacyQueryBuilder(),
    insert: () => createLegacyQueryBuilder(),
    delete: () => createLegacyQueryBuilder(),
    eq: () => createLegacyQueryBuilder(),
    single: () => createLegacyQueryBuilder(),
  }
}

export const supabase = {
  from(table: string): LegacyQueryBuilder {
    void table
    return createLegacyQueryBuilder()
  },
  rpc(fn: string, args?: Record<string, unknown>): LegacyQueryResult<unknown> {
    void fn
    void args
    return {
      data: null,
      error: buildLegacyError(),
    }
  },
}

export type Usuario = {
  user_id: string
  full_name: string
  username: string
  email?: string | null
  role_id: string
  active: boolean
  created_at: string
  updated_at: string
}

export type Rol = {
  role_id: string
  name: string
  description: string
  active: boolean
  created_at: string
  updated_at: string
}
