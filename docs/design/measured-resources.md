# Measured resources of Fragmenta

The committed evidence behind the numbers that [`SDD.md`](SDD.md) states in its Resources and Deploy driver sections. Measured
on 2026-10-18 on the development workstation (Windows 11 10.0.26300, Intel Core i9-14900HX with 32 logical processors, 47.7 GB
of memory, Python 3.13.14, numpy 2.5.3, blastfrag 0.04.000, Node v24.14.1, npm 11.11.0), on a `git archive` copy of the release
branch taken after the unit's modal commit (the later commits change a test file and this record only, none of what is
measured), so that nothing of the working tree was touched and no committed artifact changed. The copy lives in
the device's temp root and is deleted afterwards. BLAS stays on one thread, as `data-pipeline/run.py` sets it. Sizes are bytes
of file content unless a line says otherwise. `du -sk` under Git Bash reports kilobytes of content rounded up per file, not
allocated blocks.

## Stored size of the committed artifacts

```
$ find data/derived -type f | xargs du -cb | tail -1
4168041	total
$ find data/derived -type f | wc -l
48
$ du -sk data/derived | cut -f1
4188
```

`data/derived` holds 4,168,041 bytes (3.98 MiB) in 48 files: the benchmark 367,640 bytes, the models files 2,692,829 bytes
(11 scopes), the 16 case folders 40,497 to 111,730 bytes each, the manifests 33,907 bytes and the readiness document
1,146 bytes (`find data/derived/<entry> -type f | xargs du -cb | tail -1` for each entry of `ls data/derived`).

## The bake: time and memory

A throwaway root: the bake wrote into the `data/derived` of the `git archive` copy, never into the repository's. `bake_run.py`
calls `bake_all` with the defaults of `python data-pipeline/run.py` (seed 0, 30 network seeds, the benchmark on), BLAS on one
thread, and prints the wall time of `bake_all` (ingest, preprocess, split, features, train, infer, evaluate, export, validate
for 16 cases, then the benchmark and its release gate) and the bytes the bake wrote. `measure.py` runs it as a child and
polls the working set of the process and its descendants every 50 ms (the Windows venv launcher is a parent process of the
real interpreter, so the whole tree is read).

```python
"""Bake every case and the benchmark into the data/derived of THIS throwaway copy (git archive of the release branch),
exactly as `python data-pipeline/run.py` does with its defaults (seed 0, 30 network seeds, benchmark on), BLAS on one
thread. Prints the wall time of bake_all and the bytes the bake wrote."""
import os
import sys
import time
from pathlib import Path

for v in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[v] = "1"

repo = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(repo / "data-pipeline"))
from pipeline import pipeline  # noqa: E402

assert pipeline.DATA_ROOT.resolve() == (repo / "data" / "derived").resolve(), pipeline.DATA_ROOT
start = time.perf_counter()
results = pipeline.bake_all(seed=0, with_benchmark=True, n_seeds=30)
elapsed = time.perf_counter() - start
size = sum(p.stat().st_size for p in pipeline.DATA_ROOT.rglob("*") if p.is_file())
print(f"BAKE cases={len(results)} seconds={elapsed:.1f} data_derived_bytes_after={size} root={pipeline.DATA_ROOT}")
```

```python
"""Run a command, print its wall time, the peak working set of its main process (polled every 50 ms from the parent
through GetProcessMemoryInfo, a peak counter, so the last read is the peak) and the peak committed memory of the whole
process tree (a Windows job object: PeakJobMemoryUsed), and its exit code.  usage: measure.py <cwd> -- <command...>"""
import ctypes
import ctypes.wintypes as wt
import subprocess
import sys
import time

k32 = ctypes.WinDLL("kernel32", use_last_error=True)
psapi = ctypes.WinDLL("psapi", use_last_error=True)
k32.OpenProcess.restype = wt.HANDLE
k32.CreateJobObjectW.restype = wt.HANDLE
k32.AssignProcessToJobObject.argtypes = [wt.HANDLE, wt.HANDLE]
psapi.GetProcessMemoryInfo.argtypes = [wt.HANDLE, ctypes.c_void_p, wt.DWORD]


class PMC(ctypes.Structure):
    _fields_ = [("cb", wt.DWORD), ("PageFaultCount", wt.DWORD), ("PeakWorkingSetSize", ctypes.c_size_t),
                ("WorkingSetSize", ctypes.c_size_t), ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPagedPoolUsage", ctypes.c_size_t), ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
                ("QuotaNonPagedPoolUsage", ctypes.c_size_t), ("PagefileUsage", ctypes.c_size_t),
                ("PeakPagefileUsage", ctypes.c_size_t)]


class BASIC(ctypes.Structure):
    _fields_ = [("PerProcessUserTimeLimit", ctypes.c_int64), ("PerJobUserTimeLimit", ctypes.c_int64), ("LimitFlags", wt.DWORD),
                ("MinimumWorkingSetSize", ctypes.c_size_t), ("MaximumWorkingSetSize", ctypes.c_size_t),
                ("ActiveProcessLimit", wt.DWORD), ("Affinity", ctypes.c_size_t), ("PriorityClass", wt.DWORD),
                ("SchedulingClass", wt.DWORD)]


class IO(ctypes.Structure):
    _fields_ = [(n, ctypes.c_uint64) for n in ("ReadOps", "WriteOps", "OtherOps", "ReadBytes", "WriteBytes", "OtherBytes")]


class EXT(ctypes.Structure):
    _fields_ = [("Basic", BASIC), ("Io", IO), ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t)]


class PE32(ctypes.Structure):
    _fields_ = [("dwSize", wt.DWORD), ("cntUsage", wt.DWORD), ("th32ProcessID", wt.DWORD), ("th32DefaultHeapID", ctypes.c_size_t),
                ("th32ModuleID", wt.DWORD), ("cntThreads", wt.DWORD), ("th32ParentProcessID", wt.DWORD),
                ("pcPriClassBase", ctypes.c_long), ("dwFlags", wt.DWORD), ("szExeFile", ctypes.c_wchar * 260)]


k32.CreateToolhelp32Snapshot.restype = wt.HANDLE


def descendants(root: int) -> set[int]:
    snap = k32.CreateToolhelp32Snapshot(2, 0)
    pe = PE32()
    pe.dwSize = ctypes.sizeof(pe)
    parent_of = {}
    ok = k32.Process32FirstW(snap, ctypes.byref(pe))
    while ok:
        parent_of[pe.th32ProcessID] = pe.th32ParentProcessID
        ok = k32.Process32NextW(snap, ctypes.byref(pe))
    k32.CloseHandle(snap)
    found = {root}
    grew = True
    while grew:
        grew = False
        for pid, parent in parent_of.items():
            if parent in found and pid not in found:
                found.add(pid)
                grew = True
    return found


def main() -> int:
    cwd = sys.argv[1]
    cmd = sys.argv[sys.argv.index("--") + 1:]
    start = time.perf_counter()
    p = subprocess.Popen(cmd, cwd=cwd)
    peak_one = 0
    peak_sum = 0
    seen: set[int] = set()
    handles: dict[int, int] = {}
    c = PMC()
    c.cb = ctypes.sizeof(c)
    while p.poll() is None:
        total = 0
        for pid in descendants(p.pid):
            seen.add(pid)
            if pid not in handles:
                handles[pid] = k32.OpenProcess(0x1F0FFF, False, pid)
            if handles[pid] and psapi.GetProcessMemoryInfo(handles[pid], ctypes.byref(c), c.cb):
                peak_one = max(peak_one, c.PeakWorkingSetSize)
                total += c.WorkingSetSize
        peak_sum = max(peak_sum, total)
        time.sleep(0.05)
    elapsed = time.perf_counter() - start
    print(f"MEASURE exit={p.returncode} wall_s={elapsed:.1f} peak_working_set_one_process_mb={peak_one / 1048576:.0f} "
          f"peak_working_set_sum_of_tree_mb={peak_sum / 1048576:.0f} processes_seen={len(seen)}")
    return p.returncode


sys.exit(main())
```

```
$ python measure.py repo -- python bake_run.py <the copy>      (one run; the venv python)
BAKE cases=16 seconds=677.5 data_derived_bytes_after=4168041 root=<the copy>\data\derived
MEASURE exit=0 wall_s=677.9 peak_working_set_one_process_mb=258 peak_working_set_sum_of_tree_mb=269 processes_seen=2
$ diff -rq <the copy>/data/derived <the repository>/data/derived
(no output, exit 0)
```

The full bake of 16 cases takes 677.5 s (11.3 minutes) and peaks at 258 MB of working set in one process. It wrote
4,168,041 bytes, and every file is byte-identical to the committed artifacts, which is the reproducibility the release
depends on. The sizing's 678 s is this measurement.

## The tests: time and memory

`python -m pytest` from the repository root, in the worktree with `npm ci` done (the planted-defect suite needs the shell's
installed schema and the web guards need the shell), the temp root pointed at the device's temp root so the plants' copies
land there. The same wrapper measures it. The second run is the one recorded here; the first (213.6 s) measured the same
tests.

```
$ python measure.py . -- python -m pytest -p no:cacheprovider
610 passed, 2 xfailed, 1 warning in 221.85s (0:03:41)
MEASURE exit=0 wall_s=222.7 peak_working_set_one_process_mb=315 peak_working_set_sum_of_tree_mb=340 processes_seen=1276
$ python measure.py . -- python -m pytest tests/adversarial -p no:cacheprovider        (the one suite CI runs)
441 passed, 2 xfailed in 128.30s (0:02:08)
MEASURE exit=0 wall_s=128.7 peak_working_set_one_process_mb=195 peak_working_set_sum_of_tree_mb=157 processes_seen=1227
```

All tests take 222 s and peak at 315 MB in the pytest process (340 MB summed over the processes polled at one instant).
The two `xfailed` are the design guards on the real tree, which fail until the design document is written to them. The
planted-defect suite alone takes 128 s: each plant copies the repository's files and runs a guard as a subprocess, so the
time is file copies and process starts, not computation.

## The site: install, test and build

On the `git archive` copy, with a warm npm cache (the cold-cache time is longer and was not measured).

```
$ cd frontend && time npm ci
added 131 packages, and audited 132 packages in 11s
real	0m10.865s
$ du -sk node_modules | cut -f1
191110
$ find node_modules -type f | wc -l
13146
$ time npm test
ℹ tests 141
ℹ pass 141
ℹ fail 0
ℹ duration_ms 1083.4121
real	0m1.498s
$ time npm run build
[copy-data] 16 cases + benchmark copied, 3710 kB
✓ built in 2.59s
[spa-404] 404.html + 6 routes materialised for 200 responses
real	0m5.849s
```

`npm ci` takes 10.9 s and installs 131 packages (191 MB, 13,146 files in `node_modules`), `npm test` runs 141 tests in 1.1 s,
and the build takes 5.8 s including the type check and the route files. The build prints a bundle warning for the 1.69 MB
main script; the measurement is the size below.

## The deploy payload

The deploy uploads `frontend/dist` (`path: frontend/dist` of the Pages upload in `.github/workflows/deploy-pages.yml`).

```
$ find dist -type f | xargs du -cb | tail -1
7089412	total
$ find dist -type f | wc -l
122
$ find dist/data -type f | xargs du -cb | tail -1      (the artifacts the site serves)
4168041	total
$ find dist -type f -not -path 'dist/data/*' | xargs du -cb | tail -1      (the site itself)
2921371	total
$ find dist -name '*.woff*' -o -name '*.ttf' | xargs du -cb | tail -1      (the KaTeX fonts)
1072948	total
$ find dist/assets -name 'index-*.js' | xargs du -cb | tail -1      (the main script)
1690887	total
$ du -sk dist | cut -f1
7209
```

The deploy payload is the whole of `frontend/dist`: 7,089,412 bytes (6.8 MiB) in 122 files, made of 2,921,371 bytes of site
files (1,072,948 of them KaTeX fonts, 1,690,887 the main script) and 4,168,041 bytes of artifacts, the same bytes as
`data/derived`. The `copy-data` step reports 3710 kB for the files the site reads of the 4,168,041 bytes (the index and the
manifests are copied as well, in `dist/data`).
