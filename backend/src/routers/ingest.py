from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from kafka_producer import get_kafka_producer
from schema import LogIngestRequest
from utils import verify_api_key

router = APIRouter()


@router.post("/ingest", status_code=status.HTTP_202_ACCEPTED)
async def ingest_log(
    log_data: LogIngestRequest,
    auth_info: dict = Depends(verify_api_key),
):
    """Ingest a single log entry."""
    try:
        log_dict = {
            "timestamp": log_data.timestamp or datetime.utcnow().isoformat(),
            "level": log_data.level.upper(),
            "service": log_data.service,
            "message": log_data.message,
            "metadata": log_data.metadata,
            "workspace_id": auth_info["workspace_id"],
        }

        kafka_producer = get_kafka_producer()
        if not kafka_producer.send_log(log_dict):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to send log to Kafka",
            )

        return {
            "status": "accepted",
            "message": "Log queued for processing",
            "timestamp": log_dict["timestamp"],
            "workspace_id": auth_info["workspace_id"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to ingest log: {str(e)}",
        )


@router.post("/ingest/batch", status_code=status.HTTP_202_ACCEPTED)
async def ingest_logs_batch(
    logs: List[LogIngestRequest],
    auth_info: dict = Depends(verify_api_key),
):
    """Ingest multiple logs in a single request."""
    try:
        kafka_producer = get_kafka_producer()
        success_count = 0

        for log_data in logs:
            log_dict = {
                "timestamp": log_data.timestamp or datetime.utcnow().isoformat(),
                "level": log_data.level.upper(),
                "service": log_data.service,
                "message": log_data.message,
                "metadata": log_data.metadata,
                "workspace_id": auth_info["workspace_id"],
            }
            if kafka_producer.send_log(log_dict):
                success_count += 1

        if success_count == 0:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Failed to send any logs to Kafka",
            )

        return {
            "status": "accepted",
            "message": f"Batch of {success_count}/{len(logs)} logs queued for processing",
            "queued": success_count,
            "failed": len(logs) - success_count,
            "workspace_id": auth_info["workspace_id"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to ingest batch: {str(e)}",
        )
