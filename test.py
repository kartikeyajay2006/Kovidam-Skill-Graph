from backend.app.db.postgres.session import SessionLocal

db = SessionLocal()
print("DB Connected:", db)
db.close()