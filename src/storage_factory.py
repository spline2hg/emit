from enum import Enum
from storage import StorageBackend, SQLiteStorage, ElasticsearchStorage, S3CompatibleStorage
from config import Config
from db import SessionLocal
from elasticsearch import Elasticsearch
import logging
from functools import lru_cache
from models import Base
from db import engine


class StorageBackendType(Enum):
    SQLITE = "sqlite"
    ELASTICSEARCH = "elasticsearch"
    S3 = "s3"

logger = logging.getLogger(__name__)

backend_type_map = {
    'sqlite': StorageBackendType.SQLITE,
    'elasticsearch': StorageBackendType.ELASTICSEARCH,
    's3': StorageBackendType.S3
}

_es_client: Elasticsearch | None = None

def create_elasticsearch_client() -> Elasticsearch:
    """Create Elasticsearch client"""
    try:
        global _es_client
        if _es_client is None:
            _es_client = Elasticsearch(
                f"http://{Config.ELASTICSEARCH_HOST}:{Config.ELASTICSEARCH_PORT}"
            )
            
        # Test connection
        if _es_client.ping():
            logger.info("Elasticsearch client connected successfully")
            return _es_client
        else:
            logger.error("Failed to ping Elasticsearch")
            return None

    except Exception as e:
        logger.error(f"Failed to create Elasticsearch client: {e}")
        return None


@lru_cache(maxsize=2)
def get_storage_backend(backend_name: str | None = None) -> StorageBackend:
    """Create and return the storage backend

    Args:
        backend_name: Optional backend name ('sqlite', 'elasticsearch', or 's3').
                     If not provided, uses Config.STORAGE_BACKEND
    """
    try:
        # Use provided backend or fall back to config
        backend_name = backend_name.lower() if backend_name else Config.STORAGE_BACKEND.lower()


        backend_type = backend_type_map.get(backend_name)
        if not backend_type:
            raise ValueError(f"Invalid storage backend: {backend_name}. Valid options: {list(backend_type_map.keys())}")

        logger.info(f"Initializing storage backend: {backend_name}")

        # Create appropriate backend
        if backend_type == StorageBackendType.SQLITE:
            Base.metadata.create_all(bind=engine)
            backend = SQLiteStorage(SessionLocal)
            logger.info("SQLite storage backend initialized")
        elif backend_type == StorageBackendType.ELASTICSEARCH:
            es_client = create_elasticsearch_client()
            if not es_client:
                raise RuntimeError("Failed to create Elasticsearch client")
            backend = ElasticsearchStorage(es_client, Config.ELASTICSEARCH_INDEX)
            logger.info("Elasticsearch storage backend initialized")
        elif backend_type == StorageBackendType.S3:
            # Create S3-compatible storage backend
            backend = S3CompatibleStorage(
                endpoint_url=Config.S3_ENDPOINT_URL,
                aws_access_key_id=Config.S3_AWS_ACCESS_KEY_ID,
                aws_secret_access_key=Config.S3_AWS_SECRET_ACCESS_KEY,
                bucket_name=Config.S3_BUCKET_NAME,
                region=Config.S3_REGION,
                prefix=Config.S3_PREFIX
            )
            logger.info("S3-compatible storage backend initialized")
        else:
            raise ValueError(f"Unsupported storage backend: {backend_type}")

        return backend

    except Exception as e:
        logger.error(f"Failed to initialize storage backend: {e}")
        raise