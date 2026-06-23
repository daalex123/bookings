import Link from "next/link";
import { signIn } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirect?: string;
    registered?: string;
    confirmEmail?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const registerHref = params.redirect
    ? `/register?redirect=${encodeURIComponent(params.redirect)}`
    : "/register";

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Access your appointments and business dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error && (
            <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
              {params.error}
            </p>
          )}
          {params.confirmEmail && (
            <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Check your email to confirm your account, then sign in here.
            </p>
          )}
          {params.registered && !params.error && (
            <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
              Account created. Please sign in.
            </p>
          )}
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="redirect" value={params.redirect || "/"} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-500">
            No account?{" "}
            <Link href={registerHref} className="text-zinc-900 underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
