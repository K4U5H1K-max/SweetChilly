import typer
import subprocess

app = typer.Typer()

@app.command("run")
def run_job(job_name: str):
    typer.echo(f"Manually triggering job: {job_name}")

@app.command("worker")
def start_worker():
    """
    Start the RQ worker to process background jobs.
    """
    typer.echo("Starting RQ Worker for queues: ingestion processing")
    try:
        subprocess.run(["rq", "worker", "--worker-class", "rq.SimpleWorker", "ingestion", "processing"])
    except KeyboardInterrupt:
        typer.echo("\nWorker stopped.")
