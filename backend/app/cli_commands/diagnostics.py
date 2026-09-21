import typer

app = typer.Typer()

@app.command("stats")
def show_stats():
    typer.echo("Showing pipeline statistics...")

@app.command("status")
def pipeline_status():
    typer.echo("Showing overall pipeline status...")

@app.command("failures")
def pipeline_failures():
    typer.echo("Listing recent processing failures...")

@app.command("documents")
def list_documents():
    typer.echo("Listing recently processed documents...")
