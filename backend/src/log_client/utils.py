import traceback
from datetime import datetime
import requests
import logging

logger = logging.getLogger(__name__)

def build_payload(record, service: str) -> dict:
    """
    Convert a LogRecord into a dict matching the LogEntry table.
    All extra fields go into log_metadata.
    
    dict_keys(['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 'filename', 'module', 'exc_info', 
    'exc_text', 'stack_info', 'lineno', 'funcName', 'created', 'msecs', 'relativeCreated', 'thread', 'threadName', 
    'processName', 'process', 'taskName'])
    
    """
    log_metadata = {
        "logger_name": record.name,
        "pathname": record.pathname,
        "lineno": record.lineno,
        "func_name": record.funcName,
        "file_name": record.filename,
        "module": record.module,
    }

    if record.exc_info:
        log_metadata["exception"] = "".join(traceback.format_exception(*record.exc_info))

    payload = {
        "timestamp": datetime.utcfromtimestamp(record.created).isoformat(),
        "level": record.levelname,
        "service": service,
        "message": record.getMessage(),
        "metadata": log_metadata,
    }

    return payload 


def send_log(url: str, api_key:str, payload: dict, timeout: int = 2):
    try:
        headers = {
            "X-API-Key": api_key
        }
                
        requests.post(url, json=payload, headers=headers,timeout=timeout)
        print(payload)
        pass
    except Exception as e:
        print("LOG SEND FAILED:", e)
