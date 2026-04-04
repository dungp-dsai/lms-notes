import boto3
from botocore.exceptions import ClientError

from ..config import settings


def get_s3_client():
    return boto3.client(
        "s3",
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )


async def upload_to_s3(file_data: bytes, filename: str, content_type: str) -> str:
    """Upload file to S3 and return public URL."""
    client = get_s3_client()
    bucket = settings.aws_bucket_name
    
    try:
        client.put_object(
            Bucket=bucket,
            Key=f"images/{filename}",
            Body=file_data,
            ContentType=content_type,
        )
        
        url = f"https://{bucket}.s3.{settings.aws_region}.amazonaws.com/images/{filename}"
        return url
    except ClientError as e:
        raise RuntimeError(f"Failed to upload to S3: {e}")


def is_s3_configured() -> bool:
    """Check if S3 credentials are configured."""
    return bool(
        settings.aws_access_key_id
        and settings.aws_secret_access_key
        and settings.aws_bucket_name
    )
