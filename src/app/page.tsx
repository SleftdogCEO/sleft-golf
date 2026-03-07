import Link from 'next/link'
import { Activity, ShoppingBag, Users, Camera, Trophy, MapPin } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#9971;</span>
            <span className="text-xl font-bold text-white">Sleft Golf</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full px-5 py-2 text-sm font-semibold text-emerald-200 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 transition-colors">
              Sign up
            </Link>
          </div>
        </nav>

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Golf is better{' '}
            <span className="text-emerald-300">together</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-200">
            See who&apos;s playing live, share your best rounds, buy and sell equipment,
            and connect with golfers who share your passion for the game.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup" className="rounded-full bg-white px-8 py-3 text-base font-semibold text-emerald-900 shadow-lg hover:bg-emerald-50 transition-colors">
              Get started
            </Link>
            <Link href="#features" className="rounded-full border border-emerald-400 px-8 py-3 text-base font-semibold text-emerald-200 hover:bg-emerald-800/50 transition-colors">
              Learn more
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Everything you need on the course and off
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
            Sleft Golf brings golfers together with tools designed for how you actually play.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Activity className="h-6 w-6 text-emerald-600" />}
            title="Live Course Activity"
            description="See who's playing where right now. Find open groups, track tee times, and never play alone unless you want to."
          />
          <FeatureCard
            icon={<Trophy className="h-6 w-6 text-emerald-600" />}
            title="Leaderboards & Scorecards"
            description="Track your scores, compete with friends, and climb the daily leaderboard. See the best rounds happening across your network."
          />
          <FeatureCard
            icon={<Camera className="h-6 w-6 text-emerald-600" />}
            title="Share Your Golf Day"
            description="Upload photos from the course, share that perfect drive, or document the 19th hole. Your golf life, one feed."
          />
          <FeatureCard
            icon={<ShoppingBag className="h-6 w-6 text-emerald-600" />}
            title="Equipment Marketplace"
            description="Buy and sell clubs, bags, balls, and gear with fellow golfers. Find deals from people who actually play."
          />
          <FeatureCard
            icon={<Users className="h-6 w-6 text-emerald-600" />}
            title="Golf Networking"
            description="Connect professionally through the game. See what people do off the course and build relationships that matter."
          />
          <FeatureCard
            icon={<MapPin className="h-6 w-6 text-emerald-600" />}
            title="Coordinate & Play"
            description="Invite friends to rounds, find playing partners at your skill level, and organize outings. Golf made social."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-900">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to tee up?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-emerald-200">
            Join the community of golfers who are making every round count.
          </p>
          <Link href="/signup" className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-base font-semibold text-emerald-900 shadow-lg hover:bg-emerald-50 transition-colors">
            Start playing
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-800 bg-dark-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">&#9971;</span>
              <span className="font-semibold text-white">Sleft Golf</span>
            </div>
            <p className="text-sm text-gray-500">
              Built for golfers, by golfers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dark-700 bg-dark-800 p-8 shadow-sm transition-all hover:bg-dark-700">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-gray-400">{description}</p>
    </div>
  )
}
