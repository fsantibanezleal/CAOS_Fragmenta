# app/, the dormant backend

**This product does not require a request-time backend, and this directory says so rather than
being absent**, so that the repo layout is the same as every other product in this line and a
reviewer knows where to look if one is ever added.

Everything Fragmenta serves is either a committed artifact or a closed-form model small enough to
run in the browser. There is no server state, no auth-gated data and no request-time compute, which
are the three triggers that would justify activating this module.

The module still imports cleanly, and CI keeps it that way, so it does not rot while unused.
