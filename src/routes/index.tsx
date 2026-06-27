import {
  IconArrowRight,
  IconCamera,
  IconCircleCheck,
  IconCloudUpload,
} from "@tabler/icons-react"
import { Link, createFileRoute } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  return (
    <>
      <section className="flex flex-1 items-center border-b">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_30rem] lg:px-8 lg:py-24">
          <div className="flex max-w-3xl flex-col justify-center">
            <p className="text-sm font-medium text-primary">
              Burgeri write-off control
            </p>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-normal text-balance sm:text-5xl lg:text-6xl">
              Approve every loss, then push it straight to iiko.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Restaurant staff photograph a write-off from their phone.
              Reviewers verify the evidence in one queue, approve valid losses,
              and the act is created in iiko — with full history and analytics
              for accounting.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/review/write-offs"
                className={buttonVariants({ size: "lg" })}
              >
                Open reviewer queue
                <IconArrowRight data-icon="inline-end" />
              </Link>
              <Link
                to="/write-offs"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Submit a write-off
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              A dedicated employee mobile app is on the way.
            </p>
          </div>

          <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
            <p className="text-sm font-medium">A clean three-step check-in</p>
            <div className="mt-6 grid gap-5">
              <Step
                icon={<IconCamera />}
                number="01"
                title="Photograph"
                text="Capture the damaged or unusable product at the restaurant."
              />
              <Step
                icon={<IconCloudUpload />}
                number="02"
                title="Submit"
                text="Choose the location and deduction type, then explain what happened."
              />
              <Step
                icon={<IconCircleCheck />}
                number="03"
                title="Review"
                text="A responsible employee approves or rejects the record with a full audit trail."
              />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function Step({
  icon,
  number,
  title,
  text,
}: {
  icon: React.ReactNode
  number: string
  title: string
  text: string
}) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr] gap-4">
      <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading font-semibold">{title}</h2>
          <span className="text-xs font-medium text-muted-foreground">
            {number}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}
