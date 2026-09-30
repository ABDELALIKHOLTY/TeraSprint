import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from core.config import settings
import logging

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=f"http://{settings.MINIO_ENDPOINT}" if not settings.MINIO_SECURE else f"https://{settings.MINIO_ENDPOINT}",
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            config=Config(signature_version='s3v4'),
            region_name='us-east-1' # Required for boto3 even if not used by MinIO
        )
        self._init_buckets()

    def _init_buckets(self):
        """Initializes the buckets if they do not exist."""
        # 1. Avatars Bucket
        self._create_public_bucket(settings.MINIO_BUCKET_AVATARS)
        # 2. Project Files Bucket
        self._create_public_bucket(settings.MINIO_BUCKET_PROJECT_FILES)

    def _create_public_bucket(self, bucket_name: str):
        try:
            if not self.s3_client.head_bucket(Bucket=bucket_name):
                pass
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                try:
                    self.s3_client.create_bucket(Bucket=bucket_name)
                    policy = {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Principal": "*",
                                "Action": ["s3:GetObject"],
                                "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                            }
                        ]
                    }
                    import json
                    self.s3_client.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
                    logger.info(f"Bucket {bucket_name} created and made public.")
                except Exception as ex:
                    logger.error(f"Failed to create bucket {bucket_name}: {ex}")

    def upload_avatar(self, file_content: bytes, filename: str, content_type: str) -> str:
        """
        Uploads an avatar image and returns the public URL.
        """
        bucket = settings.MINIO_BUCKET_AVATARS
        return self._upload_file(bucket, file_content, filename, content_type)

    def upload_project_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        """
        Uploads a project file (doc, code, etc.) and returns the public URL.
        """
        bucket = settings.MINIO_BUCKET_PROJECT_FILES
        return self._upload_file(bucket, file_content, filename, content_type)

    def _upload_file(self, bucket: str, file_content: bytes, filename: str, content_type: str) -> str:
        import uuid
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        
        try:
            self.s3_client.put_object(
                Bucket=bucket,
                Key=unique_filename,
                Body=file_content,
                ContentType=content_type
            )
            # URL format: http://localhost:9000/bucket/filename
            # In a production env, this would be a public DNS name
            endpoint = settings.MINIO_ENDPOINT.replace('minio:9000', 'localhost:9000')
            url = f"http://{endpoint}/{bucket}/{unique_filename}"
            return url
        except Exception as e:
            logger.error(f"Failed to upload to {bucket}: {e}")
            raise Exception("Storage upload failed")

storage_service = StorageService()
