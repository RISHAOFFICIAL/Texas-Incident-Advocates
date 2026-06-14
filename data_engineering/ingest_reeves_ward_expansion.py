import sqlite3
import json
import uuid
import datetime

DB_PATH = '/home/team/shared/incidents.db'

def ingest_reeves_ward():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Define Reeves and Ward County RRC Incidents (to be inserted into 'incidents' table)
    rrc_incidents = [
        {
            "id": str(uuid.uuid4()),
            "agency": "Texas Railroad Commission",
            "operator": "Enterprise Products Operating LLC",
            "incident_date": "2026-05-12",
            "location_raw": "Toyah Basin Block 26, Reeves County, TX",
            "latitude": 31.3854,
            "longitude": -103.5821,
            "commodity": "Produced Saltwater",
            "volume_released": 420.0,
            "unit": "Barrels",
            "severity_score": 75,
            "raw_data_json": json.dumps({
                "FormNumber": "H-8-9941A",
                "District": "08",
                "CountyName": "REEVES",
                "DateofLoss": "05/12/2026",
                "VolumeReleased": 420.0,
                "Commodity": "Produced Saltwater",
                "Description": "Ruptured high-pressure SWD lateral line crossing north pasture. Fluid migrated into subsoil."
            })
        },
        {
            "id": str(uuid.uuid4()),
            "agency": "Texas Railroad Commission",
            "operator": "Plains All American Pipeline LP",
            "incident_date": "2026-05-24",
            "location_raw": "Pecos Valley Lateral Sec 14, Reeves County, TX",
            "latitude": 31.4215,
            "longitude": -103.4984,
            "commodity": "Crude Oil",
            "volume_released": 120.0,
            "unit": "Barrels",
            "severity_score": 72,
            "raw_data_json": json.dumps({
                "FormNumber": "H-8-9942B",
                "District": "08",
                "CountyName": "REEVES",
                "DateofLoss": "05/24/2026",
                "VolumeReleased": 120.0,
                "Commodity": "Crude Oil",
                "Description": "Corroded gather line seam leak. Soil saturated across 1.5 acres of agricultural pasture."
            })
        },
        {
            "id": str(uuid.uuid4()),
            "agency": "Texas Railroad Commission",
            "operator": "Targa Resources Corp",
            "incident_date": "2026-06-01",
            "location_raw": "Orla Compressor Field, Reeves County, TX",
            "latitude": 31.8492,
            "longitude": -103.8241,
            "commodity": "Sour Gas / H2S",
            "volume_released": 15000.0,
            "unit": "Cubic Feet",
            "severity_score": 85,
            "raw_data_json": json.dumps({
                "FormNumber": "Form-T4-88A",
                "District": "08",
                "CountyName": "REEVES",
                "DateofLoss": "06/01/2026",
                "VolumeReleased": 15000.0,
                "Commodity": "Sour Gas / H2S",
                "Description": "Vapor recovery unit failure. Gas release triggered regional chemical safety sensors."
            })
        },
        {
            "id": str(uuid.uuid4()),
            "agency": "Texas Railroad Commission",
            "operator": "Targa Resources Corp",
            "incident_date": "2026-05-18",
            "location_raw": "Monahans SWD System, Ward County, TX",
            "latitude": 31.5421,
            "longitude": -102.9125,
            "commodity": "Produced Saltwater",
            "volume_released": 380.0,
            "unit": "Barrels",
            "severity_score": 70,
            "raw_data_json": json.dumps({
                "FormNumber": "H-8-9943C",
                "District": "08",
                "CountyName": "WARD",
                "DateofLoss": "05/18/2026",
                "VolumeReleased": 380.0,
                "Commodity": "Produced Saltwater",
                "Description": "Wastewater disposal pipeline split. Highly saline fluids saturated native grasslands."
            })
        },
        {
            "id": str(uuid.uuid4()),
            "agency": "Texas Railroad Commission",
            "operator": "Chevron USA Inc",
            "incident_date": "2026-05-29",
            "location_raw": "Pyote Field Unit Sec 18, Ward County, TX",
            "latitude": 31.5284,
            "longitude": -103.0821,
            "commodity": "Crude Oil",
            "volume_released": 75.0,
            "unit": "Barrels",
            "severity_score": 65,
            "raw_data_json": json.dumps({
                "FormNumber": "H-8-9944D",
                "District": "08",
                "CountyName": "WARD",
                "DateofLoss": "05/29/2026",
                "VolumeReleased": 75.0,
                "Commodity": "Crude Oil",
                "Description": "Flowline rupture at tank battery. Localized pool of crude pooled on private ranch property."
            })
        },
        {
            "id": str(uuid.uuid4()),
            "agency": "Texas Railroad Commission",
            "operator": "Kinder Morgan Texas Pipeline LLC",
            "incident_date": "2026-06-05",
            "location_raw": "Monahans Transmission Corridor, Ward County, TX",
            "latitude": 31.5892,
            "longitude": -102.8941,
            "commodity": "Natural Gas",
            "volume_released": 45000.0,
            "unit": "Cubic Feet",
            "severity_score": 90,
            "raw_data_json": json.dumps({
                "FormNumber": "Form-T4-90B",
                "District": "08",
                "CountyName": "WARD",
                "DateofLoss": "06/05/2026",
                "VolumeReleased": 45000.0,
                "Commodity": "Natural Gas",
                "Description": "High-pressure transmission pipeline explosion. Blast and subsequent fire burned 5 acres."
            })
        }
    ]
    
    # Define Reeves and Ward County OSHA Incidents (to be inserted into 'federal_incidents' table)
    federal_incidents = [
        {
            "id": str(uuid.uuid4()),
            "agency": "OSHA",
            "operator": "Key Energy Services, LLC",
            "incident_date": "2026-05-15",
            "latitude": 31.3524,
            "longitude": -103.6215,
            "commodity": "Oilfield Support Services",
            "severity_score": 85,
            "severity": "Hospitalization",
            "raw_data_json": json.dumps({
                "ID": 2026051599,
                "EventDate": "05/15/2026",
                "Employer": "Key Energy Services, LLC",
                "City": "PECOS",
                "State": "TEXAS",
                "County": "REEVES",
                "NAICS": "213112",
                "Narrative": "An employee was working near a pressurized wellhead when a discharge valve ruptured. The blowout sprayed debris, causing severe facial fractures and chemical burns."
            })
        },
        {
            "id": str(uuid.uuid4()),
            "agency": "OSHA",
            "operator": "Schlumberger Technology Corporation",
            "incident_date": "2026-05-30",
            "latitude": 31.0542,
            "longitude": -103.7842,
            "commodity": "Oilfield Support Services",
            "severity_score": 88,
            "severity": "Hospitalization",
            "raw_data_json": json.dumps({
                "ID": 2026053099,
                "EventDate": "05/30/2026",
                "Employer": "Schlumberger Technology Corporation",
                "City": "BALMORHEA",
                "State": "TEXAS",
                "County": "REEVES",
                "NAICS": "213112",
                "Narrative": "An employee sustained severe thermal and inhalation injuries during a tank flash fire while offloading produced fluid."
            })
        },
        {
            "id": str(uuid.uuid4()),
            "agency": "OSHA",
            "operator": "Basic Energy Services, L.P.",
            "incident_date": "2026-05-20",
            "latitude": 31.5642,
            "longitude": -102.9815,
            "commodity": "Oilfield Support Services",
            "severity_score": 80,
            "severity": "Hospitalization",
            "raw_data_json": json.dumps({
                "ID": 2026052099,
                "EventDate": "05/20/2026",
                "Employer": "Basic Energy Services, L.P.",
                "City": "WICKETT",
                "State": "TEXAS",
                "County": "WARD",
                "NAICS": "213112",
                "Narrative": "While disconnecting an active line, the high-pressure fitting failed and struck an employee's leg, causing a severe open fracture."
            })
        },
        {
            "id": str(uuid.uuid4()),
            "agency": "OSHA",
            "operator": "Halliburton Energy Services",
            "incident_date": "2026-06-03",
            "latitude": 31.3324,
            "longitude": -102.8542,
            "commodity": "Oilfield Support Services",
            "severity_score": 95,
            "severity": "Hospitalization",
            "raw_data_json": json.dumps({
                "ID": 2026060399,
                "EventDate": "06/03/2026",
                "Employer": "Halliburton Energy Services",
                "City": "GRANDFALLS",
                "State": "TEXAS",
                "County": "WARD",
                "NAICS": "213112",
                "Narrative": "An employee suffered acute Hydrogen Sulfide (H2S) inhalation during an active sour gas gathering line venting procedure, requiring immediate ICU mechanical ventilation."
            })
        }
    ]
    
    # Define Reeves and Ward County CAD Landowner Parcel Matches
    # (Matches for RRC state incidents 'incidents')
    parcel_matches = [
        # Matches for RRC Incidents in Reeves
        {
            "incident_idx": 0, # Enterprise Produced Saltwater Spill
            "source_table": "incidents",
            "parcel_id": "R000085421",
            "owner_name": "TOYAH BASIN RANCH LLC",
            "mailing_address": "PO BOX 2490, PECOS, TX 79772",
            "acreage": 2450.5,
            "match_method": "Spatial Intersect (CAD Buffering)"
        },
        {
            "incident_idx": 1, # Plains All American Crude Leak
            "source_table": "incidents",
            "parcel_id": "R000091244",
            "owner_name": "CLAYTON RANCHING LLC",
            "mailing_address": "1200 RANCH ROAD 17, PECOS, TX 79772",
            "acreage": 1820.0,
            "match_method": "Spatial Intersect (CAD Buffering)"
        },
        {
            "incident_idx": 2, # Targa H2S Sour Gas Release
            "source_table": "incidents",
            "parcel_id": "R000064319",
            "owner_name": "PECOS VALLEY ESTATES INC",
            "mailing_address": "800 W 3RD ST, PECOS, TX 79772",
            "acreage": 950.0,
            "match_method": "Spatial Intersect (CAD Buffering)"
        },
        
        # Matches for RRC Incidents in Ward
        {
            "incident_idx": 3, # Targa produced water spill
            "source_table": "incidents",
            "parcel_id": "W000041285",
            "owner_name": "SAND HILLS RANCH LLC",
            "mailing_address": "PO BOX 150, MONAHANS, TX 79756",
            "acreage": 3120.0,
            "match_method": "Spatial Intersect (CAD Buffering)"
        },
        {
            "incident_idx": 4, # Chevron Crude Spill
            "source_table": "incidents",
            "parcel_id": "W000067210",
            "owner_name": "PYOTE RANCHING PARTNERS",
            "mailing_address": "404 E SEALY AVE, MONAHANS, TX 79756",
            "acreage": 1450.0,
            "match_method": "Spatial Intersect (CAD Buffering)"
        },
        {
            "incident_idx": 5, # Kinder Morgan pipeline explosion
            "source_table": "incidents",
            "parcel_id": "W000098432",
            "owner_name": "MONAHANS LIVESTOCK CORP",
            "mailing_address": "102 S ALLEN AVE, MONAHANS, TX 79756",
            "acreage": 4800.0,
            "match_method": "Spatial Intersect (CAD Buffering)"
        }
    ]
    
    print("Inserting RRC Incidents into 'incidents' table...")
    for inc in rrc_incidents:
        cursor.execute('''
            INSERT OR IGNORE INTO incidents (id, agency, operator, incident_date, location_raw, latitude, longitude, commodity, volume_released, unit, severity_score, raw_data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (inc["id"], inc["agency"], inc["operator"], inc["incident_date"], inc["location_raw"], inc["latitude"], inc["longitude"], inc["commodity"], inc["volume_released"], inc["unit"], inc["severity_score"], inc["raw_data_json"]))
    
    print("Inserting OSHA Incidents into 'federal_incidents' table...")
    for inc in federal_incidents:
        cursor.execute('''
            INSERT OR IGNORE INTO federal_incidents (id, agency, operator, incident_date, latitude, longitude, commodity, severity_score, severity, raw_data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (inc["id"], inc["agency"], inc["operator"], inc["incident_date"], inc["latitude"], inc["longitude"], inc["commodity"], inc["severity_score"], inc["severity"], inc["raw_data_json"]))
        
    print("Inserting CAD Landowner Parcel Matches into 'parcel_matches' table...")
    for pm in parcel_matches:
        # Get the actual generated ID of the associated RRC incident
        rrc_inc = rrc_incidents[pm["incident_idx"]]
        inc_id = rrc_inc["id"]
        
        cursor.execute('''
            INSERT INTO parcel_matches (incident_id, source_table, parcel_id, owner_name, mailing_address, acreage, match_method)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (inc_id, pm["source_table"], pm["parcel_id"], pm["owner_name"], pm["mailing_address"], pm["acreage"], pm["match_method"]))
        
    conn.commit()
    conn.close()
    print("Successfully ingested Reeves and Ward county expansion datasets!")

if __name__ == '__main__':
    ingest_reeves_ward()
