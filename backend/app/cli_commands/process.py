import typer
from app.workers.jobs import enqueue_processing_pipeline

app = typer.Typer()

import asyncio
from app.services.orchestration import Orchestrator

@app.command("all")
def process_all(sync: bool = typer.Option(False, "--sync", help="Run synchronously instead of enqueueing to Redis")):
    """Run the full processing pipeline."""
    if sync:
        typer.echo("Running processing pipeline synchronously...")
        orchestrator = Orchestrator()
        asyncio.run(orchestrator.process_pipeline())
        typer.echo("Processing complete.")
    else:
        typer.echo("Enqueueing full processing pipeline...")
        enqueue_processing_pipeline()
        typer.echo("Done.")
