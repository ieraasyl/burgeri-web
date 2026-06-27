import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/terms")({
  component: TermsPage,
})

function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-primary">Legal</p>
      <h1 className="mt-3 font-heading text-3xl font-semibold">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: June 17, 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Acceptance
          </h2>
          <p className="mt-2">
            By using Burgeri Ops, you agree to these Terms of Service. If you do
            not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Service
          </h2>
          <p className="mt-2">
            Burgeri Ops lets restaurant staff submit product write-off requests
            with photo evidence and lets reviewers approve or reject them and
            sync approved acts to iiko. The service is for internal restaurant
            operations and may change over time.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Accounts
          </h2>
          <p className="mt-2">
            You are responsible for keeping your account secure and for activity
            under your account. You agree to provide accurate information and to
            use the service lawfully.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Acceptable Use
          </h2>
          <p className="mt-2">
            You may not misuse the service, attempt to disrupt it, access data
            without permission, submit false write-offs, or use Burgeri Ops for
            unlawful or harmful activity.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            No Guarantee
          </h2>
          <p className="mt-2">
            We try to keep write-off records and iiko synchronization accurate
            and current, but we do not guarantee uninterrupted service or that
            every record reaches iiko without delay.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Changes
          </h2>
          <p className="mt-2">
            We may update these terms as the service changes. Continued use of
            Burgeri Ops after an update means you accept the revised terms.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Contact
          </h2>
          <p className="mt-2">
            Questions about these terms can be sent to{" "}
            <a
              href="mailto:contact@example.com"
              className="font-medium text-primary hover:underline"
            >
              contact@example.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
