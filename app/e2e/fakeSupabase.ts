// A stand-in for Supabase Auth and PostgREST, served by route interception.
//
// The production build is pointed at SUPABASE_URL (see playwright.config.ts),
// and every request to that host lands in FakeSupabase.handle. Tables live in
// memory and mirror the real schema: the columns each table has, its primary
// key, the grants (which columns a cook may update, whether rows can be
// deleted), own-rows RLS, and the functions the migrations define. A request
// this file does not understand is answered with a 501 and recorded, and the
// test fails on it.

import type { Page, Request, Route } from '@playwright/test'

export const SUPABASE_URL = 'https://e2e.supabase.test'
export const SUPABASE_KEY = 'sb_publishable_e2e'
// supabase-js names its storage key after the first label of the host.
const STORAGE_KEY = 'sb-e2e-auth-token'

export const EMAIL = 'cook@example.test'
export const PASSWORD = 'correct horse battery'

type Row = Record<string, unknown>
type Rating = 1 | 2 | 3

interface TableSpec {
  readonly columns: readonly string[]
  readonly key: readonly string[]
  /** Column defaults. `now` is a timestamp that increases with every row written. */
  readonly defaults: (now: string) => Row
  /** Columns a cook may update, as granted in the migrations. Empty = no update grant. */
  readonly updatable: readonly string[]
  readonly deletable: boolean
  /** A check constraint, as a message, or null when the row passes. */
  readonly check: (row: Row) => string | null
}

const PASSES = () => null

// One entry per table in supabase/migrations, kept in step with them.
const TABLES: Record<string, TableSpec> = {
  // 00001, with update and delete from 00004
  cook_logs: {
    columns: ['id', 'user_id', 'recipe_id', 'cooked_on', 'rating', 'notes', 'created_at'],
    key: ['id'],
    defaults: (now) => ({ id: crypto.randomUUID(), notes: '', created_at: now }),
    updatable: ['cooked_on', 'rating', 'notes'],
    deletable: true,
    check: (row) => (row.rating === 1 || row.rating === 2 || row.rating === 3 ? null : 'rating must be 1 to 3'),
  },
  // 00002 and 00003
  chefs: {
    columns: ['user_id', 'name', 'skin', 'hair', 'created_at'],
    key: ['user_id'],
    defaults: (now) => ({ skin: 1, hair: 1, created_at: now }),
    updatable: ['name', 'skin', 'hair'],
    deletable: false,
    check: (row) => {
      const name = row.name
      if (typeof name !== 'string' || name !== name.trim() || name.length < 1 || name.length > 24) {
        return 'chef name must be 1 to 24 characters with no outer spaces'
      }
      return null
    },
  },
  // 00004
  plan_items: {
    columns: ['user_id', 'recipe_id', 'added_at'],
    key: ['user_id', 'recipe_id'],
    defaults: (now) => ({ added_at: now }),
    updatable: [],
    deletable: true,
    check: PASSES,
  },
  pantry_items: {
    columns: ['user_id', 'ingredient_id'],
    key: ['user_id', 'ingredient_id'],
    defaults: () => ({}),
    updatable: [],
    deletable: true,
    check: PASSES,
  },
  grocery_checks: {
    columns: ['user_id', 'ingredient_id'],
    key: ['user_id', 'ingredient_id'],
    defaults: () => ({}),
    updatable: [],
    deletable: true,
    check: PASSES,
  },
  price_overrides: {
    columns: ['user_id', 'ingredient_id', 'price_cents'],
    key: ['user_id', 'ingredient_id'],
    defaults: () => ({}),
    updatable: ['ingredient_id', 'price_cents'],
    deletable: true,
    check: (row) =>
      Number.isInteger(row.price_cents) && Number(row.price_cents) > 0 ? null : 'price_cents must be above zero',
  },
  kit_items: {
    columns: ['user_id', 'equipment_id'],
    key: ['user_id', 'equipment_id'],
    defaults: () => ({}),
    updatable: [],
    deletable: true,
    check: PASSES,
  },
}

export interface SeedLog {
  readonly recipe: string
  readonly rating: Rating
  readonly cookedOn?: string
  readonly notes?: string
}

export interface Seed {
  /** Start with a stored session, as if the cook signed in earlier. Default true. */
  readonly signedIn?: boolean
  /** null = the account has not created a chef yet. */
  readonly chef?: { readonly name: string; readonly skin: number; readonly hair: number } | null
  readonly logs?: readonly SeedLog[]
  /** Recipe ids added to this week. */
  readonly plan?: readonly string[]
  /** Ingredient ids. */
  readonly pantry?: readonly string[]
  /** Ingredient ids already in the cart. */
  readonly checks?: readonly string[]
  /** Package prices the cook corrected, by ingredient id. */
  readonly prices?: Readonly<Record<string, number>>
  /** Equipment ids the cook owns. */
  readonly kit?: readonly string[]
}

interface Account {
  readonly id: string
  readonly email: string
  readonly password: string
}

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

// 2100-01-01. Far enough out that supabase-js never tries to refresh.
const EXPIRES_AT = 4102444800

export class FakeSupabase {
  readonly unhandled: string[] = []
  private readonly accounts: Account[] = [{ id: crypto.randomUUID(), email: EMAIL, password: PASSWORD }]
  private readonly tokens = new Map<string, string>()
  private readonly rows: Record<string, Row[]> = Object.fromEntries(Object.keys(TABLES).map((name) => [name, []]))
  private readonly failures: { table: string; method: string; message: string }[] = []
  private clock = Date.parse('2026-10-01T12:00:00Z')

  get userId(): string {
    const account = this.accounts[0]
    if (account === undefined) throw new Error('The fake has no accounts')
    return account.id
  }

  /** Rows of one table, for assertions. */
  table(name: string): readonly Row[] {
    const rows = this.rows[name]
    if (rows === undefined) throw new Error(`The fake has no table ${name}`)
    return rows
  }

  /** The next matching request answers with a server error. */
  failNext(table: string, method: string, message: string) {
    this.failures.push({ table, method, message })
  }

  async load(page: Page, seed: Seed) {
    const user_id = this.userId
    const chef = seed.chef === undefined ? { name: 'Remy', skin: 1, hair: 1 } : seed.chef
    if (chef !== null) this.insertRow('chefs', { ...chef, user_id })
    for (const log of seed.logs ?? []) {
      this.insertRow('cook_logs', {
        user_id,
        recipe_id: log.recipe,
        rating: log.rating,
        cooked_on: log.cookedOn ?? '2026-10-01',
        notes: log.notes ?? '',
      })
    }
    for (const recipe_id of seed.plan ?? []) this.insertRow('plan_items', { user_id, recipe_id })
    for (const ingredient_id of seed.pantry ?? []) this.insertRow('pantry_items', { user_id, ingredient_id })
    for (const ingredient_id of seed.checks ?? []) this.insertRow('grocery_checks', { user_id, ingredient_id })
    for (const [ingredient_id, price_cents] of Object.entries(seed.prices ?? {})) {
      this.insertRow('price_overrides', { user_id, ingredient_id, price_cents })
    }
    for (const equipment_id of seed.kit ?? []) this.insertRow('kit_items', { user_id, equipment_id })
    if (seed.signedIn === false) return
    // Store the session once per tab, as supabase-js would after a sign-in.
    // A reload keeps whatever the app has done to it since (a sign-out stays signed out).
    await page.addInitScript(
      ([key, value]) => {
        if (sessionStorage.getItem('e2e-session-seeded') !== null) return
        localStorage.setItem(key, value)
        sessionStorage.setItem('e2e-session-seeded', 'yes')
      },
      [STORAGE_KEY, JSON.stringify(this.session(this.userId))] as const,
    )
  }

  async handle(route: Route) {
    const request = route.request()
    const url = new URL(request.url())
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders(request) })
    if (request.headers().apikey !== SUPABASE_KEY) {
      return this.reject(route, `${request.method()} ${url.pathname} came without the publishable key`)
    }
    if (url.pathname.startsWith('/auth/v1/')) return this.auth(route, request, url)
    if (url.pathname.startsWith('/rest/v1/')) return this.rest(route, request, url)
    return this.reject(route, `${request.method()} ${url.pathname}`)
  }

  // ── Auth ──

  private session(userId: string) {
    const account = this.accounts.find((candidate) => candidate.id === userId)
    if (account === undefined) throw new Error(`No account ${userId}`)
    const claims = { sub: userId, email: account.email, role: 'authenticated', aud: 'authenticated', exp: EXPIRES_AT }
    const accessToken = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(claims)}.e2e`
    this.tokens.set(accessToken, userId)
    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: EXPIRES_AT,
      refresh_token: `refresh-${userId}`,
      user: {
        id: userId,
        aud: 'authenticated',
        role: 'authenticated',
        email: account.email,
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: {},
        created_at: '2026-10-01T12:00:00Z',
      },
    }
  }

  private async auth(route: Route, request: Request, url: URL) {
    const path = url.pathname.slice('/auth/v1'.length)
    const method = request.method()
    const grant = url.searchParams.get('grant_type')

    if (method === 'POST' && path === '/token' && grant === 'password') {
      const { email, password } = request.postDataJSON() as { email: string; password: string }
      const account = this.accounts.find((candidate) => candidate.email === email && candidate.password === password)
      if (account === undefined) {
        return json(route, request, 400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
      }
      return json(route, request, 200, this.session(account.id))
    }
    if (method === 'POST' && path === '/token' && grant === 'refresh_token') {
      const { refresh_token: token } = request.postDataJSON() as { refresh_token: string }
      const account = this.accounts.find((candidate) => `refresh-${candidate.id}` === token)
      if (account === undefined) return json(route, request, 400, { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' })
      return json(route, request, 200, this.session(account.id))
    }
    if (method === 'POST' && path === '/signup') {
      const { email, password } = request.postDataJSON() as { email: string; password: string }
      if (this.accounts.some((candidate) => candidate.email === email)) {
        return json(route, request, 422, { error_code: 'user_already_exists', msg: 'User already registered' })
      }
      const account = { id: crypto.randomUUID(), email, password }
      this.accounts.push(account)
      // "Confirm email" is off in development, so sign-up returns a session.
      return json(route, request, 200, this.session(account.id))
    }
    if (method === 'POST' && path === '/logout') {
      this.userFrom(request)
      return route.fulfill({ status: 204, headers: corsHeaders(request) })
    }
    return this.reject(route, `${method} ${url.pathname}${url.search}`)
  }

  private userFrom(request: Request): string | null {
    const header = request.headers().authorization ?? ''
    return this.tokens.get(header.replace(/^Bearer /, '')) ?? null
  }

  // ── PostgREST ──

  private async rest(route: Route, request: Request, url: URL) {
    // A table name, or rpc/<function>.
    const name = url.pathname.slice('/rest/v1/'.length)
    const method = request.method()
    const userId = this.userFrom(request)
    if (userId === null) return json(route, request, 401, { code: '42501', message: `permission denied for ${name}` })

    const failure = this.failures.find((candidate) => candidate.table === name && candidate.method === method)
    if (failure !== undefined) {
      this.failures.splice(this.failures.indexOf(failure), 1)
      return json(route, request, 500, { code: 'XX000', message: failure.message })
    }

    if (name.startsWith('rpc/')) return this.rpc(route, request, name.slice('rpc/'.length), userId)
    const spec = TABLES[name]
    if (spec === undefined) {
      return json(route, request, 404, { code: '42P01', message: `relation "public.${name}" does not exist` })
    }

    const prefer = request.headers().prefer ?? ''
    const wantsObject = (request.headers().accept ?? '').startsWith('application/vnd.pgrst.object+json')
    const select = url.searchParams.get('select')
    const respond = (rows: Row[], status: number) => {
      const shaped = rows.map((row) => project(row, select))
      if (!wantsObject) return json(route, request, status, shaped)
      if (shaped.length !== 1) {
        return json(route, request, 406, {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
          details: `The result contains ${shaped.length} rows`,
        })
      }
      return json(route, request, status, shaped[0])
    }

    const filters = [...url.searchParams].filter(([key]) => !['select', 'order', 'on_conflict', 'columns'].includes(key))
    for (const [column, filter] of filters) {
      if (!spec.columns.includes(column)) return unknownColumn(route, request, name, column)
      if (!/^(eq|in)\./.test(filter)) return this.reject(route, `the filter ${column}=${filter}`)
    }
    // Own-rows RLS: a cook only ever sees and touches their own rows.
    const table = this.rows[name] ?? []
    const matching = () => table.filter((row) => row.user_id === userId && filters.every(([column, filter]) => matches(row[column], filter)))

    if (method === 'GET') {
      const rows = matching()
      const order = url.searchParams.get('order')
      if (order !== null) {
        const [column, direction] = order.split('.')
        if (column === undefined || !spec.columns.includes(column)) return unknownColumn(route, request, name, String(column))
        rows.sort((a, b) => compare(a[column], b[column]) * (direction === 'desc' ? -1 : 1))
      }
      return respond(rows, 200)
    }

    if (method === 'POST') {
      const body = request.postDataJSON() as Row | Row[]
      const incoming = Array.isArray(body) ? body : [body]
      const merge = prefer.includes('resolution=merge-duplicates')
      const ignore = prefer.includes('resolution=ignore-duplicates')
      const written: Row[] = []
      for (const values of incoming) {
        for (const column of Object.keys(values)) {
          if (!spec.columns.includes(column)) return unknownColumn(route, request, name, column)
          // An upsert sets every column it was sent, so each needs the update grant,
          // whether or not the row exists yet. Postgres checks it before running.
          if (merge && !spec.updatable.includes(column)) {
            return json(route, request, 403, { code: '42501', message: `permission denied for table ${name}` })
          }
        }
        if ('user_id' in values && values.user_id !== userId) {
          return json(route, request, 403, { code: '42501', message: `new row violates row-level security policy for table "${name}"` })
        }
        const candidate = this.newRow(name, { ...values, user_id: userId })
        const existing = table.find((row) => spec.key.every((column) => row[column] === candidate[column]))
        if (existing !== undefined) {
          if (ignore) continue
          if (!merge) {
            return json(route, request, 409, { code: '23505', message: `duplicate key value violates unique constraint "${name}_pkey"` })
          }
          const problem = spec.check({ ...existing, ...values })
          if (problem !== null) return json(route, request, 400, { code: '23514', message: problem })
          Object.assign(existing, values)
          written.push(existing)
          continue
        }
        const problem = spec.check(candidate)
        if (problem !== null) return json(route, request, 400, { code: '23514', message: problem })
        table.push(candidate)
        written.push(candidate)
      }
      if (!prefer.includes('return=representation')) return route.fulfill({ status: 201, headers: corsHeaders(request) })
      return respond(written, 201)
    }

    if (method === 'PATCH') {
      const values = request.postDataJSON() as Row
      for (const column of Object.keys(values)) {
        if (!spec.updatable.includes(column)) {
          return json(route, request, 403, { code: '42501', message: `permission denied for table ${name}` })
        }
      }
      if (filters.length === 0) return json(route, request, 400, { code: '21000', message: 'UPDATE requires a WHERE clause' })
      const rows = matching()
      for (const row of rows) {
        const problem = spec.check({ ...row, ...values })
        if (problem !== null) return json(route, request, 400, { code: '23514', message: problem })
      }
      for (const row of rows) Object.assign(row, values)
      if (!prefer.includes('return=representation')) return route.fulfill({ status: 204, headers: corsHeaders(request) })
      return respond(rows, 200)
    }

    if (method === 'DELETE') {
      if (!spec.deletable) return json(route, request, 403, { code: '42501', message: `permission denied for table ${name}` })
      if (filters.length === 0) return json(route, request, 400, { code: '21000', message: 'DELETE requires a WHERE clause' })
      const rows = matching()
      this.rows[name] = table.filter((row) => !rows.includes(row))
      if (!prefer.includes('return=representation')) return route.fulfill({ status: 204, headers: corsHeaders(request) })
      return respond(rows, 200)
    }

    return this.reject(route, `${method} ${url.pathname}`)
  }

  // ── Functions (rpc/<name>), as written in the migrations ──

  private rpc(route: Route, request: Request, fn: string, userId: string) {
    if (request.method() !== 'POST') return this.reject(route, `${request.method()} rpc/${fn}`)
    const args = request.postDataJSON() as Record<string, unknown>

    if (fn === 'finish_shopping') {
      const staples = args.bought_staples
      if (Object.keys(args).join() !== 'bought_staples' || !Array.isArray(staples) || !staples.every((id) => typeof id === 'string')) {
        return json(route, request, 404, {
          code: 'PGRST202',
          message: `Could not find the function public.finish_shopping(${Object.keys(args).join(', ')})`,
        })
      }
      // 00004: stock the pantry with the bought staples, then clear the checks and the plan.
      for (const ingredient_id of new Set(staples)) {
        const stocked = this.table('pantry_items').some((row) => row.user_id === userId && row.ingredient_id === ingredient_id)
        if (!stocked) this.insertRow('pantry_items', { user_id: userId, ingredient_id })
      }
      this.rows.grocery_checks = this.table('grocery_checks').filter((row) => row.user_id !== userId)
      this.rows.plan_items = this.table('plan_items').filter((row) => row.user_id !== userId)
      // A function returning void answers 204.
      return route.fulfill({ status: 204, headers: corsHeaders(request) })
    }

    return this.reject(route, `POST rpc/${fn}`)
  }

  /** A row with the table's defaults filled in, not yet stored. */
  private newRow(name: string, values: Row): Row {
    const spec = TABLES[name]
    if (spec === undefined) throw new Error(`The fake has no table ${name}`)
    // Strictly increasing, so order=created_at is the order rows were written.
    this.clock += 1000
    return { ...spec.defaults(new Date(this.clock).toISOString()), ...values }
  }

  /** Stores a seed row, which must pass the table's checks. */
  private insertRow(name: string, values: Row) {
    const row = this.newRow(name, values)
    const problem = TABLES[name]?.check(row) ?? null
    if (problem !== null) throw new Error(`Seed row for ${name} fails its check: ${problem}`)
    this.rows[name]?.push(row)
  }

  private reject(route: Route, what: string) {
    this.unhandled.push(what)
    return json(route, route.request(), 501, { code: 'E2E', message: `The fake Supabase does not handle ${what}` })
  }
}

function corsHeaders(request: Request): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': request.headers()['access-control-request-headers'] ?? '*',
    'access-control-expose-headers': 'content-range, x-supabase-api-version',
  }
}

function json(route: Route, request: Request, status: number, body: unknown) {
  return route.fulfill({
    status,
    headers: { ...corsHeaders(request), 'x-supabase-api-version': '2024-01-01' },
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function unknownColumn(route: Route, request: Request, table: string, column: string) {
  return json(route, request, 400, { code: 'PGRST204', message: `Could not find the '${column}' column of '${table}'` })
}

function project(row: Row, select: string | null): Row {
  if (select === null || select === '*') return { ...row }
  return Object.fromEntries(select.split(',').map((column) => [column, row[column]]))
}

function matches(value: unknown, filter: string): boolean {
  const [operator, ...rest] = filter.split('.')
  const operand = rest.join('.')
  if (operator === 'eq') return String(value) === operand
  if (operator === 'in') return operand.replace(/^\(|\)$/g, '').split(',').includes(String(value))
  throw new Error(`Unchecked filter ${filter}`)
}

function compare(a: unknown, b: unknown): number {
  return String(a).localeCompare(String(b))
}
