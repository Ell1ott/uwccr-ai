import { useAuth } from "../lib/auth";
import { initials } from "../lib/errors";

export function AccountPanel() {
  const auth = useAuth();
  const email = auth.session?.user.email ?? null;

  return (
    <div className="flex flex-col gap-3">
      <section className="overflow-hidden rounded-[18px] bg-surface-container-low">
        <div className="flex items-center gap-3 px-3 py-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[13px] font-semibold tracking-wide text-on-secondary-container">
            {auth.displayName ? initials(auth.displayName) : "?"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-md font-medium text-on-surface">
              {auth.displayName}
            </span>
            <span className="block truncate text-label-sm tracking-wide text-on-surface-variant">
              {["Student", email].filter(Boolean).join(" · ")}
            </span>
          </span>
        </div>
      </section>
      <button
        type="button"
        className="flex h-12 items-center justify-center rounded-[18px] bg-surface-container-low px-4 text-label-sm tracking-wide text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        onClick={() => void auth.signOut()}
      >
        Sign out
      </button>
    </div>
  );
}
