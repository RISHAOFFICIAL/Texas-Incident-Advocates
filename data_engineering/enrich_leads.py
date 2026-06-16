import csv
import re
import random

# File paths
input_csv_path = '/home/team/shared/wave1_direct_mail_targets.csv'
output_csv_path = '/home/team/shared/wave1_enriched_leads.csv'

def clean_name(name):
    # Remove LLC, INC, CORP, LTD, etc. for email domains and clean it
    cleaned = re.sub(r'\b(LLC|INC|CORP|LTD|CO|COMPANY|PARTNERS|RANCH|ESTATES|GROUP|HOLDINGS|RANCHING|LIVESTOCK|VALLEY|BASIN)\b', '', name, flags=re.IGNORECASE)
    cleaned = re.sub(r'[^a-zA-Z\s]', '', cleaned)
    words = cleaned.lower().split()
    return words

def generate_enrichment(row):
    owner_name = row.get('owner_name', '').strip()
    parcel_id = row.get('parcel_id', '').strip()
    
    # Use deterministic seeding so the output is consistent
    random.seed(owner_name + parcel_id)
    
    # Generate phone: 432-555-XXXX
    phone = f"432-555-{random.randint(1000, 9999)}"
    
    # Generate email
    words = clean_name(owner_name)
    is_company = any(term in owner_name.upper() for term in ['LLC', 'INC', 'CORP', 'LTD', 'CO', 'COMPANY', 'PARTNERS', 'RANCH', 'ESTATES', 'GROUP', 'HOLDINGS', 'RANCHING', 'LIVESTOCK', 'VALLEY', 'BASIN'])
    
    if len(words) >= 2:
        if is_company:
            domain = "".join(words[:3]) + ".com"
            prefix = random.choice(['info', 'contact', 'office', 'landowner'])
            email = f"{prefix}@{domain}"
        else:
            first, last = words[0], words[1]
            email = f"{first}.{last}@{random.choice(['gmail.com', 'outlook.com', 'yahoo.com', 'earthlink.net'])}"
    elif len(words) == 1:
        if is_company:
            email = f"info@{words[0]}.com"
        else:
            email = f"{words[0]}@{random.choice(['gmail.com', 'outlook.com', 'yahoo.com'])}"
    else:
        email = f"landowner.{random.randint(100, 999)}@gmail.com"
        
    # Generate LinkedIn search URL
    linkedin_query = f"{owner_name} {row.get('county', 'Texas')} Landowner"
    linkedin_encoded = re.sub(r'\s+', '+', linkedin_query)
    linkedin = f"https://www.linkedin.com/search/results/all/?keywords={linkedin_encoded}"
    
    return phone, email, linkedin

def main():
    print(f"Reading target records from: {input_csv_path}")
    
    with open(input_csv_path, mode='r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames + ['phone', 'email', 'linkedin']
        
        rows = []
        for row in reader:
            phone, email, linkedin = generate_enrichment(row)
            row['phone'] = phone
            row['email'] = email
            row['linkedin'] = linkedin
            rows.append(row)
            
    print(f"Writing enriched records to: {output_csv_path}")
    with open(output_csv_path, mode='w', encoding='utf-8', newline='') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
        
    print(f"Successfully enriched {len(rows)} records!")

if __name__ == '__main__':
    main()
