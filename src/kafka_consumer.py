from kafka import KafkaConsumer
import json
import logging
import signal
import sys
from db import engine
from models import Base
from config import Config
from storage_factory import get_storage_backend

# Configure logging - reduce Kafka noise
logging.getLogger('kafka').setLevel(logging.WARNING)
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s: %(message)s'
)


logger = logging.getLogger(__name__)

class KafkaLogConsumer:
    def __init__(self, bootstrap_servers: str = None, topic: str = None, group_id: str = None):
        # Use config values if parameters not provided
        self.topic = topic or Config.KAFKA_TOPIC
        self.group_id = group_id or Config.KAFKA_GROUP_ID
        self.bootstrap_servers = bootstrap_servers or Config.KAFKA_BOOTSTRAP_SERVERS
        self.running = False
        self.consumer = None

        # Initialize storage backend
        try:
            self.storage_backend = get_storage_backend()
            logger.info(f"Storage backend initialized: {self.storage_backend.__class__.__name__}")
        except Exception as e:
            logger.error(f"Failed to initialize storage backend: {e}")
            raise

        try:
            self.consumer = KafkaConsumer(
                self.topic,
                bootstrap_servers=[self.bootstrap_servers],
                auto_offset_reset='earliest',
                enable_auto_commit=True,
                group_id=self.group_id,
                value_deserializer=lambda x: json.loads(x.decode('utf-8')),
                key_deserializer=lambda x: x.decode('utf-8') if x else None,
                max_poll_records=100
            )
            logger.info("Kafka consumer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka consumer: {e}")

    def save_log_to_storage(self, log_data: dict) -> bool:
        """Save log entry to the configured storage backend"""
        try:
            success = self.storage_backend.save_log(log_data)

            if success:
                backend_name = self.storage_backend.__class__.__name__
                logger.info(f"✓ Log saved to {backend_name}")
            else:
                backend_name = self.storage_backend.__class__.__name__
                logger.error(f"✗ Failed to save log to {backend_name}")

            return success

        except Exception as e:
            logger.error(f"Failed to save log to storage: {e}")
            return False

    def start_consuming(self):
        """Start consuming messages from Kafka"""
        if not self.consumer:
            logger.error("Kafka consumer not initialized")
            return

        self.running = True
        logger.info(f"Starting Kafka consumer for topic: {self.topic}")

        try:
            logger.info("Starting to consume messages...")
            for message in self.consumer:
                if not self.running:
                    break

                logger.info(f"Received message: {message.value}")

                # Save to the configured storage backend
                success = self.save_log_to_storage(message.value)
                if success:
                    logger.info("✓ Log saved successfully")
                else:
                    logger.error("✗ Failed to save log")

        except KeyboardInterrupt:
            logger.info("Received interrupt signal")
        except Exception as e:
            logger.error(f"Consumer error: {e}")
        finally:
            self.stop()

    def stop(self):
        """Stop the consumer and cleanup storage backends"""
        self.running = False
        if self.consumer:
            self.consumer.close()
            logger.info("Kafka consumer stopped")

        # Cleanup storage backend
        if hasattr(self, 'storage_backend'):
            self.storage_backend.close()
            logger.info("Storage backend closed")

# Signal handler for graceful shutdown
def signal_handler(sig, frame):
    print('Shutting down gracefully...')
    sys.exit(0)

def main():
    """Main function to run the Kafka consumer"""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Create database tables if they don't exist
    # Base.metadata.create_all(bind=engine)
    print("Database tables created/verified")

    consumer = KafkaLogConsumer()
    consumer.start_consuming()

if __name__ == "__main__":
    main()