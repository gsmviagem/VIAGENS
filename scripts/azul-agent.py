#!/usr/bin/env python3
"""
Azul Sync Agent — roda em background, poleia Supabase e executa extração automática.
Instalar como tarefa do Windows: scripts\azul-agent-install.bat
"""
import sys, os, json, time, subprocess, urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
SUPA_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://gvoqerbrzvyzarxqpwvd.supabase.co")
SUPA_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_8L84Hb3ctwEsUf86wWVjrA_iC-DFbl3")
POLL_INTERVAL = 20  # segundos

def supa_get(path):
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/{path}",
        headers={"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}"}
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

def supa_upsert(table, body, on_conflict):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/{table}",
        data=data,
        headers={
            "apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}",
            "Content-Type": "application/json",
            "Prefer": f"resolution=merge-duplicates,return=minimal"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status

def get_job():
    rows = supa_get("settings?key=eq.azul_sync_job&select=value,updated_at")
    if not rows:
        return None
    val = rows[0].get("value", {})
    if isinstance(val, str):
        val = json.loads(val)
    return val if val.get("status") == "pending" else None

def run_extraction(cpf, password, account_id):
    print(f"[AGENT] Extraindo CPF {cpf}...", flush=True)
    supa_upsert("settings", {
        "key": "azul_sync_job",
        "value": json.dumps({"status": "running", "cpf": cpf, "account_id": account_id, "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}),
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }, "key")

    result = subprocess.run(
        [sys.executable, str(SCRIPT_DIR / "azul-extract.py"), cpf, password],
        capture_output=True, text=True, encoding="utf-8", errors="replace"
    )
    output = result.stdout + result.stderr
    print(output, flush=True)

    count = 0
    for line in output.splitlines():
        if "emissões salvas" in line or "emiss" in line.lower():
            import re
            m = re.search(r"(\d+) de \d+", line)
            if m:
                count = int(m.group(1))

    status = "done" if result.returncode == 0 else "error"
    supa_upsert("settings", {
        "key": "azul_sync_job",
        "value": json.dumps({"status": status, "count": count, "account_id": account_id, "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}),
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }, "key")
    print(f"[AGENT] Concluído: {status}, {count} emissões.", flush=True)

def main():
    print(f"[AGENT] Iniciado. Poleia a cada {POLL_INTERVAL}s...", flush=True)
    while True:
        try:
            job = get_job()
            if job:
                run_extraction(job["cpf"], job["password"], job.get("account_id"))
        except Exception as e:
            print(f"[AGENT] Erro: {e}", flush=True)
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
