'use client'

import { useState } from 'react'
import { getDailyJoke, GOLF_DAD_JOKES } from '@/lib/golf-dad-jokes'
import { RefreshCw } from 'lucide-react'

export function DailyDadJoke({ variant = 'card' }: { variant?: 'card' | 'banner' | 'compact' }) {
  const dailyJoke = getDailyJoke()
  const [joke, setJoke] = useState(dailyJoke)
  const [revealed, setRevealed] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)

  const getRandomJoke = () => {
    setIsSpinning(true)
    setRevealed(false)
    const randomIndex = Math.floor(Math.random() * GOLF_DAD_JOKES.length)
    setJoke({ ...GOLF_DAD_JOKES[randomIndex], jokeNumber: randomIndex + 1 })
    setTimeout(() => setIsSpinning(false), 500)
  }

  if (variant === 'banner') {
    return (
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">&#9971;</span>
              <h3 className="font-bold text-lg">Daily Golf Joke</h3>
              <span className="bg-white/20 text-xs font-medium px-2 py-0.5 rounded-full">
                #{joke.jokeNumber}
              </span>
            </div>
            <p className="text-lg font-semibold mb-2">{joke.setup}</p>
            {revealed ? (
              <p className="text-xl font-bold text-yellow-200 animate-in slide-in-from-bottom-2">
                {joke.punchline}
              </p>
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="mt-1 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors backdrop-blur-sm"
              >
                Reveal punchline...
              </button>
            )}
          </div>
          <button
            onClick={getRandomJoke}
            className="p-2 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
            title="Another one!"
          >
            <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {revealed && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={getRandomJoke}
              className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-sm font-medium transition-colors"
            >
              Hit me with another one
            </button>
            <span className="text-white/60 text-xs">
              {GOLF_DAD_JOKES.length} jokes and counting
            </span>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span>&#9971;</span>
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Golf Joke of the Day</span>
        </div>
        <p className="text-sm font-medium text-gray-100">{joke.setup}</p>
        {revealed ? (
          <p className="text-sm font-bold text-emerald-400 mt-1">{joke.punchline}</p>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-1"
          >
            Show punchline
          </button>
        )}
      </div>
    )
  }

  // Default card variant
  return (
    <div className="bg-dark-800 rounded-2xl shadow-sm border border-dark-700 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#9971;</span>
            <div>
              <h3 className="font-bold text-white text-lg">Golf Joke of the Day</h3>
              <p className="text-emerald-100 text-xs">
                Joke #{joke.jokeNumber} of {GOLF_DAD_JOKES.length}
              </p>
            </div>
          </div>
          <button
            onClick={getRandomJoke}
            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            title="Another joke!"
          >
            <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="px-6 py-5">
        <p className="text-gray-100 text-lg font-medium mb-3">{joke.setup}</p>
        {revealed ? (
          <div>
            <p className="text-emerald-400 text-xl font-bold mb-4">
              {joke.punchline}
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-dark-700">
              <button
                onClick={getRandomJoke}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Another one
              </button>
              <span className="text-dark-600">|</span>
              <span className="text-xs text-gray-500">
                Share this groaner with your foursome
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 font-semibold rounded-xl transition-colors text-sm"
          >
            Tap to reveal the punchline...
          </button>
        )}
      </div>
    </div>
  )
}
