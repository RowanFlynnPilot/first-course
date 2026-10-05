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
import { fromPasswordReset, linkError, supabase } from './supabase'

export default function App() {
  // undefined = still asking Supabase; null = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  // A password reset link signs the cook in, and the new password comes before anything else.
  const [settingPassword, setSettingPassword] = useState(fromPasswordReset)

  useEffect(() => {
    // Fires once on subscribe with the stored session, then on every change.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      // A reset link that did not sign anyone in leaves nothing to set.
      if (next === null) setSettingPassword(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p className="status">Loading…</p>
  if (session === null) return <AuthScreen linkError={linkError} />
  if (settingPassword) return <SetPasswordScreen email={session.user.email} onDone={() => setSettingPassword(false)} />
  return <Kitchen key={session.user.id} userId={session.user.id} />
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
    Promise.all([fetchCookLogs(), fetchChef(), fetchShop()])
      .then(([loadedLogs, loadedChef, loadedShop]) => {
        setLogs(loadedLogs)
        setChef(loadedChef)
        setShop(loadedShop)
      })
      .catch((cause: Error) => setError(cause.message))
  }, [attempt])

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
      <Route path="/" element={<MenuScreen chef={chef} logs={logs} shop={shop} notice={notice} />} />
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
