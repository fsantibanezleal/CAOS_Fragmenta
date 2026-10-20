- Base: template 0.10.000 adopted (`.template-version`). Its guards taken verbatim: `scripts/check_notebooks.py` (the notebooks'
  layout, the English and Spanish mirror, levels, anatomy, metadata and cleanliness) and `scripts/check_readme_areas.py` (the
  README by areas), both new CI steps; `scripts/run_notebooks.py`, the local execution gate; `check_tech_matrix.py`, which now
  reads `notebooks/requirements.txt` (the SDD technology table gains matplotlib 3.11.2, nbclient 0.11.0, nbformat 5.11.1 and
  ipykernel 7.4.0); `check_content_standards.py` and `check_template_residue.py`, which now scan the notebooks.
- `scripts/setup.sh --notebooks` and `scripts/setup.ps1 -Notebooks` build the notebook environment, `.venv-notebooks`, from
  `notebooks/requirements.txt`.
