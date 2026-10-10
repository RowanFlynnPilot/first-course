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

// Long, as a real one can be: an email has no spaces to wrap at, and the menu shows it.
export const EMAIL = 'remy.the.weeknight.cook@example.test'
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

/** PostgREST answers at most this many rows to a read, whatever was asked (Supabase's default max-rows). */
const MAX_ROWS = 1000

// 00008: ids are the curriculum's typed ids, lowercase words joined by hyphens.
const ID = /^[a-z0-9-]{1,64}$/
const idCheck = (column: string) => (row: Row) => (typeof row[column] === 'string' && ID.test(String(row[column])) ? null : `${column} is not an id`)

// One entry per table in supabase/migrations, kept in step with them.
const TABLES: Record<string, TableSpec> = {
  // 00001, with update and delete from 00004
  cook_logs: {
    columns: ['id', 'user_id', 'recipe_id', 'cooked_on', 'rating', 'notes', 'created_at'],
    key: ['id'],
    defaults: (now) => ({ id: crypto.randomUUID(), notes: '', created_at: now }),
    updatable: ['cooked_on', 'rating', 'notes'],
    deletable: true,
    check: (row) => {
      if (row.rating !== 1 && row.rating !== 2 && row.rating !== 3) return 'rating must be 1 to 3'
      if (typeof row.notes !== 'string' || row.notes.length > 2000) return 'notes must be at most 2000 characters'
      if (
        typeof row.cooked_on !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.cooked_on) ||
        row.cooked_on < '1900-01-01' ||
        row.cooked_on > '2999-12-31'
      ) {
        return 'cooked_on must be from 1900 to 2999'
      }
      return idCheck('recipe_id')(row)
    },
  },
  // 00002, 00003 and 00005
  chefs: {
    columns: ['user_id', 'name', 'skin', 'hair', 'hair_style', 'facial_hair', 'glasses', 'extras', 'created_at'],
    key: ['user_id'],
    defaults: (now) => ({ skin: 1, hair: 1, hair_style: 0, facial_hair: 0, glasses: 0, extras: [], created_at: now }),
    updatable: ['name', 'skin', 'hair', 'hair_style', 'facial_hair', 'glasses', 'extras'],
    deletable: false,
    check: (row) => {
      const name = row.name
      if (typeof name !== 'string' || name !== name.trim() || name.length < 1 || name.length > 24) {
        return 'chef name must be 1 to 24 characters with no outer spaces'
      }
      const ranges: readonly [string, number][] = [['skin', 6], ['hair', 8], ['hair_style', 3], ['facial_hair', 3], ['glasses', 2]]
      for (const [column, max] of ranges) {
        const value = row[column]
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) return `${column} must be 0 to ${max}`
      }
      const extras = row.extras
      if (!Array.isArray(extras) || !extras.every((id) => typeof id === 'string' && /^[a-z0-9-]{1,32}$/.test(id)) || extras.length > 4) {
        return 'extras must be at most 4 ids'
      }
      return null
    },
  },
  // 00004, with shopped from 00006
  plan_items: {
    columns: ['user_id', 'recipe_id', 'added_at', 'shopped', 'shopped_on'],
    key: ['user_id', 'recipe_id'],
    defaults: (now) => ({ added_at: now, shopped: false, shopped_on: null }),
    // 00009: the date the groceries were bought, cleared with the mark.
    updatable: ['shopped', 'shopped_on'],
    deletable: true,
    check: (row) => {
      if (typeof row.shopped !== 'boolean') return 'shopped must be true or false'
      // 00009: a date with a four-digit year, as cooked_on.
      if (row.shopped_on !== null && !(typeof row.shopped_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.shopped_on) && row.shopped_on >= '1900-01-01' && row.shopped_on <= '2999-12-31')) {
        return 'new row for relation "plan_items" violates check constraint "plan_items_shopped_on_range"'
      }
      return idCheck('recipe_id')(row)
    },
  },
  pantry_items: {
    columns: ['user_id', 'ingredient_id'],
    key: ['user_id', 'ingredient_id'],
    defaults: () => ({}),
    updatable: [],
    deletable: true,
    check: idCheck('ingredient_id'),
  },
  // grocery_checks (00004) is not here: 00010 took every grant on it away, and the app keeps its checks on
  // the phone, so a request for it fails the test like any the fake does not know.
  price_overrides: {
    columns: ['user_id', 'ingredient_id', 'price_cents'],
    key: ['user_id', 'ingredient_id'],
    defaults: () => ({}),
    updatable: ['ingredient_id', 'price_cents'],
    deletable: true,
    check: (row) =>
      Number.isInteger(row.price_cents) && Number(row.price_cents) > 0 && Number(row.price_cents) <= 100_000
        ? idCheck('ingredient_id')(row)
        : 'price_cents must be above zero and at most 100000',
  },
  kit_items: {
    columns: ['user_id', 'equipment_id'],
    key: ['user_id', 'equipment_id'],
    defaults: () => ({}),
    updatable: [],
    deletable: true,
    check: idCheck('equipment_id'),
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
  /** The stored session's hour is up, so it must be renewed before any read (the phone left a while). */
  readonly sessionExpired?: boolean
  /**
   * "Confirm email" on, as on the live project since October 4, 2026: sign-up
   * returns the new user without a session. Default false, as in development.
   */
  readonly confirmEmail?: boolean
  /** The seeded account never clicked its confirmation link (with confirmEmail). Default false. */
  readonly unconfirmed?: boolean
  /** null = the account has not created a chef yet. */
  readonly chef?: {
    readonly name: string
    readonly skin: number
    readonly hair: number
    readonly hair_style?: number
    readonly facial_hair?: number
    readonly glasses?: number
    readonly extras?: readonly string[]
  } | null
  readonly logs?: readonly SeedLog[]
  /** Recipe ids added to this week. */
  readonly plan?: readonly string[]
  /** Which of the plan's recipes are already shopped for ("Done shopping"). */
  readonly shopped?: readonly string[]
  /** The day a shopped recipe's groceries were bought, by recipe id (00009). */
  readonly shoppedOn?: Readonly<Record<string, string>>
  /** Ingredient ids. */
  readonly pantry?: readonly string[]
  /** Ingredient ids already in the cart, kept on the phone (lib/cart.ts), for the plan's list. */
  readonly checks?: readonly string[]
  /** Equipment ids checked off in the list's kit aisle, kept on the phone with the checks. */
  readonly kitChecks?: readonly string[]
  /** When the cart's first grocery was checked off, as an ISO time; by default, as the page opens. */
  readonly checkedSince?: string
  /** Package prices the cook corrected, by ingredient id. */
  readonly prices?: Readonly<Record<string, number>>
  /** Equipment ids the cook owns. */
  readonly kit?: readonly string[]
}

interface Account {
  readonly id: string
  readonly email: string
  readonly password: string
  /** The email link was clicked. Signing in needs it while "Confirm email" is on. */
  readonly confirmed: boolean
}

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

// 2100-01-01. Far enough out that supabase-js never tries to refresh.
const EXPIRES_AT = 4102444800

export class FakeSupabase {
  readonly unhandled: string[] = []
  /** Emails a password reset link was asked for, in order. */
  readonly resetRequests: string[] = []
  /** Emails a new confirmation link was asked for, in order. */
  readonly resendRequests: string[] = []
  private readonly accounts: Account[] = [{ id: crypto.randomUUID(), email: EMAIL, password: PASSWORD, confirmed: true }]
  private readonly tokens = new Map<string, string>()
  private readonly rows: Record<string, Row[]> = Object.fromEntries(Object.keys(TABLES).map((name) => [name, []]))
  private readonly failures: { table: string; method: string; message: string }[] = []
  private readonly lost: { table: string; method: string }[] = []
  private readonly held: { table: string; method: string; released: Promise<void> }[] = []
  private readonly dropped: { table: string; method: string }[] = []
  /** Requests that never reach the server until let through again, as "table method". */
  private readonly droppedAlways = new Set<string>()
  /** The scope of each sign-out the server heard ("local" is this device only). */
  readonly logouts: string[] = []
  /** Every session ended, as Sign out on another device does: a renewal is refused from now on. */
  private sessionsEnded = false
  private signal = true
  private clock = Date.parse('2026-10-01T12:00:00Z')
  private confirmEmail = false

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

  /** The next matching request answers with a server error. `table` is a table, rpc/<function>, or auth/<path> ("auth/logout"). */
  failNext(table: string, method: string, message: string) {
    this.failures.push({ table, method, message })
  }

  /** The next matching request is carried out, but its answer never arrives, as on weak signal. */
  loseNextAnswer(table: string, method: string) {
    this.lost.push({ table, method })
  }

  /**
   * The next matching request is carried out at once, but its answer arrives
   * only when the returned function is called: slow signal. A read answers
   * with what the database held when it arrived, however late.
   */
  holdNext(table: string, method: string): () => void {
    let release = () => {}
    const released = new Promise<void>((resolve) => {
      release = resolve
    })
    this.held.push({ table, method, released })
    return release
  }

  /** The next matching request never reaches the server: no signal, for one request. `table` as for failNext. */
  dropNext(table: string, method: string) {
    this.dropped.push({ table, method })
  }

  /** Ends every session, as signing out on every device would: no refresh token renews any more. */
  endSessions() {
    this.sessionsEnded = true
  }

  /** Every matching request never reaches the server, until `letThrough`: a dead spot for one kind of call. */
  dropEvery(table: string, method: string) {
    this.droppedAlways.add(`${table} ${method}`)
  }

  letThrough(table: string, method: string) {
    this.droppedAlways.delete(`${table} ${method}`)
  }

  /** No signal at all until `restoreSignal`: every request fails as the browser's does with none. */
  loseSignal() {
    this.signal = false
  }

  restoreSignal() {
    this.signal = true
  }

  /** Rows deleted by another device: every row of the table that has these values. */
  deleteElsewhere(table: string, values: Row) {
    const rows = this.table(table)
    const kept = rows.filter((row) => !Object.entries(values).every(([column, value]) => row[column] === value))
    if (kept.length === rows.length) throw new Error(`No ${table} row has ${JSON.stringify(values)} to delete`)
    this.rows[table] = kept
  }

  /** A row written by another device, as a seed is. */
  writeElsewhere(table: string, values: Row) {
    this.insertRow(table, { ...values, user_id: this.userId })
  }

  async load(page: Page, seed: Seed) {
    this.confirmEmail = seed.confirmEmail ?? false
    if (seed.unconfirmed === true) {
      const [account, ...rest] = this.accounts
      if (account === undefined) throw new Error('The fake has no accounts')
      this.accounts.splice(0, this.accounts.length, { ...account, confirmed: false }, ...rest)
    }
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
    for (const recipe_id of seed.plan ?? []) {
      this.insertRow('plan_items', {
        user_id,
        recipe_id,
        shopped: seed.shopped?.includes(recipe_id) ?? false,
        shopped_on: seed.shoppedOn?.[recipe_id] ?? null,
      })
    }
    for (const ingredient_id of seed.pantry ?? []) this.insertRow('pantry_items', { user_id, ingredient_id })
    for (const [ingredient_id, price_cents] of Object.entries(seed.prices ?? {})) {
      this.insertRow('price_overrides', { user_id, ingredient_id, price_cents })
    }
    for (const equipment_id of seed.kit ?? []) this.insertRow('kit_items', { user_id, equipment_id })
    if (seed.signedIn === false) return
    // Store the session once per tab, as the auth client would after a sign-in,
    // and the cart, which the app keeps on the phone (lib/cart.ts), checked
    // for the list the seeded plan makes. A reload keeps whatever the app has
    // done to them since (a sign-out stays signed out).
    const cart =
      seed.checks === undefined && seed.kitChecks === undefined
        ? null
        : JSON.stringify({
            checks: seed.checks ?? [],
            kitChecks: seed.kitChecks ?? [],
            checkedFor: (seed.plan ?? []).filter((id) => !(seed.shopped ?? []).includes(id)),
          })
    const since = seed.checkedSince === undefined ? null : Date.parse(seed.checkedSince)
    await page.addInitScript(
      ([key, value, cartKey, stored, checkedSince]) => {
        if (sessionStorage.getItem('e2e-session-seeded') !== null) return
        localStorage.setItem(key, value)
        // Checked off as the page opens (on its clock, installed or not), unless the seed says when.
        if (stored !== null) localStorage.setItem(cartKey, JSON.stringify({ ...JSON.parse(stored), since: checkedSince ?? Date.now() }))
        sessionStorage.setItem('e2e-session-seeded', 'yes')
      },
      [
        STORAGE_KEY,
        // An hour that ran out in 2023: the auth client renews it before anything else.
        JSON.stringify({ ...this.session(this.userId), ...(seed.sessionExpired === true ? { expires_at: 1_700_000_000 } : {}) }),
        `first-course:cart:${user_id}`,
        cart,
        since,
      ] as const,
    )
  }

  async handle(route: Route) {
    const request = route.request()
    const url = new URL(request.url())
    if (!this.signal) return route.abort('internetdisconnected')
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders(request) })
    const where = url.pathname.startsWith('/auth/v1/')
      ? `auth${url.pathname.slice('/auth/v1'.length)}`
      : url.pathname.slice('/rest/v1/'.length)
    if (this.droppedAlways.has(`${where} ${request.method()}`)) return route.abort('internetdisconnected')
    const drop = this.dropped.find((candidate) => candidate.table === where && candidate.method === request.method())
    if (drop !== undefined) {
      this.dropped.splice(this.dropped.indexOf(drop), 1)
      return route.abort('internetdisconnected')
    }
    if (request.headers().apikey !== SUPABASE_KEY) {
      return this.reject(route, `${request.method()} ${url.pathname} came without the publishable key`)
    }
    if (url.pathname.startsWith('/auth/v1/')) return this.auth(route, request, url)
    if (url.pathname.startsWith('/rest/v1/')) {
      const name = url.pathname.slice('/rest/v1/'.length)
      const hold = this.held.find((candidate) => candidate.table === name && candidate.method === request.method())
      if (hold !== undefined) {
        this.held.splice(this.held.indexOf(hold), 1)
        const late = {
          request: () => request,
          fulfill: async (options: Parameters<Route['fulfill']>[0]) => {
            await hold.released
            return route.fulfill(options)
          },
        } as unknown as Route
        return this.rest(late, request, url)
      }
      const lost = this.lost.find((candidate) => candidate.table === name && candidate.method === request.method())
      if (lost === undefined) return this.rest(route, request, url)
      this.lost.splice(this.lost.indexOf(lost), 1)
      // Do the work, then drop the answer on the floor.
      const silent = { request: () => request, fulfill: () => route.abort('failed') } as unknown as Route
      return this.rest(silent, request, url)
    }
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
    const failure = this.failures.find((candidate) => candidate.table === `auth${path}` && candidate.method === method)
    if (failure !== undefined) {
      this.failures.splice(this.failures.indexOf(failure), 1)
      return json(route, request, 500, { error_code: 'unexpected_failure', msg: failure.message })
    }
    const grant = url.searchParams.get('grant_type')

    if (method === 'POST' && path === '/token' && grant === 'password') {
      const { email, password } = request.postDataJSON() as { email: string; password: string }
      const account = this.accounts.find((candidate) => candidate.email === email && candidate.password === password)
      if (account === undefined) {
        return json(route, request, 400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' })
      }
      if (this.confirmEmail && !account.confirmed) {
        return json(route, request, 400, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' })
      }
      return json(route, request, 200, this.session(account.id))
    }
    if (method === 'POST' && path === '/token' && grant === 'refresh_token') {
      const { refresh_token: token } = request.postDataJSON() as { refresh_token: string }
      const account = this.accounts.find((candidate) => `refresh-${candidate.id}` === token)
      if (account === undefined || this.sessionsEnded) {
        return json(route, request, 400, { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' })
      }
      return json(route, request, 200, this.session(account.id))
    }
    if (method === 'POST' && path === '/signup') {
      const { email, password } = request.postDataJSON() as { email: string; password: string }
      if (this.accounts.some((candidate) => candidate.email === email)) {
        return json(route, request, 422, { error_code: 'user_already_exists', msg: 'User already registered' })
      }
      const account = { id: crypto.randomUUID(), email, password, confirmed: !this.confirmEmail }
      this.accounts.push(account)
      if (this.confirmEmail) {
        // The new user, unconfirmed and with no session, until the email link is clicked.
        const { user } = this.session(account.id)
        return json(route, request, 200, { ...user, confirmation_sent_at: '2026-10-04T12:00:00Z' })
      }
      // "Confirm email" off, as in development: sign-up returns a session.
      return json(route, request, 200, this.session(account.id))
    }
    if (method === 'POST' && path === '/logout') {
      this.userFrom(request)
      this.logouts.push(url.searchParams.get('scope') ?? 'global')
      return route.fulfill({ status: 204, headers: corsHeaders(request) })
    }
    if (method === 'POST' && path === '/recover') {
      // Supabase answers the same whether or not the email has an account, so it never says which emails exist.
      const { email } = request.postDataJSON() as { email: string }
      this.resetRequests.push(email)
      return json(route, request, 200, {})
    }
    if (method === 'POST' && path === '/resend') {
      const { email, type } = request.postDataJSON() as { email: string; type: string }
      if (type !== 'signup') return this.reject(route, `POST /auth/v1/resend of type ${type}`)
      this.resendRequests.push(email)
      return json(route, request, 200, {})
    }
    if (path === '/user' && (method === 'GET' || method === 'PUT')) {
      const userId = this.userFrom(request)
      // As GoTrue answers a token it cannot read: 403, bad_jwt.
      if (userId === null) return json(route, request, 403, { error_code: 'bad_jwt', msg: 'invalid JWT' })
      if (method === 'PUT') {
        const { password } = request.postDataJSON() as { password: string }
        const index = this.accounts.findIndex((candidate) => candidate.id === userId)
        const account = this.accounts[index]
        if (account === undefined) throw new Error(`No account ${userId}`)
        this.accounts[index] = { ...account, password }
      }
      return json(route, request, 200, this.session(userId).user)
    }
    return this.reject(route, `${method} ${url.pathname}${url.search}`)
  }

  /**
   * Where a password reset link sends the cook: the app's address with a
   * signed-in session in the hash, as Supabase's implicit flow does.
   */
  recoveryHash(): string {
    return this.linkHash('recovery')
  }

  /** The hash a confirmation email's link lands with: a new account, signed in. */
  signupHash(): string {
    return this.linkHash('signup')
  }

  /**
   * A reset link for a different account, as someone could send one that
   * carries their own session: the account is made here, with no chef.
   */
  strangerHash(): string {
    const stranger = { id: crypto.randomUUID(), email: 'someone.else@example.test', password: 'their own password', confirmed: true }
    this.accounts.push(stranger)
    return this.linkHash('recovery', stranger.id)
  }

  private linkHash(type: 'recovery' | 'signup', userId = this.userId): string {
    const session = this.session(userId)
    const params = new URLSearchParams({
      access_token: session.access_token,
      expires_at: String(Math.floor(Date.now() / 1000) + 3600),
      expires_in: '3600',
      refresh_token: session.refresh_token,
      token_type: 'bearer',
      type,
    })
    return `#${params.toString()}`
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
    // A table the app has no business with (grocery_checks, shut by 00010, or a typo) fails the test.
    const spec = TABLES[name]
    if (spec === undefined) return this.reject(route, `${request.method()} ${name}, a table the app does not use`)

    const prefer = request.headers().prefer ?? ''
    const wantsObject = (request.headers().accept ?? '').startsWith('application/vnd.pgrst.object+json')
    const select = url.searchParams.get('select')
    // PostgREST refuses a column the table does not have, in what is read as in a filter.
    for (const column of select === null || select === '*' ? [] : select.split(',')) {
      if (!spec.columns.includes(column)) {
        return json(route, request, 400, { code: '42703', message: `column ${name}.${column} does not exist` })
      }
    }
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

    const filters = [...url.searchParams].filter(([key]) => !['select', 'order', 'on_conflict', 'columns', 'limit', 'offset'].includes(key))
    for (const [column, filter] of filters) {
      if (!spec.columns.includes(column)) return unknownColumn(route, request, name, column)
      if (!/^(eq|in)\./.test(filter)) return this.reject(route, `the filter ${column}=${filter}`)
    }
    // Own-rows RLS: a cook only ever sees and touches their own rows.
    const table = this.rows[name] ?? []
    const matching = () => table.filter((row) => row.user_id === userId && filters.every(([column, filter]) => matches(row[column], filter)))

    if (method === 'GET') {
      const rows = matching()
      // order=created_at.asc,id.asc: each key in turn, as PostgREST does.
      const order = url.searchParams.get('order')
      if (order !== null) {
        const keys = order.split(',').map((key) => key.split('.') as [string, string | undefined])
        for (const [column] of keys) if (!spec.columns.includes(column)) return unknownColumn(route, request, name, column)
        rows.sort((a, b) => {
          for (const [column, direction] of keys) {
            const by = compare(a[column], b[column]) * (direction === 'desc' ? -1 : 1)
            if (by !== 0) return by
          }
          return 0
        })
      }
      // range(): offset and limit, and never more than PostgREST's max-rows (1,000 on Supabase).
      const offset = Number(url.searchParams.get('offset') ?? '0')
      const limit = Math.min(Number(url.searchParams.get('limit') ?? MAX_ROWS), MAX_ROWS)
      const page = rows.slice(offset, offset + limit)
      return respond(page, 200)
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
        this.afterInsert(name, candidate)
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

  // ── Triggers, as written in the migrations ──

  private afterInsert(name: string, row: Row) {
    // 00006: saving a cook takes its recipe off the cook's plan.
    if (name === 'cook_logs') {
      this.rows.plan_items = this.table('plan_items').filter(
        (planned) => !(planned.user_id === row.user_id && planned.recipe_id === row.recipe_id),
      )
    }
  }

  // ── Functions (rpc/<name>), as written in the migrations ──

  private rpc(route: Route, request: Request, fn: string, userId: string) {
    if (request.method() !== 'POST') return this.reject(route, `${request.method()} rpc/${fn}`)
    const args = request.postDataJSON() as Record<string, unknown>

    if (fn === 'finish_shopping') {
      const {
        bought_staples: staples,
        shopped_recipes: recipes,
        bought_on: boughtOn = null,
        bought_kit: kit = [],
        seen_checks: seen = null,
      } = args
      const texts = (value: unknown): value is string[] => Array.isArray(value) && value.every((id) => typeof id === 'string')
      // 00010: bought_staples and shopped_recipes, then bought_on, bought_kit and the ignored
      // seen_checks, each with a default, so the two apps before it still find the function.
      const optional = ['bought_kit', 'bought_on', 'seen_checks']
      const known = Object.keys(args).every((name) => ['bought_staples', 'shopped_recipes', ...optional].includes(name))
      if (!known || !texts(staples) || !texts(recipes) || !texts(kit) || (seen !== null && !texts(seen))) {
        return json(route, request, 404, {
          code: 'PGRST202',
          message: `Could not find the function public.finish_shopping(${Object.keys(args).join(', ')})`,
        })
      }
      if (boughtOn !== null && !(typeof boughtOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(boughtOn) && !Number.isNaN(Date.parse(boughtOn)))) {
        return json(route, request, 400, { code: '22007', message: `invalid input syntax for type date: "${String(boughtOn)}"` })
      }
      // One transaction: every row is checked before any is written, and a refusal changes nothing.
      const marked = this.table('plan_items')
        .filter((row) => row.user_id === userId && recipes.includes(String(row.recipe_id)))
        // A recipe already shopped keeps its first date (00010).
        .map((row) => ({ row, next: { ...row, shopped: true, shopped_on: row.shopped === true ? row.shopped_on : boughtOn } }))
      const problem =
        [...staples.map((ingredient_id) => TABLES.pantry_items?.check({ user_id: userId, ingredient_id }) ?? null),
          ...kit.map((equipment_id) => TABLES.kit_items?.check({ user_id: userId, equipment_id }) ?? null),
          ...marked.map(({ next }) => TABLES.plan_items?.check(next) ?? null)].find((message) => message !== null) ?? null
      if (problem !== null) return json(route, request, 400, { code: '23514', message: problem })
      // 00010: stock the pantry with the bought staples and the kit with the bought kit, and mark the recipes the shop covered.
      for (const ingredient_id of new Set(staples)) {
        const stocked = this.table('pantry_items').some((row) => row.user_id === userId && row.ingredient_id === ingredient_id)
        if (!stocked) this.insertRow('pantry_items', { user_id: userId, ingredient_id })
      }
      for (const equipment_id of new Set(kit)) {
        const owned = this.table('kit_items').some((row) => row.user_id === userId && row.equipment_id === equipment_id)
        if (!owned) this.insertRow('kit_items', { user_id: userId, equipment_id })
      }
      for (const { row, next } of marked) Object.assign(row, next)
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
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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
