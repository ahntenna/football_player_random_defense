"""
선수 사진 다운로드 스크립트 (Python 3.9+ / 표준 라이브러리만 사용)

- 영문 위키백과 문서의 대표 이미지(pageimages) 중 '자유 라이선스(pilicense=free)' 이미지만 받는다.
- 위키미디어 공용(Commons)에서 저작자/라이선스/출처 URL을 조회해 js/data/photo-credits.js 로 기록한다.
- 결과: assets/players/<id>.<ext>

사용법:
    python tools/fetch_photos.py          # 없는 사진만 받기
    python tools/fetch_photos.py --force  # 전부 다시 받기
"""
import json
import os
import re
import sys
import time
import html
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "players")
CREDITS_JS = os.path.join(ROOT, "js", "data", "photo-credits.js")
UA = "FPRD-PhotoFetcher/1.0 (non-commercial fan game asset fetcher; python-urllib)"
THUMB_SIZE = 420

# (게임 내 선수 id, 영문 위키백과 문서 제목)
TARGETS = [
    ("dembele", "Ousmane Dembélé"),
    ("yamal", "Lamine Yamal"),
    ("vitinha", "Vitinha (footballer, born February 2000)"),
    ("mbappe", "Kylian Mbappé"),
    ("kane", "Harry Kane"),
    ("haaland", "Erling Haaland"),
    ("hakimi", "Achraf Hakimi"),
    ("raphinha", "Raphinha"),
    ("salah", "Mohamed Salah"),
    ("pedri", "Pedri"),
    ("nuno_mendes", "Nuno Mendes (footballer, born 2002)"),
    ("palmer", "Cole Palmer"),
    ("donnarumma", "Gianluigi Donnarumma"),
    ("kvaratskhelia", "Khvicha Kvaratskhelia"),
    ("rice", "Declan Rice"),
    ("doue", "Désiré Doué"),
    ("joao_neves", "João Neves"),
    ("bellingham", "Jude Bellingham"),
    ("mctominay", "Scott McTominay"),
    ("lautaro", "Lautaro Martínez"),
    ("olise", "Michael Olise"),
    ("vinicius", "Vinícius Júnior"),
    ("van_dijk", "Virgil van Dijk"),
    ("lewandowski", "Robert Lewandowski"),
    ("julian_alvarez", "Julián Álvarez"),
    ("saka", "Bukayo Saka"),
    ("fabian_ruiz", "Fabián Ruiz"),
    ("gyokeres", "Viktor Gyökeres"),
    ("gabriel", "Gabriel Magalhães"),
    ("courtois", "Thibaut Courtois"),
    ("luis_diaz", "Luis Díaz (footballer, born 1997)"),
    ("caicedo", "Moisés Caicedo"),
    ("saliba", "William Saliba"),
    ("mac_allister", "Alexis Mac Allister"),
    ("wirtz", "Florian Wirtz"),
    ("valverde", "Federico Valverde"),
    ("szoboszlai", "Dominik Szoboszlai"),
    ("guirassy", "Serhou Guirassy"),
    ("dumfries", "Denzel Dumfries"),
    ("gravenberch", "Ryan Gravenberch"),
    ("marquinhos", "Marquinhos"),
    ("musiala", "Jamal Musiala"),
    ("pacho", "Willian Pacho"),
    ("odegaard", "Martin Ødegaard"),
    ("osimhen", "Victor Osimhen"),
    ("enzo", "Enzo Fernández"),
    ("isak", "Alexander Isak"),
    ("alisson", "Alisson Becker"),
    ("kimmich", "Joshua Kimmich"),
    ("calhanoglu", "Hakan Çalhanoğlu"),
    # 히든
    ("messi", "Lionel Messi"),
    ("ronaldo", "Cristiano Ronaldo"),
    ("pele", "Pelé"),
    ("maradona", "Diego Maradona"),
    ("beckenbauer", "Franz Beckenbauer"),
]


def fetch_bytes(url, timeout=60, tries=6):
    """429(요청 제한)·5xx 는 Retry-After 또는 지수 백오프로 재시도한다."""
    delay = 4.0
    for attempt in range(tries):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt == tries - 1:
                raise
            wait = float(exc.headers.get("Retry-After") or delay)
            print(f"       ... HTTP {exc.code}, {wait:.0f}초 대기 후 재시도")
            time.sleep(wait)
            delay = min(delay * 2, 60)


def get_json(url):
    return json.loads(fetch_bytes(url, timeout=30).decode("utf-8"))


def download(url, path):
    data = fetch_bytes(url)
    with open(path, "wb") as f:
        f.write(data)
    return len(data)


def clean_html(value):
    text = re.sub(r"<[^>]+>", "", value or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def page_image(title):
    q = urllib.parse.urlencode({
        "action": "query", "titles": title, "prop": "pageimages|description",
        "piprop": "thumbnail|name", "pithumbsize": THUMB_SIZE, "pilicense": "free",
        "redirects": 1, "format": "json", "formatversion": 2,
    })
    data = get_json("https://en.wikipedia.org/w/api.php?" + q)
    return data["query"]["pages"][0]


def commons_credit(filename):
    q = urllib.parse.urlencode({
        "action": "query", "titles": "File:" + filename, "prop": "imageinfo",
        "iiprop": "extmetadata|url", "format": "json", "formatversion": 2,
    })
    data = get_json("https://commons.wikimedia.org/w/api.php?" + q)
    page = data["query"]["pages"][0]
    info = (page.get("imageinfo") or [{}])[0]
    meta = info.get("extmetadata", {})
    return {
        "author": clean_html(meta.get("Artist", {}).get("value", "")) or "Unknown",
        "license": clean_html(meta.get("LicenseShortName", {}).get("value", "")) or "See source",
        "source": info.get("descriptionurl", ""),
    }


def main():
    force = "--force" in sys.argv
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(CREDITS_JS), exist_ok=True)

    old = {}
    if os.path.exists(CREDITS_JS) and not force:
        m = re.search(r"PHOTO_CREDITS\s*=\s*(\{.*\});", open(CREDITS_JS, encoding="utf-8").read(), re.S)
        if m:
            try:
                old = json.loads(m.group(1))
            except ValueError:
                old = {}

    credits, total = {}, 0
    for pid, title in TARGETS:
        if pid in old and os.path.exists(os.path.join(ROOT, old[pid]["file"])) and not force:
            credits[pid] = old[pid]
            print(f"[skip] {pid}")
            continue
        try:
            page = page_image(title)
            thumb = page.get("thumbnail")
            if not thumb:
                print(f"[none] {pid}: '{title}' 자유 라이선스 대표 이미지 없음")
                continue
            src = thumb["source"].split("?")[0]
            ext = os.path.splitext(urllib.parse.urlparse(src).path)[1].lower() or ".jpg"
            if ext not in (".jpg", ".jpeg", ".png", ".webp"):
                ext = ".jpg"
            rel = f"assets/players/{pid}{ext}"
            size = download(src, os.path.join(ROOT, rel))
            total += size
            credit = commons_credit(page["pageimage"])
            credits[pid] = {
                "file": rel, "w": thumb["width"], "h": thumb["height"],
                "wiki": page.get("title", title), "desc": page.get("description", ""),
                "image": page["pageimage"], **credit,
            }
            print(f"[ok]   {pid:15s} {size/1024:6.1f}KB  {thumb['width']}x{thumb['height']}  {page.get('description','')}  | {credit['license']}")
            time.sleep(2.0)
        except Exception as exc:  # noqa: BLE001 - 네트워크 오류는 개별 선수만 건너뛴다
            print(f"[fail] {pid}: {exc}")

    body = json.dumps(credits, ensure_ascii=False, indent=1)
    with open(CREDITS_JS, "w", encoding="utf-8") as f:
        f.write("/* 자동 생성 파일: tools/fetch_photos.py 가 생성한다. 사진 출처·저작자·라이선스 기록. */\n")
        f.write("(function (root) {\n  var F = root.FPRD = root.FPRD || {};\n  F.PHOTO_CREDITS = " + body + ";\n})(typeof window !== 'undefined' ? window : globalThis);\n")
    print(f"\n완료: {len(credits)}/{len(TARGETS)}명, 이번 다운로드 {total/1024/1024:.2f}MB")


if __name__ == "__main__":
    main()
