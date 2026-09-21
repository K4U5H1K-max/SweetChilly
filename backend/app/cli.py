import typer
from app.cli_commands import ingest, process, events, sources, jobs, diagnostics

app = typer.Typer(help="Logistics & Accessibility Event Intelligence Engine")

app.add_typer(ingest.app, name="ingest", help="Ingest raw data from external sources")
app.add_typer(process.app, name="process", help="Run data processing pipeline stages")
app.add_typer(events.app, name="events", help="Inspect and query canonical events")
app.add_typer(sources.app, name="sources", help="Manage and inspect source adapters")
app.add_typer(jobs.app, name="jobs", help="Manage background worker jobs")
app.add_typer(diagnostics.app, name="diagnostics", help="Pipeline diagnostics and stats")

@app.command()
def run():
    """
    Run the end-to-end ingestion and processing workflow.
    """
    typer.echo("Running end-to-end workflow...")
    # This will later call orchestration services
    typer.echo("Workflow complete.")

if __name__ == "__main__":
    app()
