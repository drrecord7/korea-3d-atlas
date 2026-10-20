import http.server
import socketserver
import urllib.parse
import urllib.request
import json
import math
import os

PORT = 8787
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

def wgs84_to_wtm(lat_deg, lon_deg):
    """Convert WGS84 (lat, lon) to Korea GRS80 WTM (EPSG:5181) coordinates."""
    a = 6378137.0
    f = 1 / 298.257222101
    k0 = 1.0
    lat0 = math.radians(38.0)
    lon0 = math.radians(127.0)
    x0 = 200000.0
    y0 = 500000.0

    e2 = 2 * f - f * f
    ep2 = e2 / (1 - e2)
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)

    def meridian_arc(phi):
        return a * (
            (1 - e2 / 4 - 3 * e2**2 / 64 - 5 * e2**3 / 256) * phi
            - (3 * e2 / 8 + 3 * e2**2 / 32 + 45 * e2**3 / 1024) * math.sin(2 * phi)
            + (15 * e2**2 / 256 + 45 * e2**3 / 1024) * math.sin(4 * phi)
            - (35 * e2**3 / 3072) * math.sin(6 * phi)
        )

    M = meridian_arc(lat)
    M0 = meridian_arc(lat0)
    N = a / math.sqrt(1 - e2 * math.sin(lat) ** 2)
    T = math.tan(lat) ** 2
    C = ep2 * math.cos(lat) ** 2
    A = (lon - lon0) * math.cos(lat)

    x = x0 + k0 * N * (
        A
        + (1 - T + C) * A**3 / 6
        + (5 - 18 * T + T**2 + 72 * C - 58 * ep2) * A**5 / 120
    )
    y = y0 + k0 * (
        M
        - M0
        + N
        * math.tan(lat)
        * (
            A**2 / 2
            + (5 - T + 9 * C + 4 * C**2) * A**4 / 24
            + (61 - 58 * T + T**2 + 600 * C - 330 * ep2) * A**6 / 720
        )
    )
    return round(x, 2), round(y, 2)


def compute_bearing(lat1, lon1, lat2, lon2):
    """Compute compass bearing (0-360 deg) from (lat1, lon1) looking toward (lat2, lon2)."""
    dist_lat = abs(lat1 - lat2)
    dist_lon = abs(lon1 - lon2)
    if dist_lat < 1e-6 and dist_lon < 1e-6:
        return None
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_lon = math.radians(lon2 - lon1)
    y = math.sin(d_lon) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lon)
    brng = math.degrees(math.atan2(y, x))
    return round((brng + 360) % 360, 1)


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)


def fetch_rv_nodes(px, py, rad=300, page_size=60):
    url = (
        f"https://rv.map.kakao.com/roadview-search/v2/nodes"
        f"?PX={px}&PY={py}&RAD={rad}&PAGE_SIZE={page_size}"
        f"&INPUT_COORD_SYSTEM=WTM&SERVICE=glpano"
    )
    req = urllib.request.Request(
        url,
        headers={
            "Referer": "https://map.kakao.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=3.5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("street_view", {}).get("streetList") or []
    except Exception:
        return []


def format_rv_node(node, target_lat, target_lng):
    n_lat = float(node.get("wgsy", target_lat))
    n_lng = float(node.get("wgsx", target_lng))
    dist_m = haversine_m(target_lat, target_lng, n_lat, n_lng)
    bearing = compute_bearing(n_lat, n_lng, target_lat, target_lng)
    if bearing is None:
        bearing = float(node.get("angle", 0))
    panoid = node.get("id")
    wcongx = node.get("wcongx")
    wcongy = node.get("wcongy")
    embed_url = (
        f"https://map.kakao.com/?panoid={panoid}&pan={bearing}"
        f"&zoom=0&map_type=TYPE_MAP&map_attribute=ROADVIEW"
        f"&urlX={wcongx}&urlY={wcongy}&urlLevel=3"
    )
    link_url = f"https://map.kakao.com/link/roadview/{n_lat},{n_lng}"
    return {
        "panoid": panoid,
        "lat": n_lat,
        "lng": n_lng,
        "pan": bearing,
        "distance_m": dist_m,
        "addr": node.get("addr", ""),
        "shot_date": str(node.get("shot_date", ""))[:10],
        "st_name": node.get("st_name") or "",
        "embed_url": embed_url,
        "link_url": link_url,
    }


def find_nearest_kakao_roadview(lat, lng):
    wtmx, wtmy = wgs84_to_wtm(lat, lng)
    # 1. Query center (RAD=300, PAGE_SIZE=60)
    candidates = fetch_rv_nodes(wtmx, wtmy, rad=300, page_size=60)
    closest_any = None
    if candidates:
        closest_any = min(
            candidates,
            key=lambda n: haversine_m(
                lat, lng, float(n.get("wgsy", lat)), float(n.get("wgsx", lng))
            ),
        )

    modern = [n for n in candidates if str(n.get("shot_date", "")) >= "2018"]

    # 2. If no modern node found at center (e.g., deep inside a palace, crater, or mountain peak),
    # probe a ring at ~160m, ~420m, and ~850m offsets
    if not modern:
        offsets = [
            (0, -160), (0, 160), (-160, 0), (160, 0),
            (0, -420), (0, 420), (-420, 0), (420, 0),
            (-320, -320), (320, -320), (-320, 320), (320, 320),
            (0, -850), (0, 850), (-850, 0), (850, 0),
        ]
        for dx, dy in offsets:
            ring_nodes = fetch_rv_nodes(round(wtmx + dx, 1), round(wtmy + dy, 1), rad=300, page_size=50)
            if ring_nodes:
                candidates.extend(ring_nodes)
                modern = [n for n in candidates if str(n.get("shot_date", "")) >= "2018"]
                if modern:
                    break

    pool = modern if modern else candidates
    if pool:
        best = min(
            pool,
            key=lambda n: haversine_m(
                lat, lng, float(n.get("wgsy", lat)), float(n.get("wgsx", lng))
            ),
        )
        primary = format_rv_node(best, lat, lng)
        result = {"ok": True, **primary, "walk_node": None}
        if closest_any and closest_any.get("id") != best.get("id"):
            walk_info = format_rv_node(closest_any, lat, lng)
            if walk_info["distance_m"] + 40 < primary["distance_m"]:
                result["walk_node"] = walk_info
        return result

    fallback_url = f"https://map.kakao.com/link/roadview/{lat},{lng}"
    return {
        "ok": False,
        "lat": lat,
        "lng": lng,
        "distance_m": 0,
        "addr": "",
        "shot_date": "",
        "embed_url": fallback_url,
        "link_url": fallback_url,
    }


class AtlasHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/kakao-rv":
            qs = urllib.parse.parse_qs(parsed.query)
            try:
                lat = float(qs.get("lat", ["37.5796"])[0])
                lng = float(qs.get("lng", ["126.9770"])[0])
            except ValueError:
                lat, lng = 37.5796, 126.9770

            fmt = qs.get("format", ["json"])[0]
            info = find_nearest_kakao_roadview(lat, lng)

            if fmt == "redirect":
                self.send_response(302)
                self.send_header("Location", info["embed_url"])
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                return

            payload = json.dumps(info, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "public, max-age=3600")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        return super().do_GET()

    def log_message(self, format, *args):
        pass


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    print(f"Starting Korea 3D Travel Atlas Server on http://127.0.0.1:{PORT}")
    server = ThreadedHTTPServer(("127.0.0.1", PORT), AtlasHandler)
    server.serve_forever()
