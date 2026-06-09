import asyncio
import yaml
import bcrypt
import json
from prisma import Prisma, Json
from typing import Dict, Any

async def load_templates(db: Prisma, tenant_id: str, templates_to_load: list):
    # This keeps the schemas clean and abstracted. In a real system, these might be loaded from JSON files.
    schemas = {
        "M-CHAT-R": {
            "fields": [
                {
                    "name": f"mchat_{i+1}",
                    "label": label,
                    "type": "select",
                    "options": ["Yes", "No"],
                    "required": True
                } for i, label in enumerate([
                    "1. If you point at something across the room, does your child look at it?",
                    "2. Have you ever wondered if your child might be deaf?",
                    "3. Does your child play pretend or make-believe?",
                    "4. Does your child like climbing on things?",
                    "5. Does your child make unusual finger movements near his or her eyes?",
                    "6. Does your child point with one finger to ask for something or to get help?",
                    "7. Does your child point with one finger to show you something interesting?",
                    "8. Is your child interested in other children?",
                    "9. Does your child show you things by bringing them to you... just to share?",
                    "10. Does your child respond when you call his or her name?",
                    "11. When you smile at your child, does he or she smile back at you?",
                    "12. Does your child get upset by everyday noises?",
                    "13. Does your child walk?",
                    "14. Does your child look you in the eye when you are talking/playing?",
                    "15. Does your child try to copy what you do?",
                    "16. If you turn your head to look at something, does your child look around to see what you are looking at?",
                    "17. Does your child try to get you to watch him or her?",
                    "18. Does your child understand when you tell him or her to do something?",
                    "19. If something new happens, does your child look at your face to see how you feel?",
                    "20. Does your child like movement activities (e.g., being swung or bounced)?"
                ])
            ]
        },
        "CARS": {
            "fields": [
                {
                    "name": f"cars_{i+1}",
                    "label": label,
                    "type": "select",
                    "options": ["Normal", "Mildly abnormal", "Moderately abnormal", "Severely abnormal"],
                    "required": True
                } for i, label in enumerate([
                    "1. Relating to People", "2. Imitation", "3. Emotional Response", "4. Body Use", 
                    "5. Object Use", "6. Adaptation to Change", "7. Visual Response", "8. Listening Response", 
                    "9. Taste, Smell, and Touch Response and Use", "10. Fear or Nervousness", 
                    "11. Verbal Communication", "12. Nonverbal Communication", "13. Activity Level", 
                    "14. Level and Consistency of Intellectual Response", "15. General Impressions"
                ])
            ]
        },
        "GARS-2": {
            "fields": [
                {
                    "name": f"gars_{i+1}",
                    "label": f"{i+1}. Test Question",
                    "type": "select",
                    "options": ["Never", "Seldom", "Sometimes", "Frequently"],
                    "required": True
                } for i in range(41)
            ]
        }
    }

    created_templates = []
    for template_name in templates_to_load:
        if template_name in schemas:
            tmpl = await db.assessmenttemplate.create(
                data={
                    "tenantId": tenant_id,
                    "name": template_name,
                    "type": template_name,
                    "formSchema": Json(schemas[template_name]),
                    "isActive": True
                }
            )
            created_templates.append(tmpl)
    return created_templates

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
    system_tenant = await db.tenant.find_first(where={"name": "SYSTEM"})
    if not system_tenant:
        system_tenant = await db.tenant.create(
            data={
                "name": "SYSTEM",
                "subscriptionTier": "ENTERPRISE",
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
        tenant = await db.tenant.find_first(where={"name": tenant_config['name']})
        if not tenant:
            tenant = await db.tenant.create(
                data={
                    "name": tenant_config['name'],
                    "subscriptionTier": tenant_config['tier'],
                    "status": tenant_config.get('status', 'ACTIVE'),
                    "maxUsers": limits['max_users'],
                    "maxStorageGB": limits['max_storage_gb'],
                    "maxAssessments": limits['max_assessments'],
                    "featureFlags": Json(limits['features'])
                }
            )
            print(f"Created Tenant: {tenant.name}")
            
            # Load global templates into this tenant
            await load_templates(db, tenant.id, templates_config)

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
