import xml.etree.ElementTree as ET
import re

tree = ET.parse(r'C:\Users\amaan\Downloads\data\data\documents\pid_hp_separation_train.svg')
root = tree.getroot()
ns = {'svg': 'http://www.w3.org/2000/svg'}

# Clean tags
for elem in root.iter():
    elem.tag = elem.tag.split('}')[-1]

sensors = []
assets = []
valves = []
lines = []

texts = []
for t in root.findall('.//text'):
    if t.text:
        x = float(t.attrib.get('x', 0))
        y = float(t.attrib.get('y', 0))
        texts.append({'text': t.text.strip(), 'x': x, 'y': y, 'size': float(t.attrib.get('font-size', 0))})

# Find sensors (Circles with radius 27)
for c in root.findall('.//circle'):
    x = float(c.attrib.get('cx', 0))
    y = float(c.attrib.get('cy', 0))
    r = float(c.attrib.get('r', 0))
    if r == 27:
        # find texts inside
        in_texts = [t for t in texts if abs(t['x'] - x) <= 30 and abs(t['y'] - y) <= 30]
        if in_texts:
            name = "".join([t['text'] for t in sorted(in_texts, key=lambda i: i['y'])])
            sensors.append({'id': name, 'x': x, 'y': y})

# Find valves (usually text like SDV, PCV, TCV, LCV)
for t in texts:
    if re.match(r'^(SDV|PCV|TCV|LCV|PSV|BDV)-\d+$', t['text']):
        valves.append({'id': t['text'], 'x': t['x'], 'y': t['y']})

# Find assets (E-101, V-101, P-101A/B, etc - usually font-size >= 13 and not in a table)
# We can check the y coordinate to avoid the table header/footer if they exist
for t in texts:
    if re.match(r'^[A-Z]-\d+[A-Z]?$', t['text']) and t['size'] >= 13:
        if t['y'] > 400 and t['y'] < 1700: # exclude titles
            assets.append({'id': t['text'], 'x': t['x'], 'y': t['y']})

print("ASSETS:")
for a in assets: print(a)
print("SENSORS:")
for s in sensors: print(s)
print("VALVES:")
for v in valves: print(v)
