import pandas as pd

def explore_rrc_file(file_path):
    try:
        # Read the Excel file
        # H-8 reports usually have a header row or some metadata at the top
        df = pd.read_excel(file_path)
        print("Columns found:")
        print(df.columns.tolist())
        print("\nFirst 5 rows:")
        print(df.head())
        
        # Check for specific fields mentioned in the design spec:
        # Operator Name, Spill Date, Lease Name, Commodity, Volume Spilled, Lat_Long_Raw
        
    except Exception as e:
        print(f"Error reading file: {e}")

if __name__ == "__main__":
    explore_rrc_file("h8s_2025.xlsx")
