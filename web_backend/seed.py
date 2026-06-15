import asyncio
import yaml
import bcrypt
import json
from prisma import Prisma, Json
from typing import Dict, Any



def get_subscription_limits(subs: list, tier: str) -> dict:
    for sub in subs:
        if sub['name'] == tier:
            return sub
    return {
        "max_users": 10,
        "max_storage_gb": 5,
        "max_assessments": 1000,
        "features": []
    }

async def seed_from_config():
    db = Prisma()
    await db.connect()

    with open('seed.yaml', 'r') as f:
        config = yaml.safe_load(f)

    # 1. Ensure Super Admin Exists
    sa_config = config['system']['super_admin']
    salt = bcrypt.gensalt()
    
    # We must have at least one tenant to attach the Super Admin to, 
    # or make them a platform admin with no strict tenant dependency.
    # We will create a SYSTEM tenant for them if needed.
    system_tenant = await db.organization.find_first(where={"name": "SYSTEM"})
    if not system_tenant:
        system_tenant = await db.organization.create(
            data={
                "name": "SYSTEM",
                "subscriptionPlan": "ENTERPRISE",
                "status": "ACTIVE"
            }
        )

    sa_exists = await db.user.find_unique(where={"email": sa_config['email']})
    if not sa_exists:
        hashed_pw = bcrypt.hashpw(sa_config['password'].encode('utf-8'), salt).decode('utf-8')
        await db.user.create(
            data={
                "email": sa_config['email'],
                "passwordHash": hashed_pw,
                "firstName": sa_config['firstName'],
                "lastName": sa_config['lastName'],
                "role": "SUPER_ADMIN",
                "tenantId": system_tenant.id
            }
        )
        print(f"Created SUPER_ADMIN: {sa_config['email']}")

    # 2. Setup Environment Specific Tenants
    env_name = "development" # In real app, pull from ENV variable
    env_config = config['environments'].get(env_name, {})
    
    subscriptions = config.get('subscriptions', [])
    templates_config = config.get('assessment_templates', [])

    for tenant_config in env_config.get('tenants', []):
        limits = get_subscription_limits(subscriptions, tenant_config['tier'])
        
        # Check if tenant exists
        tenant = await db.organization.find_first(where={"name": tenant_config['name']})
        if not tenant:
            tenant = await db.organization.create(
                data={
                    "name": tenant_config['name'],
                    "subscriptionPlan": tenant_config['tier'],
                    "status": tenant_config.get('status', 'ACTIVE'),
                    "maxUsers": limits['max_users'],
                    "maxStorageGB": limits['max_storage_gb'],
                    "maxAssessments": limits['max_assessments'],
                    "featureFlags": Json(limits['features'])
                }
            )
            print(f"Created Tenant: {tenant.name}")
            
            # Templates are now hardcoded in the frontend.

        # 3. Setup Users for Tenant
        for user_config in tenant_config.get('users', []):
            u_exists = await db.user.find_unique(where={"email": user_config['email']})
            if not u_exists:
                hashed_pw = bcrypt.hashpw(user_config['password'].encode('utf-8'), salt).decode('utf-8')
                await db.user.create(
                    data={
                        "email": user_config['email'],
                        "passwordHash": hashed_pw,
                        "firstName": user_config['firstName'],
                        "lastName": user_config['lastName'],
                        "role": user_config['role'],
                        "tenantId": tenant.id
                    }
                )
                print(f"  Created User: {user_config['email']} ({user_config['role']})")

    print("\nDynamic Seeding Complete!")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(seed_from_config())
