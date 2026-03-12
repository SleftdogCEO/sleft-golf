export const GOLF_DAD_JOKES: { setup: string; punchline: string }[] = [
  // Classic rewrites that actually land
  { setup: "I shot a 68 today.", punchline: "Then I played the back nine." },
  { setup: "My wife said it's either her or golf.", punchline: "I'm gonna miss her. She was a decent cook." },
  { setup: "I play golf in the low 80s.", punchline: "If it gets any hotter I'm in the cart girl's shade." },
  { setup: "After 18 holes I'm usually 3 under.", punchline: "3 under a tree, 3 under a bush, 3 under the water." },

  // Actually funny ones
  { setup: "My buddy said he broke 70 yesterday.", punchline: "He meant the speed limit driving to the course." },
  { setup: "My golf game is a lot like my dating life.", punchline: "I spend a lot of money to end up in the rough." },
  { setup: "They say golf is 90% mental.", punchline: "The other 10% is also mental. Just a different kind." },
  { setup: "I told my therapist I've been having trouble on the course.", punchline: "She said, 'Let's work on your drives.' I said, 'Finally, someone who gets it.'" },
  { setup: "My caddie asked me what my typical round looks like.", punchline: "I said, 'Imagine a man drowning, but on grass.'" },
  { setup: "The difference between golf and government?", punchline: "In golf you can't improve your lie." },
  { setup: "I just spent $400 on a new driver.", punchline: "My wife thinks I'm seeing someone. Honestly, I'd have more fun if I was." },
  { setup: "My doctor told me I should avoid any unnecessary stress.", punchline: "So I stopped keeping score." },
  { setup: "I finally broke 90.", punchline: "My playing partner said, 'Congrats.' I said, 'Don't. It was a par-3 course.'" },
  { setup: "Golf is the only sport where the ball doesn't move.", punchline: "And somehow I still miss it." },
  { setup: "What do golf and laundry have in common?", punchline: "I always lose my socks and my balls." },
  { setup: "I asked my pro why I keep slicing.", punchline: "He said, 'Because you're swinging.' Fair enough." },
  { setup: "My buddy says he plays scratch golf.", punchline: "He writes down his score, looks at it, then scratches it out." },
  { setup: "I asked the starter how tough the course was.", punchline: "He said, 'Put it this way — the pro shop sells tissues.'" },
  { setup: "The worst part about a 4-putt?", punchline: "Knowing you could've 3-putted with your eyes closed." },
  { setup: "My golf swing has been described as 'unique.'", punchline: "That's the polite word. The marshal used a different one." },

  // Relatable player humor
  { setup: "I finally found the secret to hitting it straight.", punchline: "I aim at the trees. Works every time." },
  { setup: "Why do I golf every Saturday?", punchline: "It's cheaper than therapy. Well, actually no. But it's outside." },
  { setup: "My handicap isn't a number.", punchline: "It's a lifestyle." },
  { setup: "I don't always lose golf balls.", punchline: "Sometimes I just donate them to the lake." },
  { setup: "Golf tip: always bring more balls than you think you need.", punchline: "Then double it. Then add 6 more." },
  { setup: "I got fitted for clubs last week.", punchline: "The guy said, 'Have you considered pickleball?'" },
  { setup: "I told my buddy I've been working on my short game.", punchline: "He said, 'Your whole game is short.'" },
  { setup: "The cart girl asked if I wanted anything.", punchline: "I said, 'Talent, mostly.'" },
  { setup: "I found a ball in the woods with my name written on it.", punchline: "Apparently I lost it there 3 rounds ago." },
  { setup: "There's no 'I' in team.", punchline: "But there are 4 in 'I can't believe I just quadruple-bogeyed.'" },
  { setup: "My son asked why I yell at a ball.", punchline: "I said, 'One day you'll understand. Probably around 30.'" },

  // Short and punchy
  { setup: "Golf: the only place where a 'birdie' makes grown men cry.", punchline: "And a 'bogey' makes them lie." },
  { setup: "If you think it's hard to meet new people...", punchline: "Try picking up the wrong golf ball." },
  { setup: "I got a hole in one today.", punchline: "Just not on the course. Ripped right through my pants on the bench." },
  { setup: "Some days you're the golfer.", punchline: "Most days you're the divot." },
  { setup: "What's the difference between a golf ball and a Porsche?", punchline: "I can actually drive a golf ball 250 yards." },
  { setup: "My new year's resolution was to break 80.", punchline: "It's March and I've broken 3 clubs, 2 tees, and my spirit." },
  { setup: "They call it a 'round' of golf.", punchline: "Because by the 18th hole, that's the shape of your dignity." },
  { setup: "Columbus went around the world in 1492.", punchline: "That's not a lot of strokes when you consider the course." },
  { setup: "I just got a new set of clubs for my wife.", punchline: "Best trade I ever made." },

  // Group chat energy
  { setup: "My buddy texted 'I'm on the green in 2!'", punchline: "He forgot to mention it was a par 3 and he took a drop." },
  { setup: "The forecast said 30% chance of rain.", punchline: "There was 100% chance we were still playing." },
  { setup: "Rule #1 of golf: if it goes right, it's a fade.", punchline: "If it goes left, it's a draw. If it goes straight, it's a miracle." },
  { setup: "My foursome has a rule: no mulligans.", punchline: "We also have an unspoken rule: everyone gets mulligans." },
  { setup: "I asked Siri for the nearest golf course.", punchline: "She said, 'Based on your scores, maybe try mini golf first.'" },
  { setup: "There's a fine line between a great drive and a lost ball.", punchline: "It's called OB." },
  { setup: "My putting is so bad.", punchline: "Google Maps tried to recalculate my route to the hole." },
  { setup: "I don't need anger management.", punchline: "I just need a fairway that's wider than my stance." },
  { setup: "The 19th hole is where the real scoring happens.", punchline: "On the bar tab." },
  { setup: "I told my boss I needed Friday off for a 'medical appointment.'", punchline: "The course was in great condition." },
]

export function getDailyJoke(): { setup: string; punchline: string; jokeNumber: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const index = dayOfYear % GOLF_DAD_JOKES.length
  return { ...GOLF_DAD_JOKES[index], jokeNumber: index + 1 }
}
