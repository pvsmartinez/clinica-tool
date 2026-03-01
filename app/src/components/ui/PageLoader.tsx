/** Full-page loading fallback used by all Suspense boundaries. */
export function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <span className="text-gray-400 text-sm">Carregando...</span>
    </div>
  )
}

/** Full-screen variant — used before the layout shell is mounted (auth loading). */
export function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <span className="text-gray-400 text-sm">Carregando...</span>
    </div>
  )
}
