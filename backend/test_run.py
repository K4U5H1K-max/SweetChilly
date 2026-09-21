import asyncio
import sys
from rich.console import Console
from rich.panel import Panel

from app.ingestion.adapters.gdelt import GDELTAdapter
from app.ingestion.adapters.imd import IMDAdapter
from app.ingestion.adapters.nhai import NHAIAdapter
from app.ingestion.adapters.pib import PIBAdapter
from app.processing.filtering import RelevanceFilter
from app.processing.ner import NERExtractor

console = Console()

from types import SimpleNamespace

async def test_manual_text():
    console.print(Panel.fit("Testing NLP Pipeline Directly", style="bold blue"))
    
    # Mocking what the adapters return
    docs = [
        SimpleNamespace(
            id="dummy-1",
            original_url="http://test.com/1",
            canonical_url="http://test.com/1",
            original_title="Massive Landslide blocks NH44 near Ramban",
            raw_content="A massive landslide occurred today blocking National Highway 44. Traffic has been diverted. Authorities expect the clearance to take 48 hours."
        ),
        SimpleNamespace(
            id="dummy-2",
            original_url="http://test.com/2",
            canonical_url="http://test.com/2",
            original_title="Bollywood star spotted at Mumbai Airport",
            raw_content="Famous actor was seen boarding a flight today."
        )
    ]
    return docs

async def test_processing(docs):
    if not docs:
        return
        
    console.print(Panel.fit("Testing Processing Pipeline (Filter & NER)", style="bold magenta"))
    
    # 1. Filter
    filter_engine = RelevanceFilter(threshold=0.5)
    relevant = filter_engine.filter(docs)
    console.print(f"Filtering complete. [yellow]{len(relevant)} out of {len(docs)}[/yellow] documents are relevant to logistics/accessibility.")
    
    # 2. NER
    if relevant:
        console.print("[cyan]Running NER on the most relevant document...[/cyan]")
        ner = NERExtractor()
        top_doc = relevant[0]
        
        console.print(f"Analyzing: [italic]'{top_doc.normalized_title}'[/italic]")
        entities = ner.extract(top_doc)
        
        if entities:
            for ent in entities:
                console.print(f"  - [{ent['type']}]: {ent['normalized_value']} (Confidence: {ent['confidence']})")
        else:
            console.print("  No infrastructure or transport entities found in this document.")

async def main():
    try:
        docs = await test_manual_text()
        print("\n" + "-"*50 + "\n")
        
        # Fake cleaning for manual text since cleaning pipeline takes raw_docs
        from app.processing.cleaning import CleaningPipeline
        cleaner = CleaningPipeline()
        clean_docs = cleaner.clean(docs)
        
        await test_processing(clean_docs)
    except Exception as e:
        console.print(f"[red]Error during testing: {e}[/red]")

if __name__ == "__main__":
    asyncio.run(main())
