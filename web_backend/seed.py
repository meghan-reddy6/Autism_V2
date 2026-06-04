import asyncio
from prisma import Prisma, Json
import bcrypt
import json

async def seed():
    db = Prisma()
    await db.connect()
    
    # Check if a user already exists
    existing = await db.user.find_first(where={"email": "doctor@clinic.com"})
    if existing:
        print("User already exists!")
        await db.disconnect()
        return

    # Create Tenant
    tenant = await db.tenant.create(
        data={
            "name": "Horizon Health Clinic",
            "subscriptionTier": "ENTERPRISE"
        }
    )

    # Hash password
    salt = bcrypt.gensalt()
    hashed_pw = bcrypt.hashpw("Admin@123".encode('utf-8'), salt).decode('utf-8')

    # Create Doctor User
    user = await db.user.create(
        data={
            "email": "doctor@clinic.com",
            "passwordHash": hashed_pw,
            "firstName": "Gregory",
            "lastName": "House",
            "role": "DOCTOR",
            "tenantId": tenant.id
        }
    )

    # Create Mock Patient
    patient = await db.patient.create(
        data={
            "tenantId": tenant.id,
            "mrn": "MRN-1029",
            "firstName": "Ethan",
            "lastName": "Williams",
            "dateOfBirth": "2019-05-14T00:00:00Z",
            "gender": "Male",
            "guardianName": "Sarah Williams",
            "guardianPhone": "555-0199"
        }
    )

    # Create Parent User
    parent_user = await db.user.create(
        data={
            "email": "parent@portal.com",
            "passwordHash": hashed_pw,
            "firstName": "Sarah",
            "lastName": "Williams",
            "role": "PATIENT_PARENT",
            "tenantId": tenant.id
        }
    )

    # Create Super Admin User
    admin_user = await db.user.create(
        data={
            "email": "superadmin@system.com",
            "passwordHash": hashed_pw,
            "firstName": "System",
            "lastName": "Administrator",
            "role": "SUPER_ADMIN",
            "tenantId": tenant.id
        }
    )

    # Create Assessment Templates based on old scales
    mchat_schema = {
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
    }
    
    mchat_template = await db.assessmenttemplate.create(
        data={
            "tenantId": tenant.id,
            "name": "M-CHAT-R",
            "type": "M-CHAT-R",
            "formSchema": Json(mchat_schema),
            "isActive": True
        }
    )

    cars_schema = {
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
    }

    cars_template = await db.assessmenttemplate.create(
        data={
            "tenantId": tenant.id,
            "name": "CARS",
            "type": "CARS",
            "formSchema": Json(cars_schema),
            "isActive": True
        }
    )

    gars2_schema = {
        "fields": [
            {
                "name": f"gars_{i+1}",
                "label": label,
                "type": "select",
                "options": ["Never", "Seldom", "Sometimes", "Frequently"],
                "required": True
            } for i, label in enumerate([
                "1. Avoids establishing eye contact, looks away when eye contact is made.",
                "2. Stares at hands, objects, or items in the environment for at least 5 seconds.",
                "3. Flicks fingers rapidly in front of eyes for periods of 5 seconds or more.",
                "4. Eats specific foods and refuses to eat what most people usually will eat.",
                "5. Licks, tastes, or attempts to eat inedible objects.",
                "6. Smells or sniffs objects (e.g. toys, person's hands).",
                "7. Whirls, turns in circles.",
                "8. Spins objects not meant for spinning.",
                "9. Rocks back and forth while seated or standing.",
                "10. Makes rapid lunging, darting movements.",
                "11. Prances (i.e., walks on tip toes).",
                "12. Flaps hands or fingers in front of the face or at sides.",
                "13. Makes high-pitched sounds or other vocalizations for self-stimulation.",
                "14. Slaps, hits, or bites self or attempts to injure self.",
                "15. Repeats (echoes) words verbally or with signs.",
                "16. Repeats words out of context (words heard more than 1 min earlier).",
                "17. Repeats words or phrases over and over.",
                "18. Speaks or signs with flat tone, affect, or dysrhythmic patterns.",
                "19. Responds inappropriately to simple commands.",
                "20. Looks away or avoids looking at speaker when name is called.",
                "21. Does not ask for things he or she wants.",
                "22. Does not initiate conversations with peers or adults.",
                "23. Uses 'yes' and 'no' inappropriately.",
                "24. Uses pronouns inappropriately (refers to self as 'he' or 'you').",
                "25. Uses the word 'I' inappropriately.",
                "26. Repeats unintelligible sounds (babbles) over and over.",
                "27. Uses gestures instead of speech or signs to obtain objects.",
                "28. Inappropriately answers questions about a statement or brief story.",
                "29. Avoids eye contact, looks away when someone looks at him or her.",
                "30. Stares or looks unhappy or unexcited when praised or entertained.",
                "31. Resists physical contact from others (e.g., hugs, pats).",
                "32. Does not imitate other people when imitation is required.",
                "33. Withdraws, remains aloof, or acts standoffish in group situations.",
                "34. Behaves in an unreasonably fearful, frightened manner.",
                "35. Is unaffectionate; does not give affectionate responses.",
                "36. Shows no recognition that a person is present (looks through people).",
                "37. Laughs, giggles, cries inappropriately.",
                "38. Uses toys or objects inappropriately.",
                "39. Does certain things repetitively, ritualistically.",
                "40. Becomes upset when routines are changed.",
                "41. Responds negatively or with temper tantrums to commands/requests."
            ])
        ]
    }

    gars2_template = await db.assessmenttemplate.create(
        data={
            "tenantId": tenant.id,
            "name": "GARS-2",
            "type": "GARS-2",
            "formSchema": Json(gars2_schema),
            "isActive": True
        }
    )

    # Create Assessment Session
    session = await db.assessmentsession.create(
        data={
            "token": "demo-token-123",
            "tenantId": tenant.id,
            "patientId": patient.id,
            "assessmentTemplateId": mchat_template.id,
            "status": "CREATED",
            "createdBy": user.id
        }
    )

    print(f"Successfully seeded database!")
    print(f"Doctor Login: doctor@clinic.com / Admin@123")
    print(f"Parent Login: parent@portal.com / Admin@123")
    print(f"Admin Login: superadmin@system.com / Admin@123")
    print(f"Demo Assessment Link: http://localhost:3000/assessment/demo-token-123")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(seed())
