from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import cloudinary
import cloudinary.uploader
import tempfile
import time
import hashlib
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME = os.environ.get('CLOUDINARY_CLOUD_NAME')
CLOUDINARY_API_KEY = os.environ.get('CLOUDINARY_API_KEY')
CLOUDINARY_API_SECRET = os.environ.get('CLOUDINARY_API_SECRET')

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True
)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============ Models ============

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class SOSNotifyRequest(BaseModel):
    user_id: str
    user_name: Optional[str] = "Unknown"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_url: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    emergency_contacts: Optional[list] = []
    contacts_notified: Optional[int] = 0
    sms_success: Optional[bool] = False
    call_success: Optional[bool] = False
    audio_recorded: Optional[bool] = False
    photo_captured: Optional[bool] = False
    success: Optional[bool] = False
    timestamp: Optional[str] = None

class SOSEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str = "Unknown"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_url: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    emergency_contacts: list = []
    contacts_notified: int = 0
    sms_success: bool = False
    call_success: bool = False
    audio_recorded: bool = False
    photo_captured: bool = False
    success: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SOSUploadResponse(BaseModel):
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    message: str = "Upload complete"


class SOSBase64UploadRequest(BaseModel):
    user_id: str = "unknown"
    image_base64: Optional[str] = None
    image_filename: Optional[str] = "sos_image.jpg"
    audio_base64: Optional[str] = None
    audio_filename: Optional[str] = "sos_audio.m4a"


class SignUploadRequest(BaseModel):
    folder: str = "sos"
    resource_type: str = "image"


# ============ Status Routes ============

@api_router.get("/")
async def root():
    return {"message": "SOS Emergency Backend API", "status": "running"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ============ Cloudinary Sign Upload Route ============

@api_router.post("/sos/sign-upload")
async def sign_cloudinary_upload(request: SignUploadRequest):
    """
    Generate a Cloudinary signed upload signature.
    This allows the mobile app to do authenticated uploads directly to Cloudinary
    without exposing the API secret on the client.
    """
    try:
        timestamp = int(time.time())
        folder = request.folder
        resource_type = request.resource_type

        # Build params to sign
        params_to_sign = {
            "folder": folder,
            "timestamp": timestamp,
        }

        # Generate signature using Cloudinary's utility
        signature = cloudinary.utils.api_sign_request(
            params_to_sign,
            CLOUDINARY_API_SECRET
        )

        return {
            "signature": signature,
            "timestamp": timestamp,
            "api_key": CLOUDINARY_API_KEY,
            "cloud_name": CLOUDINARY_CLOUD_NAME,
            "folder": folder,
        }
    except Exception as e:
        logger.error(f"Sign upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to sign upload: {str(e)}")


# ============ SOS Routes ============

@api_router.post("/sos/upload", response_model=SOSUploadResponse)
async def sos_upload(
    user_id: str = Form(default="unknown"),
    image_file: Optional[UploadFile] = File(default=None),
    audio_file: Optional[UploadFile] = File(default=None),
):
    """
    Upload SOS evidence files (image and/or audio) to Cloudinary.
    Server-side fallback for when client-side upload fails.
    """
    image_url = None
    audio_url = None

    try:
        # Upload image to Cloudinary
        if image_file and image_file.filename:
            logger.info(f"Uploading SOS image for user {user_id}, filename: {image_file.filename}, content_type: {image_file.content_type}")
            contents = await image_file.read()
            logger.info(f"Image file size: {len(contents)} bytes")

            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                tmp.write(contents)
                tmp_path = tmp.name

            try:
                result = cloudinary.uploader.upload(
                    tmp_path,
                    folder=f"sos/images/{user_id}",
                    resource_type="image",
                    transformation=[{"quality": "auto", "fetch_format": "auto"}]
                )
                image_url = result.get('secure_url')
                logger.info(f"SOS image uploaded: {image_url}")
            finally:
                os.unlink(tmp_path)

        # Upload audio to Cloudinary
        if audio_file and audio_file.filename:
            logger.info(f"Uploading SOS audio for user {user_id}")
            contents = await audio_file.read()

            with tempfile.NamedTemporaryFile(suffix='.m4a', delete=False) as tmp:
                tmp.write(contents)
                tmp_path = tmp.name

            try:
                result = cloudinary.uploader.upload(
                    tmp_path,
                    folder=f"sos/audio/{user_id}",
                    resource_type="video",
                )
                audio_url = result.get('secure_url')
                logger.info(f"SOS audio uploaded: {audio_url}")
            finally:
                os.unlink(tmp_path)

        return SOSUploadResponse(
            image_url=image_url,
            audio_url=audio_url,
            message="Upload complete"
        )

    except Exception as e:
        logger.error(f"SOS upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    

@api_router.post("/sos/upload-base64", response_model=SOSUploadResponse)
async def sos_upload_base64(request: SOSBase64UploadRequest):
    """
    Upload SOS evidence files via base64 encoding.
    This avoids FormData issues on React Native/Expo.
    """
    image_url = None
    audio_url = None

    try:
        if request.image_base64:
            logger.info(f"Uploading base64 SOS image for user {request.user_id}")
            image_data = base64.b64decode(request.image_base64)
            logger.info(f"Decoded image size: {len(image_data)} bytes")
            suffix = '.jpg'
            if request.image_filename and '.' in request.image_filename:
                suffix = '.' + request.image_filename.rsplit('.', 1)[1]

            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(image_data)
                tmp_path = tmp.name

            try:
                result = cloudinary.uploader.upload(
                    tmp_path,
                    folder=f"sos/images/{request.user_id}",
                    resource_type="image",
                    transformation=[{"quality": "auto", "fetch_format": "auto"}]
                )
                image_url = result.get('secure_url')
                logger.info(f"SOS base64 image uploaded: {image_url}")
            finally:
                os.unlink(tmp_path)

        if request.audio_base64:
            logger.info(f"Uploading base64 SOS audio for user {request.user_id}")
            audio_data = base64.b64decode(request.audio_base64)
            suffix = '.m4a'
            if request.audio_filename and '.' in request.audio_filename:
                suffix = '.' + request.audio_filename.rsplit('.', 1)[1]

            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_data)
                tmp_path = tmp.name

            try:
                result = cloudinary.uploader.upload(
                    tmp_path,
                    folder=f"sos/audio/{request.user_id}",
                    resource_type="video",
                )
                audio_url = result.get('secure_url')
                logger.info(f"SOS base64 audio uploaded: {audio_url}")
            finally:
                os.unlink(tmp_path)

        return SOSUploadResponse(
            image_url=image_url,
            audio_url=audio_url,
            message="Base64 upload complete"
        )

    except Exception as e:
        logger.error(f"SOS base64 upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Base64 upload failed: {str(e)}")


@api_router.post("/sos/notify")
async def sos_notify(request: SOSNotifyRequest):
    """
    Store SOS event data in MongoDB and return confirmation.
    Called by the mobile app after SOS trigger completes.
    """
    try:
        event = SOSEvent(
            user_id=request.user_id,
            user_name=request.user_name,
            latitude=request.latitude,
            longitude=request.longitude,
            location_url=request.location_url,
            image_url=request.image_url,
            audio_url=request.audio_url,
            emergency_contacts=request.emergency_contacts,
            contacts_notified=request.contacts_notified,
            sms_success=request.sms_success,
            call_success=request.call_success,
            audio_recorded=request.audio_recorded,
            photo_captured=request.photo_captured,
            success=request.success,
            timestamp=request.timestamp or datetime.now(timezone.utc).isoformat(),
        )

        doc = event.model_dump()
        await db.sos_events.insert_one(doc)
        logger.info(f"SOS event stored for user {request.user_id}: {event.id}")

        return {
            "status": "success",
            "event_id": event.id,
            "message": "SOS event recorded successfully",
            "timestamp": event.timestamp,
        }

    except Exception as e:
        logger.error(f"SOS notify failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to store SOS event: {str(e)}")


@api_router.get("/sos/events/{user_id}")
async def get_sos_events(user_id: str, limit: int = 20):
    """
    Get SOS event history for a specific user.
    """
    try:
        events = await db.sos_events.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(limit)

        return {
            "status": "success",
            "count": len(events),
            "events": events,
        }

    except Exception as e:
        logger.error(f"Failed to fetch SOS events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch events: {str(e)}")


@api_router.get("/sos/health")
async def sos_health():
    """Health check for SOS service."""
    return {
        "status": "healthy",
        "service": "SOS Emergency Backend",
        "cloudinary_configured": bool(CLOUDINARY_CLOUD_NAME),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
