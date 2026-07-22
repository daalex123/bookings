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
import {
  Calendar,
  Clock,
  Users,
  Bell,
  Sparkles,
  Shield,
  Zap,
  TrendingUp,
} from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="relative bg-zinc-950">
      {/* Hero Section with Gradient */}
      <section className="relative overflow-hidden bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 pb-16 pt-12 sm:pb-24 sm:pt-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-size-[14px_24px]" />
        <div className="absolute left-0 right-0 top-0 h-px bg-linear-to-r from-transparent via-zinc-700 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/60 px-4 py-1.5 text-sm font-medium text-zinc-300 shadow-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-zinc-400" />
              <span>Simple, powerful appointment booking</span>
            </div>

            <h1 className="bg-linear-to-br from-white via-zinc-200 to-zinc-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl">
              Book appointments,
              <br />
              <span className="bg-linear-to-r from-white to-zinc-300 bg-clip-text">
                effortlessly
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
              Customers book through your business&apos;s private link. Business
              owners manage services and appointments from one unified dashboard.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              {user ? (
                <>
                  <Link href="/my-appointments">
                    <Button size="lg" className="group min-w-45 shadow-lg shadow-zinc-900/10 transition-all hover:shadow-xl hover:shadow-zinc-900/20">
                      My appointments
                      <Calendar className="ml-2 h-4 w-4 transition-transform group-hover:scale-110" />
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button size="lg" variant="outline" className="min-w-45 border-zinc-700 bg-zinc-800/50 text-zinc-200 backdrop-blur-sm hover:bg-zinc-800 hover:border-zinc-600">
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="group min-w-45 shadow-lg shadow-zinc-900/10 transition-all hover:shadow-xl hover:shadow-zinc-900/20">
                      Get started
                      <Zap className="ml-2 h-4 w-4 transition-transform group-hover:scale-110" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="min-w-45 border-zinc-700 bg-zinc-800/50 text-zinc-200 backdrop-blur-sm hover:bg-zinc-800 hover:border-zinc-600">
                      Sign in
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Secure & private</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Setup in minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-zinc-950 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
              Everything you need to manage bookings
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              A complete solution for businesses of all sizes
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="group relative overflow-hidden border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-blue-500/20 opacity-50 blur-2xl transition-all group-hover:scale-150" />
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <Calendar className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-zinc-100">Smart Scheduling</CardTitle>
                <CardDescription>
                  Automatic time slot management with conflict detection and timezone support
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group relative overflow-hidden border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-purple-500/10">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-purple-500/20 opacity-50 blur-2xl transition-all group-hover:scale-150" />
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                  <Bell className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-zinc-100">Multi-channel Alerts</CardTitle>
                <CardDescription>
                  Email, SMS, and WhatsApp notifications keep everyone informed in real-time
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group relative overflow-hidden border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/20 opacity-50 blur-2xl transition-all group-hover:scale-150" />
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-zinc-100">Team Management</CardTitle>
                <CardDescription>
                  Add staff members, assign services, and track performance from one dashboard
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group relative overflow-hidden border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-zinc-700 hover:shadow-lg hover:shadow-orange-500/10">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-orange-500/20 opacity-50 blur-2xl transition-all group-hover:scale-150" />
              <CardHeader>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl text-zinc-100">Revenue Insights</CardTitle>
                <CardDescription>
                  Track income by service, staff, and time period with detailed analytics
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-zinc-900 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* For Customers */}
            <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur-sm shadow-lg shadow-black/20">
              <CardHeader className="space-y-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30">
                  <Clock className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl text-zinc-100">For Customers</CardTitle>
                <CardDescription className="text-base text-zinc-400">
                  Use the booking link shared by your business — each business has its
                  own private URL. There is no public directory of all businesses.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-400">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">Receive booking link</p>
                    <p className="text-sm text-zinc-500">Get a secure, private link from your service provider</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-400">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">Choose your service</p>
                    <p className="text-sm text-zinc-500">Browse available services and select your preferred time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-400">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">Get confirmed</p>
                    <p className="text-sm text-zinc-500">Receive instant confirmation via email, SMS, or WhatsApp</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* For Business Owners */}
            <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur-sm shadow-lg shadow-black/20">
              <CardHeader className="space-y-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30">
                  <Users className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl text-zinc-100">For Business Owners</CardTitle>
                <CardDescription className="text-base text-zinc-400">
                  Create your business in the{" "}
                  <Link href="/dashboard" className="font-medium text-zinc-200 underline underline-offset-2 hover:text-zinc-100">
                    dashboard
                  </Link>
                  , then copy your secure booking link from Settings and share it
                  with customers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-400">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">Create your business</p>
                    <p className="text-sm text-zinc-500">Set up your brand, services, and operating hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-400">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">Share your link</p>
                    <p className="text-sm text-zinc-500">Get your unique booking URL and share it with customers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-400">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200">Manage everything</p>
                    <p className="text-sm text-zinc-500">Track appointments, staff, and revenue from one place</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="relative overflow-hidden bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900 py-16 sm:py-24">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-size-[24px_24px]" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Ready to streamline your bookings?
            </h2>
            <p className="mt-4 text-lg text-zinc-300 sm:text-xl">
              Join hundreds of businesses managing appointments effortlessly
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="group min-w-50 bg-white text-zinc-900 shadow-xl hover:bg-zinc-100">
                  Get started for free
                  <Sparkles className="ml-2 h-4 w-4 transition-transform group-hover:rotate-12 group-hover:scale-110" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="min-w-50 border-zinc-600 bg-transparent text-white hover:bg-zinc-800 hover:text-white">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
