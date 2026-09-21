import { Activity, CheckCircle2, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const EXAMPLE_ENV = `# .env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
VITE_ENABLE_SENSOR_SIMULATOR=true`

const STEPS = [
  {
    title: 'Create a Firebase project',
    body: 'console.firebase.google.com → Add project. Enable Authentication (Email/Password), Firestore, and Storage.',
  },
  {
    title: 'Register a web app',
    body: 'Project Settings → General → Your apps → Add web app. Copy the SDK config values into a .env file (see below).',
  },
  {
    title: 'Deploy the security rules & functions',
    body: 'Run `npm run deploy:rules` then `npm run deploy:functions` from this project to enforce RBAC and enable the AI + IoT backend.',
  },
  {
    title: 'Restart the dev server',
    body: '`npm run dev` after saving .env. This screen disappears and the auth page appears.',
  },
]

export function SetupPage() {
  return (
    <div className="min-h-screen bg-background p-6 sm:p-10">
      <div className="mx-auto max-w-3xl animate-fade-in">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500">
            <Activity className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Firebase isn't configured yet</h1>
            <p className="text-sm text-muted-foreground">
              NextGen CMMS runs on Firebase. Wire up a project to unlock the full experience.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="sm:odd:col-span-2">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {i + 1}
                </div>
                <CardTitle className="text-sm">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="leading-relaxed">{step.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-4">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <Code2 className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm">Your .env file</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 font-mono text-xs leading-relaxed text-foreground scrollbar-slim">
              {EXAMPLE_ENV}
            </pre>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-success" />
                Copy to repo root as `.env`
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-success" />
                Never commit `.env`
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Full instructions live in the project README.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reload after configuring
          </Button>
        </div>
      </div>
    </div>
  )
}