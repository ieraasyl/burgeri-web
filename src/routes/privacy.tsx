import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-primary">Legal</p>
      <h1 className="mt-3 font-heading text-3xl font-semibold">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: June 17, 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            What We Collect
          </h2>
          <p className="mt-2">
            Mentoria Hub collects the information needed to provide student
            opportunity and course features, such as your name, email address,
            account login details, saved opportunities, and course progress. If
            you sign in with Google, we use your Google account only to
            authenticate you and identify your account.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            How We Use Information
          </h2>
          <p className="mt-2">
            We use your information to create and secure your account, show
            relevant opportunities and courses, save your preferences, maintain
            the service, and communicate essential account information. We do
            not sell your personal information.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Sharing
          </h2>
          <p className="mt-2">
            We share information only with service providers needed to operate
            Mentoria Hub, when required by law, or with your consent. Google
            user data is not shared for advertising purposes.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Data Retention and Security
          </h2>
          <p className="mt-2">
            We keep account information while your account is active or as
            needed to provide the service. We use reasonable technical and
            organizational safeguards to protect user data.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Your Choices
          </h2>
          <p className="mt-2">
            You may request access, correction, or deletion of your account data
            by contacting us at{" "}
            <a
              href="mailto:contact@example.com"
              className="font-medium text-primary hover:underline"
            >
              contact@example.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Contact
          </h2>
          <p className="mt-2">
            For questions about this policy, contact Mentoria Hub at{" "}
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
