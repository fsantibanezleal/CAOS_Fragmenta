# Playwright: applying the pattern

- **Gate the published build, not the development server**, and gate it in the deploy, where a failure
  can stop the publish.
- **Read declarations, not pixels.** Have every chart and 3D view write what it drew into `data-*`
  attributes and assert on those; an empty canvas and a working one look alike to a pixel sampler.
- **Measure figures geometrically.** For every SVG, collect the client rectangles of rendered text and
  boxes and test them against each other; sample every stroke along its length with
  `getTotalLength`/`getPointAtLength` and test the points against the text rectangles. Skip text that
  is not rendered (the other language's layout).
- **Count rows by height**, not by distinct top offsets, when checking that a bar stays on one line; a
  smaller label sits a few pixels off the others' top.
- **Exercise every interactive surface**: click every tab and sub-tab, set every theme and language, and
  check the setting was kept.
