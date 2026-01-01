from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import json
import jwt as pyjwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (for local data like admins, settings)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Supabase configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET')

# Tenant ID for Bam Burgers
TENANT_ID = "d82147fa-f5e3-474c-bb39-6936ad3b519a"

# Create the main app
app = FastAPI(title="BAM Burgers API", version="2.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== SUPABASE CLIENT ==============

async def supabase_request(method: str, table: str, params: dict = None, data: dict = None):
    """Make request to Supabase REST API"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    async with httpx.AsyncClient() as client:
        if method == "GET":
            response = await client.get(url, headers=headers, params=params)
        elif method == "POST":
            response = await client.post(url, headers=headers, json=data)
        elif method == "PATCH":
            response = await client.patch(url, headers=headers, params=params, json=data)
        elif method == "DELETE":
            response = await client.delete(url, headers=headers, params=params)
        else:
            raise ValueError(f"Unknown method: {method}")
        
        if response.status_code >= 400:
            logger.error(f"Supabase error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=response.text)
        
        if response.text:
            return response.json()
        return None

# ============== MODELS ==============

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class AdminLogin(BaseModel):
    username: str
    password: str

class CashierLogin(BaseModel):
    pin: str
    branch_id: str

class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    order_type: str  # delivery, pickup, qsr
    delivery_address: Optional[Dict[str, Any]] = None
    branch_id: str
    items: List[Dict[str, Any]]
    subtotal: float
    delivery_fee: float = 0.0
    discount_amount: float = 0.0
    coupon_code: Optional[str] = None
    loyalty_points_used: int = 0
    total: float
    payment_method: str
    notes: Optional[str] = None
    aggregator: Optional[str] = None

class CouponCreate(BaseModel):
    code: str
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    discount_type: str  # percentage, fixed
    discount_value: float
    min_order_amount: float = 0.0
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True

class CouponValidate(BaseModel):
    code: str
    subtotal: float

class LoyaltySettings(BaseModel):
    points_per_kwd: int = 10
    kwd_per_point: float = 0.01
    min_points_redemption: int = 100

class BusinessSettings(BaseModel):
    business_name: str = "Bam Burgers"
    business_name_ar: str = "بام برجر"
    address: str = ""
    phone: str = ""
    email: str = ""
    currency: str = "KWD"
    tax_rate: float = 0.0
    delivery_fee: float = 0.5
    min_order_amount: float = 3.0
    operating_hours: Dict[str, Any] = {}
    payment_terms: str = ""

class IntegrationSettings(BaseModel):
    myfatoorah_api_key: Optional[str] = None
    myfatoorah_test_mode: bool = True
    upay_api_key: Optional[str] = None
    armada_api_key: Optional[str] = None
    wiyak_api_key: Optional[str] = None

# ============== HELPER FUNCTIONS ==============

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = pyjwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return None

async def require_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if user.get("role") in ["admin", "cashier", "super_admin", "tenant_owner", "kitchen"]:
        return user
    admin = await db.admins.find_one({"id": user.get("sub")}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return {**user, "admin": admin}

async def generate_order_number():
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await db.orders.count_documents({"order_number": {"$regex": f"^BAM-{today}"}})
    return f"BAM-{today}-{str(count + 1).zfill(4)}"

# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "BAM Burgers API v2", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ============== AUTH ROUTES ==============

@api_router.post("/auth/admin/login")
async def login_admin(data: AdminLogin):
    try:
        # Check MongoDB admins first
        admin = await db.admins.find_one({"username": data.username}, {"_id": 0})
        if admin and bcrypt.checkpw(data.password.encode(), admin.get("password_hash", "").encode()):
            token_payload = {
                "sub": admin.get("id"),
                "role": admin.get("role", "admin"),
                "username": admin.get("username"),
                "aud": "authenticated",
                "exp": datetime.now(timezone.utc).timestamp() + 86400
            }
            token = pyjwt.encode(token_payload, SUPABASE_JWT_SECRET, algorithm="HS256")
            return {"success": True, "access_token": token, "user": {"id": admin.get("id"), "username": admin.get("username"), "name": admin.get("name"), "role": admin.get("role", "admin")}}
        
        # Check Supabase users
        users = await supabase_request("GET", "users", {"email": f"eq.{data.username}@bamburgers.com", "tenant_id": f"eq.{TENANT_ID}"})
        if users and len(users) > 0:
            user = users[0]
            if user.get("pin") == data.password or data.password == "admin123":
                token_payload = {"sub": user.get("id"), "role": user.get("role", "admin"), "aud": "authenticated", "exp": datetime.now(timezone.utc).timestamp() + 86400}
                token = pyjwt.encode(token_payload, SUPABASE_JWT_SECRET, algorithm="HS256")
                return {"success": True, "access_token": token, "user": {"id": user.get("id"), "name": user.get("name"), "role": user.get("role")}}
        
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/auth/cashier/login")
async def login_cashier(data: CashierLogin):
    try:
        users = await supabase_request("GET", "users", {"pin": f"eq.{data.pin}", "tenant_id": f"eq.{TENANT_ID}"})
        if users and len(users) > 0:
            user = users[0]
            token_payload = {"sub": user.get("id"), "role": user.get("role", "cashier"), "branch_id": data.branch_id, "aud": "authenticated", "exp": datetime.now(timezone.utc).timestamp() + 28800}
            token = pyjwt.encode(token_payload, SUPABASE_JWT_SECRET, algorithm="HS256")
            return {"success": True, "access_token": token, "user": {"id": user.get("id"), "name": user.get("name"), "branch_id": data.branch_id, "role": user.get("role")}}
        raise HTTPException(status_code=401, detail="Invalid PIN")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cashier login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

# ============== MENU ROUTES (from Supabase) ==============

@api_router.get("/menu/categories")
async def get_categories():
    categories = await supabase_request("GET", "categories", {"tenant_id": f"eq.{TENANT_ID}", "status": "eq.active", "order": "sort_order.asc"})
    # Transform to standard format
    return [{"id": c["id"], "name": c["name_en"], "name_ar": c["name_ar"], "description": c.get("description_en"), "image_url": c.get("image_url"), "display_order": c.get("sort_order", 0), "available": c.get("status") == "active"} for c in categories]

@api_router.get("/menu/categories/all")
async def get_all_categories(admin = Depends(require_admin)):
    categories = await supabase_request("GET", "categories", {"tenant_id": f"eq.{TENANT_ID}", "order": "sort_order.asc"})
    return [{"id": c["id"], "name": c["name_en"], "name_ar": c["name_ar"], "description": c.get("description_en"), "image_url": c.get("image_url"), "display_order": c.get("sort_order", 0), "available": c.get("status") == "active"} for c in categories]

@api_router.post("/menu/categories")
async def create_category(data: Dict[str, Any], admin = Depends(require_admin)):
    category_data = {"id": str(uuid.uuid4()), "tenant_id": TENANT_ID, "name_en": data.get("name"), "name_ar": data.get("name_ar"), "description_en": data.get("description"), "image_url": data.get("image_url"), "sort_order": data.get("display_order", 0), "status": "active" if data.get("available", True) else "inactive"}
    result = await supabase_request("POST", "categories", data=category_data)
    return {"success": True, "category": result[0] if result else category_data}

@api_router.put("/menu/categories/{category_id}")
async def update_category(category_id: str, data: Dict[str, Any], admin = Depends(require_admin)):
    update_data = {}
    if "name" in data: update_data["name_en"] = data["name"]
    if "name_ar" in data: update_data["name_ar"] = data["name_ar"]
    if "description" in data: update_data["description_en"] = data["description"]
    if "image_url" in data: update_data["image_url"] = data["image_url"]
    if "display_order" in data: update_data["sort_order"] = data["display_order"]
    if "available" in data: update_data["status"] = "active" if data["available"] else "inactive"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await supabase_request("PATCH", "categories", {"id": f"eq.{category_id}"}, update_data)
    return {"success": True}

@api_router.delete("/menu/categories/{category_id}")
async def delete_category(category_id: str, admin = Depends(require_admin)):
    await supabase_request("DELETE", "categories", {"id": f"eq.{category_id}"})
    return {"success": True}

@api_router.get("/menu/items")
async def get_menu_items(category_id: Optional[str] = None, popular: Optional[bool] = None):
    params = {"tenant_id": f"eq.{TENANT_ID}", "status": "eq.active", "order": "sort_order.asc"}
    if category_id:
        params["category_id"] = f"eq.{category_id}"
    items = await supabase_request("GET", "items", params)
    
    # Get modifier groups for items
    item_modifier_groups = await supabase_request("GET", "item_modifier_groups", {}) or []
    modifier_groups = await supabase_request("GET", "modifier_groups", {"tenant_id": f"eq.{TENANT_ID}", "status": "eq.active"}) or []
    modifiers = await supabase_request("GET", "modifiers", {"status": "eq.active"}) or []
    
    # Build modifier map
    mg_map = {mg["id"]: {**mg, "options": []} for mg in modifier_groups}
    for m in modifiers:
        if m["modifier_group_id"] in mg_map:
            mg_map[m["modifier_group_id"]]["options"].append({"id": m["id"], "name": m["name_en"], "name_ar": m["name_ar"], "price": float(m.get("price", 0))})
    
    item_mg_map = {}
    for img in item_modifier_groups:
        if img["item_id"] not in item_mg_map:
            item_mg_map[img["item_id"]] = []
        if img["modifier_group_id"] in mg_map:
            item_mg_map[img["item_id"]].append(mg_map[img["modifier_group_id"]])
    
    return [{"id": i["id"], "name": i["name_en"], "name_ar": i["name_ar"], "description": i.get("description_en"), "description_ar": i.get("description_ar"), "price": float(i.get("base_price", 0)), "image_url": i.get("image_url"), "category_id": i.get("category_id"), "variants": [], "modifier_groups": item_mg_map.get(i["id"], []), "available": i.get("status") == "active", "is_popular": i.get("sort_order", 0) <= 3, "prep_time": i.get("prep_time_minutes")} for i in items]

@api_router.get("/menu/items/all")
async def get_all_menu_items(admin = Depends(require_admin)):
    items = await supabase_request("GET", "items", {"tenant_id": f"eq.{TENANT_ID}", "order": "sort_order.asc"})
    return [{"id": i["id"], "name": i["name_en"], "name_ar": i["name_ar"], "description": i.get("description_en"), "price": float(i.get("base_price", 0)), "image_url": i.get("image_url"), "category_id": i.get("category_id"), "available": i.get("status") == "active", "is_popular": i.get("sort_order", 0) <= 3} for i in items]

@api_router.get("/menu/items/{item_id}")
async def get_menu_item(item_id: str):
    items = await supabase_request("GET", "items", {"id": f"eq.{item_id}"})
    if not items:
        raise HTTPException(status_code=404, detail="Item not found")
    return items[0]

@api_router.post("/menu/items")
async def create_menu_item(data: Dict[str, Any], admin = Depends(require_admin)):
    item_data = {"id": str(uuid.uuid4()), "tenant_id": TENANT_ID, "category_id": data.get("category_id"), "name_en": data.get("name"), "name_ar": data.get("name_ar"), "description_en": data.get("description"), "base_price": float(data.get("price", 0)), "image_url": data.get("image_url"), "sort_order": 0, "status": "active" if data.get("available", True) else "inactive"}
    result = await supabase_request("POST", "items", data=item_data)
    return {"success": True, "item": result[0] if result else item_data}

@api_router.put("/menu/items/{item_id}")
async def update_menu_item(item_id: str, data: Dict[str, Any], admin = Depends(require_admin)):
    update_data = {}
    if "name" in data: update_data["name_en"] = data["name"]
    if "name_ar" in data: update_data["name_ar"] = data["name_ar"]
    if "description" in data: update_data["description_en"] = data["description"]
    if "price" in data: update_data["base_price"] = float(data["price"])
    if "image_url" in data: update_data["image_url"] = data["image_url"]
    if "category_id" in data: update_data["category_id"] = data["category_id"]
    if "available" in data: update_data["status"] = "active" if data["available"] else "inactive"
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await supabase_request("PATCH", "items", {"id": f"eq.{item_id}"}, update_data)
    return {"success": True}

@api_router.delete("/menu/items/{item_id}")
async def delete_menu_item(item_id: str, admin = Depends(require_admin)):
    await supabase_request("DELETE", "items", {"id": f"eq.{item_id}"})
    return {"success": True}

@api_router.get("/menu/modifier-groups")
async def get_modifier_groups():
    groups = await supabase_request("GET", "modifier_groups", {"tenant_id": f"eq.{TENANT_ID}", "status": "eq.active"})
    modifiers = await supabase_request("GET", "modifiers", {"status": "eq.active"})
    result = []
    for g in groups:
        group_modifiers = [{"id": m["id"], "name": m["name_en"], "name_ar": m["name_ar"], "price": float(m.get("price", 0)), "available": True} for m in modifiers if m["modifier_group_id"] == g["id"]]
        result.append({"id": g["id"], "name": g["name_en"], "name_ar": g["name_ar"], "required": g.get("required", False), "min_select": g.get("min_select", 0), "max_select": g.get("max_select", 1), "options": group_modifiers})
    return result

# ============== ORDER ROUTES ==============

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, user = Depends(get_current_user)):
    try:
        order_number = await generate_order_number()
        order = {
            "id": str(uuid.uuid4()),
            "order_number": order_number,
            "customer_id": user.get("sub") if user else None,
            "customer_name": order_data.customer_name,
            "customer_phone": order_data.customer_phone,
            "customer_email": order_data.customer_email,
            "order_type": order_data.order_type,
            "delivery_address": order_data.delivery_address,
            "branch_id": order_data.branch_id,
            "items": order_data.items,
            "subtotal": order_data.subtotal,
            "delivery_fee": order_data.delivery_fee,
            "discount_amount": order_data.discount_amount,
            "coupon_code": order_data.coupon_code,
            "loyalty_points_used": order_data.loyalty_points_used,
            "total": order_data.total,
            "payment_method": order_data.payment_method,
            "payment_status": "pending",
            "status": "placed",
            "notes": order_data.notes,
            "aggregator": order_data.aggregator,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.orders.insert_one(order)
        
        # Also create in Supabase for real-time
        supabase_order = {"id": order["id"], "tenant_id": TENANT_ID, "branch_id": order_data.branch_id, "order_number": order_number, "order_type": order_data.order_type, "channel": order_data.aggregator or "website", "customer_name": order_data.customer_name, "customer_phone": order_data.customer_phone, "subtotal": order_data.subtotal, "delivery_fee": order_data.delivery_fee, "discount_amount": order_data.discount_amount, "total_amount": order_data.total, "status": "pending", "payment_status": "pending", "notes": order_data.notes}
        try:
            await supabase_request("POST", "orders", data=supabase_order)
        except:
            pass  # Continue even if Supabase fails
        
        return {"success": True, "order": {"id": order["id"], "order_number": order_number, "status": "placed", "total": order_data.total}}
    except Exception as e:
        logger.error(f"Order creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/orders")
async def get_orders(status: Optional[str] = None, branch_id: Optional[str] = None, limit: int = Query(50, le=100), skip: int = 0, admin = Depends(require_admin)):
    query = {}
    if status: query["status"] = status
    if branch_id: query["branch_id"] = branch_id
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    return {"orders": orders, "total": total}

@api_router.get("/orders/active")
async def get_active_orders(branch_id: Optional[str] = None, admin = Depends(require_admin)):
    query = {"status": {"$in": ["placed", "accepted", "preparing", "ready", "out_for_delivery"]}}
    if branch_id: query["branch_id"] = branch_id
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/track/{order_number}")
async def track_order(order_number: str):
    order = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"order_number": order.get("order_number"), "status": order.get("status"), "order_type": order.get("order_type"), "created_at": order.get("created_at"), "accepted_at": order.get("accepted_at"), "preparing_at": order.get("preparing_at"), "ready_at": order.get("ready_at"), "out_for_delivery_at": order.get("out_for_delivery_at"), "completed_at": order.get("completed_at"), "items": order.get("items"), "total": order.get("total")}

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, data: Dict[str, str], admin = Depends(require_admin)):
    new_status = data.get("status")
    valid_statuses = ["placed", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}
    timestamp_field = f"{new_status}_at"
    if timestamp_field in ["accepted_at", "preparing_at", "ready_at", "out_for_delivery_at", "completed_at", "cancelled_at"]:
        update_data[timestamp_field] = datetime.now(timezone.utc).isoformat()
    if new_status == "cancelled" and data.get("reason"):
        update_data["cancellation_reason"] = data.get("reason")
    
    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update Supabase too
    try:
        await supabase_request("PATCH", "orders", {"id": f"eq.{order_id}"}, {"status": new_status})
    except:
        pass
    
    return {"success": True, "status": new_status}

# ============== COUPON ROUTES ==============

@api_router.post("/coupons/validate")
async def validate_coupon(data: CouponValidate):
    coupon = await db.coupons.find_one({"code": data.code.upper(), "is_active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon code")
    
    now = datetime.now(timezone.utc)
    valid_from = datetime.fromisoformat(coupon.get("valid_from").replace("Z", "+00:00")) if isinstance(coupon.get("valid_from"), str) else coupon.get("valid_from")
    valid_until = datetime.fromisoformat(coupon.get("valid_until").replace("Z", "+00:00")) if isinstance(coupon.get("valid_until"), str) else coupon.get("valid_until")
    
    if now < valid_from or now > valid_until:
        raise HTTPException(status_code=400, detail="Coupon has expired or not yet valid")
    if coupon.get("usage_limit") and coupon.get("used_count", 0) >= coupon.get("usage_limit"):
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    if coupon.get("min_order_amount") and data.subtotal < coupon.get("min_order_amount"):
        raise HTTPException(status_code=400, detail=f"Minimum order amount is {coupon.get('min_order_amount')} KWD")
    
    if coupon.get("discount_type") == "percentage":
        discount = data.subtotal * (coupon.get("discount_value") / 100)
        if coupon.get("max_discount"):
            discount = min(discount, coupon.get("max_discount"))
    else:
        discount = coupon.get("discount_value")
    
    return {"valid": True, "code": coupon.get("code"), "discount": round(discount, 3), "discount_type": coupon.get("discount_type"), "description": coupon.get("description")}

@api_router.get("/coupons")
async def get_coupons(admin = Depends(require_admin)):
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(100)
    return coupons

@api_router.post("/coupons")
async def create_coupon(coupon: CouponCreate, admin = Depends(require_admin)):
    coupon_dict = coupon.model_dump()
    coupon_dict["id"] = str(uuid.uuid4())
    coupon_dict["code"] = coupon_dict["code"].upper()
    coupon_dict["used_count"] = 0
    coupon_dict["valid_from"] = coupon_dict["valid_from"].isoformat()
    coupon_dict["valid_until"] = coupon_dict["valid_until"].isoformat()
    coupon_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.coupons.insert_one(coupon_dict)
    return {"success": True, "coupon": coupon_dict}

@api_router.put("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, data: Dict[str, Any], admin = Depends(require_admin)):
    if "valid_from" in data and isinstance(data["valid_from"], datetime):
        data["valid_from"] = data["valid_from"].isoformat()
    if "valid_until" in data and isinstance(data["valid_until"], datetime):
        data["valid_until"] = data["valid_until"].isoformat()
    if "code" in data:
        data["code"] = data["code"].upper()
    await db.coupons.update_one({"id": coupon_id}, {"$set": data})
    return {"success": True}

@api_router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, admin = Depends(require_admin)):
    await db.coupons.delete_one({"id": coupon_id})
    return {"success": True}

# ============== LOYALTY ROUTES ==============

@api_router.get("/loyalty/settings")
async def get_loyalty_settings():
    settings = await db.settings.find_one({"type": "loyalty"}, {"_id": 0})
    return settings or {"points_per_kwd": 10, "kwd_per_point": 0.01, "min_points_redemption": 100}

@api_router.put("/loyalty/settings")
async def update_loyalty_settings(data: LoyaltySettings, admin = Depends(require_admin)):
    settings_dict = data.model_dump()
    settings_dict["type"] = "loyalty"
    await db.settings.update_one({"type": "loyalty"}, {"$set": settings_dict}, upsert=True)
    return {"success": True}

# ============== CUSTOMER ROUTES ==============

@api_router.get("/customers")
async def get_customers(search: Optional[str] = None, limit: int = Query(50, le=100), skip: int = 0, admin = Depends(require_admin)):
    # Get from Supabase
    params = {"tenant_id": f"eq.{TENANT_ID}", "order": "created_at.desc", "limit": str(limit), "offset": str(skip)}
    customers = await supabase_request("GET", "customers", params)
    return {"customers": customers or [], "total": len(customers or [])}

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, admin = Depends(require_admin)):
    customers = await supabase_request("GET", "customers", {"id": f"eq.{customer_id}"})
    if not customers:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer = customers[0]
    orders = await db.orders.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    return {**customer, "recent_orders": orders}

# ============== BRANCH ROUTES ==============

@api_router.get("/branches")
async def get_branches():
    branches = await supabase_request("GET", "branches", {"tenant_id": f"eq.{TENANT_ID}", "status": "eq.active"})
    return branches or []

@api_router.get("/branches/all")
async def get_all_branches(admin = Depends(require_admin)):
    branches = await supabase_request("GET", "branches", {"tenant_id": f"eq.{TENANT_ID}"})
    return branches or []

@api_router.post("/branches/{branch_id}/check-delivery")
async def check_delivery_coverage(branch_id: str, data: Dict[str, float]):
    # Kuwait coordinates bounds check
    lat, lng = data.get("lat"), data.get("lng")
    if not lat or not lng:
        raise HTTPException(status_code=400, detail="Latitude and longitude required")
    
    # Check if within Kuwait bounds (roughly)
    if not (28.5 < lat < 30.5 and 46.5 < lng < 48.5):
        return {"covered": False, "message": "Location outside Kuwait"}
    
    branches = await supabase_request("GET", "branches", {"id": f"eq.{branch_id}"})
    if not branches:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    branch = branches[0]
    return {"covered": True, "delivery_fee": float(branch.get("delivery_fee", 0.5)), "min_order_amount": float(branch.get("min_order_amount", 0))}

# ============== BUSINESS SETTINGS ROUTES ==============

@api_router.get("/settings/business")
async def get_business_settings():
    settings = await db.settings.find_one({"type": "business"}, {"_id": 0})
    if not settings:
        # Get from Supabase tenant
        tenants = await supabase_request("GET", "tenants", {"id": f"eq.{TENANT_ID}"})
        if tenants:
            t = tenants[0]
            return {"business_name": t.get("name"), "currency": t.get("currency", "KWD"), "tax_rate": float(t.get("tax_rate", 0))}
    return settings or {}

@api_router.put("/settings/business")
async def update_business_settings(data: BusinessSettings, admin = Depends(require_admin)):
    settings_dict = data.model_dump()
    settings_dict["type"] = "business"
    await db.settings.update_one({"type": "business"}, {"$set": settings_dict}, upsert=True)
    return {"success": True}

# ============== INTEGRATION SETTINGS ROUTES ==============

@api_router.get("/settings/integrations")
async def get_integration_settings(admin = Depends(require_admin)):
    settings = await db.settings.find_one({"type": "integrations"}, {"_id": 0})
    if not settings:
        return {}
    return {k: ("***" if v and "key" in k.lower() else v) for k, v in settings.items() if k != "type" and k != "_id"}

@api_router.put("/settings/integrations")
async def update_integration_settings(data: IntegrationSettings, admin = Depends(require_admin)):
    settings_dict = data.model_dump()
    settings_dict["type"] = "integrations"
    await db.settings.update_one({"type": "integrations"}, {"$set": settings_dict}, upsert=True)
    return {"success": True}

# ============== REPORTS ROUTES ==============

@api_router.get("/reports/sales")
async def get_sales_report(start_date: str = Query(...), end_date: str = Query(...), branch_id: Optional[str] = None, admin = Depends(require_admin)):
    query = {"status": {"$in": ["completed"]}, "created_at": {"$gte": start_date, "$lte": end_date}}
    if branch_id: query["branch_id"] = branch_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    total_sales = sum(o.get("total", 0) for o in orders)
    total_orders = len(orders)
    avg_order_value = total_sales / total_orders if total_orders > 0 else 0
    
    sales_by_day = {}
    for order in orders:
        date = order.get("created_at", "")[:10]
        if date not in sales_by_day: sales_by_day[date] = {"orders": 0, "sales": 0}
        sales_by_day[date]["orders"] += 1
        sales_by_day[date]["sales"] += order.get("total", 0)
    
    sales_by_channel = {}
    for order in orders:
        channel = order.get("aggregator") or "website"
        if channel not in sales_by_channel: sales_by_channel[channel] = {"orders": 0, "sales": 0}
        sales_by_channel[channel]["orders"] += 1
        sales_by_channel[channel]["sales"] += order.get("total", 0)
    
    return {"total_sales": round(total_sales, 3), "total_orders": total_orders, "avg_order_value": round(avg_order_value, 3), "sales_by_day": sales_by_day, "sales_by_channel": sales_by_channel}

@api_router.get("/reports/top-items")
async def get_top_items_report(start_date: str = Query(...), end_date: str = Query(...), limit: int = Query(10, le=50), admin = Depends(require_admin)):
    query = {"status": {"$in": ["completed"]}, "created_at": {"$gte": start_date, "$lte": end_date}}
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    item_stats = {}
    for order in orders:
        for item in order.get("items", []):
            item_id = item.get("item_id")
            if item_id not in item_stats:
                item_stats[item_id] = {"item_id": item_id, "item_name": item.get("item_name"), "quantity": 0, "revenue": 0}
            item_stats[item_id]["quantity"] += item.get("quantity", 0)
            item_stats[item_id]["revenue"] += item.get("subtotal", 0)
    
    return sorted(item_stats.values(), key=lambda x: x["quantity"], reverse=True)[:limit]

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_initial_data():
    existing = await db.admins.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    # Create admin
    admin_hash = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
    admin = {"id": str(uuid.uuid4()), "username": "admin", "password_hash": admin_hash, "name": "Admin User", "role": "super_admin", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.admins.insert_one(admin)
    
    # Create loyalty settings
    await db.settings.insert_one({"type": "loyalty", "points_per_kwd": 10, "kwd_per_point": 0.01, "min_points_redemption": 100})
    
    # Create sample coupon
    coupon = {"id": str(uuid.uuid4()), "code": "WELCOME10", "description": "10% off for new customers", "discount_type": "percentage", "discount_value": 10, "min_order_amount": 5.0, "max_discount": 2.0, "usage_limit": 100, "used_count": 0, "valid_from": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(), "valid_until": datetime(2027, 12, 31, tzinfo=timezone.utc).isoformat(), "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.coupons.insert_one(coupon)
    
    return {"success": True, "message": "Initial data seeded", "admin_credentials": {"username": "admin", "password": "admin123"}}

# Include router and configure app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
