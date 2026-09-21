import typer
import json
from typing import Optional
from app.db.session import SessionLocal
from app.repositories import event_repo, location_repo
from app.core.enums import EventStatus

app = typer.Typer()

@app.command("list")
def list_events(
    type: Optional[str] = typer.Option(None, help="Filter by event type"),
    severity: Optional[str] = typer.Option(None, help="Filter by severity"),
    status: Optional[str] = typer.Option(None, help="Filter by status"),
):
    with SessionLocal() as db:
        query = db.query(event_repo.model)
        
        if type:
            query = query.filter(event_repo.model.event_type == type)
        if severity:
            query = query.filter(event_repo.model.severity == severity)
        if status:
            try:
                enum_status = EventStatus(status.upper())
                query = query.filter(event_repo.model.status == enum_status)
            except ValueError:
                typer.echo(f"Invalid status: {status}")
                return
                
        events = query.limit(50).all()
        
        if not events:
            typer.echo("No events found matching criteria.")
            return
            
        from rich.console import Console
        from rich.table import Table
        
        console = Console()
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("ID", style="dim", width=10)
        table.add_column("Type")
        table.add_column("Title")
        table.add_column("Severity")
        table.add_column("Status")
        
        for e in events:
            table.add_row(str(e.id)[:8], e.event_type, e.title[:40], e.severity, str(e.status.value))
            
        console.print(table)

@app.command("show")
def show_event(event_id: str):
    with SessionLocal() as db:
        event = event_repo.get(db, event_id)
        if not event:
            typer.echo(f"Event {event_id} not found.")
            return
            
        from rich.console import Console
        console = Console()
        
        console.print(f"[bold]Title:[/bold] {event.title}")
        console.print(f"[bold]Type:[/bold] {event.event_type}")
        console.print(f"[bold]Severity:[/bold] {event.severity}")
        console.print(f"[bold]Status:[/bold] {event.status.value}")
        console.print(f"[bold]Cause:[/bold] {event.cause}")
        console.print(f"[bold]Summary:[/bold] {event.summary}")
        
        if event.metadata_json:
            console.print("\n[bold]Metadata:[/bold]")
            console.print(json.dumps(event.metadata_json, indent=2))

@app.command("active")
def active_events():
    """Alias for list --status ACTIVE"""
    list_events(status="ACTIVE")

@app.command("nearby")
def nearby_events(
    lat: float = typer.Option(..., help="Latitude"),
    lon: float = typer.Option(..., help="Longitude"),
    radius: float = typer.Option(..., help="Radius in km")
):
    with SessionLocal() as db:
        # First find locations, then find events linked to those locations
        locations = location_repo.find_nearby(db, lat, lon, radius)
        if not locations:
            typer.echo(f"No locations found within {radius}km of {lat}, {lon}")
            return
            
        # Simplified: in a real implementation we would join EventLocation
        # For now, just print the locations found.
        typer.echo(f"Found {len(locations)} locations within {radius}km.")
        for loc in locations:
            typer.echo(f"- {loc.name} ({loc.district}, {loc.state})")
            
@app.command("export")
def export_events(
    format: str = typer.Option("json", help="Export format (json)"),
    status: Optional[str] = typer.Option(None, help="Filter by status")
):
    with SessionLocal() as db:
        query = db.query(event_repo.model)
        if status:
            try:
                enum_status = EventStatus(status.upper())
                query = query.filter(event_repo.model.status == enum_status)
            except ValueError:
                pass
                
        events = query.all()
        
        if format == "json":
            out = []
            for e in events:
                out.append({
                    "id": str(e.id),
                    "title": e.title,
                    "type": e.event_type,
                    "severity": e.severity,
                    "status": e.status.value,
                    "metadata": e.metadata_json
                })
            typer.echo(json.dumps(out, indent=2))
        else:
            typer.echo(f"Format {format} not supported yet.")
