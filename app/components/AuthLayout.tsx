export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-center bg-surface px-12 lg:flex">
        <div className="max-w-sm">
          <h2 className="text-2xl font-bold text-foreground">Govlytics</h2>
          <p className="mt-4 text-lg text-foreground">
            Win more federal contracts with AI-powered strategy reports.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted">
            <li>Instant win probability scoring</li>
            <li>Tailored to your firm's certifications and capabilities</li>
            <li>Teaming and positioning guidance for every opportunity</li>
          </ul>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background px-4 lg:w-1/2">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            {children}
          </div>

          <p className="text-center text-sm text-muted">{footer}</p>
        </div>
      </div>
    </div>
  )
}