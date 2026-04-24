#!/usr/bin/env python3
"""
Azul Sync Agent — roda em background, poleia Supabase e executa extração automática.
Instalar como tarefa do Windows: scripts\azul-agent-install.bat
"""
import sys, os, json, time, subprocess, urllib.request, re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SCRIPT_DIR = Path(__file__).parent
SUPA_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://gvoqerbrzvyzarxqpwvd.supabase.co")
SUPA_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_8L84Hb3ctwEsUf86wWVjrA_iC-DFbl3")
POLL_INTERVAL = 20
MAX_PARALLEL  = 4

def log(msg):
    try:
        print(msg, flush=True)
    except Exception:
        print(msg.encode('ascii', errors='replace').decode(), flush=True)

def supa_get(path):
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/{path}",
        headers={"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}"}
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

def supa_upsert(table, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{SUPA_URL}/rest/v1/{table}",
        data=data,
        headers={
            "apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status

def get_pending_jobs():
    rows = supa_get("settings?key=like.azul_sync_job_%25&select=key,value,updated_at")
    jobs = []
    now = time.time()
    for row in rows:
        val = row.get("value", {})
        if isinstance(val, str):
            try:
                val = json.loads(val)
            except Exception:
                continue
        status = val.get("status")
        if status == "pending":
            jobs.append({"key": row["key"], **val})
        elif status == "running":
            # Resume stuck jobs (running > 10 min without update)
            updated = row.get("updated_at", "")
            try:
                import datetime
                dt = datetime.datetime.fromisoformat(updated.replace("Z", "+00:00"))
                age = now - dt.timestamp()
                if age > 600:
                    log(f"[AGENT] Job travado detectado: {row['key']} ({int(age)}s) — retomando.")
                    jobs.append({"key": row["key"], **val})
            except Exception:
                pass
    return jobs

def set_job_status(key, status, count=None, error=None, base_val=None):
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    # Start from existing job data so cpf/password are never lost
    val = dict(base_val) if base_val else {}
    val["status"] = status
    val["updated_at"] = now
    if count is not None:
        val["count"] = count
    if error:
        val["error"] = error[:300]
    # Strip password from done/error states for cleanliness
    if status in ("done", "error"):
        val.pop("password", None)
    supa_upsert("settings", {"key": key, "value": json.dumps(val), "updated_at": now})

def lookup_account(account_id):
    rows = supa_get(f"airline_accounts?id=eq.{account_id}&select=login_cpf,password")
    if rows:
        return rows[0]["login_cpf"], rows[0]["password"]
    return None, None

def run_extraction(job):
    key = job["key"]
    cpf = job.get("cpf")
    password = job.get("password")

    if (not cpf or not password) and job.get("account_id"):
        cpf, password = lookup_account(job["account_id"])

    if not cpf or not password:
        log(f"[AGENT] {key}: sem CPF/senha — ignorando job corrompido.")
        set_job_status(key, "error", error="missing cpf/password", base_val=job)
        return

    log(f"[AGENT] Extraindo CPF {cpf} (job: {key})...")

    set_job_status(key, "running", base_val=job)

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    if job.get("account_id"):
        env["AZUL_ACCOUNT_ID"] = str(job["account_id"])
    cmd = [sys.executable, str(SCRIPT_DIR / "azul-extract.py"), cpf, password]
    if job.get("full"):
        cmd.append("--full")
    result = subprocess.run(cmd, capture_output=True, encoding="utf-8", errors="replace", env=env)

    output = (result.stdout or "") + (result.stderr or "")
    count = 0
    for line in output.splitlines():
        m = re.search(r"(\d+) de \d+ emiss", line)
        if m:
            count = int(m.group(1))

    if result.returncode == 0:
        set_job_status(key, "done", count=count, base_val=job)
        log(f"[AGENT] {key}: OK, {count} emissoes salvas.")
    else:
        err = output[-300:].strip()
        set_job_status(key, "error", error=err, base_val=job)
        log(f"[AGENT] {key}: ERRO — {err[:120]}")

def write_heartbeat():
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    supa_upsert("settings", {"key": "azul_agent_heartbeat",
                              "value": json.dumps({"ts": now}), "updated_at": now})

def main():
    log(f"[AGENT] Iniciado. Poleia a cada {POLL_INTERVAL}s (paralelo: {MAX_PARALLEL})...")
    while True:
        try:
            write_heartbeat()
            jobs = get_pending_jobs()
            if jobs:
                with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as pool:
                    list(pool.map(run_extraction, jobs))
        except Exception as e:
            log(f"[AGENT] Erro no ciclo: {e}")
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
