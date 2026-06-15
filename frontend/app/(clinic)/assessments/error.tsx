'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <h2 className="mt-6 text-xl font-semibold">Assessment Error</h2>
        <p className="mb-8 mt-2 text-center text-sm font-normal leading-6 text-muted-foreground">
          There was a problem loading this assessment module. This failure has been isolated to prevent affecting the rest of the application.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
