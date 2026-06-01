import asyncio
from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    deleted_reports = await db.clinicalreport.delete_many()
    print(f"Deleted {deleted_reports} reports")
    deleted_patients = await db.patient.delete_many()
    print(f"Deleted {deleted_patients} patients")
    await db.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
