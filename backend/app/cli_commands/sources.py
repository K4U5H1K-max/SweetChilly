import typer

app = typer.Typer()

@app.command("list")
def list_sources():
    typer.echo("Listing sources...")

@app.command("status")
def status_sources():
    typer.echo("Checking source health status...")

@app.command("test")
def test_source(source_id: str):
    typer.echo(f"Testing source adapter: {source_id}")
