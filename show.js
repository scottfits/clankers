// Made by build.mjs from show.json and the feeds. Edit show.json, not this file.
window.SHOW = {
 "feed": "https://anchor.fm/s/11a757edc/podcast/rss",
 "links": {
  "youtube": "https://www.youtube.com/watch?v=LGwXzYCNqXA&list=PLVyxrlZ6UNhM",
  "spotify": "https://podcasters.spotify.com/pod/show/scott-fitsimones",
  "apple": "https://podcasts.apple.com/us/podcast/conversations-with-clankers/id6837877027"
 },
 "icons": {
  "youtube": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQC7rRv5p0NHqBDRbnfLOfLYY5CWXgtfZTod1D2wX4ZEw&s=10",
  "spotify": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQz-pzrJrHHHCJ1LSek991YTxYQfEbeB3NjCV6nx--Hdw&s=10",
  "apple": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQeo4XAt_JiEZxa98EXzyaDbr_qkDgzYVMc5qBg5hH-4w&s"
 },
 "episodes": [
  {
   "slug": "pvsnp",
   "number": 2,
   "trailer": false,
   "title": "Are We Closer to Solving P vs NP?",
   "date": "2026-11-24T17:09:10.000Z",
   "guid": "bdeb1301-4f46-402f-9412-fd49537fadb6",
   "youtube": "coQ16_MqK_Y",
   "spotify": "https://open.spotify.com/episode/7Eru9Z7D7HIUO5GNGmOxRb",
   "link": "https://podcasters.spotify.com/pod/show/scott-fitsimones/episodes/Are-We-Closer-to-Solving-P-vs-NP-e3suqm9",
   "audio": "https://anchor.fm/s/11a757edc/podcast/play/130033801/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-10-24%2F437527253-44100-2-86dce9fc43e5f8.mp3",
   "paragraphs": [
    "What is P vs NP, and why does it matter? I asked Claude to teach it to me from scratch, a few hours after Anthropic posted a Claude-written proof of VP ≠ VNP, the algebraic cousin of the problem.",
    "We start with why checking a Sudoku is easy and solving one is not, then go through what P and NP mean, Gödel’s 1956 letter to von Neumann, how Cook and Karp showed that Sudoku, routing and scheduling are the same problem in disguise, and what would change if P equaled NP. We end on the Millennium Prize scoreboard and whether AI needs a proof at all. Animated throughout."
   ],
   "chapters": [
    [
     0,
     "How computer scientists measure hard problems"
    ],
    [
     81,
     "Checking a Sudoku vs solving one"
    ],
    [
     164,
     "Writing a program to solve Sudoku"
    ],
    [
     228,
     "What P and NP mean"
    ],
    [
     327,
     "Why P = NP is even possible"
    ],
    [
     373,
     "What breaks if P = NP"
    ],
    [
     500,
     "Gödel’s letter to von Neumann"
    ],
    [
     572,
     "Cook, Karp and the master key"
    ],
    [
     627,
     "How every hard problem turns into the same one"
    ],
    [
     722,
     "A world where P = NP"
    ],
    [
     806,
     "Claude’s claimed VP ≠ VNP proof"
    ],
    [
     899,
     "VP vs VNP: determinant and permanent"
    ],
    [
     979,
     "The Millennium Prize scoreboard"
    ],
    [
     1096,
     "AlphaFold and good guesses"
    ],
    [
     1152,
     "Can neural networks skip the problem?"
    ],
    [
     1219,
     "Would AGI crack a hard Sudoku?"
    ],
    [
     1274,
     "Wrap"
    ]
   ],
   "extra": "",
   "made": false
  },
  {
   "slug": "riemann",
   "number": 1,
   "trailer": false,
   "title": "Why Does the Riemann Hypothesis Matter?",
   "date": "2026-11-22T02:59:25.000Z",
   "guid": "07d508b1-ecf7-4b2b-a6aa-bc5eddf4d036",
   "youtube": "LGwXzYCNqXA",
   "spotify": "https://open.spotify.com/episode/07jxZJI4zKL0TDijhHENnw",
   "link": "https://podcasters.spotify.com/pod/show/scott-fitsimones/episodes/Why-Does-the-Riemann-Hypothesis-Matter-e3sq55l",
   "audio": "https://anchor.fm/s/11a757edc/podcast/play/129880693/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-10-22%2F437321740-44100-2-2c26520f1c94b.mp3",
   "paragraphs": [
    "Why does the Riemann Hypothesis matter? I asked Claude the day after Anthropic mathematician Levent Alpöge released a proof of it, built with Claude, as 17 million lines of Lean code.",
    "We start with Riemann himself and build up from nothing: why primes matter, Euclid’s proof that they never run out, Gauss’s estimate of how they thin out, and how the zeros of the zeta function turn that estimate into the exact count.",
    "Then the proof: what’s known about how it works, which Millennium Prize problem could go next, and what mathematicians do with a result a machine can verify but no person can yet explain."
   ],
   "chapters": [
    [
     0,
     "Who was Bernhard Riemann?"
    ],
    [
     60,
     "Why primes matter"
    ],
    [
     159,
     "Euclid’s proof that primes never run out"
    ],
    [
     248,
     "Gauss and the odds of a prime"
    ],
    [
     322,
     "The staircase, the wobble and the zeta function"
    ],
    [
     471,
     "Zeros and the critical line"
    ],
    [
     651,
     "Trivial zeros and the critical strip"
    ],
    [
     746,
     "Why a trillion checked zeros isn’t proof"
    ],
    [
     827,
     "The proof announcement"
    ],
    [
     912,
     "How the proof works"
    ],
    [
     1011,
     "The other Millennium Prize problems"
    ],
    [
     1136,
     "From 40% of zeros to all of them"
    ],
    [
     1227,
     "What comes next"
    ]
   ],
   "extra": "zeta",
   "made": true
  }
 ]
};
