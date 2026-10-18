"""The technology guard on Fragmenta's own tree (template 0.08.002, installed verbatim in U10a; the SDD guard's real-tree
test is `test_view_the_real_repository_passes` in test_spec_guards.py, with the same marker).

Fragmenta's design document is written to the guards by U10b (the executive brief, the research basis, the sizing and
contracts, the technology table, the resources, one validation.md per feature), so on the real tree both guards fail
today and the findings are U10b's input. strict=True: the day a guard passes on the real tree its test XPASSES and
fails, which is the signal to delete the marker and keep the test as the clean-tree proof. The plants that prove each
guard rejects a defect run on throwaway trees (test_spec_guards.py) and do not wait for U10b."""
from __future__ import annotations

import pytest
from planting import ROOT, guard


@pytest.mark.xfail(strict=True, reason="U10b writes the technology table to the template guard (CAOS_Fragmenta#33)")
def test_the_technology_table_is_the_pinned_dependencies_on_the_real_tree() -> None:
    r = guard(ROOT, "check_tech_matrix.py", ok_marker="check_tech_matrix: OK")
    assert r.returncode == 0 and "check_tech_matrix: OK" in r.stdout, r.stdout
