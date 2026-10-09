import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Anything thrown while rendering lands here, on screen, with its message.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch() {
    document.title = 'Something broke · First Course'
  }

  render() {
    if (this.state.error === null) return this.props.children
    return (
      <main className="page">
        <h1 className="title">Something broke</h1>
        <p className="notice notice-error" role="alert">
          {this.state.error.message}
        </p>
        <p className="section-note">Your saved cooks and lists are safe.</p>
        <div className="actions">
          <a className="button" href={import.meta.env.BASE_URL}>
            Back to the menu
          </a>
        </div>
      </main>
    )
  }
}

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing #root')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
