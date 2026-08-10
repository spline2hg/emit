import os
import ssl

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Application configuration."""

    # Kafka settings
    KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
    KAFKA_TOPIC = os.getenv('KAFKA_TOPIC', 'logs')
    KAFKA_GROUP_ID = os.getenv('KAFKA_GROUP_ID', 'log-consumer-group')
    KAFKA_SECURITY_PROTOCOL = os.getenv('KAFKA_SECURITY_PROTOCOL', 'PLAINTEXT').upper()
    KAFKA_SASL_MECHANISM = os.getenv('KAFKA_SASL_MECHANISM', 'SCRAM-SHA-256')
    KAFKA_SASL_USERNAME = os.getenv('KAFKA_SASL_USERNAME', '')
    KAFKA_SASL_PASSWORD = os.getenv('KAFKA_SASL_PASSWORD', '')
    KAFKA_SSL_CAFILE = os.getenv('KAFKA_SSL_CAFILE', '')
    KAFKA_SSL_CA_CERT = os.getenv('KAFKA_SSL_CA_CERT', '')

    # SQLite settings
    SQLITE_DATABASE_URL = os.getenv('SQLITE_DATABASE_URL', 'sqlite:///./logs.db')

    # Elasticsearch settings
    ELASTICSEARCH_HOST = os.getenv('ELASTICSEARCH_HOST', 'localhost')
    ELASTICSEARCH_PORT = int(os.getenv('ELASTICSEARCH_PORT', '9200'))
    ELASTICSEARCH_INDEX = os.getenv('ELASTICSEARCH_INDEX', 'logs')
    ELASTICSEARCH_USE_SSL = os.getenv('ELASTICSEARCH_USE_SSL', 'false').lower() == 'true'
    ELASTICSEARCH_VERIFY_CERTS = os.getenv('ELASTICSEARCH_VERIFY_CERTS', 'true').lower() == 'true'

    # Storage settings - Choose ONE backend
    STORAGE_BACKEND = os.getenv('STORAGE_BACKEND', 'sqlite')

    # S3-compatible storage settings
    S3_ENDPOINT_URL = os.getenv('S3_ENDPOINT_URL', 'http://localhost:9000')
    S3_AWS_ACCESS_KEY_ID = os.getenv('S3_AWS_ACCESS_KEY_ID', 'minioadmin')
    S3_AWS_SECRET_ACCESS_KEY = os.getenv('S3_AWS_SECRET_ACCESS_KEY', 'minioadmin')
    S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'log-storage')
    S3_REGION = os.getenv('S3_REGION', 'us-east-1')
    S3_PREFIX = os.getenv('S3_PREFIX', 'logs')

    # LLM settings (OpenAI-compatible endpoint)
    LLM_MODEL = os.getenv('LLM_MODEL')
    LLM_BASE_URL = os.getenv('LLM_BASE_URL', None)
    LLM_API_KEY = os.getenv('LLM_API_KEY', None)
    LLM_TEMPERATURE = float(os.getenv('LLM_TEMPERATURE', '0.2'))


def kafka_client_options() -> dict:
    """Build kafka-python TLS/SASL options from environment variables."""
    options = {
        'security_protocol': Config.KAFKA_SECURITY_PROTOCOL,
    }

    if Config.KAFKA_SECURITY_PROTOCOL in {'SASL_SSL', 'SASL_PLAINTEXT'}:
        options.update({
            'sasl_mechanism': Config.KAFKA_SASL_MECHANISM,
            'sasl_plain_username': Config.KAFKA_SASL_USERNAME,
            'sasl_plain_password': Config.KAFKA_SASL_PASSWORD,
        })

    if Config.KAFKA_SECURITY_PROTOCOL in {'SSL', 'SASL_SSL'}:
        if Config.KAFKA_SSL_CA_CERT:
            ca_cert = Config.KAFKA_SSL_CA_CERT.replace('\\n', '\n')
            options['ssl_context'] = ssl.create_default_context(cadata=ca_cert)
        elif Config.KAFKA_SSL_CAFILE:
            options['ssl_cafile'] = Config.KAFKA_SSL_CAFILE

    return options
