#!/usr/bin/env python3
"""
Azul Pelo Mundo extractor via stealth-browser server.
Usage:
  python scripts/azul-extract.py <cpf> <senha>          # incremental (para no 1º já existente)
  python scripts/azul-extract.py <cpf> <senha> --full   # extrai tudo sem verificar base
"""
import sys, json, time, urllib.request, subprocess, os, re
from pathlib import Path

CPF      = sys.argv[1] if len(sys.argv) > 1 else None
PASSWORD = sys.argv[2] if len(sys.argv) > 2 else None
FULL     = "--full" in sys.argv

if not CPF or not PASSWORD:
    print("Uso: python scripts/azul-extract.py <cpf> <senha> [--full]", file=sys.stderr)
    sys.exit(1)

SKILL_DIR  = Path(os.environ.get("USERPROFILE", Path.home())) / ".claude/skills/stealth-browser"
SERVER_URL = "http://localhost:6222"
HUB_URL    = "https://gsmviagem.vercel.app/api/sync/azul"
LOCATORS_URL = "https://gsmviagem.vercel.app/api/sheets/locators"

# ── Stealth browser helpers ───────────────────────────────────────────────────

def server_ready():
    try:
        r = urllib.request.urlopen(f"{SERVER_URL}/", timeout=2)
        return r.status == 200
    except Exception:
        return False

def start_server():
    python = str(SKILL_DIR / "venv/Scripts/python.exe")
    server = str(SKILL_DIR / "server.py")
    env = os.environ.copy()
    env["PORT"] = "6222"
    env["HEADLESS"] = "false"
    flags = subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0
    proc = subprocess.Popen([python, server], env=env, cwd=str(SKILL_DIR),
                             creationflags=flags)
    print("[AZUL] Iniciando browser stealth...")
    for _ in range(60):
        time.sleep(1)
        if server_ready():
            print("[AZUL] Browser pronto.")
            return proc
    raise RuntimeError("Stealth browser nao iniciou em 60s")

def api_post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(f"{SERVER_URL}{path}", data=data,
                                  headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

def set_react_input(page_name, selector, value):
    escaped = value.replace("'", "\\'").replace('"', '\\"')
    api_post(f"/pages/{page_name}/evaluate", {"script": f"""
      (() => {{
        const el = document.querySelector('{selector}');
        if (!el) return 'not found';
        const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        d.set.call(el, '{escaped}');
        el.dispatchEvent(new Event('input', {{bubbles:true}}));
        el.dispatchEvent(new Event('change', {{bubbles:true}}));
        return el.value;
      }})()
    """})

def goto(page_name, url):
    api_post(f"/pages/{page_name}/goto", {"url": url})

def click(page_name, selector):
    return api_post(f"/pages/{page_name}/click", {"selector": selector})

def login(page_name):
    print("[AZUL] Abrindo pagina de login...")
    goto(page_name, "https://azulpelomundo.voeazul.com.br/login")
    time.sleep(3)
    click(page_name, "#consultar-pnr")
    time.sleep(1)
    set_react_input(page_name, "#undefined_loginField", CPF)
    time.sleep(0.2)
    set_react_input(page_name, "#undefined_passwordField", PASSWORD)
    time.sleep(0.2)
    api_post(f"/pages/{page_name}/evaluate", {"script": "document.querySelector('#btnLogin').click()"})
    print("[AZUL] Login enviado, aguardando...")
    time.sleep(7)
    result = api_post(f"/pages/{page_name}/evaluate", {"script": "window.location.href"})
    url = result.get("result", "")
    if isinstance(url, dict):
        url = url.get("value", "")
    if "searchResult" not in str(url):
        raise RuntimeError(f"Login falhou, URL: {url}")
    print("[AZUL] Login ok!")

def capture_bookings(page_name):
    print("[AZUL] Capturando emissoes (aguarde ~30s)...")
    data = json.dumps({
        "url": "https://azulpelomundo.voeazul.com.br/searchResult",
        "intercept_url_fragment": "booking/search",
        "timeout": 120000
    }).encode()
    req = urllib.request.Request(
        f"{SERVER_URL}/pages/{page_name}/goto_intercept",
        data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=130) as r:
        resp = json.loads(r.read())
    bookings = resp.get("data", [])
    if not isinstance(bookings, list):
        raise RuntimeError(f"Dados inesperados: {str(bookings)[:100]}")
    print(f"[AZUL] {len(bookings)} emissoes capturadas!")
    return bookings

# ── Data helpers ──────────────────────────────────────────────────────────────

def to_iso_date(d):
    if not d:
        return d
    parts = d.split("/")
    if len(parts) == 3 and len(parts[2]) == 4:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return d

CANCELLED_STATUSES = {"CANCEL", "REFUND", "REEMBOLSO", "ESTORNO", "VOID", "CANCELADO", "REFUNDADO"}

def is_cancelled(booking):
    status = str(booking.get("status") or "").upper()
    return any(s in status for s in CANCELLED_STATUSES)

def map_booking(b):
    item   = (b.get("cart") or {}).get("items", [{}])
    item   = item[0] if item else {}
    dep    = item.get("departureFlight") or {}
    ret    = item.get("returnFlight") or None
    fg     = (dep.get("flightGroup") or [{}])[0]
    totals = (b.get("cart") or {}).get("total", [])
    miles  = next((t["value"] for t in totals if t.get("currency") == "POINTS"), 0)
    cash   = next((t["value"] for t in totals if t.get("currency") == "BRL"), 0)

    # All passengers joined
    paxes = b.get("passengers") or [{}]
    pax   = paxes[0]
    all_names = " / ".join(
        f"{p.get('name','')} {p.get('lastName','')}".strip()
        for p in paxes if p.get("name") or p.get("lastName")
    ) or ""
    all_tickets = " / ".join(p.get("ticketNumber", "") for p in paxes if p.get("ticketNumber")) or pax.get("ticketNumber", "")

    # Emission date — try several field names the Azul API may use
    emission_raw = (b.get("orderDate") or b.get("issueDate") or b.get("createdAt")
                    or b.get("bookingDate") or b.get("purchaseDate") or b.get("transactionDate") or "")
    emission_date = to_iso_date(str(emission_raw)[:10]) if emission_raw else ""

    return {
        "locator":             b.get("pnrNumber"),
        "passengerName":       all_names,
        "passengerTicket":     all_tickets,
        "emissionDate":        emission_date,
        "origin":              item.get("origin", ""),
        "destination":         item.get("destination", ""),
        "flightDate":          to_iso_date(dep.get("departureDate", "")),
        "departureTime":       dep.get("departureTime", ""),
        "arrivalTime":         dep.get("finalArrivalTime", ""),
        "operatingAirline":    fg.get("operatingCarrier", ""),
        "flightNumber":        str(fg.get("flightNumber", "")),
        "flightCategory":      dep.get("category", ""),
        "isRoundTrip":         bool(ret),
        "returnDate":          to_iso_date((ret or {}).get("departureDate")),
        "returnOrigin":        (ret or {}).get("originAirport"),
        "returnDestination":   (ret or {}).get("finalDestination"),
        "returnDepartureTime": (ret or {}).get("departureTime"),
        "returnArrivalTime":   (ret or {}).get("finalArrivalTime"),
        "milesUsed":           miles,
        "cashPaid":            cash,
        "paymentCard":         ((b.get("payment") or {}).get("items") or [{}])[0].get("vendorCode", ""),
        "status":              b.get("statusAntiFraud") or b.get("status", ""),
    }

def fetch_existing_locators():
    try:
        req = urllib.request.Request(LOCATORS_URL, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
        locs = set()
        for x in data.get("locators", []):
            if x:
                for part in re.split(r'[/,]', str(x)):
                    part = part.strip().upper()
                    if part:
                        locs.add(part)
        print(f"[AZUL] {len(locs)} localizadores ja na base.")
        return locs
    except Exception as e:
        print(f"[AZUL] Aviso: nao foi possivel buscar localizadores existentes: {e}")
        return set()

def filter_new_bookings(bookings, existing):
    new = [b for b in bookings if str(b.get("locator") or "").upper() not in existing]
    skipped = len(bookings) - len(new)
    print(f"[AZUL] {len(new)} novos de {len(bookings)} total ({skipped} ja na base).")
    return new

def clear_existing_bookings():
    """Apaga todos os registros antes de reinserir."""
    supa_url = "https://gvoqerbrzvyzarxqpwvd.supabase.co"
    supa_key = "sb_publishable_8L84Hb3ctwEsUf86wWVjrA_iC-DFbl3"
    # id > 0 is a workaround to delete all rows via REST (can't DELETE without a filter)
    req = urllib.request.Request(
        f"{supa_url}/rest/v1/extracted_bookings?id=gt.00000000-0000-0000-0000-000000000000",
        headers={
            "apikey": supa_key, "Authorization": f"Bearer {supa_key}",
            "Prefer": "return=minimal"
        },
        method="DELETE"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            print(f"[AZUL] Banco limpo (HTTP {r.status}).")
    except Exception as e:
        print(f"[AZUL] Aviso: nao foi possivel limpar banco: {e}")

def post_to_hub(bookings, account_id=None):
    body = json.dumps({"cpf": CPF, "password": PASSWORD, "bookings": bookings,
                       **({"accountId": account_id} if account_id else {})}).encode()
    req = urllib.request.Request(HUB_URL, data=body,
                                  headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    account_id = os.environ.get("AZUL_ACCOUNT_ID")

    server_proc = None
    if not server_ready():
        server_proc = start_server()

    try:
        page = "azul"
        # Close stale page if it exists, then recreate fresh
        try:
            req = urllib.request.Request(f"{SERVER_URL}/pages/{page}", method="DELETE")
            urllib.request.urlopen(req, timeout=5)
        except Exception:
            pass
        api_post("/pages", {"name": page})

        login(page)
        raw = capture_bookings(page)
        bookings = [map_booking(b) for b in raw]

        # Drop cancelled/refunded bookings
        before = len(bookings)
        bookings = [b for b in bookings if not is_cancelled(b)]
        if before != len(bookings):
            print(f"[AZUL] {before - len(bookings)} canceladas ignoradas.")

        if not FULL:
            existing = fetch_existing_locators()
            bookings = filter_new_bookings(bookings, existing)
        else:
            print(f"[AZUL] Modo --full: enviando todas as {len(bookings)} emissoes.")

        print(f"[AZUL] Limpando banco antes de inserir...")
        clear_existing_bookings()

        if not bookings:
            print("[AZUL] Nenhuma emissao nova para enviar.")
            return

        print(f"[AZUL] Enviando {len(bookings)} emissoes para o hub...")
        result = post_to_hub(bookings, account_id)
        print(f"[AZUL] {result.get('message', json.dumps(result))}")
    finally:
        if server_proc:
            server_proc.terminate()

if __name__ == "__main__":
    main()
