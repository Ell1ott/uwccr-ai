import { LoginForm } from "./LoginForm";

export function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface text-on-surface">
      <header className="px-container-padding-mobile pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-4 md:px-container-padding-desktop">
        <div className="mx-auto w-full max-w-md">
          <p className="text-label-sm tracking-[0.14em] text-on-surface-variant uppercase">
            UWC Costa Rica
          </p>
          <h1 className="mt-1 text-headline-lg-mobile tracking-tight md:text-headline-lg">
            Am I fucked?
          </h1>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-container-padding-mobile pb-safe md:px-0">
        <div className="rounded-[28px] bg-surface-container-lowest p-6 shadow-[0_8px_32px_rgba(4,22,39,0.06)]">
          <LoginForm />
        </div>
        <p className="mt-6 px-1 pb-8 text-time-stamp font-normal text-on-surface-variant">
          Grounded in the 2026–2027 student & family handbook. Not official
          advice.
        </p>
      </main>
    </div>
  );
}
