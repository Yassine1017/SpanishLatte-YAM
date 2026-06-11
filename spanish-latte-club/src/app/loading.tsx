import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-[620px] rounded-lg" />
          <Skeleton className="h-[620px] rounded-lg" />
        </div>
      </div>
    </main>
  );
}
