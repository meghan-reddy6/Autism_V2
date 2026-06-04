from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from dependencies import get_current_user, require_roles
from database import db

router = APIRouter(
    prefix="/api/v1/assessment-templates",
    tags=["Assessment Templates"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/")
async def list_templates(current_user = Depends(get_current_user)):
    templates = await db.assessmenttemplate.find_many(
        where={
            "OR": [
                {"tenantId": current_user.tenantId},
                {"tenantId": None}
            ]
        }
    )
    return templates

@router.post("/", dependencies=[Depends(require_roles(["CLINIC_ADMIN", "SUPER_ADMIN"]))])
async def create_template(template_data: dict, current_user = Depends(get_current_user)):
    template = await db.assessmenttemplate.create(
        data={
            "tenantId": current_user.tenantId,
            "name": template_data["name"],
            "description": template_data.get("description"),
            "type": template_data["type"],
            "formSchema": template_data.get("schema", {}),
            "isActive": template_data.get("isActive", True)
        }
    )
    return template

@router.get("/{template_id}")
async def get_template(template_id: str, current_user = Depends(get_current_user)):
    template = await db.assessmenttemplate.find_unique(where={"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if template.tenantId is not None and template.tenantId != current_user.tenantId:
        raise HTTPException(status_code=403, detail="Not authorized to view this template")
    return template

@router.patch("/{template_id}", dependencies=[Depends(require_roles(["CLINIC_ADMIN", "SUPER_ADMIN"]))])
async def update_template(template_id: str, template_data: dict, current_user = Depends(get_current_user)):
    template = await db.assessmenttemplate.find_unique(where={"id": template_id})
    if not template or template.tenantId != current_user.tenantId:
        raise HTTPException(status_code=404, detail="Template not found")
        
    update_data = {k: v for k, v in template_data.items() if k in ["name", "description", "type", "isActive"]}
    if "schema" in template_data:
        update_data["formSchema"] = template_data["schema"]
    
    updated = await db.assessmenttemplate.update(
        where={"id": template_id},
        data=update_data
    )
    return updated
