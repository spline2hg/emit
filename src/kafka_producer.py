from kafka import KafkaProducer
import json
import logging
from typing import Dict, Any

# Configure logging for kafka
logging.getLogger('kafka').setLevel(logging.WARNING)
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

class KafkaLogProducer:
    def __init__(self, bootstrap_servers: str = 'localhost:9092', topic: str = 'logs'):
        self.topic = topic
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=[bootstrap_servers],
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                retries=3,
                acks='all'
            )
            logger.info("Kafka producer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka producer: {e}")
            self.producer = None

    def send_log(self, log_data: Dict[str, Any]) -> bool:
        """Send log data to Kafka topic"""
        if not self.producer:
            logger.warning("Kafka producer not available, skipping Kafka send")
            return False

        try:
            logger.info(f"Sending to Kafka: {log_data}")
            # Use service as key for partitioning
            future = self.producer.send(
                self.topic,
                key=log_data.get('service', 'unknown'),
                value=log_data
            )

            # Wait for acknowledgment
            result = future.get(timeout=10)
            logger.info(f"✓ Log sent to Kafka: {log_data.get('level')} - {log_data.get('message')}")
            return True
        except Exception as e:
            logger.error(f"Failed to send log to Kafka: {e}")
            return False

    def close(self):
        """Close the Kafka producer"""
        if self.producer:
            self.producer.flush()
            self.producer.close()

# Global producer instance
kafka_producer = None

def get_kafka_producer() -> KafkaLogProducer:
    """Get or create Kafka producer instance"""
    global kafka_producer
    if kafka_producer is None:
        kafka_producer = KafkaLogProducer()
    return kafka_producer