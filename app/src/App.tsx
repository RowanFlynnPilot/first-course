import { isAuthRetryableFetchError, type Session } from '@supabase/auth-js'
import { useEffect, useRef, useState } from 'react'
import { KitchenContext, type Kitchen } from './kitchen'
import { HashRouter, Route, Routes, useLocation, useNavigationType } from 'react-router'
import { loadCart, saveCart, settleCart } from './lib/cart'
import { fetchChef, type Chef } from './lib/chefs'
import { fetchCookLogs } from './lib/cookLogs'
import type { CookNotice } from './lib/notice'
import type { CookLog } from './lib/progress'
import { fetchShop, withoutPlanned, type Shop, type ShopChange } from './lib/shop'
import { AuthScreen } from './screens/AuthScreen'
import { ChefScreen } from './screens/ChefScreen'
import { CookScreen } from './screens/CookScreen'
import { EditChefScreen } from './screens/EditChefScreen'
import { EditCookScreen } from './screens/EditCookScreen'
import { KitScreen } from './screens/KitScreen'
import { LogScreen } from './screens/LogScreen'
import { MenuScreen } from './screens/MenuScreen'
import { NameChefScreen } from './screens/NameChefScreen'
import { PantryScreen } from './screens/PantryScreen'
import { RecipeScreen } from './screens/RecipeScreen'
import { SetPasswordScreen } from './screens/SetPasswordScreen'
import { ShopScreen } from './screens/ShopScreen'
import { SpicesScreen } from './screens/SpicesScreen'
import { menuScrollPosition } from './components/menuScroll'
import { Plate } from './components/Plate'
import { clearFocusTarget } from './components/useFocusTarget'
import { plainMessage } from './lib/errors'
import { forgetOldTimers } from './lib/timers'
import { usePageTitle } from './components/usePageTitle'
import { auth, emailLink, fromPasswordReset, linkError, LinkUnreachable, linkOwner, signInFromLink } from './supabase'

export default function App() {
  // undefined = still asking Supabase; null = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  // A password reset link signs the cook in, and the new password comes before anything else.
  const [settingPassword, setSettingPassword] = useState(fromPasswordReset)
  // An email link's sign-in finishes before anything shows, so the sign-in screen never flashes first.
  const [landed, setLanded] = useState(emailLink === null)
  // Whose account the link signs in, and who is signed in here (null: no one): the cook is asked first.
  const [asking, setAsking] = useState<{ from: string | null; to: string; owner: string } | null>(null)
  // Why an email link that brought the cook here failed. Shown once, then
  // gone: it must not come back on the sign-in screen after a sign-out.
  const [linkProblem, setLinkProblem] = useState<string | null>(linkError)
  // A sign-out the server never heard (no signal): this phone is signed out,
  // but the session is still good elsewhere until it expires. Said on the
  // sign-in screen, which is where the cook lands.
  const [signOutProblem, setSignOutProblem] = useState<string | null>(null)
  // Whether the auth client signed this phone out since Sign out was tapped.
  // It does even when the server never hears it, unless the session could not
  // be loaded at all (no signal and an expired token): then nothing changed.
  const signedOut = useRef(false)
  // The stored session ran out and there was no signal to renew it. The cook
  // is still signed in, so the sign-in screen would be wrong: the app says
  // so, and opens by itself once a renewal gets through (TOKEN_REFRESHED).
  const [unrenewed, setUnrenewed] = useState(false)
  // The email link could not be checked or used for want of signal. Its
  // tokens are still good, and the address no longer has them, so the app
  // offers Try again rather than ask for another email.
  const [linkUnreachable, setLinkUnreachable] = useState<string | null>(null)

  // A link that did not sign anyone in leaves no password to set, and says why.
  function linkFailed(cause: Error) {
    if (cause instanceof LinkUnreachable) {
      setLinkUnreachable(cause.message)
      return
    }
    setSettingPassword(false)
    setLinkProblem(cause.message)
    setLanded(true)
  }

  function land(owner: string) {
    if (emailLink === null) throw new Error('No email link to sign in with')
    signInFromLink(emailLink, owner).then(() => setLanded(true), linkFailed)
  }

  function checkLink() {
    if (emailLink === null) throw new Error('No email link to check')
    // Who the link really signs in, checked by Supabase, against who is signed in here already.
    Promise.all([auth.getSession(), linkOwner(emailLink)])
      .then(([{ data, error }, owner]) => {
        // A stored session that could not be renewed for want of signal is someone signed in here,
        // not no one: until it can be read, the link must not replace it without asking.
        if (data.session === null && error !== null && isAuthRetryableFetchError(error)) {
          throw new LinkUnreachable(
            'No connection, so the app could not check who is signed in here. Check your signal, and try again in a minute.',
          )
        }
        const current = data.session?.user
        // Already signed in as the link's account (a reset asked for while signed in): nothing to ask.
        if (current?.id === owner.id) {
          land(owner.id)
          return
        }
        // Anyone can send a link carrying their own account, so the cook says whether to use it,
        // signed in here already or not.
        setAsking({
          from: current === undefined ? null : (emailOf(current.email) ?? 'another account'),
          to: owner.email ?? 'another account',
          owner: owner.id,
        })
      })
      .catch(linkFailed)
  }

  useEffect(() => {
    if (emailLink !== null) checkLink()
  }, [])

  // Whether a session that came back as none is really a stored one that could not be renewed.
  function settleSignedOut() {
    void auth.getSession().then(({ data, error }) => {
      setUnrenewed(data.session === null && error !== null && isAuthRetryableFetchError(error))
      setSession(data.session)
    })
  }

  useEffect(() => {
    // Fires once on subscribe with the stored session, then on every change.
    const { data } = auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT') {
        signedOut.current = true
        // Signed out for real (on another device, say): there is no sign-in left to renew.
        setUnrenewed(false)
      }
      if (next !== null) {
        setSignOutProblem(null)
        setUnrenewed(false)
      }
      // No session at the start can be one that ran out with no signal to renew it.
      if (next === null && event === 'INITIAL_SESSION') settleSignedOut()
      else setSession(next)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (asking !== null) {
    const { from, to, owner } = asking
    return (
      <UseLink
        from={from}
        to={to}
        onUse={() => {
          setAsking(null)
          land(owner)
        }}
        onDecline={() => {
          setAsking(null)
          setSettingPassword(false)
          setLanded(true)
        }}
      />
    )
  }
  if (linkUnreachable !== null) {
    return (
      <NoConnection
        message={linkUnreachable}
        onTryAgain={() => {
          setLinkUnreachable(null)
          checkLink()
        }}
      />
    )
  }
  if (session === undefined || !landed) return <Waiting text="Loading…" />
  if (session === null && unrenewed) {
    return (
      <NoConnection
        message="Your sign-in needs signal to renew. You are still signed in, and your checks are kept on this phone: the app opens by itself once your phone has signal."
        // The auth client will not ask again for a minute after a failed renewal; a fresh page asks at once.
        onTryAgain={() => window.location.reload()}
      />
    )
  }
  if (session === null) {
    return (
      <AuthScreen
        linkError={linkProblem}
        onLinkErrorShown={() => setLinkProblem(null)}
        signOutProblem={signOutProblem}
      />
    )
  }
  if (settingPassword) return <SetPasswordScreen email={session.user.email} onDone={() => setSettingPassword(false)} />
  return (
    <Kitchen
      key={session.user.id}
      userId={session.user.id}
      email={emailOf(session.user.email)}
      linkProblem={linkProblem}
      onLinkProblemSeen={() => setLinkProblem(null)}
      onSignOut={async () => {
        setSignOutProblem(null)
        signedOut.current = false
        // This phone only, as the screen says: another device stays signed in.
        const { error } = await auth.signOut({ scope: 'local' })
        if (error === null) return
        if (!signedOut.current) throw new Error(`Could not sign out: ${plainMessage(error)}`)
        const problem = 'Signed out on this phone, but the sign-out did not reach the server.'
        setSignOutProblem(problem)
        throw new Error(problem)
      }}
    />
  )
}

/** An account's email, or null for none: Supabase gives an account without one the empty string. */
function emailOf(email: string | undefined): string | null {
  return email === undefined || email === '' ? null : email
}

/**
 * An email link, before it signs anyone in. Anyone can send a link that
 * carries their own account: signed in with it, this cook's cooks would go
 * into that account, so the cook chooses. Signed in here already as someone
 * else, staying is the first choice; signed out, signing in is.
 */
function UseLink({ from, to, onUse, onDecline }: { from: string | null; to: string; onUse: () => void; onDecline: () => void }) {
  const question = from === null ? 'Sign in with this link?' : 'Switch accounts?'
  usePageTitle(question)
  const use = (
    <button className={from === null ? 'button' : 'button button-quiet'} type="button" onClick={onUse}>
      {from === null ? 'Sign in' : `Switch to ${to}`}
    </button>
  )
  return (
    <main className="page auth">
      <h1 className="wordmark">First Course</h1>
      <h2 className="section-title">{question}</h2>
      {from === null ? (
        <p>This email link signs in as {to}. If you did not ask for this email, do not use it.</p>
      ) : (
        <p>
          This email link signs in as {to}. You are signed in here as {from}. If you did not ask
          for this email, stay signed in.
        </p>
      )}
      <div className="actions">
        {from === null && use}
        <button className={from === null ? 'button button-quiet' : 'button'} type="button" onClick={onDecline}>
          {from === null ? 'Not now' : `Stay signed in as ${from}`}
        </button>
        {from !== null && use}
      </div>
    </main>
  )
}

/** Nothing could reach Supabase before the kitchen opened: why, and Try again. */
function NoConnection({ message, onTryAgain }: { message: string; onTryAgain: () => void }) {
  usePageTitle('No connection')
  return (
    <main className="page loading">
      <p className="wordmark">First Course</p>
      <h1 className="title">No connection</h1>
      <p className="notice notice-error" role="alert">
        {message}
      </p>
      <div className="actions">
        <button className="button" type="button" onClick={onTryAgain}>
          Try again
        </button>
      </div>
    </main>
  )
}

/**
 * While the app loads: its name and its plate, not a blank page. The
 * installed app opens on this every time, so it is the first thing a cook
 * sees. Still: nothing here moves.
 */
function Waiting({ text }: { text: string }) {
  // A wait past a few seconds is usually no signal: say so rather than leave a cook watching a plate.
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <main className="page loading">
      <p className="wordmark">First Course</p>
      <Plate state="ready" goodCooks={0} size={64} />
      <p className="status" role="status">
        {text}
        {slow && ' No answer yet. Your phone may have no signal.'}
      </p>
    </main>
  )
}

/** How long the loading screen waits before it says the phone may have no signal. */
const SLOW_AFTER_MS = 5000

/** Away from the app this long, and it loads everything again on return. */
const REFRESH_AFTER_MS = 10 * 60 * 1000

// Async, so a problem with what this phone keeps fails the load like any other read. Every load (the
// first, and each catch-up) also forgets the timers of cooks left long ago: an installed app can stay
// open for days, and an old cook's timers would count as started in the next cook of that recipe.
async function loadKitchen(userId: string) {
  forgetOldTimers(localStorage, userId, Date.now())
  const cart = loadCart(localStorage, userId)
  return Promise.all([fetchCookLogs(), fetchChef(), fetchShop(cart)])
}

function Kitchen({
  userId,
  email,
  linkProblem,
  onLinkProblemSeen,
  onSignOut,
}: {
  userId: string
  email: string | null
  /** An email link failed while a stored session kept the cook signed in. */
  linkProblem: string | null
  onLinkProblemSeen: () => void
  onSignOut: () => Promise<void>
}) {
  // The link problem is shown once, here, and the app forgets it, so a later sign-out does not bring it back.
  const [linkShown, setLinkShown] = useState(linkProblem)
  useEffect(() => {
    if (linkShown !== null) onLinkProblemSeen()
  }, [linkShown, onLinkProblemSeen])
  const [logs, setLogs] = useState<readonly CookLog[] | null>(null)
  // undefined = still loading; null = this account has not named a chef.
  const [chef, setChef] = useState<Chef | null | undefined>(undefined)
  const [shop, setShop] = useState<Shop | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Each "Try again" loads everything once more.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    loadKitchen(userId)
      .then(([loadedLogs, loadedChef, loadedShop]) => {
        setLogs(loadedLogs)
        setChef(loadedChef)
        setShop(loadedShop)
      })
      .catch((cause: Error) => setError(cause.message))
  }, [userId, attempt])

  // The cart is kept on this phone (lib/cart.ts): saved whenever it changes.
  const checks = shop?.checks
  const kitChecks = shop?.kitChecks
  const checkedFor = shop?.checkedFor
  const since = shop?.since
  useEffect(() => {
    if (checks !== undefined && kitChecks !== undefined && checkedFor !== undefined && since !== undefined) {
      saveCart(localStorage, userId, { checks, kitChecks, checkedFor, since })
    }
  }, [userId, checks, kitChecks, checkedFor, since])

  // Back after a while away, catch up with whatever another device did
  // meanwhile. An installed app is never reloaded, so this is how it learns.
  // A failed catch-up keeps what is on screen and says so; it does not
  // replace the screen, so a cook in the middle of a recipe keeps cooking.
  const [refreshes, setRefreshes] = useState(0)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  // Writes that have landed. A catch-up that was out while one landed may have
  // read the database before it did, so it reads again rather than put older
  // data on screen over the write.
  const writes = useRef(0)
  useEffect(() => {
    let hiddenAt: number | null = null
    function onVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      if (hiddenAt === null) return
      const away = Date.now() - hiddenAt
      hiddenAt = null
      if (away < REFRESH_AFTER_MS) return
      setRefreshError(null)
      setRefreshes((count) => count + 1)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  useEffect(() => {
    if (refreshes === 0) return
    // A newer catch-up (Try again, or another return) replaces this one.
    let current = true
    const writesBefore = writes.current
    loadKitchen(userId)
      .then(([loadedLogs, loadedChef, loadedShop]) => {
        if (!current) return
        if (writes.current !== writesBefore) {
          setRefreshes((count) => count + 1)
          return
        }
        setLogs(loadedLogs)
        setChef(loadedChef)
        setShop(loadedShop)
      })
      .catch((cause: Error) => {
        if (current) setRefreshError(cause.message)
      })
    return () => {
      current = false
    }
  }, [userId, refreshes])

  if (error !== null) {
    return (
      <main className="page loading">
        <p className="wordmark">First Course</p>
        <h1 className="title">Could not load your kitchen</h1>
        <p className="notice notice-error" role="alert">
          {error}
        </p>
        <div className="actions">
          <button
            className="button"
            type="button"
            onClick={() => {
              setError(null)
              setAttempt(attempt + 1)
            }}
          >
            Try again
          </button>
        </div>
      </main>
    )
  }
  if (logs === null || chef === undefined || shop === null) return <Waiting text="Loading your kitchen…" />
  // Creating the chef is a write like any other: a catch-up that was out meanwhile reads again.
  function chefSaved(saved: Chef) {
    writes.current += 1
    setChef(saved)
  }
  if (chef === null) return <NameChefScreen onCreated={chefSaved} />

  // Every write's change applies to the latest state, never to what a screen
  // drew from, so two writes that land close together both stay. The cart
  // settles to whatever list the change leaves (settleCart in lib/cart.ts).
  const changeShop: ShopChange = (change) => {
    writes.current += 1
    setShop((previous) => {
      if (previous === null) throw new Error('The shop changed before it loaded')
      return settleCart(change(previous))
    })
  }
  function changeLogs(change: (logs: readonly CookLog[]) => readonly CookLog[]) {
    writes.current += 1
    setLogs((previous) => {
      if (previous === null) throw new Error('The cook log changed before it loaded')
      // A new, frozen array every time: progress is kept per log array (progress.ts).
      return Object.freeze(change(previous))
    })
  }

  const kitchen: Kitchen = {
    userId,
    email,
    chef,
    logs,
    shop,
    onShopChange: changeShop,
    onChefSaved: chefSaved,
    onLogged: (log) => {
      // A save retried after a lost answer can find its cook already here, brought in by a catch-up.
      changeLogs((previous) =>
        previous.some((other) => other.id === log.id)
          ? previous.map((other) => (other.id === log.id ? log : other))
          : [...previous, log],
      )
      // Saving the cook took its recipe off the plan in the database (00006).
      changeShop((previous) => withoutPlanned(previous, log.recipeId))
    },
    onLogUpdated: (log) => changeLogs((previous) => previous.map((other) => (other.id === log.id ? log : other))),
    onLogDeleted: (id) => changeLogs((previous) => previous.filter((other) => other.id !== id)),
    onSignOut,
  }

  return (
    <HashRouter>
      {linkShown !== null && (
        <div className="page page-alert">
          <p className="notice notice-error" role="alert">
            {linkShown} You are still signed in.
          </p>
          <button className="link-button" type="button" onClick={() => setLinkShown(null)}>
            Hide this
          </button>
        </div>
      )}
      {refreshError !== null && (
        <div className="page page-alert">
          <p className="notice notice-error" role="alert">
            Could not catch up with your other devices: {refreshError}
          </p>
          <button
            className="link-button"
            type="button"
            onClick={() => {
              setRefreshError(null)
              setRefreshes(refreshes + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}
      <KitchenContext value={kitchen}>
        <Pages />
      </KitchenContext>
    </HashRouter>
  )
}

/** The screens, by route. Each reads the kitchen it needs (kitchen.ts); the after-cook notice is kept here. */
function Pages() {
  const location = useLocation()
  const { pathname } = location
  const backToMenu = pathname === '/' && (location.state as { back?: unknown } | null)?.back === true
  const navigationType = useNavigationType()
  const [notice, setNotice] = useState<CookNotice | null>(null)

  // A new page opens at the top, with focus on its heading so a screen reader
  // starts there. Back and forward keep the browser's own position. A screen
  // that already placed focus keeps it: the link that was tapped is still
  // there (Next step in cook mode), or a full-screen moment took it.
  useEffect(() => {
    // A focus target named on the screen just left must not pull focus here.
    clearFocusTarget()
    if (navigationType === 'POP') return
    window.scrollTo(0, backToMenu ? menuScrollPosition() : 0)
    if (document.activeElement !== null && document.activeElement !== document.body) return
    const heading = document.querySelector<HTMLElement>('main h1')
    if (heading === null) throw new Error(`The page at ${pathname} has no heading`)
    heading.tabIndex = -1
    heading.focus({ preventScroll: true })
  }, [pathname, navigationType, backToMenu])

  // The after-cook notice is shown once. It goes when you leave the menu.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (pathname !== '/') setNotice(null)
  }

  return (
    <Routes>
      <Route path="/" element={<MenuScreen notice={notice} />} />
      <Route path="/chef" element={<ChefScreen />} />
      <Route path="/chef/edit" element={<EditChefScreen />} />
      <Route path="/recipe/:id" element={<RecipeScreen />} />
      <Route path="/cook/:id/log" element={<LogScreen onNotice={setNotice} />} />
      <Route path="/cook/:id/:step" element={<CookScreen />} />
      <Route path="/cook-log/:id" element={<EditCookScreen />} />
      <Route path="/shop" element={<ShopScreen />} />
      <Route path="/pantry" element={<PantryScreen />} />
      <Route path="/kit" element={<KitScreen />} />
      <Route path="/spices" element={<SpicesScreen />} />
      <Route path="*" element={<NotOnTheMenu />} />
    </Routes>
  )
}

function NotOnTheMenu(): never {
  throw new Error('That page is not on the menu.')
}
