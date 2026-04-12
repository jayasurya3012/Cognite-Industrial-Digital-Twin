import csv
import json
import os

input_file = r'C:\Users\amaan\Downloads\data\data\timeseries.csv'
output_file = r'c:\Users\amaan\OneDrive\Desktop\Cognite\dummy1\public\data\timeseries.json'

timeseries = []
current_time = None
current_row = {}

# Parse
with open(input_file, 'r') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        t = row['timestamp']
        if t != current_time:
            if current_time is not None:
                timeseries.append({'timestamp': current_time, 'values': current_row})
                if len(timeseries) >= 500: # Stop after ~500 timesteps to be highly performant for UI
                    break
            current_time = t
            current_row = {}
            
        sid = row['sensor_id']
        try:
            val = float(row['value'])
        except ValueError:
            val = 0.0
            
        current_row[sid] = {
            'v': val,
            'q': row['quality_flag']
        }
    
    if current_time and len(timeseries) < 500:
        timeseries.append({'timestamp': current_time, 'values': current_row})

with open(output_file, 'w') as f:
    json.dump(timeseries, f, separators=(',', ':'))

print(f"Processed {len(timeseries)} timesteps into json.")
