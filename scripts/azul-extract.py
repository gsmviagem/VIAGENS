#!/usr/bin/env python3
"""
Azul Pelo Mundo extractor via stealth-browser server.
Usage: python scripts/azul-extract.py <cpf> <senha>
"""
import sys, json, time, http.client, urllib.request, subprocess, os, signal
from pathlib import Path

CPF = sys.argv[1] if len(sys.argv) > 1 else None
PASSWORD = sys.argv[2] if len(sys.argv) > 2 else None
if not CPF or not PASSWORD:
    print("Uso: python scripts/azul-extract.py <cpf> <senha>", file=sys.stderr)
    sys.exit(1)

SKILL_DIR = Path(os.environ.get("USERPROFILE", Path.home())) / ".claude/skills/stealth-browser"
SERVER_URL = "http://localhost:6222"
HUB_URL = "https://gsmviagem.vercel.app/api/sync/azul"

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
    proc = subprocess.Popen([python, server], env=env, cwd=str(SKILL_DIR),
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("[AZUL] Iniciando browser stealth...")
    for _ in range(20):
        time.sleep(1)
        if server_ready():
            print("[AZUL] Browser pronto.")
            return proc
    raise RuntimeError("Stealth browser não iniciou em 20s")

def api_post(path, body):
    import json as _json
    data = _json.dumps(body).encode()
    req = urllib.request.Request(f"{SERVER_URL}{path}", data=data,
                                  headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=10) as r:
        return _json.loads(r.read())

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

def is_logged_in(page_name):
    result = api_post(f"/pages/{page_name}/evaluate", {"script": """
      (() => {
        const text = document.body.innerText || '';
        return text.includes('Sair') || !!document.querySelector('[class*="logout"]');
      })()
    """})
    val = result.get("result")
    if isinstance(val, dict):
        return val.get("value", False)
    return bool(val)

def login(page_name):
    print("[AZUL] Abrindo página de login...")
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
    print("[AZUL] Capturando emissões (aguarde ~30s)...")
    import json as _json
    data = _json.dumps({
        "url": "https://azulpelomundo.voeazul.com.br/searchResult",
        "intercept_url_fragment": "booking/search",
        "timeout": 120000
    }).encode()
    req = urllib.request.Request(
        f"{SERVER_URL}/pages/{page_name}/goto_intercept",
        data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=130) as r:
        resp = _json.loads(r.read())
    bookings = resp.get("data", [])
    if not isinstance(bookings, list):
        raise RuntimeError(f"Dados inesperados: {str(bookings)[:100]}")
    print(f"[AZUL] {len(bookings)} emissões capturadas!")
    return bookings

def to_iso_date(d):
    if not d:
        return d
    parts = d.split("/")
    if len(parts) == 3 and len(parts[2]) == 4:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return d

def map_booking(b):
    item  = (b.get("cart") or {}).get("items", [{}])
    item  = item[0] if item else {}
    dep   = item.get("departureFlight") or {}
    ret   = item.get("returnFlight") or None
    fg    = (dep.get("flightGroup") or [{}])[0]
    totals = (b.get("cart") or {}).get("total", [])
    miles = next((t["value"] for t in totals if t.get("currency") == "POINTS"), 0)
    cash  = next((t["value"] for t in totals if t.get("currency") == "BRL"), 0)
    pax   = (b.get("passengers") or [{}])[0]
    return {
        "locator": b.get("pnrNumber"),
        "passengerName": f"{pax.get('name','')} {pax.get('lastName','')}".strip(),
        "passengerTicket": pax.get("ticketNumber", ""),
        "origin": item.get("origin", ""),
        "destination": item.get("destination", ""),
        "flightDate": to_iso_date(dep.get("departureDate", "")),
        "departureTime": dep.get("departureTime", ""),
        "arrivalTime": dep.get("finalArrivalTime", ""),
        "operatingAirline": fg.get("operatingCarrier", ""),
        "flightNumber": str(fg.get("flightNumber", "")),
        "flightCategory": dep.get("category", ""),
        "isRoundTrip": bool(ret),
        "returnDate": to_iso_date((ret or {}).get("departureDate")),
        "returnOrigin": (ret or {}).get("originAirport"),
        "returnDestination": (ret or {}).get("finalDestination"),
        "returnDepartureTime": (ret or {}).get("departureTime"),
        "returnArrivalTime": (ret or {}).get("finalArrivalTime"),
        "milesUsed": miles,
        "cashPaid": cash,
        "paymentCard": ((b.get("payment") or {}).get("items") or [{}])[0].get("vendorCode", ""),
        "status": b.get("statusAntiFraud") or b.get("status", ""),
    }

def post_to_hub(bookings):
    import json as _json
    body = _json.dumps({"cpf": CPF, "password": PASSWORD, "bookings": bookings}).encode()
    req = urllib.request.Request(HUB_URL, data=body,
                                  headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return _json.loads(r.read())

def main():
    server_proc = None
    if not server_ready():
        server_proc = start_server()

    try:
        page = "azul"
        api_post("/pages", {"name": page})  # create/get page

        login(page)
        raw = capture_bookings(page)
        bookings = [map_booking(b) for b in raw]

        print("[AZUL] Enviando para o hub...")
        result = post_to_hub(bookings)
        print(f"[AZUL] {result.get('message', json.dumps(result))}")
    finally:
        if server_proc:
            server_proc.terminate()

if __name__ == "__main__":
    main()
