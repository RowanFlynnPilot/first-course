import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useLocation, useNavigationType } from 'react-router'
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
import { fromPasswordReset, landingSignIn, linkError, supabase } from './supabase'

export default function App() {
  // undefined = still asking Supabase; null = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  // A password reset link signs the cook in, and the new password comes before anything else.
  const [settingPassword, setSettingPassword] = useState(fromPasswordReset)
  // An email link's sign-in finishes before anything shows, so the sign-in screen never flashes first.
  const [landed, setLanded] = useState(landingSignIn === null)
  const [landingError, setLandingError] = useState<string | null>(null)

  useEffect(() => {
    if (landingSignIn === null) return
    landingSignIn.then(
      () => setLanded(true),
      (cause: Error) => {
        // A reset link that did not sign anyone in leaves no password to set.
        setSettingPassword(false)
        setLandingError(cause.message)
        setLanded(true)
      },
    )
  }, [])

  useEffect(() => {
    // Fires once on subscribe with the stored session, then on every change.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined || !landed) return <p className="status">Loading…</p>
  if (session === null) return <AuthScreen linkError={landingError ?? linkError} />
  if (settingPassword) return <SetPasswordScreen email={session.user.email} onDone={() => setSettingPassword(false)} />
  return <Kitchen key={session.user.id} userId={session.user.id} />
}

/** Away from the app this long, and it loads everything again on return. */
const REFRESH_AFTER_MS = 10 * 60 * 1000

function loadKitchen() {
  return Promise.all([fetchCookLogs(), fetchChef(), fetchShop()])
}

function Kitchen({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<readonly CookLog[] | null>(null)
  // undefined = still loading; null = this account has not named a chef.
  const [chef, setChef] = useState<Chef | null | undefined>(undefined)
  const [shop, setShop] = useState<Shop | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Each "Try again" loads everything once more.
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    loadKitchen()
      .then(([loadedLogs, loadedChef, loadedShop]) => {
        setLogs(loadedLogs)
        setChef(loadedChef)
        setShop(loadedShop)
      })
      .catch((cause: Error) => setError(cause.message))
  }, [attempt])

  // Back after a while away, catch up with whatever another device did
  // meanwhile. An installed app is never reloaded, so this is how it learns.
  // A failed catch-up keeps what is on screen and says so; it does not
  // replace the screen, so a cook in the middle of a recipe keeps cooking.
  const [refreshes, setRefreshes] = useState(0)
  const [refreshError, setRefreshError] = useState<string | null>(null)
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
    loadKitchen()
      .then(([loadedLogs, loadedChef, loadedShop]) => {
        setLogs(loadedLogs)
        setChef(loadedChef)
        setShop(loadedShop)
      })
      .catch((cause: Error) => setRefreshError(cause.message))
  }, [refreshes])

  if (error !== null) {
    return (
      <main className="page">
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
  if (logs === null || chef === undefined || shop === null) return <p className="status">Loading your kitchen…</p>
  if (chef === null) return <NameChefScreen onCreated={setChef} />

  const changeShop: ShopChange = (change) =>
    setShop((previous) => {
      if (previous === null) throw new Error('The shop changed before it loaded')
      return change(previous)
    })

  return (
    <HashRouter>
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
      <Pages
        userId={userId}
        chef={chef}
        logs={logs}
        shop={shop}
        onLogged={(log) => {
          setLogs([...logs, log])
          // Saving the cook took its recipe off the plan in the database (00006).
          changeShop((previous) => withoutPlanned(previous, log.recipeId))
        }}
        onLogUpdated={(log) => setLogs(logs.map((other) => (other.id === log.id ? log : other)))}
        onLogDeleted={(id) => setLogs(logs.filter((other) => other.id !== id))}
        onChefSaved={setChef}
        onShopChange={changeShop}
      />
    </HashRouter>
  )
}

function Pages({
  userId,
  chef,
  logs,
  shop,
  onLogged,
  onLogUpdated,
  onLogDeleted,
  onChefSaved,
  onShopChange,
}: {
  userId: string
  chef: Chef
  logs: readonly CookLog[]
  shop: Shop
  onLogged: (log: CookLog) => void
  onLogUpdated: (log: CookLog) => void
  onLogDeleted: (id: string) => void
  onChefSaved: (chef: Chef) => void
  onShopChange: ShopChange
}) {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const [notice, setNotice] = useState<CookNotice | null>(null)

  // A new page opens at the top, with focus on its heading so a screen reader
  // starts there. Back and forward keep the browser's own position. A screen
  // that already placed focus keeps it: the link that was tapped is still
  // there (Next step in cook mode), or a full-screen moment took it.
  useEffect(() => {
    if (navigationType === 'POP') return
    window.scrollTo(0, 0)
    if (document.activeElement !== null && document.activeElement !== document.body) return
    const heading = document.querySelector<HTMLElement>('main h1')
    if (heading === null) throw new Error(`The page at ${pathname} has no heading`)
    heading.tabIndex = -1
    heading.focus({ preventScroll: true })
  }, [pathname, navigationType])

  // The after-cook notice is shown once. It goes when you leave the menu.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (pathname !== '/') setNotice(null)
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MenuScreen
            userId={userId}
            chef={chef}
            logs={logs}
            shop={shop}
            notice={notice}
            onChefSaved={onChefSaved}
            onShopChange={onShopChange}
          />
        }
      />
      <Route path="/chef" element={<ChefScreen chef={chef} logs={logs} prices={shop.prices} />} />
      <Route
        path="/chef/edit"
        element={<EditChefScreen userId={userId} chef={chef} logs={logs} onSaved={onChefSaved} />}
      />
      <Route path="/recipe/:id" element={<RecipeScreen logs={logs} shop={shop} onShopChange={onShopChange} />} />
      <Route
        path="/cook/:id/log"
        element={
          <LogScreen
            chef={chef}
            logs={logs}
            prices={shop.prices}
            onLogged={(log, earned) => {
              onLogged(log)
              setNotice(earned)
            }}
          />
        }
      />
      <Route path="/cook/:id/:step" element={<CookScreen logs={logs} kit={shop.kit} />} />
      <Route
        path="/cook-log/:id"
        element={<EditCookScreen logs={logs} plan={shop.plan} onUpdated={onLogUpdated} onDeleted={onLogDeleted} />}
      />
      <Route path="/shop" element={<ShopScreen shop={shop} logs={logs} onShopChange={onShopChange} />} />
      <Route path="/pantry" element={<PantryScreen shop={shop} onShopChange={onShopChange} />} />
      <Route path="/kit" element={<KitScreen shop={shop} onShopChange={onShopChange} />} />
      <Route path="/spices" element={<SpicesScreen shop={shop} />} />
      <Route path="*" element={<NotOnTheMenu />} />
    </Routes>
  )
}

function NotOnTheMenu(): never {
  throw new Error('That page is not on the menu.')
}
