import logging
from typing import List
from .utils import build_payload, send_log


class LogIngestHandler(logging.Handler):
    """
    logging ingestion handler that captures log messages.
    Sends captured log messages to a specified ingestion URL.
    """

    def __init__(self, ingest_url, service,api_key:str=""):
        super().__init__()
        self.ingest_url = ingest_url
        self.service = service
        self.api_key = api_key

    def emit(self, record):
        """
        Called for each log message that passes through this handler.
        This is where we capture the log data.
        """
        print("EMIT CALLED:", record.levelname)
        payload = build_payload(
                record,
                service=self.service
                # extra_metadata=self.extra_metadata,
            )
        send_log(self.ingest_url,self.api_key ,payload)