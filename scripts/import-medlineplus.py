"""Refresh public-domain topic summaries; never import licensed drug/encyclopedia content."""
import datetime
import json
import pathlib
import re
import urllib.request
import xml.etree.ElementTree as ET
from html import unescape

BASE = "https://medlineplus.gov/"


def download(url):
    request = urllib.request.Request(url, headers={"User-Agent": "HealthBuddy-Knowledge-Importer/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def plain(value):
    value = unescape(value)
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", unescape(value)).strip()


page = download(BASE + "xml.html").decode()
match = re.search(r'href="([^"<>]*mplus_topics_[\d-]+\.xml)"', page)
if not match:
    raise RuntimeError("MedlinePlus did not publish a topic XML link")
url = urllib.parse.urljoin(BASE, match.group(1))
if urllib.parse.urlparse(url).hostname != "medlineplus.gov":
    raise RuntimeError("Unexpected data host")
root = ET.fromstring(download(url))
topics = []
for topic in root.findall("health-topic"):
    if topic.get("language") != "English":
        continue
    summary = topic.find("full-summary")
    content = plain("".join(summary.itertext())) if summary is not None else ""
    if not content:
        continue
    topics.append({
        "id": topic.get("id"),
        "title": topic.get("title"),
        "url": topic.get("url"),
        "aliases": [plain("".join(t.itertext())) for tag in ("also-called", "see-reference") for t in topic.findall(tag)],
        "summary": content,
    })
if len(topics) < 800:
    raise RuntimeError(f"Refusing incomplete dataset: {len(topics)} topics")
result = {
    "attribution": "Source: MedlinePlus, National Library of Medicine.",
    "license": "Public-domain health topic summaries. No endorsement implied.",
    "sourceUrl": url,
    "importedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "topics": topics,
}
target = pathlib.Path(__file__).resolve().parent.parent / "data" / "medical-knowledge.json"
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(f"Imported {len(topics)} topics from {url}; {target.stat().st_size:,} bytes")
