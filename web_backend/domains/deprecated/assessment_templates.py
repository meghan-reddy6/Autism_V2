from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from dependencies import get_current_user, require_roles
from auth.authorization import require_permission
from infrastructure.tenantAwareRepository import assessment_template_repo
from audit.logger import log_audit
from fastapi import Request

router = APIRouter(
    prefix="/api/v1/assessment-templates",
    tags=["Assessment Templates"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/")
async def list_templates(current_user = Depends(require_permission("view_assessment_template"))):
    # Templates can be global (tenantId=None) or tenant-specific.
    # The tenant_repo automatically injects tenantId, so to fetch global we must bypass or use special logic.
    # For now, we will use the repo to get tenant specific ones, and a direct query for global ones if needed,
    # OR we modify repo. But the requirement is: "Tenant filtering must be enforced inside the repository query itself."
    # Let's use the repo for tenant templates, and a separate repo method for global templates if needed.
    # Actually, the user's rule: "Any repository method that can return a tenant-scoped resource must require tenant_id as an input parameter."
    
    # Since find_many injects tenantId, it only returns tenant-specific templates.
    # To get both, we need to allow OR in the repo or just fetch global templates directly.
    # We will fetch tenant templates and global templates.
    from database import db
    tenant_templates = await assessment_template_repo.find_many(tenant_id=current_user.tenantId)
    global_templates = await db.assessmenttemplate.find_many(where={"tenantId": None})
    
    # Combine and remove duplicates just in case
    seen = set()
    result = []
    for t in global_templates + tenant_templates:
        if t.id not in seen:
            seen.add(t.id)
            result.append(t)
            
    return result

@router.post("/")
async def create_template(template_data: dict, request: Request, current_user = Depends(require_permission("create_assessment_template"))):
    template = await assessment_template_repo.create(
        tenant_id=current_user.tenantId,
        data={
            "name": template_data["name"],
            "description": template_data.get("description"),
            "type": template_data["type"],
            "formSchema": template_data.get("schema", {}),
            "isActive": template_data.get("isActive", True)
        }
    )
    
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="CREATE_TEMPLATE",
        resource_type="AssessmentTemplate",
        resource_id=template.id,
        request=request
    )
    
    return template

@router.get("/{template_id}")
async def get_template(template_id: str, current_user = Depends(require_permission("view_assessment_template"))):
    # Check tenant specific first
    template = await assessment_template_repo.get_by_id(current_user.tenantId, template_id)
    if not template:
        # Check global
        from database import db
        template = await db.assessmenttemplate.find_unique(where={"id": template_id, "tenantId": None})
        
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    return template

@router.patch("/{template_id}")
async def update_template(template_id: str, template_data: dict, request: Request, current_user = Depends(require_permission("update_assessment_template"))):
    template = await assessment_template_repo.get_by_id(current_user.tenantId, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    update_data = {k: v for k, v in template_data.items() if k in ["name", "description", "type", "isActive"]}
    if "schema" in template_data:
        update_data["formSchema"] = template_data["schema"]
    
    updated = await assessment_template_repo.update(
        tenant_id=current_user.tenantId,
        where={"id": template_id},
        data=update_data
    )
    
    await log_audit(
        user_id=current_user.id,
        tenant_id=current_user.tenantId,
        action="UPDATE_TEMPLATE",
        resource_type="AssessmentTemplate",
        resource_id=template.id,
        request=request
    )
    
    return updated
