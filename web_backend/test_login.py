import httpx
import asyncio

async def main():
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "http://localhost:8000/api/v1/auth/login",
                data={"username": "doctor@clinic.com", "password": "Admin@123"}
            )
            print(res.status_code)
            print(res.text)
    except Exception as e:
        print(e)

if __name__ == "__main__":
    asyncio.run(main())
