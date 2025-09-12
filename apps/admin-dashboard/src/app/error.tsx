'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <h2>Something went wrong</h2>
        <p style={{ color: '#666' }}>{error?.message || 'An unexpected error occurred.'}</p>
        <button onClick={() => reset()} style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          borderRadius: 8,
          border: '1px solid #ddd'
        }}>Try again</button>
      </div>
    </div>
  )
}