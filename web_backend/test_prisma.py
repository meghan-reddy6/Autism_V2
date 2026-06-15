import asyncio
from database import db

async def test_db():
    await db.connect()
    print("Database connected")
    try:
        # Fetch any session
        sessions = await db.assessmentsession.find_many(
            include={"patient": True, "reports": True}
        )
        print(f"Found {len(sessions)} sessions")
        for s in sessions:
            print(f"Session: {s.id}, {s.status}")
    except Exception as e:
        print(f"Prisma error: {e}")
        import traceback
        traceback.print_exc()
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_db())
