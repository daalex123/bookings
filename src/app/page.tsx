import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-8">
      <section className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Book appointments, effortlessly
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-zinc-600">
          Customers book through your business&apos;s private link. Business
          owners manage services and appointments from one dashboard.
        </p>
        <div className="flex justify-center gap-3">
          {user ? (
            <>
              <Link href="/my-appointments">
                <Button size="lg">My appointments</Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline">
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/register">
                <Button size="lg">Get started</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign in
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>For customers</CardTitle>
          <CardDescription>
            Use the booking link shared by your business — each business has its
            own private URL. There is no public directory of all businesses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600">
            For business owners: create your business in the{" "}
            <Link href="/dashboard" className="underline">
              dashboard
            </Link>
            , then copy your secure booking link from Settings and share it
            with customers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
