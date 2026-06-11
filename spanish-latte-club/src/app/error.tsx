"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="max-w-sm rounded-lg border bg-card p-6 text-center club-shadow">
        <h1 className="text-xl font-semibold">The tasting table slipped.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while loading the club.
        </p>
        <Button className="mt-5" onClick={reset}>
          Try again
        </Button>
      </section>
    </main>
  );
}
