- The three executive illustrations are drawn as hand-authored theme-token SVG scenes of the blast to mill chain
  (`frontend/public/executive/pain.svg`, `situation.svg`, `proposal.svg`): the pain scene is animated (trucks queue at the
  crusher, mill power rises, output falls; one 9 s loop, labels fixed, reduced-motion block), the situation scene places five
  roles and four tools with their limits and a thin hand-off between the blast and the plant, and the proposal scene keeps the
  pain layout with a shared record joining the blast table, the drill rig, the muckpile camera and the plant control room.
  Labels are bilingual inside each file.
- `frontend/test/illustrations.test.ts` holds the source contract of the three files (tokens only, labels, no chart marker,
  pain animation bounds, one layout for pain and proposal).
