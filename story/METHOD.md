# How to build a story

Eight steps, in order. Answer each in one or two lines. The whole idea should take about
ten minutes in bullet points — if it takes longer, the idea is fighting you, drop it and
start another. Prose comes last.

Each step is caused by the one before it. That's the whole trick.

---

## Step 0 — Pick a corner

Take a place in the world and ask it a question. Cross any row with any column and you
have somewhere to start. There are seventy of them; you need one.

| Places | Questions |
| --- | --- |
| The cliffs of Nisaland | What was built here? |
| Huldugaard | What was lost here? |
| Wolfspine Fortress | Who left, and why? |
| The sealed passage | What do they do to survive the winter? |
| The old forest | What is forbidden here, and who does it anyway? |
| The reek | What did the last generation lie about? |
| The gnome hold and its deep archive | What arrived that shouldn't have? |
| Hrafvik | |
| The mountain that reflected the sun | |
| Uther's court in Norinheim | |

Stuck? `SPARKS.md` has premises already worked out.

## Step 1 — The intro

A cool, descriptive thing that happened there. Something you can see — a place, weather,
a moment. Not a plot. A picture.

It also has to contain a **base**: the concrete thing the story gets built on. A trait, an
object, a difference. *Once there was a kid with massive ears.* Without a base you have
scenery, and steps 2 and 3 have nothing to grab.

## Step 2 — The moral

Does it tell us something about us as humans, or about how the world works? One line.

Never write this line into the story. It's what's left in the reader, not what you say to
them. If it's comfortable to say out loud, push it further — the good ones are slightly
uncomfortable.

**The reliable way to find one: keep the base, change the environment.** The ears don't
change; where the boy stands does. Move him somewhere big ears are ordinary and the value
flips — now his friend is the strange one. Read the moral off the inversion.

Then push on whoever it cost. In that example the friend came along and became the
outsider, so staying means choosing your own comfort over the person who walked there
with you. "Find where you fit" is the soft version; "finding where you belong can mean
making someone else the stranger" is the one with teeth.

## Step 3 — The first consequence

What comes of the person's behaviour, or of the situation. Two ways in:

- **"It went good at first, but then…"** — a fall. The story is about losing something
  that worked.
- **"It was always terrible, they needed a change."** — an attempt. The story is about
  reaching for something.

Same shape, different starting point. Pick one and the rest of the chain follows.

## Step 4 — The long consequence

Time passes. What did step 3 grow into? Usually the high point — they get what they were
after. Show the good of it plainly, or the ending won't land.

## Step 5 — The final consequence

The bill. It has to come from what they did, not from something arriving offstage.
Close on the meaning.

## Step 6 — Give it a face

Now decide whose eyes we watch it through. Not the most important person — **the one with
the most to lose.** Name them.

This is the cheapest way to change a story. Same five steps, different pair of eyes, and
you have a different piece. If a story feels flat, don't rewrite the chain — move the
camera.

## Step 7 — Spread it over the acts

```sh
./new-story.sh "Title"
```

| Your step | Goes to | Lines |
| --- | --- | --- |
| 1 — the intro | Act 1, the ordinary world | 16–21 |
| the thing that changes | Act 2, the inciting incident | 14–20 |
| 3 — first consequence | Act 3 | 14–20 |
| 4 — long consequence | Act 4 | 14–20 |
| 5 — final consequence | Act 5 | 14–20 |
| 2 — the moral | nowhere | 0 |

Write to the budgets. `./check-story.sh` counts them for you.

## Step 8 — The last check

Three questions. Any "no" sends you back, and it's cheap while it's still bullet points.

1. **Take out step 3 — do 4 and 5 still happen anyway?** If yes, it's a sequence of
   events, not a story.
2. **Is the moral anywhere in the text?** Cut it.
3. **Is Act 2 trying to tell the whole story?** It always tries. It ends the moment
   there's no way back — everything after belongs to acts 3–5.

---

## One worked all the way through

> **0.** The reek, in the dark forest. *What is forbidden here, and who does it anyway?*
>
> **1.** A stream so clear you can count the stones on the bottom, and every animal that
> drinks from it walks away wrong.
>
> **2.** People will drink what they know is poison rather than admit they are lost.
>
> **3.** *It was always terrible* — a trapper, three days without water, drinks. And it
> goes well: the thirst leaves him, his head clears, he finds the path home by dark.
>
> **4.** Years on he is sharper than he was, stronger, needs less sleep. His family
> prospers on it. Then he begins to hear the water when he is nowhere near it.
>
> **5.** He takes his own children to the reek, certain he is giving them a gift.
>
> **6.** Whose eyes? Not his — **his daughter's.** She is old enough to refuse. The last
> act is her standing at the clear water with her father's hand on her shoulder, being
> told to drink.

Six lines, ten minutes, and the story is decided. Note what step 6 did: told from the
trapper it's a story about a man who ruins himself. From the daughter it's a story about
what you inherit — and the last act became a scene instead of a summary.
