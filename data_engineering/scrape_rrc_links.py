import requests
from bs4 import BeautifulSoup
import os
import re

def scrape_rrc_h8_links():
    url = "https://www.rrc.texas.gov/oil-and-gas/compliance-enforcement/spill-reporting/district-08-spills/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.rrc.texas.gov/",
        "Connection": "keep-alive"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        links = []
        for a in soup.find_all('a', href=True):
            if 'h8s' in a['href'].lower() and a['href'].endswith('.xlsx'):
                # Extract year from title or text
                text = a.get_text()
                year_match = re.search(r"20\d{2}", text)
                year = year_match.group(0) if year_match else "Unknown"
                
                links.append({
                    "year": year,
                    "url": "https://www.rrc.texas.gov" + a['href'] if a['href'].startswith('/') else a['href']
                })
        return links
    except Exception as e:
        print(f"Error scraping RRC page: {e}")
        return []

def download_file(url, local_filename):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"}
    try:
        with requests.get(url, headers=headers, stream=True) as r:
            r.raise_for_status()
            with open(local_filename, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        return True
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False

if __name__ == "__main__":
    links = scrape_rrc_h8_links()
    if links:
        # Sort by year descending
        links.sort(key=lambda x: x['year'], reverse=True)
        latest = links[0]
        print(f"Latest found: {latest['year']} - {latest['url']}")
        
        filename = f"h8s_{latest['year']}.xlsx"
        if not os.path.exists(filename):
            print(f"Downloading {filename}...")
            if download_file(latest['url'], filename):
                print("Download complete.")
        else:
            print(f"{filename} already exists.")
    else:
        print("No H-8 links found.")
