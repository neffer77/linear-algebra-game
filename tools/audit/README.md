# The build audit

`muster.html` is the source of the published build-audit page — the one that
counts the twenty skills against what is actually in `index.html`, rather than
against memory.

It lives here because it was twice nearly lost: it was written in a scratch
directory outside the repo, and a container reset wiped that directory while
the only surviving copy was the published page itself. A document that records
what the project has and has not built is worth the same durability as the
project.

## Editing it

Edit `muster.html`. It is kept **lean** — the screenshots are about 1.8 MB of
base64 and have no business in a diff, so the file carries a placeholder:

```html
<script>const SHOTS = {/*…*/};
</script>
```

`assemble.js` swaps the real images in and refuses to run if that placeholder
has gone missing, because a page that publishes with no pictures and no error
is the expensive kind of mistake.

For a change of more than a line, prefer `edit.py` over a hand-written
multi-edit script:

```
python3 tools/audit/edit.py tools/audit/muster.html "what I changed" <<'EOF'
old text
<<<>>>
new text
EOF
```

One edit, one write, one exit code. Batching several replacements into one
script means a single missed anchor silently discards every edit that already
succeeded, which has cost two rounds. Note also that `edit.py` strips the
trailing newline from the replacement: leaving it in once landed a newline
inside a JavaScript string literal and emptied the entire muster roll, which
`check.js` caught and a human would not have.

## Rebuilding and publishing

```
npm run shots -- --out tools/audit/shots     # whole-screen captures
node tools/audit/build-shots.js              # panels, viewports, downscale
node tools/audit/assemble.js                 # -> muster-built.html
node tools/audit/check.js                    # render it in both themes
```

Then publish `muster-built.html`, keeping the existing artifact URL so the page
updates in place rather than sprouting a second copy.

`build-shots.js` reads the whole-screen captures by **name**, not by their
`NN-` prefix — that prefix is the scene's position in `tools/shots.js`, so it
shifts whenever a scene is added and a hard-coded number quietly picks up
whatever stale file still answers to it. It also refuses captures more than
thirty minutes old, so a figure cannot silently show a build from last week.

## Checking it

`check.js` renders the built page at 900px in both colour schemes and reports
page errors, broken images, the roll's counts, the footer, and horizontal
overflow. Run it before every publish. The one error it always reports offline
is the Google Fonts stylesheet, which is expected and loads fine once
published.

It has earned its place more than once: it caught the emptied muster roll
described above, where the page still rendered and simply had no skills in it.
