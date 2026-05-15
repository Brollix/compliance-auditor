import urllib.request
import urllib.parse
import re
from loguru import logger
from typing import List, Dict, Any, Optional

class InfolegClient:
    """
    Client to scrape InfoLEG for full law texts.
    """
    def __init__(self):
        self.base_url = "https://servicios.infoleg.gob.ar/infolegInternet"
        self.search_url = f"{self.base_url}/listarResultados.do"

    def _fetch_url(self, url: str, method: str = "GET", data: Optional[Dict[str, str]] = None, encoding: str = "windows-1252") -> str:
        try:
            encoded_data = urllib.parse.urlencode(data).encode(encoding) if data else None
            req = urllib.request.Request(url, data=encoded_data, method=method, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                return response.read().decode(encoding, errors='replace')
        except Exception as e:
            logger.error(f"Error fetching URL {url} ({method}): {e}")
            return ""

    def get_full_text(self, law_number: str, law_type: str = "Ley") -> Optional[str]:
        """
        Retrieves the full text of a law by its number and type.
        """
        try:
            # Clean law number (e.g. "27.555" -> "27555")
            clean_number = re.sub(r'\D', '', law_number)
            
            # Map text type to InfoLEG numeric ID
            type_map = {
                "Ley": "1",
                "Decreto": "2",
                "Resolución": "3",
                "Disposición": "4"
            }
            type_id = type_map.get(law_type, "1")

            # Known IDs for common laws to bypass search issues in POC
            known_ids = {
                "27555": "341093", # Teletrabajo
                "25326": "64790",  # Protección de Datos
                "20744": "25552",  # Contrato de Trabajo
                "24013": "412",    # Empleo
                "26727": "192152", # Trabajo Agrario
            }
            if clean_number in known_ids:
                logger.info(f"Using known ID {known_ids[clean_number]} for Law {clean_number}")
                return self.get_full_text_by_id(known_ids[clean_number])

            # Perform POST search
            search_url = f"{self.base_url}/buscarNormas.do"
            post_data = {
                "tipoNorma": type_id,
                "numero": clean_number
            }
            
            logger.info(f"Searching InfoLEG via POST for {law_type} {clean_number}...")
            search_results_html = self._fetch_url(search_url, method="POST", data=post_data)
            
            # Find the first 'verNorma.do?id=XXXXX' link
            match = re.search(r'verNorma\.do\?id=(\d+)', search_results_html)
            if match:
                norma_id = match.group(1)
                logger.info(f"Found Law {clean_number} with ID: {norma_id}")
                return self.get_full_text_by_id(norma_id)
            
            logger.warning(f"Law {law_number} not found in InfoLEG search.")
            return None
            
        except Exception as e:
            logger.error(f"Error in get_full_text for law {law_number}: {e}")
            return None

    def get_full_text_by_id(self, norma_id: str) -> Optional[str]:
        """
        Retrieves the full text if we already have the InfoLEG ID.
        """
        ver_norma_url = f"{self.base_url}/verNorma.do?id={norma_id}"
        html = self._fetch_url(ver_norma_url)
        
        # Look for 'Texto Actualizado' or 'Texto Original' links
        # Patterns: 
        # <a href="anexos/60000-64999/64790/norma.htm">
        # <a href="anexos/335000-339999/339444/texact.htm">
        
        links = re.findall(r'href="([^"]+(?:texact|norma)\.htm[^"]*)"', html, re.IGNORECASE)
        if not links:
            links = re.findall(r"href='([^']+(?:texact|norma)\.htm[^']*)'", html, re.IGNORECASE)
            
        if links:
            # Prefer texact (Texto Actualizado) over norma (Texto Original)
            link = next((l for l in links if "texact" in l.lower()), links[0])
            link = link.lstrip('/')
            
            if not link.startswith('http'):
                full_url = f"{self.base_url}/{link}"
            else:
                full_url = link
                
            logger.info(f"Fetching full text from: {full_url}")
            full_html = self._fetch_url(full_url)
            if full_html:
                return self._clean_html(full_html)
        
        # Fallback: if no htm link, maybe the text is in the verNorma page itself
        if "ARTICULO" in html.upper() or "ARTÍCULO" in html.upper():
             logger.info("Full text link not found, attempting to extract from verNorma page directly.")
             return self._clean_html(html)

        return None

    def _clean_html(self, html: str) -> str:
        """
        Refined cleaning of InfoLEG HTML.
        """
        # Remove scripts, styles
        content = re.sub(r'<(script|style).*?>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
        
        # Replace <br>, <p>, <tr>, <div> with newlines
        content = re.sub(r'<(br|p|tr|div).*?>', '\n', content, flags=re.IGNORECASE)
        
        # Remove all other tags
        content = re.sub(r'<.*?>', '', content, flags=re.DOTALL)
        
        # Unescape common entities
        from html import unescape
        content = unescape(content)
        content = content.replace('&nbsp;', ' ')
        
        # Clean up multiple newlines and spaces
        lines = [line.strip() for line in content.split('\n')]
        content = '\n'.join([line for line in lines if line])
        
        return content.strip()

    def get_articles(self, full_text: str) -> List[Dict[str, str]]:
        """
        Splits the full text into articles using regex.
        """
        articles = []
        # Pattern to find "ARTICULO 1", "Art. 1", "Artculo 1"
        pattern = r'(?i)(ARTICULO\s+\d+.*?[:\.-]|Art\.\s+\d+.*?[:\.-])'
        
        parts = re.split(pattern, full_text)
        
        if len(parts) > 1:
            # Save preamble
            preamble = parts[0].strip()
            if preamble:
                articles.append({"title": "Encabezado", "content": preamble})
            
            for i in range(1, len(parts), 2):
                title = parts[i].strip()
                content = parts[i+1].strip() if i+1 < len(parts) else ""
                articles.append({"title": title, "content": content})
        else:
            articles.append({"title": "Texto Completo", "content": full_text})
            
        return articles
