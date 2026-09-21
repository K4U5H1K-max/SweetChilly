import typer
import asyncio
from app.workers.jobs import enqueue_ingestion_job
from app.services.orchestration import Orchestrator

app = typer.Typer()

def _run_sync(source: str):
    typer.echo(f"Running {source} ingestion synchronously...")
    orchestrator = Orchestrator()
    asyncio.run(orchestrator.ingest_source(source))
    typer.echo("Done.")

@app.command("gdelt")
def ingest_gdelt(sync: bool = typer.Option(False, "--sync", help="Run synchronously instead of enqueueing to Redis")):
    """Ingest data from GDELT."""
    if sync:
        _run_sync("GDELT")
    else:
        typer.echo("Enqueueing GDELT ingestion...")
        enqueue_ingestion_job("GDELT")
        typer.echo("Done.")

@app.command("pib")
def ingest_pib(sync: bool = typer.Option(False, "--sync", help="Run synchronously instead of enqueueing to Redis")):
    """Ingest data from PIB."""
    if sync:
        _run_sync("PIB")
    else:
        typer.echo("Enqueueing PIB ingestion...")
        enqueue_ingestion_job("PIB")
        typer.echo("Done.")

@app.command("imd")
def ingest_imd(sync: bool = typer.Option(False, "--sync", help="Run synchronously instead of enqueueing to Redis")):
    """Ingest data from IMD."""
    if sync:
        _run_sync("IMD")
    else:
        typer.echo("Enqueueing IMD ingestion...")
        enqueue_ingestion_job("IMD")
        typer.echo("Done.")

@app.command("nhai")
def ingest_nhai(sync: bool = typer.Option(False, "--sync", help="Run synchronously instead of enqueueing to Redis")):
    """Ingest data from NHAI."""
    if sync:
        _run_sync("NHAI")
    else:
        typer.echo("Enqueueing NHAI ingestion...")
        enqueue_ingestion_job("NHAI")
        typer.echo("Done.")

@app.command("aai")
def ingest_aai(sync: bool = typer.Option(False, "--sync", help="Run synchronously instead of enqueueing to Redis")):
    """Ingest data from AAI."""
    if sync:
        _run_sync("AAI")
    else:
        typer.echo("Enqueueing AAI ingestion...")
        enqueue_ingestion_job("AAI")
        typer.echo("Done.")

@app.command("all")
def ingest_all(sync: bool = typer.Option(False, "--sync", help="Run synchronously instead of enqueueing to Redis")):
    """Ingest data from all enabled sources."""
    if sync:
        for source in ["GDELT", "PIB", "IMD", "NHAI", "AAI"]:
            _run_sync(source)
    else:
        typer.echo("Enqueueing all sources...")
        for source in ["GDELT", "PIB", "IMD", "NHAI", "AAI"]:
            enqueue_ingestion_job(source)
        typer.echo("Done.")
