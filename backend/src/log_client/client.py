from .handler import LogIngestHandler
import logging



def init(
    ingest_url: str = "http://localhost:8000/ingest",
    api_key: str = "",
    service: str = "default_service",
    level: int = logging.INFO,
):
    capture_handler = LogIngestHandler(
        ingest_url=ingest_url,
        service=service,
        api_key=api_key,
    )
    capture_handler.setLevel(level)

    # Add handler to root logger - this captures logs from ALL loggers
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.NOTSET)  
    root_logger.addHandler(capture_handler)
    
    
    console = logging.StreamHandler()
    console.setLevel(level)
    root_logger.addHandler(console)
