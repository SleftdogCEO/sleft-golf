import Link from 'next/link'
import { Search, Users, Calendar, MessageCircle, MapPin, Hand } from 'lucide-react'

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
            Find golfers{' '}
            <span className="text-emerald-300">near you</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-200">
            Post when you want to play. Find players at your skill level in your area.
            No more empty spots or playing alone.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup" className="rounded-full bg-white px-8 py-3 text-base font-semibold text-emerald-900 shadow-lg hover:bg-emerald-50 transition-colors">
              Start playing
            </Link>
            <Link href="#how-it-works" className="rounded-full border border-emerald-400 px-8 py-3 text-base font-semibold text-emerald-200 hover:bg-emerald-800/50 transition-colors">
              How it works
            </Link>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Three taps to a tee time
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
            Stop texting group chats. Stop playing solo. Find your foursome in seconds.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          <StepCard
            step="1"
            icon={<Hand className="h-6 w-6 text-emerald-400" />}
            title="Post your availability"
            description="Pick a day, time of day, and your area. Takes 10 seconds."
          />
          <StepCard
            step="2"
            icon={<Search className="h-6 w-6 text-emerald-400" />}
            title="Get matched"
            description="Golfers near you at your skill level see your post and tap &quot;I'm In.&quot;"
          />
          <StepCard
            step="3"
            icon={<Calendar className="h-6 w-6 text-emerald-400" />}
            title="Play golf"
            description="Lock in the course, tee time, and go. Chat with your group to coordinate."
          />
        </div>
      </section>

      {/* Features */}
      <section className="bg-dark-900 border-y border-dark-800">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Built for how golfers actually play
            </h2>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Hand className="h-6 w-6 text-emerald-600" />}
              title="Looking to Play Board"
              description="Post your availability and area. Other golfers nearby see it and join up. Like a bulletin board for finding playing partners."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6 text-emerald-600" />}
              title="Skill-Level Matching"
              description="Set your handicap and find players at your level. No more awkward mismatches — play with people who match your game."
            />
            <FeatureCard
              icon={<MapPin className="h-6 w-6 text-emerald-600" />}
              title="Area-Based Discovery"
              description="Search by area to find golfers near you. Whether you're in West Palm, Jupiter, or Boca — find your local crew."
            />
            <FeatureCard
              icon={<Calendar className="h-6 w-6 text-emerald-600" />}
              title="AI-Powered Scheduling"
              description="Tell the Sleft Caddie when and where you want to play. It handles the rest — finds courses, suggests times, sets up the round."
            />
            <FeatureCard
              icon={<MessageCircle className="h-6 w-6 text-emerald-600" />}
              title="Group Chat"
              description="Every tee time has a built-in chat. Coordinate who's driving, who's bringing beers, and what tees you're playing."
            />
            <FeatureCard
              icon={<Search className="h-6 w-6 text-emerald-600" />}
              title="No Empty Spots"
              description="Need a 4th for Saturday? Post it. Looking for a game on a random Tuesday? Someone near you probably is too."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-900">
        <div className="mx-auto max-w-7xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Never play alone again
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-emerald-200">
            Join golfers in your area who are looking for the same thing — a good round with good people.
          </p>
          <Link href="/signup" className="mt-8 inline-block rounded-full bg-white px-8 py-3 text-base font-semibold text-emerald-900 shadow-lg hover:bg-emerald-50 transition-colors">
            Get started free
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

function StepCard({ step, icon, title, description }: { step: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="relative rounded-2xl border border-dark-700 bg-dark-800 p-8 text-center">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
        {step}
      </div>
      <div className="mx-auto mt-2 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-gray-400">{description}</p>
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
