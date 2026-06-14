import pandas as pd
import sqlite3
import json
import re
import uuid
import os

def parse_gps(location_str):
    if not isinstance(location_str, str):
        return None, None
    # Look for GPS: lat, lon
    match = re.search(r"GPS:\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)", location_str)
    if match:
        return float(match.group(1)), float(match.group(2))
    return None, None

def ingest_rrc_xlsx(file_path, db_path):
    if not os.path.exists(file_path):
        print(f"File {file_path} not found.")
        return
        
    # Connect to SQLite
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create table if not exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            agency TEXT,
            operator TEXT,
            incident_date TEXT,
            location_raw TEXT,
            latitude REAL,
            longitude REAL,
            commodity TEXT,
            volume_released REAL,
            unit TEXT,
            severity_score INTEGER,
            raw_data_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(agency, operator, incident_date, location_raw)
        )
    ''')
    
    # Read Excel
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return
    
    count = 0
    duplicates = 0
    for _, row in df.iterrows():
        location = str(row.get('Location', ''))
        lat, lon = parse_gps(location)
        
        # Simple severity score based on volume
        vol = row.get('GrossLoss', 0)
        severity = 1
        if vol >= 100: severity = 3
        elif vol >= 50: severity = 2
        
        incident_id = str(uuid.uuid4())
        
        try:
            cursor.execute('''
                INSERT INTO incidents (
                    id, agency, operator, incident_date, location_raw, 
                    latitude, longitude, commodity, volume_released, unit,
                    severity_score, raw_data_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                incident_id,
                'RRC',
                row.get('Operator'),
                str(row.get('DateofLoss')),
                location,
                lat,
                lon,
                row.get('TypeLiquid'),
                vol,
                'BBLS',
                severity,
                json.dumps(row.to_dict(), default=str)
            ))
            count += 1
        except sqlite3.IntegrityError:
            duplicates += 1
            continue
    
    conn.commit()
    conn.close()
    print(f"Finished: {count} new incidents ingested, {duplicates} duplicates skipped.")

if __name__ == "__main__":
    # Ingest 2025 data
    ingest_rrc_xlsx("h8s_2025.xlsx", "/home/team/shared/incidents.db")
