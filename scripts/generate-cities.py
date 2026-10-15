"""取得済みの Geolonia latest.csv から市区町村の代表経度を生成する。"""
import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

parser: argparse.ArgumentParser = argparse.ArgumentParser()
parser.add_argument('csv_path', type=Path)
args: argparse.Namespace = parser.parse_args()
locations: defaultdict[tuple[str, str], list[float]] = defaultdict(list)
row: dict[str, str]
with args.csv_path.open(encoding='utf-8-sig', newline='') as source:
    reader: csv.DictReader = csv.DictReader(source)
    for row in reader:
        if row['経度']:
            locations[(row['都道府県名'], row['市区町村名'])].append(float(row['経度']))

rows: list[dict[str, str | float]] = [
    {'prefecture': prefecture, 'name': city, 'longitude': round(sum(longitudes) / len(longitudes), 5)}
    for (prefecture, city), longitudes in locations.items()
]
overrides: dict = json.loads((Path(__file__).parent / 'city-overrides.json').read_text(encoding='utf-8'))
rows = [item for item in rows if not (item['prefecture'] == '静岡県' and item['name'] in overrides['remove'])]
addition: dict[str, str | float]
for addition in overrides['cities']:
    rows = [item for item in rows if (item['prefecture'], item['name']) != (addition['prefecture'], addition['name'])]
    indexes: list[int] = [index for index, item in enumerate(rows) if item['prefecture'] == addition['prefecture']]
    rows.insert(indexes[-1] + 1, addition)

target: Path = Path(__file__).resolve().parent.parent / 'src' / 'cities.json'
target.write_text(json.dumps(rows, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{len(rows)}市区町村の代表経度を生成しました。')
