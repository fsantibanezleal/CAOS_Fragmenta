- Adversarial validation of the web features (CAOS_Fragmenta#33, unit V2): `tests/adversarial/test_adv_web.py` plants one
  defect per requirement of live-lanes, hygiene, response-surface and site in a throwaway copy, runs the requirement's own
  gate on it (the Node tests, the Spanish guard tests, and the browser gate on builds of planted copies) and asserts that
  the clean copy passes and the planted copy fails; the four `validation.md` files give each of the 33 requirements its row.
