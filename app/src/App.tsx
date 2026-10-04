import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useLocation, useNavigationType } from 'react-router'
import { fetchChef, type Chef } from './lib/chefs'
import { fetchCookLogs } from './lib/cookLogs'
import type { CookNotice } from './lib/notice'
import type { CookLog } from './lib/progress'
import { AuthScreen } from './screens/AuthScreen'
import { ChefScreen } from './screens/ChefScreen'
import { CookScreen } from './screens/CookScreen'
import { EditChefScreen } from './screens/EditChefScreen'
import { LogScreen } from './screens/LogScreen'
import { MenuScreen } from './screens/MenuScreen'
import { NameChefScreen } from './screens/NameChefScreen'
import { RecipeScreen } from './screens/RecipeScreen'
import { supabase } from './supabase'

export default function App() {
  // undefined = still asking Supabase; null = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // Fires once on subscribe with the stored session, then on every change.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p className="status">Loading…</p>
  if (session === null) return <AuthScreen />
  return <Kitchen key={session.user.id} userId={session.user.id} />
}

function Kitchen({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<readonly CookLog[] | null>(null)
  // undefined = still loading; null = this account has not named a chef.
  const [chef, setChef] = useState<Chef | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchCookLogs(), fetchChef()])
      .then(([loadedLogs, loadedChef]) => {
        setLogs(loadedLogs)
        setChef(loadedChef)
      })
      .catch((cause: Error) => setError(cause.message))
  }, [])

  if (error !== null) {
    return (
      <p className="status notice-error" role="alert">
        {error}
      </p>
    )
  }
  if (logs === null || chef === undefined) return <p className="status">Loading your kitchen…</p>
  if (chef === null) return <NameChefScreen onCreated={setChef} />

  return (
    <HashRouter>
      <Pages
        userId={userId}
        chef={chef}
        logs={logs}
        onLogged={(log) => setLogs([...logs, log])}
        onChefSaved={setChef}
      />
    </HashRouter>
  )
}

function Pages({
  userId,
  chef,
  logs,
  onLogged,
  onChefSaved,
}: {
  userId: string
  chef: Chef
  logs: readonly CookLog[]
  onLogged: (log: CookLog) => void
  onChefSaved: (chef: Chef) => void
}) {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const [notice, setNotice] = useState<CookNotice | null>(null)

  // A new page opens at the top. Back and forward keep the browser's own position.
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])

  // The after-cook notice is shown once. It goes when you leave the menu.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    if (pathname !== '/') setNotice(null)
  }

  return (
    <Routes>
      <Route path="/" element={<MenuScreen chef={chef} logs={logs} notice={notice} />} />
      <Route path="/chef" element={<ChefScreen chef={chef} logs={logs} />} />
      <Route
        path="/chef/edit"
        element={<EditChefScreen userId={userId} chef={chef} logs={logs} onSaved={onChefSaved} />}
      />
      <Route path="/recipe/:id" element={<RecipeScreen logs={logs} />} />
      <Route
        path="/cook/:id/log"
        element={
          <LogScreen
            chef={chef}
            logs={logs}
            onLogged={(log, earned) => {
              onLogged(log)
              setNotice(earned)
            }}
          />
        }
      />
      <Route path="/cook/:id/:step" element={<CookScreen logs={logs} />} />
      <Route path="*" element={<NotOnTheMenu />} />
    </Routes>
  )
}

function NotOnTheMenu(): never {
  throw new Error('That page is not on the menu.')
}
