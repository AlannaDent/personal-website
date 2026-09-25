# Learning AI — Personal Website Project

This folder is a personal learning sandbox. The goal is to build a simple personal
website and, along the way, learn GitHub and the basics of pushing code in a hands-on way.

## Working rules

### 1. Personal GitHub account only
- This project belongs to my **personal** GitHub account: username **AlannaDent**.
  Repo: https://github.com/AlannaDent/personal-website
- Before any GitHub action, run `gh auth status` and make sure **AlannaDent** is the
  active account.
- When this folder becomes a git repository, set the git name and email **for this
  folder only** to my personal account.
- Before any action that talks to GitHub (cloning, adding a remote, pushing, opening a PR),
  confirm out loud which account and which repository it will touch.

### 2. Never push without my explicit permission
- Do not run `git push` (or anything that uploads to GitHub) unless I say "yes, push" in
  the conversation for that specific push.
- Committing locally is fine after telling me what will be committed. Pushing is not.
- Never force-push, rewrite history, or delete branches.

### 3. Teach as we go, in plain language
- I am learning. Explain every step in layman's terms, and define technical terms
  (repo, branch, commit, push, remote, PR, merge, etc.) the first time they come up
  in a conversation.
- Before running a command or changing a file, say in one or two sentences what you are
  about to do and why. Afterwards, say what happened in plain words.
- When you show a command, put it in its own code block so I can run it myself if I want.
- Keep changes small so I can follow each one.

## Project notes
- Started: 16 September 2026. Twenty-eight pull requests merged by 23 September 2026.
- Writing style: American English spellings everywhere on the site and in the game (color,
  gray, neighbor, harbor). Three deliberate exceptions, decided 22 September 2026: the season
  is called Autumn (never Fall), the town's main road is the high street (never Main
  Street), and the shop is a bookshop (never a bookstore). Keep those three; Americanize
  everything else.
- Git identity to use here (set locally, not globally): Alanna Dent
  <55811081+AlannaDent@users.noreply.github.com>. This is GitHub's no-reply address, so
  public commits show my name but not my real email.

### What the site is
- "Alanna's Workshop": a personal site with a home page and one project so far, published
  with GitHub Pages straight from the `main` branch. Live at
  https://alannadent.github.io/personal-website/ . Merging a pull request into `main` is
  the deploy; the live site updates a minute or two later.
- Plain HTML, CSS and JavaScript. No build step, no framework, no package manager. Open
  `index.html` in a browser and it works.
- The project is **The Salty Jellyfish**, a cozy browser game about running a Cape Cod
  bookshop: start with twenty books in a Little Free Library, sell them for coins, order
  more from a daily catalog, and move up through a shed, a real shop on the high street,
  and finally a church, lighthouse or ship. It has seasons and a day-night cycle
  (three-minute days, ten days a season), decor the player buys and drags into spots out
  front, pets, a hand-written journal, a living background (clouds, waves, gulls, a fox, a
  rare dolphin, neighbors, weather), and a Stats card.

### Where things live
- `index.html`, `style.css`: the home page and the shared look (colors, fonts, cards, tabs).
- `bookstore/`: the game. `index.html` is the page; `game.js` is the rules, state, saving
  and the animation loop; `scenes.js` draws every backdrop, building, interior, prop and
  animal as inline SVG on an 800 x 450 grid; `books.js` is the list of real book titles;
  `tips.js` is the list of night-sky tips (add a line to add a tip); `style.css` is the
  game's own styling.
- `stats/`: `stats.js` renders the Stats card; `config.js` holds the Supabase project URL
  and publishable key (public by design; the `service_role` key must never appear anywhere
  in this repo); `supabase.sql` documents the two tables and two functions behind the
  shared "across all players" counters.
- `reference/STYLE.md` describes the visual direction. The image folders beside it are
  other artists' work and are ignored by git on purpose.
- `bookstore/art/` (not created yet) is where Alanna's own paintings will go when they
  start replacing the placeholder drawings.
- `TODO.md` at the root is the open-items list, and `notes/` holds private notes (decisions
  log, art pipeline, art checklist). Both are private: ignored via `.git/info/exclude`
  (not `.gitignore`), so they exist only on this machine and never reach GitHub. On a new
  laptop, copy them over by hand and add both lines to `.git/info/exclude` again.

### How the game saves
- Everything is in the browser's localStorage under keys starting `saltyJellyfish.`: the
  current shop, lifetime counters, a random device id, and the sketch / header / stats
  preferences. Nothing personal is stored or sent. The game reports anonymous totals to
  Supabase under the device id; `stats/supabase.sql` caps what can be written.
- Old saves are migrated in `load()` in `game.js`. When the shape of the save changes, add
  a migration there rather than breaking existing players.

### Working habits
- One branch per change, one pull request per branch, plain-language commit and PR
  descriptions. Alanna merges on GitHub and deletes branches herself (locally with
  `git branch -d`, on GitHub with `git push origin --delete`, then `git fetch --prune`).
- Before any push or PR, read the GitHub CLI's active login and abort unless it is exactly
  AlannaDent.
- When `style.css` or any script changes, bump the `?v=` stamp on every stylesheet and
  script tag in `bookstore/index.html`, so visitors fetch fresh files instead of a cached
  mix of old and new.
- Preview locally with the dev server in `.claude/launch.json` (Python's built-in server
  on port 8765) and test in the built-in browser with planted saves in localStorage.
  Keep the ruler in mind: the picture is 800 x 450 units and people are drawn larger at
  stage one on purpose.
