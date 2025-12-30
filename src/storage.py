from abc import ABC, abstractmethod
from typing import Dict, Any
import logging
from datetime import datetime
from typing import List



logger = logging.getLogger(__name__)

class StorageBackend(ABC):
    """Abstract base class for storage backends"""

    @abstractmethod
    def save_log(self, log_data: Dict[str, Any]) -> bool:
        """Save a log entry to storage"""
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Check if the storage backend is healthy"""
        pass

    @abstractmethod
    def close(self) -> None:
        """Close any connections/cleanup"""
        pass

    @abstractmethod
    def query_logs(
        self,
        search: str | None = None,
        level: str | None = None,
        service: str | None = None,
        from_ts: str | None = None,
        to_ts: str | None = None,
        page: int = 1,
        size: int = 50,
        project_id: str | None = None
    ) -> Dict[str, Any]:
        """Return logs + total count"""
        pass
    
    @abstractmethod
    def get_unique_services(self) -> List[str]:
        pass    

class SQLiteStorage(StorageBackend):
    """SQLite storage backend"""

    def __init__(self, session_factory):
        self.session_factory = session_factory
        from models import LogEntry

    def save_log(self, log_data: Dict[str, Any]) -> bool:
        """Save log entry to SQLite database"""
        from models import LogEntry

        db = self.session_factory()
        try:
            # Parse timestamp
            timestamp_str = log_data.get('timestamp')
            if timestamp_str:
                timestamp_str = timestamp_str.replace('Z', '+00:00')
                timestamp = datetime.fromisoformat(timestamp_str)
            else:
                timestamp = datetime.utcnow()

            # Create log entry with project_id
            log_entry = LogEntry(
                timestamp=timestamp,
                level=log_data.get('level', 'INFO').upper(),
                service=log_data.get('service', 'unknown'),
                message=log_data.get('message', ''),
                log_metadata=log_data.get('metadata'),
                project_id=log_data.get('project_id', 'default')
            )

            db.add(log_entry)
            db.commit()
            logger.info(f"Saved log to SQLite: {log_entry.level} - {log_entry.message} (Project: {log_entry.project_id})")
            return True
        except Exception as e:
            logger.error(f"Failed to save log to SQLite: {e}")
            db.rollback()
            return False
        finally:
            db.close()

    def health_check(self) -> bool:
        """Check SQLite connectivity"""
        try:
            db = self.session_factory()
            db.execute("SELECT 1")
            db.close()
            return True
        except Exception as e:
            logger.error(f"SQLite health check failed: {e}")
            return False

    def close(self) -> None:
        """SQLite cleanup"""
        pass

    def query_logs(self, search: str | None = None, level: str | None = None, service: str | None = None, from_ts: str | None = None, to_ts: str | None = None, page: int = 1, size: int = 50, project_id: str | None = None) -> Dict[str, Any]:
        """Query logs with filters and pagination using SQLite"""
        try:
            from models import LogEntry
            from sqlalchemy import and_, or_, func, desc

            db = self.session_factory()
            try:
                logger.info(f"Database URL: {db.bind.url}")
                logger.info(f"Testing database connection...")
                # Build base query
                query = db.query(LogEntry)
                count_query = db.query(func.count(LogEntry.id))

                # Build filters
                filters = []

                if search:
                    filters.append(
                        or_(
                            LogEntry.message.contains(search),
                            LogEntry.service.contains(search)
                        )
                    )

                if level and level.upper() != 'ALL':
                    filters.append(LogEntry.level == level.upper())

                if service and service != 'ALL':
                    filters.append(LogEntry.service == service)

                if project_id:
                    filters.append(LogEntry.project_id == project_id)

                if from_ts:
                    try:
                        start_time = datetime.fromisoformat(from_ts.replace('Z', '+00:00'))
                        filters.append(LogEntry.timestamp >= start_time)
                    except ValueError:
                        logger.warning(f"Invalid from_ts format: {from_ts}")

                if to_ts:
                    try:
                        end_time = datetime.fromisoformat(to_ts.replace('Z', '+00:00'))
                        filters.append(LogEntry.timestamp <= end_time)
                    except ValueError:
                        logger.warning(f"Invalid to_ts format: {to_ts}")

                # Apply filters
                if filters:
                    query = query.filter(and_(*filters))
                    count_query = count_query.filter(and_(*filters))

                # Get total count
                total = count_query.scalar()
                logger.info(f"Total logs in database: {total}")

                # Apply pagination and sorting
                offset = (page - 1) * size if page > 1 else 0
                query = query.order_by(desc(LogEntry.timestamp)).offset(offset).limit(size)

                # Execute query
                logs = query.all()
                logger.info(f"Retrieved {len(logs)} logs from query")

                # Convert to dict format
                log_list = []
                for log in logs:
                    log_list.append({
                        'id': str(log.id),
                        'timestamp': log.timestamp.isoformat(),
                        'level': log.level,
                        'service': log.service,
                        'message': log.message,
                        'metadata': log.log_metadata or {}
                    })

                return {
                    "logs": log_list,
                    "total": total,
                    "page": page,
                    "size": size,
                    "total_pages": (total + size - 1) // size if size > 0 else 0
                }

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Failed to query logs from SQLite: {e}")
            return {
                "logs": [],
                "total": 0,
                "page": page,
                "size": size,
                "total_pages": 0
            }

    def get_unique_services(self) -> List[str]:
        """Get all unique service names from SQLite"""
        try:
            from models import LogEntry

            db = self.session_factory()
            try:
                # Query distinct services
                services = db.query(LogEntry.service).distinct().all()

                # Extract service names from tuples and sort
                service_list = sorted([service[0] for service in services if service[0]])

                logger.info(f"Found {len(service_list)} unique services in SQLite")
                return service_list

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Failed to get unique services from SQLite: {e}")
            return []


class ElasticsearchStorage(StorageBackend):
    """Elasticsearch storage backend"""

    def __init__(self, elasticsearch_client, index_name: str = "logs"):
        self.es = elasticsearch_client
        self.index_name = index_name

    def save_log(self, log_data: Dict[str, Any]) -> bool:
        """Save log entry to Elasticsearch"""
        try:
            # Prepare document for Elasticsearch
            doc = {
                "timestamp": log_data.get('timestamp', datetime.utcnow().isoformat()),
                "level": log_data.get('level', 'INFO').upper(),
                "service": log_data.get('service', 'unknown'),
                "message": log_data.get('message', ''),
                "metadata": log_data.get('metadata', {}),
                "project_id": log_data.get('project_id', 'default')
            }

            # Convert timestamp to proper format for Elasticsearch
            if doc["timestamp"]:
                if doc["timestamp"].endswith('Z'):
                    doc["timestamp"] = doc["timestamp"].replace('Z', '+00:00')
                doc["@timestamp"] = datetime.fromisoformat(doc["timestamp"]).isoformat()

            response = self.es.index(
                index=self.index_name,
                body=doc
            )

            logger.info(f"Saved log to Elasticsearch: {doc['level']} - {doc['message']} (ID: {response.get('_id')}, Project: {doc['project_id']})")
            return True

        except Exception as e:
            logger.error(f"Failed to save log to Elasticsearch: {e}")
            return False

    def health_check(self) -> bool:
        """Check Elasticsearch connectivity"""
        try:
            response = self.es.cluster.health()
            return response.get('status') in ['green', 'yellow']
        except Exception as e:
            logger.error(f"Elasticsearch health check failed: {e}")
            return False

    def close(self) -> None:
        """Elasticsearch cleanup"""
        try:
            self.es.close()
        except Exception as e:
            logger.error(f"Error closing Elasticsearch connection: {e}")


    def query_logs(self, search: str | None = None, level: str | None = None, service: str | None = None, from_ts: str | None = None, to_ts: str | None = None, page: int = 1, size: int = 50, project_id: str | None = None) -> Dict[str, Any]:
        """
        Query logs with filters and pagination using Elasticsearch DSL

        Args:
            search: str - Text search query (searches across message, service, metadata)
            level: str - Filter by log level
            service: str - Filter by service name
            from_ts: str - ISO datetime start range
            to_ts: str - ISO datetime end range
            page: int - Page number (starts from 1)
            size: int - Maximum number of results to return

        Returns:
            Dict[str, Any] - Dictionary with logs list and pagination info
        """
        try:
            # Build the base query using Elasticsearch DSL
            from elasticsearch.dsl import Search, Q

            # Initialize search
            s = Search(using=self.es, index=self.index_name)

            # Build query conditions
            must_clauses = []
            filter_clauses = []

            # Text search query (searches across message, service fields)
            if search:
                must_clauses.append(
                    Q('multi_match',
                    query=search,
                    fields=[
                        'message', 
                        'service', 
                        "metadata.logger_name",
                        "metadata.pathname",
                        "metadata.func_name",
                        "metadata.file_name",
                        "metadata.module",
                    ],
                    fuzziness='AUTO')
                )

            # Exact level filter
            if level and level != 'ALL':
                filter_clauses.append(
                    Q('term', level__keyword=level.upper())
                )

            # Exact service filter
            if service and service != 'ALL':
                filter_clauses.append(
                    Q('term', service__keyword=service)
                )

            # Exact project_id filter
            if project_id:
                filter_clauses.append(
                    Q('term', project_id__keyword=project_id)
                )

            # Date range filter
            date_range = {}
            if from_ts:
                date_range['gte'] = from_ts
            if to_ts:
                date_range['lte'] = to_ts

            if date_range:
                # Handle @timestamp field used in index
                filter_clauses.append(
                    Q('range', timestamp=date_range)
                )

            # Combine must and filter clauses correctly
            if must_clauses or filter_clauses:
                # Create a single bool query with both must and filter clauses
                s = s.query('bool', must=must_clauses if must_clauses else [Q('match_all')], filter=filter_clauses)
            else:
                # Default match_all query if no filters
                s = s.query('match_all')

            # Add sorting by timestamp (newest first)
            s = s.sort({'timestamp': {'order': 'desc'}})

            # Apply pagination
            offset = (page - 1) * size if page > 1 else 0
            s = s[offset:offset + size]

            # Execute search
            response = s.execute()

            # Convert hits to list of dictionaries
            logs = []
            for hit in response:
                log_entry = {
                    'id': hit.meta.id,
                    'timestamp': hit.timestamp if hasattr(hit, 'timestamp') else hit.get('timestamp', ''),
                    'level': hit.level if hasattr(hit, 'level') else hit.get('level', 'INFO'),
                    'service': hit.service if hasattr(hit, 'service') else hit.get('service', 'unknown'),
                    'message': hit.message if hasattr(hit, 'message') else hit.get('message', ''),
                    'metadata': hit.metadata if hasattr(hit, 'metadata') else hit.get('metadata', {})
                }
                logs.append(log_entry)

            logger.info(f"Retrieved {len(logs)} logs from Elasticsearch (page: {page}, size: {size})")

            # Get total count
            total = response.hits.total.value if hasattr(response.hits, 'total') else len(logs)

            return {
                "logs": logs,
                "total": total,
                "page": page,
                "size": size,
                "total_pages": (total + size - 1) // size if size > 0 else 0
            }


        except Exception as e:
            logger.error(f"Failed to query logs from Elasticsearch: {e}")
            return {
                "logs": [],
                "total": 0,
                "page": page,
                "size": size,
                "total_pages": 0
            }
    

    def get_unique_services(self) -> List[str]:
        """Get all unique service names using terms aggregation"""
        try:
            from elasticsearch.dsl import Search, A

            s = Search(using=self.es, index=self.index_name)

            # Add terms aggregation for service field
            s.aggs.bucket('services', 'terms', field='service.keyword', size=1000)

            # Set size to 0 to return no documents, only aggregations
            s = s[0:0]

            response = s.execute()

            services = []
            if hasattr(response.aggregations, 'services'):
                for bucket in response.aggregations.services.buckets:
                    services.append(bucket.key)

            logger.info(f"Found {len(services)} unique services")
            return sorted(services)

        except Exception as e:
            logger.error(f"Failed to get unique services from Elasticsearch: {e}")
            return []
            

class S3CompatibleStorage(StorageBackend):
    """S3-compatible storage backend for object storage systems like AWS S3, MinIO, etc."""

    def __init__(
        self,
        endpoint_url: str,
        aws_access_key_id: str,
        aws_secret_access_key: str,
        bucket_name: str,
        region: str = "us-east-1",
        prefix: str = "logs"
    ):
        """
        Initialize S3-compatible storage backend

        Args:
            endpoint_url: S3 endpoint URL (e.g., 'http://localhost:9000' for MinIO)
            aws_access_key_id: Access key ID
            aws_secret_access_key: Secret access key
            bucket_name: S3 bucket name
            region: AWS region (default: us-east-1)
            prefix: Prefix for all log objects (default: 'logs')
        """
        try:
            import boto3
            from botocore.client import Config as BotoConfig

            self.endpoint_url = endpoint_url
            self.bucket_name = bucket_name
            self.prefix = prefix
            self.region = region

            # Create S3 client with custom configuration for S3-compatible services
            self.s3_client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key,
                region_name=region,
                config=BotoConfig(
                    signature_version='s3v4',
                    s3={'addressing_style': 'path'}
                )
            )

            # Create bucket if it doesn't exist
            self._ensure_bucket_exists()

            logger.info(f"S3-compatible storage initialized: bucket={bucket_name}, endpoint={endpoint_url}")

        except ImportError:
            logger.error("boto3 is required for S3 storage. Install with: pip install boto3")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize S3 storage: {e}")
            raise

    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        try:
            # Check if bucket exists
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except Exception as e:
            try:
                # Bucket doesn't exist, create it
                logger.info(f"Creating S3 bucket: {self.bucket_name}")
                if self.region == 'us-east-1':
                    # us-east-1 has a special case for LocationConstraint
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                else:
                    self.s3_client.create_bucket(
                        Bucket=self.bucket_name,
                        CreateBucketConfiguration={'LocationConstraint': self.region}
                    )
                logger.info(f"Successfully created bucket: {self.bucket_name}")
            except Exception as create_error:
                logger.error(f"Failed to create bucket: {create_error}")
                raise

    def _generate_object_key(self, log_data: Dict[str, Any]) -> str:
        """
        Generate S3 object key based on timestamp and project

        Format: prefix/project_id/YYYY/MM/DD/HH/filename.json
        """
        try:
            timestamp_str = log_data.get('timestamp')
            if timestamp_str:
                if timestamp_str.endswith('Z'):
                    timestamp_str = timestamp_str.replace('Z', '+00:00')
                timestamp = datetime.fromisoformat(timestamp_str)
            else:
                timestamp = datetime.utcnow()

            project_id = log_data.get('project_id', 'default')

            # Create key path
            key_parts = [
                self.prefix,
                project_id,
                timestamp.strftime('%Y'),
                timestamp.strftime('%m'),
                timestamp.strftime('%d'),
                timestamp.strftime('%H'),
                f"{timestamp.strftime('%Y%m%d%H%M%S')}_{log_data.get('service', 'unknown')}_{log_data.get('level', 'INFO')}.json"
            ]

            return '/'.join(key_parts)

        except Exception as e:
            logger.error(f"Failed to generate object key: {e}")
            # Fallback to simple key
            return f"{self.prefix}/unknown/{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.json"

    def save_log(self, log_data: Dict[str, Any]) -> bool:
        """Save log entry to S3 as a JSON file"""
        try:
            import json

            # Prepare log entry
            log_entry = {
                "timestamp": log_data.get('timestamp', datetime.utcnow().isoformat()),
                "level": log_data.get('level', 'INFO').upper(),
                "service": log_data.get('service', 'unknown'),
                "message": log_data.get('message', ''),
                "metadata": log_data.get('metadata', {}),
                "project_id": log_data.get('project_id', 'default')
            }

            # Generate object key
            object_key = self._generate_object_key(log_entry)

            # Convert to JSON bytes
            json_data = json.dumps(log_entry, default=str).encode('utf-8')

            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=json_data,
                ContentType='application/json',
                Metadata={
                    'level': log_entry['level'],
                    'service': log_entry['service'],
                    'project_id': str(log_entry['project_id'])
                }
            )

            logger.info(f"Saved log to S3: {object_key}")
            return True

        except Exception as e:
            logger.error(f"Failed to save log to S3: {e}")
            return False

    def health_check(self) -> bool:
        """Check S3 connectivity"""
        try:
            # Try to list objects in the bucket with max 1 object
            self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=self.prefix,
                MaxKeys=1
            )
            return True
        except Exception as e:
            logger.error(f"S3 health check failed: {e}")
            return False

    def close(self) -> None:
        """S3 cleanup - close the client connection"""
        try:
            # S3 client doesn't need explicit closing, but we can clear references
            self.s3_client = None
            logger.info("S3 client closed")
        except Exception as e:
            logger.error(f"Error closing S3 client: {e}")

    def query_logs(
        self,
        search: str | None = None,
        level: str | None = None,
        service: str | None = None,
        from_ts: str | None = None,
        to_ts: str | None = None,
        page: int = 1,
        size: int = 50,
        project_id: str | None = None
    ) -> Dict[str, Any]:
        """
        Query logs with filters and pagination from S3

        Note: This is a basic implementation that lists and filters objects.
        For production use with large datasets, consider using Athena or Glue
        """
        try:
            import json
            from typing import Dict, Any

            all_logs = []

            # Build prefix for listing (use date range if provided)
            list_prefix = self.prefix

            if project_id:
                list_prefix = f"{self.prefix}/{project_id}"
            elif from_ts:
                try:
                    start_time = datetime.fromisoformat(from_ts.replace('Z', '+00:00'))
                    list_prefix = f"{self.prefix}/{start_time.strftime('%Y/%m/%d')}"
                except ValueError:
                    logger.warning(f"Invalid from_ts format: {from_ts}")

            # List all objects in the bucket with the prefix
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=list_prefix)

            for page in pages:
                if 'Contents' not in page:
                    continue

                for obj in page['Contents']:
                    try:
                        # Get object metadata first for filtering
                        obj_metadata = self.s3_client.head_object(
                            Bucket=self.bucket_name,
                            Key=obj['Key']
                        ).get('Metadata', {})

                        # Apply filters based on metadata
                        if level and level.upper() != 'ALL':
                            if obj_metadata.get('level', '').upper() != level.upper():
                                continue

                        if service and service != 'ALL':
                            if obj_metadata.get('service', '') != service:
                                continue

                        # Download and parse the object content
                        response = self.s3_client.get_object(
                            Bucket=self.bucket_name,
                            Key=obj['Key']
                        )

                        log_entry = json.loads(response['Body'].read().decode('utf-8'))
                        log_entry['id'] = obj['Key']  # Use S3 key as ID

                        # Apply text search filter
                        if search:
                            search_text = f"{log_entry.get('message', '')} {log_entry.get('service', '')}".lower()
                            if search.lower() not in search_text:
                                continue

                        # Apply date range filter
                        timestamp_str = log_entry.get('timestamp', '')
                        if timestamp_str:
                            if timestamp_str.endswith('Z'):
                                timestamp_str = timestamp_str.replace('Z', '+00:00')
                            log_timestamp = datetime.fromisoformat(timestamp_str)

                            if from_ts:
                                try:
                                    start_time = datetime.fromisoformat(from_ts.replace('Z', '+00:00'))
                                    if log_timestamp < start_time:
                                        continue
                                except ValueError:
                                    pass

                            if to_ts:
                                try:
                                    end_time = datetime.fromisoformat(to_ts.replace('Z', '+00:00'))
                                    if log_timestamp > end_time:
                                        continue
                                except ValueError:
                                    pass

                        all_logs.append(log_entry)

                    except Exception as e:
                        logger.warning(f"Failed to process object {obj['Key']}: {e}")
                        continue

            # Sort by timestamp (newest first)
            all_logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

            # Get total count
            total = len(all_logs)

            # Apply pagination
            offset = (page - 1) * size if page > 1 else 0
            paginated_logs = all_logs[offset:offset + size]

            logger.info(f"Retrieved {len(paginated_logs)} logs from S3 (page: {page}, total: {total})")

            return {
                "logs": paginated_logs,
                "total": total,
                "page": page,
                "size": size,
                "total_pages": (total + size - 1) // size if size > 0 else 0
            }

        except Exception as e:
            logger.error(f"Failed to query logs from S3: {e}")
            return {
                "logs": [],
                "total": 0,
                "page": page,
                "size": size,
                "total_pages": 0
            }

    def get_unique_services(self) -> List[str]:
        """Get all unique service names from S3 metadata"""
        try:
            services = set()

            # List all objects and collect service names from metadata
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=self.prefix)

            for page in pages:
                if 'Contents' not in page:
                    continue

                for obj in page['Contents']:
                    try:
                        # Get object metadata
                        obj_metadata = self.s3_client.head_object(
                            Bucket=self.bucket_name,
                            Key=obj['Key']
                        ).get('Metadata', {})

                        service = obj_metadata.get('service', '')
                        if service:
                            services.add(service)

                    except Exception as e:
                        logger.warning(f"Failed to get metadata for {obj['Key']}: {e}")
                        continue

            service_list = sorted(list(services))
            logger.info(f"Found {len(service_list)} unique services in S3")
            return service_list

        except Exception as e:
            logger.error(f"Failed to get unique services from S3: {e}")
            return []