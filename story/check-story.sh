#!/usr/bin/env python3
"""Report each act's length against its budget.

    ./check-story.sh stories/nisaland-the-light.md
    ./check-story.sh                      # checks every story

A "line" is a sentence, matching how the acts are budgeted.
"""
import re, sys, pathlib

BUDGETS = {1: (16, 21), 2: (14, 20), 3: (14, 20), 4: (14, 20), 5: (14, 20)}
ACT = re.compile(r'^##\s*Act\s*(\d)', re.M)


def sentences(text):
    # drop html comments, blockquoted notes, frontmatter leftovers
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    text = '\n'.join(l for l in text.splitlines() if not l.lstrip().startswith('>'))
    text = text.strip()
    if not text:
        return 0
    return len([s for s in re.split(r'(?<=[.!?])["”]?\s+', text) if s.strip()])


def check(path):
    src = path.read_text()
    marks = [(int(m.group(1)), m.start(), m.end()) for m in ACT.finditer(src)]
    if not marks:
        print(f"{path.name}: no act headings found")
        return
    print(f"\n{path.name}")
    total = 0
    for i, (num, _, end) in enumerate(marks):
        stop = marks[i + 1][1] if i + 1 < len(marks) else len(src)
        body = src[end:stop]
        body = body.split('\n', 1)[1] if '\n' in body else ''
        n = sentences(body)
        total += n
        lo, hi = BUDGETS.get(num, (14, 20))
        if n == 0:
            flag, note = '·', 'empty'
        elif n < lo:
            flag, note = '-', f'{lo - n} short'
        elif n > hi:
            flag, note = '+', f'{n - hi} over'
        else:
            flag, note = 'ok', ''
        print(f"  {flag:>2}  Act {num}  {n:>3} lines  (budget {lo}-{hi})  {note}")
    print(f"      total  {total:>3} lines  (budget 72-101)")


def main():
    root = pathlib.Path(__file__).resolve().parent / 'stories'
    args = sys.argv[1:]
    paths = [pathlib.Path(a) for a in args] if args else sorted(
        p for p in root.glob('*.md') if not p.name.startswith('_'))
    for p in paths:
        check(p)
    print()


main()
