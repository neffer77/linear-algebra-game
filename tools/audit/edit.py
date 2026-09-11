"""Apply one replacement to a file and write it immediately.

Batching several of these into one script and writing at the end means a single
missed anchor discards every edit that already succeeded. One edit, one write,
one exit code. NB: the payload separator strips the trailing newline from the
replacement, because leaving it in once landed a newline inside a JS string
literal and silently emptied the whole muster roll.
"""
import sys
path, label = sys.argv[1], sys.argv[2]
raw = sys.stdin.read()
sep = '\n<<<>>>\n'
if sep not in raw:
    sys.exit('no separator in payload')
a, b = raw.split(sep, 1)
if b.endswith('\n'):
    b = b[:-1]
s = open(path).read()
if a not in s:
    sys.exit(f'MISS: {label}')
open(path, 'w').write(s.replace(a, b, 1))
print('ok:', label)
