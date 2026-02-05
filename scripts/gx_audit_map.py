#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
from collections import defaultdict, deque
from pathlib import Path
from typing import Dict, List, Set

ROOT = Path(__file__).resolve().parents[1]  # galaxy-iep-accommodations
SRC = ROOT / "src"
SCRIPTS = ROOT / "scripts"
AUDIT_DIR = ROOT / "audit"
AUDIT_DIR.mkdir(exist_ok=True)

SCAN_EXTS = {".ts", ".tsx", ".js", ".jsx", ".py"}

IMPORT_RE = re.compile(
    r"""(?:import\s+(?:type\s+)?[^;]*?\s+from\s+["'](?P<mod>[^"']+)["']|require\(\s*["'](?P<req>[^"']+)["']\s*\))"""
)
FETCH_API_RE = re.compile(r"""fetch\(\s*["'](?P<url>/api/[^"']+)["']""")
NEXT_API_ROUTE_RE = re.compile(r"""^src/app/api/(?P<route>.+)/route\.ts$""")
PIPELINE_STEP_RE = re.compile(r"""\[\s*["'](?P<script>[\w./-]+\.py)["']""")
OUTPUT_HINT_RE = re.compile(r"""output[/\\]_runs|_runs[/\\][^/\\]+[/\\]artifacts""", re.I)

DEFAULT_SEED_HINTS = [
    "src/components/galaxy/UploadCard.tsx",
    "src/app/api/run/route.ts",
    "src/app/api/upload/route.ts",
    "src/app/api/case-managers/route.ts",
    "src/app/api/artifacts",
]

def rel(p: Path) -> str:
    try:
        return p.relative_to(ROOT).as_posix()
    except Exception:
        return p.as_posix()

def read_text(p: Path) -> str:
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""

def is_code_file(p: Path) -> bool:
    return p.is_file() and p.suffix.lower() in SCAN_EXTS

def walk_files(base: Path) -> List[Path]:
    out: List[Path] = []
    for dirpath, dirnames, filenames in os.walk(base):
        ignore = {"node_modules", ".next", ".git", "dist", "build", "__pycache__", ".venv", "venv"}
        dirnames[:] = [d for d in dirnames if d not in ignore and not d.startswith(".")]
        for fn in filenames:
            p = Path(dirpath) / fn
            if is_code_file(p):
                out.append(p)
    return out

def normalize_api_route(route_file_rel: str) -> str:
    rp = route_file_rel.replace("\\", "/")
    if not rp.startswith("src/app/api/"):
        return ""
    rp = rp[len("src/app/api/") :]
    rp = rp.removesuffix("/route.ts").removesuffix("route.ts")
    rp = rp.strip("/")
    return "/api/" + rp

def resolve_ts_import(importer: Path, spec: str) -> str:
    if spec.startswith("."):
        base = (importer.parent / spec).resolve()
        candidates: List[Path] = []
        if base.suffix:
            candidates.append(base)
        else:
            for ext in [".ts", ".tsx", ".js", ".jsx"]:
                candidates.append(Path(str(base) + ext))
            for ext in [".ts", ".tsx", ".js", ".jsx"]:
                candidates.append(base / ("index" + ext))
        for c in candidates:
            if c.exists():
                return rel(c)
        return rel(base)

    if spec.startswith("@/"):
        candidate = SRC / spec[2:]
        for ext in [".ts", ".tsx", ".js", ".jsx"]:
            c = Path(str(candidate) + ext)
            if c.exists():
                return rel(c)
        for ext in [".ts", ".tsx", ".js", ".jsx"]:
            c = candidate / ("index" + ext)
            if c.exists():
                return rel(c)
        return rel(candidate)

    return ""  # external deps ignored

def node_kind(n: str) -> str:
    if n.startswith("/api/"):
        return "api"
    if n.startswith("src/app/api/") and n.endswith("/route.ts"):
        return "api_route_file"
    if n.startswith("src/components/") or n.endswith(".tsx"):
        return "ui"
    if n.startswith("scripts/") and n.endswith(".py"):
        return "py_script"
    if "output/" in n or "_runs/" in n or "artifacts" in n:
        return "output"
    if n.startswith("src/"):
        return "src_other"
    return "other"

def build_graph() -> Dict:
    nodes: Set[str] = set()
    edges: List[Dict] = []

    src_files = walk_files(SRC) if SRC.exists() else []
    script_files = walk_files(SCRIPTS) if SCRIPTS.exists() else []

    for p in src_files:
        nodes.add(rel(p))
    for p in script_files:
        nodes.add(rel(p))

    api_route_files = [p for p in src_files if "src/app/api/" in rel(p) and p.name == "route.ts"]
    api_routes: Dict[str, str] = {}
    for p in api_route_files:
        rp = rel(p)
        if NEXT_API_ROUTE_RE.match(rp):
            api = normalize_api_route(rp)
            if api:
                api_routes[rp] = api
                nodes.add(api)

    for p in src_files:
        if p.suffix.lower() not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        t = read_text(p)
        a = rel(p)

        for m in IMPORT_RE.finditer(t):
            spec = m.group("mod") or m.group("req") or ""
            dep = resolve_ts_import(p, spec) if spec else ""
            if dep:
                edges.append({"from": a, "to": dep, "type": "import"})
                nodes.add(dep)

        for m in FETCH_API_RE.finditer(t):
            api = m.group("url")
            edges.append({"from": a, "to": api, "type": "fetch"})
            nodes.add(api)

        if OUTPUT_HINT_RE.search(t):
            edges.append({"from": a, "to": "output/_runs/**/artifacts", "type": "writes"})
            nodes.add("output/_runs/**/artifacts")

    for file_rel, api_path in api_routes.items():
        edges.append({"from": api_path, "to": file_rel, "type": "implements"})

    run_route = ROOT / "src/app/api/run/route.ts"
    if run_route.exists():
        run_text = read_text(run_route)
        scripts = set(m.group("script") for m in PIPELINE_STEP_RE.finditer(run_text))
        for s in sorted(scripts):
            py = f"scripts/{s}" if not s.startswith("scripts/") else s
            edges.append({"from": rel(run_route), "to": py, "type": "spawns"})
            nodes.add(py)
        edges.append({"from": rel(run_route), "to": "output/_runs/**/artifacts", "type": "writes"})
        nodes.add("output/_runs/**/artifacts")

    return {"root": rel(ROOT), "nodes": sorted(nodes), "edges": edges}

def prune_to_built(graph: Dict, seeds: List[str], max_hops: int = 6) -> Dict:
    nodes = set(graph["nodes"])
    edges = graph["edges"]

    adj = defaultdict(set)
    radj = defaultdict(set)
    for e in edges:
        adj[e["from"]].add(e["to"])
        radj[e["to"]].add(e["from"])

    seed_nodes: Set[str] = set()
    for s in seeds:
        if s in nodes:
            seed_nodes.add(s)
            continue
        for n in nodes:
            if s in n:
                seed_nodes.add(n)

    if not seed_nodes:
        seed_nodes = {n for n in nodes if str(n).startswith("/api/")}

    keep: Set[str] = set(seed_nodes)
    dq = deque([(sn, 0) for sn in seed_nodes])

    while dq:
        cur, d = dq.popleft()
        if d >= max_hops:
            continue
        for nxt in adj.get(cur, set()):
            if nxt not in keep:
                keep.add(nxt)
                dq.append((nxt, d + 1))
        for prv in radj.get(cur, set()):
            if prv not in keep:
                keep.add(prv)
                dq.append((prv, d + 1))

    new_edges = [e for e in edges if e["from"] in keep and e["to"] in keep]
    return {"root": graph["root"], "nodes": sorted(keep), "edges": new_edges}

def write_dot(graph: Dict) -> str:
    lines: List[str] = []
    lines.append("digraph GX {")
    lines.append('  rankdir="LR";')
    lines.append('  node [shape=box, fontsize=10];')
    for n in graph["nodes"]:
        safe = str(n).replace('"', '\\"')
        lines.append(f'  "{safe}";')
    for e in graph["edges"]:
        a = str(e["from"]).replace('"', '\\"')
        b = str(e["to"]).replace('"', '\\"')
        label = str(e["type"]).replace('"', '\\"')
        lines.append(f'  "{a}" -> "{b}" [label="{label}"];')
    lines.append("}")
    return "\n".join(lines)

def write_html(graph: Dict) -> str:
    colors = {
        "ui": "#A855F7",
        "api": "#22D3EE",
        "api_route_file": "#60A5FA",
        "py_script": "#F59E0B",
        "output": "#34D399",
        "src_other": "#9CA3AF",
        "other": "#6B7280",
    }
    edge_colors = {
        "fetch": "#22D3EE",
        "implements": "#60A5FA",
        "import": "#9CA3AF",
        "spawns": "#F59E0B",
        "writes": "#34D399",
    }

    idx: Dict[str, int] = {}
    nodes_list = []
    for i, n in enumerate(graph["nodes"]):
        idx[n] = i
        k = node_kind(str(n))
        nodes_list.append({
            "id": i,
            "label": n,
            "color": {"background": colors.get(k, "#6B7280"), "border": "rgba(255,255,255,0.20)"},
            "font": {"color": "#fff"},
            "kind": k,
        })

    edges_list = []
    for j, e in enumerate(graph["edges"]):
        f = idx.get(e["from"])
        t = idx.get(e["to"])
        if f is None or t is None:
            continue
        et = e["type"]
        edges_list.append({
            "id": j,
            "from": f,
            "to": t,
            "label": et,
            "arrows": "to",
            "color": {"color": edge_colors.get(et, "#9CA3AF")},
            "type": et,
        })

    payload = json.dumps({"nodes": nodes_list, "edges": edges_list})

    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>SpEdGalexii GX Map (Minimal)</title>
  <style>
    html, body {{ height: 100%; margin: 0; background: #060614; color: #fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }}
    #wrap {{ display:flex; height:100%; }}
    #left {{ width: 360px; padding: 14px; border-right: 1px solid rgba(255,255,255,.12); overflow:auto; }}
    #graph {{ flex: 1; }}
    input {{ width: 100%; padding: 10px; border-radius: 10px; border:1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.06); color:#fff; }}
    .row {{ margin-top: 10px; display:flex; gap:10px; flex-wrap:wrap; }}
    label {{ display:flex; align-items:center; gap:8px; font-size: 13px; opacity:.92; }}
    .hint {{ opacity:.75; font-size: 12px; line-height:1.4; margin-top:10px; }}
    .chip {{ display:inline-block; padding: 3px 8px; border-radius: 999px; border:1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); font-size:12px; }}
  </style>
</head>
<body>
  <div id="wrap">
    <div id="left">
      <h2 style="margin:0 0 10px 0;">GX Map (Minimal) ✨</h2>
      <input id="q" placeholder="Search nodes (UploadCard, /api/run, 06_required_output.py)..." />

      <div class="row">
        <div class="chip">UI</div>
        <div class="chip">API</div>
        <div class="chip">Scripts</div>
        <div class="chip">Output</div>
      </div>

      <div class="hint">Toggle edge types to reduce noise.</div>

      <div class="row" style="margin-top:12px;">
        <label><input type="checkbox" class="etype" value="fetch" checked /> fetch</label>
        <label><input type="checkbox" class="etype" value="implements" checked /> implements</label>
        <label><input type="checkbox" class="etype" value="import" checked /> import</label>
        <label><input type="checkbox" class="etype" value="spawns" checked /> spawns</label>
        <label><input type="checkbox" class="etype" value="writes" checked /> writes</label>
      </div>

      <div class="hint" style="margin-top:12px;">
        Tip: Uncheck <b>import</b> to see only UI → API → scripts → output.
      </div>
    </div>

    <div id="graph"></div>
  </div>

  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <script>
    const data = {payload};
    const nodes = new vis.DataSet(data.nodes);
    const edges = new vis.DataSet(data.edges);

    const container = document.getElementById("graph");
    const network = new vis.Network(container, {nodes, edges}, {
      autoResize: true,
      physics: { stabilization: true },
      interaction: { hover: true },
      edges: { font: { align: "middle", color: "#fff" } },
    });

    function applyFilters() {
      const term = document.getElementById("q").value.trim().toLowerCase();
      const allowed = new Set(Array.from(document.querySelectorAll(".etype"))
        .filter(cb => cb.checked)
        .map(cb => cb.value));

      nodes.forEach(n => {
        const hit = !term || (n.label || "").toLowerCase().includes(term);
        nodes.update({id: n.id, hidden: !hit});
      });

      edges.forEach(e => {
        const from = nodes.get(e.from);
        const to = nodes.get(e.to);
        const visible = allowed.has(e.type) && from && to && !from.hidden && !to.hidden;
        edges.update({id: e.id, hidden: !visible});
      });
    }

    document.getElementById("q").addEventListener("input", applyFilters);
    document.querySelectorAll(".etype").forEach(cb => cb.addEventListener("change", applyFilters));

    applyFilters();
    network.fit();
  </script>
</body>
</html>
"""

def main() -> None:
    g = build_graph()
    pruned = prune_to_built(g, seeds=DEFAULT_SEED_HINTS, max_hops=6)

    (AUDIT_DIR / "graph.json").write_text(json.dumps(pruned, indent=2), encoding="utf-8")
    (AUDIT_DIR / "graph.dot").write_text(write_dot(pruned), encoding="utf-8")
    (AUDIT_DIR / "graph.html").write_text(write_html(pruned), encoding="utf-8")

    print("✅ Wrote:")
    print(" - audit/graph.json")
    print(" - audit/graph.dot")
    print(" - audit/graph.html")
    print("Open:")
    print("  open audit/graph.html")

if __name__ == "__main__":
    main()
