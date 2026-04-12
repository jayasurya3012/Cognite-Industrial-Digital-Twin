import xml.etree.ElementTree as ET
import re
import json
import csv
import math
import os

svg_path = r'C:\Users\amaan\Downloads\data\data\documents\pid_hp_separation_train.svg'
metadata_path = r'C:\Users\amaan\Downloads\data\data\sensor_metadata.csv'
output_path = r'c:\Users\amaan\OneDrive\Desktop\Cognite\dummy1\public\data\data.json'

os.makedirs(os.path.dirname(output_path), exist_ok=True)

tree = ET.parse(svg_path)
root = tree.getroot()

for elem in root.iter():
    elem.tag = elem.tag.split('}')[-1]

sensors = []
assets = []
valves = []
connections = []

texts = []
for t in root.findall('.//text'):
    if t.text:
        x = float(t.attrib.get('x', 0))
        y = float(t.attrib.get('y', 0))
        size = float(t.attrib.get('font-size', 0))
        texts.append({'text': t.text.strip(), 'x': x, 'y': y, 'size': size})

# 1. Extract Assets
for t in texts:
    if re.match(r'^[A-Z]-\d+[A-Z]?$', t['text']) and t['size'] >= 13:
        if 400 < t['y'] < 1700:
            assets.append({'id': t['text'], 'x': t['x'], 'y': t['y'], 'type': 'Asset'})

# 2. Extract Sensors (Circles)
claimed_texts = set()
for c in root.findall('.//circle'):
    x = float(c.attrib.get('cx', 0))
    y = float(c.attrib.get('cy', 0))
    r = float(c.attrib.get('r', 0))
    if r == 27:
        in_texts = [t for t in texts if abs(t['x'] - x) <= 30 and abs(t['y'] - y) <= 30]
        if in_texts:
            sorted_texts = sorted(in_texts, key=lambda i: i['y'])
            parts = []
            for it in sorted_texts:
                parts.extend([p for p in it['text'].split() if p.isalnum()])
            name = "".join(parts)
            if re.match(r'^[A-Z]+[0-9]+[A-Z]?$', name):
                sensors.append({'id': name, 'x': x, 'y': y, 'type': 'Sensor'})
                for it in sorted_texts:
                    claimed_texts.add((it['x'], it['y'], it['text']))

# 3. Extract Valves
for t in texts:
    if (t['x'], t['y'], t['text']) in claimed_texts: continue
    if re.match(r'^(SDV|PCV|TCV|LCV|PSV|BDV)-\d+$', t['text']):
        valves.append({'id': t['text'], 'x': t['x'], 'y': t['y'], 'type': 'Valve'})

# 4. Extract Connections (Simplified as segment lines)
for line in root.findall('.//line'):
    w = float(line.attrib.get('stroke-width', 0))
    if w >= 2.0:
        c = line.attrib.get('stroke', '')
        if c in ['#1A1A2E', '#1B4F8A']:
            x1, y1 = float(line.attrib.get('x1', 0)), float(line.attrib.get('y1', 0))
            x2, y2 = float(line.attrib.get('x2', 0)), float(line.attrib.get('y2', 0))
            if max(y1, y2) < 1700 and min(y1, y2) > 200:
                connections.append({'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2})

# Assign sensors to closest asset dynamically using proximity
for s in sensors:
    best_asset = None
    min_d = float('inf')
    for a in assets:
        d = math.hypot(s['x'] - a['x'], s['y'] - a['y'])
        if d < min_d:
            min_d = d
            best_asset = a['id']
    s['asset_id'] = best_asset

# Use sensor_metadata.csv to override or supplement if needed
# (Mostly relevant if a sensor name in the SVG closely matches the CSV but was misassigned)
metadata_map = {}
with open(metadata_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        sid = row['sensor_id'] # e.g. PT-101-PV
        aid = row['asset_id'].split(':')[-1] # e.g. PT-101 or V-101
        
        # If the asset_id is like "PT-101", it means it is a sensor on its own
        # but in our proximity model, we treat V-101 as the main physical asset
        if re.match(r'^[A-Z]-\d+[A-Z]?$', aid):
            metadata_map[sid] = aid

# Enhance standard output
data = {
    'assets': assets,
    'sensors': sensors,
    'valves': valves,
    'connections': connections
}

with open(output_path, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Extraction complete! Saved {len(assets)} assets, {len(sensors)} sensors, {len(valves)} valves to {output_path}")
