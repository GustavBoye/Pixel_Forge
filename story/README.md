# Story repo

World bible, story template, and drafts.

- **The world** — Norinheim and its edges: the gnomes, the Huldus, the Grukks, the
  Bloodguard, and the mountains between them.
- **Small stories** — self-contained pieces written to the five-act template in
  `TEMPLATE.md`.
- **Wolfspine** — the novel draft: Ulfir of Hrafvik, the fortress at the empire's
  northern edge, and what comes over the wall.

## Layout

```
story/
├── README.md            you are here — conventions and status
├── METHOD.md            how to find a story: image → moral → choice → price → acts
├── TEMPLATE.md          the five-act structure explained, act by act
├── SPARKS.md            premise bank — pick one and go
├── new-story.sh         ./new-story.sh "Title"  → a blank story from the template
├── check-story.sh       ./check-story.sh        → act lengths vs. budgets
├── stories/
│   ├── _TEMPLATE.md     the blank form (copied by new-story.sh)
│   └── *.md             one file per short story
├── OUTLINE.md           the working outline — spine, movements, scene list, threads
├── CHARACTERS.md        who exists, what's established, what's only planned
├── WORLD.md             places, peoples, things, and locked spellings
├── manuscript/
│   └── act-1/           one file per chapter, in reading order
└── notes/
    └── open-questions.md  continuity flags and line-level fixes, unapplied
```

## Status

| # | Chapter | Status |
| --- | --- | --- |
| 1 | Urgård | draft — 3 outline beats still missing |
| 2 | The Passage | draft |
| 3 | The Journey Back | draft |
| 4 | Hrafvik | draft — ends in outline |
| 5 | Goodbye Brother | draft |
| 6 | *(gap)* | missing |
| 7 | Fignal the Gnome | draft |
| 8 | The Vibkriseer | rough draft |
| 9 | Healing | unfinished — breaks off mid-scene |
| 10 | A Warm Welcome | rough draft, ends in outline |
| 11 | King of the Huldus | stub (one line) |
| 12 | Back to Wolfspine Fortress | stub |
| 13 | A Moment | stub |

Act 1 ends unresolved on purpose; the story is aimed at a final question — Lily returns
with a Bloodguard child and can have no more, and Ulfir has to choose.

## Conventions

- **The prose is yours, untouched.** Chapter text is preserved exactly as drafted,
  typos included. Every suggested correction lives in `notes/open-questions.md` instead,
  so nothing gets silently rewritten. Straight quotes are used throughout for consistency.
- **Each chapter file opens with a small frontmatter block** — act, chapter number, title,
  POV, status. Update `status` as chapters move from stub → rough draft → draft → final.
- **Material that exists only as outline** sits inside a blockquote marked
  `[OUTLINE — not yet drafted]` so it never gets mistaken for finished prose.
- **Chapters 8–13 are headed "Chapter X" in the draft** and are numbered here by position.
- **New chapters** go in `manuscript/act-<n>/` named `<NN>-<kebab-title>.md`.

## Writing a short story

```sh
./new-story.sh "The Sealing"      # creates stories/the-sealing.md
./check-story.sh                  # act lengths against the budgets
```

Fill the six SPARK lines at the top of the file first — pressure, misfit, lure, choice,
payoff, bill. If you can't answer them in one line each, the story isn't ready yet and
prose won't fix it. `SPARKS.md` has premises with the choice already worked out.
Then write the acts to budget; the guidance in each act is an HTML comment, so delete it
as you go. `TEMPLATE.md` explains what each act has to do.

## Working with it

Commit per chapter or per revision pass so the draft history is readable later
(`git log --follow story/manuscript/act-1/01-urgard.md` will then show a chapter's whole
life). `OUTLINE.md` is the working document — one line per scene, plus the open threads
and the decisions still to make. Keep it compressed; detail belongs in the manuscript.
