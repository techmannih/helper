import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted text-foreground">
      <h2 className="mb-4 text-4xl font-bold">Page not found</h2>
      <p className="mb-6 text-lg">The thing you were looking for doesn&apos;t exist.</p>
      <Link href="/">
        <span className="text-blue-500 underline hover:text-blue-700">Go home?</span>
      </Link>
    </div>
  );
}
