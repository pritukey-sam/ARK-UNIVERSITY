from fastapi import Depends, HTTPException
from auth import get_current_user

def get_current_company_id(user=Depends(get_current_user)):
    # Super Admin might not have a company_id or might want to see everything
    # But for standard roles, it's required.
    company_id = user.get("company_id")
    if not company_id and user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="User not associated with a company")
    return company_id

def enforce_company_scope(db_query, model, company_id):
    if company_id:
        return db_query.filter(model.company_id == company_id)
    return db_query
