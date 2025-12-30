import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""

    # Kafka settings
    KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
    KAFKA_TOPIC = os.getenv('KAFKA_TOPIC', 'logs')
    KAFKA_GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'log-consumer-group')

    # SQLite settings
    SQLITE_DATABASE_URL = os.getenv('SQLITE_DATABASE_URL', 'sqlite:///./logs1.db')

    # Elasticsearch settings
    ELASTICSEARCH_HOST = os.getenv('ELASTICSEARCH_HOST', 'localhost')
    ELASTICSEARCH_PORT = int(os.getenv('ELASTICSEARCH_PORT', '9200'))
    ELASTICSEARCH_INDEX = os.getenv('ELASTICSEARCH_INDEX', 'logs')
    ELASTICSEARCH_USE_SSL = os.getenv('ELASTICSEARCH_USE_SSL', 'false').lower() == 'true'
    ELASTICSEARCH_VERIFY_CERTS = os.getenv('ELASTICSEARCH_VERIFY_CERTS', 'true').lower() == 'true'

    # Storage settings - Choose ONE backend
    STORAGE_BACKEND = os.getenv('STORAGE_BACKEND', 'elasticsearch')  # Options: 'sqlite', 'elasticsearch', 's3'

    # S3-compatible storage settings
    S3_ENDPOINT_URL = os.getenv('S3_ENDPOINT_URL', 'http://localhost:9000')  # For MinIO, use http://localhost:9000
    S3_AWS_ACCESS_KEY_ID = os.getenv('S3_AWS_ACCESS_KEY_ID', 'minioadmin')
    S3_AWS_SECRET_ACCESS_KEY = os.getenv('S3_AWS_SECRET_ACCESS_KEY', 'minioadmin')
    S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'log-storage')
    S3_REGION = os.getenv('S3_REGION', 'us-east-1')
    S3_PREFIX = os.getenv('S3_PREFIX', 'logs')  # Prefix for log objects in bucket