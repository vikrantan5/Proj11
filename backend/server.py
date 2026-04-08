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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
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
            logger.info(f"Uploading SOS image for user {user_id}")
            contents = await image_file.read()

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
        "cloudinary_configured": bool(os.environ.get('CLOUDINARY_CLOUD_NAME')),
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
