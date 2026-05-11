from app.main import SessionLocal
from app.models.schema import Job

db = SessionLocal()
job = db.query(Job).first()
if job and job.created_at:
    print(repr(job.created_at.isoformat(timespec='milliseconds')))
