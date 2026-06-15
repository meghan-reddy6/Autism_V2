import asyncio
from prisma import Prisma

async def main():
    p = Prisma()
    await p.connect()
    
    sessions = await p.assessmentsession.find_many()
    print(f'Total sessions: {len(sessions)}')
    t_counts = {}
    for s in sessions:
        t_counts[s.tenantId] = t_counts.get(s.tenantId, 0) + 1
    print('sessions by tenant:', t_counts)
    
    assessments = await p.assessment.find_many()
    print(f'Total assessments: {len(assessments)}')
    a_counts = {}
    for a in assessments:
        a_counts[a.tenantId] = a_counts.get(a.tenantId, 0) + 1
    print('assessments by tenant:', a_counts)
    
    await p.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
