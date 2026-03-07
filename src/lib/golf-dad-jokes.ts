export const GOLF_DAD_JOKES: { setup: string; punchline: string }[] = [
  { setup: "I shot a 68 today.", punchline: "Then I played the back nine." },
  { setup: "My doctor told me to play 36 holes a day.", punchline: "So I bought a harmonica." },
  { setup: "Golf is a lot like taxes.", punchline: "You drive hard to get to the green, and then end up in the hole." },
  { setup: "I'm not saying my golf game is bad...", punchline: "But if I grew tomatoes, they'd come up sliced." },
  { setup: "What's the difference between a golfer and a fisherman?", punchline: "When a golfer lies, he doesn't have to bring anything home to prove it." },
  { setup: "My buddy asked what my handicap is.", punchline: "I told him it's my inability to say no to a Saturday tee time." },
  { setup: "Why do I always bring a spare shirt when I golf?", punchline: "In case I get a hole in one. Still waiting." },
  { setup: "The secret to golf is simple.", punchline: "Just hit the ball and then go find it. Then hit it again." },
  { setup: "They say golf is like life.", punchline: "Don't believe them. Golf is way more complicated." },
  { setup: "My wife said I have to choose between her and golf.", punchline: "I'm really going to miss her." },
  { setup: "I play golf in the low 80s.", punchline: "If it gets any hotter, I stay home." },
  { setup: "My golf pro told me to keep my head down.", punchline: "That's the same advice my accountant gave me after he saw my income." },
  { setup: "What did the bad golfer give his wife for their anniversary?", punchline: "A diamond. He was aiming for a club." },
  { setup: "My buddy told me he was playing scratch golf.", punchline: "He takes a stroke, then scratches it off the card." },
  { setup: "The easiest shot in golf is your fourth putt.", punchline: "Because by that point you don't care anymore." },
  { setup: "I asked the caddie if he thought I could reach the green with a 7-iron.", punchline: "He said, 'Eventually.'" },
  { setup: "After 18 holes I'm usually 3 under.", punchline: "3 under a tree, 3 under a bush, and 3 under the water." },
  { setup: "I found the best way to lower my golf score.", punchline: "I stopped playing." },
  { setup: "Golf and marriage have a lot in common.", punchline: "Both require commitment, patience, and lowering your expectations." },
  { setup: "My swing is so bad...", punchline: "I had to aim at the ball next to mine to hit the right one." },
  { setup: "I hit two great balls today.", punchline: "I stepped on a rake in the bunker." },
  { setup: "Why do golfers always carry a spare pair of pants?", punchline: "Because they're terrified of a hole in one... on the wrong end." },
  { setup: "I told my wife I want to be cremated.", punchline: "She made a tee time for noon." },
  { setup: "My caddie said to me, 'Think you can get there with a 5-iron?'", punchline: "I said, 'Probably take me three or four.'" },
  { setup: "You know you're a bad golfer when...", punchline: "The ball retriever is the most used club in your bag." },
  { setup: "I'm such a bad golfer...", punchline: "I just joined a club I can actually hit the ball with." },
  { setup: "My friend says he golfs in the 70s.", punchline: "When it hits 80, he goes home." },
  { setup: "What's the difference between a bad golfer and a bad skydiver?", punchline: "A bad golfer goes WHACK... 'dang.' A bad skydiver goes 'dang'... WHACK." },
  { setup: "My caddie told me I was one of the worst golfers he'd ever seen.", punchline: "I told him I didn't appreciate that. He said, 'Sorry, I forgot you were playing.'" },
  { setup: "I just got a new set of clubs for my wife.", punchline: "Best trade I ever made." },
  { setup: "A golfer and his wife are in divorce court.", punchline: "The judge asks, 'What are the grounds?' He says, 'About 180 acres, with a really tough 14th hole.'" },
  { setup: "Golf tip: always count your blessings.", punchline: "It's easier than counting your strokes." },
  { setup: "Columbus went around the world in 1492.", punchline: "That's not a lot of strokes when you consider the course." },
  { setup: "I'm not over the hill.", punchline: "I just can't chip over it." },
  { setup: "If you drink, don't drive.", punchline: "Use a 3-wood instead." },
  { setup: "Real golfers don't cry when they line up their fourth putt.", punchline: "Real golfers cry when they line up their sixth." },
  { setup: "An interesting thing about golf...", punchline: "No matter how bad you play, it's always possible to get worse." },
  { setup: "I'd move heaven and earth to break 100.", punchline: "Actually I already did. It's called my 3-iron off the tee." },
  { setup: "My golf game is improving.", punchline: "Last week I only threw my clubs 7 times." },
  { setup: "What's the difference between a golf ball and a Porsche?", punchline: "I can drive a golf ball 250 yards." },
]

export function getDailyJoke(): { setup: string; punchline: string; jokeNumber: number } {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  const index = dayOfYear % GOLF_DAD_JOKES.length
  return { ...GOLF_DAD_JOKES[index], jokeNumber: index + 1 }
}
