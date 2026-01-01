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
from supabase import create_client, Client as SupabaseClient
import jwt as pyjwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Supabase connection
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET')

supabase: SupabaseClient = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Create the main app without a prefix
app = FastAPI(title="BAM Burgers API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Auth Models
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class CashierLogin(BaseModel):
    pin: str
    branch_id: str

# Menu Models
class ModifierOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: Optional[str] = None
    price: float = 0.0
    available: bool = True

class ModifierGroup(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: Optional[str] = None
    required: bool = False
    min_select: int = 0
    max_select: int = 1
    options: List[ModifierOption] = []

class Variant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: Optional[str] = None
    price: float
    available: bool = True

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: Optional[str] = None
    description: Optional[str] = None
    description_ar: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    category_id: str
    variants: List[Variant] = []
    modifier_groups: List[str] = []  # List of modifier group IDs
    available: bool = True
    is_popular: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    display_order: int = 0
    available: bool = True

# Order Models
class OrderItem(BaseModel):
    item_id: str
    item_name: str
    variant_id: Optional[str] = None
    variant_name: Optional[str] = None
    quantity: int
    unit_price: float
    modifiers: List[Dict[str, Any]] = []
    special_instructions: Optional[str] = None
    subtotal: float

class DeliveryAddress(BaseModel):
    lat: float
    lng: float
    address_line: str
    area: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    apartment: Optional[str] = None
    instructions: Optional[str] = None

class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    order_type: str  # delivery, pickup
    delivery_address: Optional[DeliveryAddress] = None
    branch_id: str
    items: List[OrderItem]
    subtotal: float
    delivery_fee: float = 0.0
    discount: float = 0.0
    coupon_code: Optional[str] = None
    loyalty_points_used: int = 0
    total: float
    payment_method: str  # cash, card, online
    notes: Optional[str] = None
    aggregator: Optional[str] = None  # talabat, keeta, jahez, etc

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    order_type: str
    delivery_address: Optional[DeliveryAddress] = None
    branch_id: str
    items: List[OrderItem]
    subtotal: float
    delivery_fee: float = 0.0
    discount: float = 0.0
    coupon_code: Optional[str] = None
    loyalty_points_used: int = 0
    loyalty_points_earned: int = 0
    total: float
    payment_method: str
    payment_status: str = "pending"  # pending, paid, failed
    status: str = "placed"  # placed, accepted, preparing, ready, out_for_delivery, completed, cancelled
    notes: Optional[str] = None
    aggregator: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accepted_at: Optional[datetime] = None
    preparing_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None
    out_for_delivery_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None

# Coupon Models
class Coupon(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    description: Optional[str] = None
    discount_type: str  # percentage, fixed
    discount_value: float
    min_order_amount: float = 0.0
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    used_count: int = 0
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True
    applicable_categories: List[str] = []  # Empty = all categories
    applicable_items: List[str] = []  # Empty = all items

class CouponValidate(BaseModel):
    code: str
    subtotal: float
    items: List[Dict[str, Any]] = []

# Loyalty Models
class LoyaltySettings(BaseModel):
    points_per_kwd: int = 10
    kwd_per_point: float = 0.01
    min_points_redemption: int = 100
    max_points_per_order: Optional[int] = None

# Customer Models
class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None  # Supabase auth user id
    email: str
    name: str
    phone: Optional[str] = None
    addresses: List[DeliveryAddress] = []
    loyalty_points: int = 0
    total_orders: int = 0
    total_spent: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Branch Models
class Branch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_ar: Optional[str] = None
    address: str
    lat: float
    lng: float
    phone: Optional[str] = None
    delivery_coverage: List[List[float]] = []  # Polygon coordinates
    delivery_fee: float = 0.5
    min_order_amount: float = 0.0
    is_active: bool = True
    opening_hours: Dict[str, Any] = {}

# Integration Settings
class IntegrationSettings(BaseModel):
    myfatoorah_api_key: Optional[str] = None
    myfatoorah_test_mode: bool = True
    upay_api_key: Optional[str] = None
    upay_merchant_id: Optional[str] = None
    armada_api_key: Optional[str] = None
    wiyak_api_key: Optional[str] = None
    talabat_api_key: Optional[str] = None
    jahez_api_key: Optional[str] = None
    keeta_api_key: Optional[str] = None
    deliveroo_api_key: Optional[str] = None
    cari_api_key: Optional[str] = None

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
    
    # Check if user has admin or cashier role from token
    if user.get("role") in ["admin", "cashier", "super_admin"]:
        return user
    
    # Fallback: Check if user is admin in MongoDB by user_id
    admin = await db.admins.find_one({"user_id": user.get("sub")}, {"_id": 0})
    if not admin:
        # Also check by id
        admin = await db.admins.find_one({"id": user.get("sub")}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return {**user, "admin": admin}

async def generate_order_number():
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    count = await db.orders.count_documents({"order_number": {"$regex": f"^BAM-{today}"}})
    return f"BAM-{today}-{str(count + 1).zfill(4)}"

def point_in_polygon(lat: float, lng: float, polygon: List[List[float]]) -> bool:
    """Check if a point is inside a polygon using ray casting algorithm"""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside

# ============== ROUTES ==============

# Status Routes
@api_router.get("/")
async def root():
    return {"message": "BAM Burgers API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register_customer(data: UserRegister):
    try:
        # Register with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "name": data.name,
                    "phone": data.phone
                }
            }
        })
        
        if auth_response.user:
            # Create customer in MongoDB
            customer = Customer(
                user_id=auth_response.user.id,
                email=data.email,
                name=data.name,
                phone=data.phone
            )
            customer_dict = customer.model_dump()
            customer_dict['created_at'] = customer_dict['created_at'].isoformat()
            await db.customers.insert_one(customer_dict)
            
            return {
                "success": True,
                "message": "Registration successful",
                "user": {
                    "id": auth_response.user.id,
                    "email": data.email,
                    "name": data.name
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Registration failed")
            
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/auth/login")
async def login_customer(data: UserLogin):
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        
        if auth_response.session:
            # Get customer from MongoDB
            customer = await db.customers.find_one({"user_id": auth_response.user.id}, {"_id": 0})
            
            return {
                "success": True,
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token,
                "user": {
                    "id": auth_response.user.id,
                    "email": auth_response.user.email,
                    "name": customer.get("name") if customer else auth_response.user.user_metadata.get("name"),
                    "phone": customer.get("phone") if customer else None,
                    "loyalty_points": customer.get("loyalty_points", 0) if customer else 0
                }
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/auth/admin/login")
async def login_admin(data: AdminLogin):
    try:
        # Find admin in MongoDB
        admin = await db.admins.find_one({"username": data.username}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        if not bcrypt.checkpw(data.password.encode(), admin.get("password_hash", "").encode()):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Create token
        token_payload = {
            "sub": admin.get("id"),
            "role": "admin",
            "username": admin.get("username"),
            "aud": "authenticated",
            "exp": datetime.now(timezone.utc).timestamp() + 86400  # 24 hours
        }
        token = pyjwt.encode(token_payload, SUPABASE_JWT_SECRET, algorithm="HS256")
        
        return {
            "success": True,
            "access_token": token,
            "user": {
                "id": admin.get("id"),
                "username": admin.get("username"),
                "name": admin.get("name"),
                "role": admin.get("role", "admin")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/auth/cashier/login")
async def login_cashier(data: CashierLogin):
    try:
        # Find cashier by PIN
        cashiers = await db.cashiers.find({"branch_id": data.branch_id}, {"_id": 0}).to_list(100)
        
        for cashier in cashiers:
            if bcrypt.checkpw(data.pin.encode(), cashier.get("pin_hash", "").encode()):
                # Create token
                token_payload = {
                    "sub": cashier.get("id"),
                    "role": "cashier",
                    "branch_id": data.branch_id,
                    "aud": "authenticated",
                    "exp": datetime.now(timezone.utc).timestamp() + 28800  # 8 hours
                }
                token = pyjwt.encode(token_payload, SUPABASE_JWT_SECRET, algorithm="HS256")
                
                return {
                    "success": True,
                    "access_token": token,
                    "user": {
                        "id": cashier.get("id"),
                        "name": cashier.get("name"),
                        "branch_id": data.branch_id,
                        "role": "cashier"
                    }
                }
        
        raise HTTPException(status_code=401, detail="Invalid PIN")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cashier login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/auth/me")
async def get_current_user_info(user = Depends(require_user)):
    customer = await db.customers.find_one({"user_id": user.get("sub")}, {"_id": 0})
    if customer:
        return {
            "id": user.get("sub"),
            "email": customer.get("email"),
            "name": customer.get("name"),
            "phone": customer.get("phone"),
            "loyalty_points": customer.get("loyalty_points", 0),
            "total_orders": customer.get("total_orders", 0)
        }
    return {"id": user.get("sub"), "email": user.get("email")}

# ============== MENU ROUTES ==============

@api_router.get("/menu/categories")
async def get_categories():
    categories = await db.categories.find({"available": True}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return categories

@api_router.get("/menu/categories/all")
async def get_all_categories():
    categories = await db.categories.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return categories

@api_router.post("/menu/categories")
async def create_category(category: Category, admin = Depends(require_admin)):
    category_dict = category.model_dump()
    await db.categories.insert_one(category_dict)
    return {"success": True, "category": category_dict}

@api_router.put("/menu/categories/{category_id}")
async def update_category(category_id: str, data: Dict[str, Any], admin = Depends(require_admin)):
    result = await db.categories.update_one({"id": category_id}, {"$set": data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"success": True}

@api_router.delete("/menu/categories/{category_id}")
async def delete_category(category_id: str, admin = Depends(require_admin)):
    await db.categories.delete_one({"id": category_id})
    return {"success": True}

@api_router.get("/menu/items")
async def get_menu_items(category_id: Optional[str] = None, popular: Optional[bool] = None):
    query = {"available": True}
    if category_id:
        query["category_id"] = category_id
    if popular:
        query["is_popular"] = True
    
    items = await db.menu_items.find(query, {"_id": 0}).to_list(500)
    return items

@api_router.get("/menu/items/all")
async def get_all_menu_items():
    items = await db.menu_items.find({}, {"_id": 0}).to_list(500)
    return items

@api_router.get("/menu/items/{item_id}")
async def get_menu_item(item_id: str):
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@api_router.post("/menu/items")
async def create_menu_item(item: MenuItem, admin = Depends(require_admin)):
    item_dict = item.model_dump()
    item_dict['created_at'] = item_dict['created_at'].isoformat()
    await db.menu_items.insert_one(item_dict)
    return {"success": True, "item": item_dict}

@api_router.put("/menu/items/{item_id}")
async def update_menu_item(item_id: str, data: Dict[str, Any], admin = Depends(require_admin)):
    result = await db.menu_items.update_one({"id": item_id}, {"$set": data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True}

@api_router.delete("/menu/items/{item_id}")
async def delete_menu_item(item_id: str, admin = Depends(require_admin)):
    await db.menu_items.delete_one({"id": item_id})
    return {"success": True}

@api_router.get("/menu/modifier-groups")
async def get_modifier_groups():
    groups = await db.modifier_groups.find({}, {"_id": 0}).to_list(100)
    return groups

@api_router.post("/menu/modifier-groups")
async def create_modifier_group(group: ModifierGroup, admin = Depends(require_admin)):
    group_dict = group.model_dump()
    await db.modifier_groups.insert_one(group_dict)
    return {"success": True, "group": group_dict}

@api_router.put("/menu/modifier-groups/{group_id}")
async def update_modifier_group(group_id: str, data: Dict[str, Any], admin = Depends(require_admin)):
    result = await db.modifier_groups.update_one({"id": group_id}, {"$set": data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Modifier group not found")
    return {"success": True}

@api_router.delete("/menu/modifier-groups/{group_id}")
async def delete_modifier_group(group_id: str, admin = Depends(require_admin)):
    await db.modifier_groups.delete_one({"id": group_id})
    return {"success": True}

# ============== ORDER ROUTES ==============

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, user = Depends(get_current_user)):
    try:
        order_number = await generate_order_number()
        
        # Calculate loyalty points earned (10 points per KWD)
        loyalty_settings = await db.settings.find_one({"type": "loyalty"}, {"_id": 0})
        points_per_kwd = loyalty_settings.get("points_per_kwd", 10) if loyalty_settings else 10
        loyalty_points_earned = int(order_data.total * points_per_kwd)
        
        order = Order(
            order_number=order_number,
            customer_id=order_data.customer_id or (user.get("sub") if user else None),
            customer_name=order_data.customer_name,
            customer_phone=order_data.customer_phone,
            customer_email=order_data.customer_email,
            order_type=order_data.order_type,
            delivery_address=order_data.delivery_address,
            branch_id=order_data.branch_id,
            items=order_data.items,
            subtotal=order_data.subtotal,
            delivery_fee=order_data.delivery_fee,
            discount=order_data.discount,
            coupon_code=order_data.coupon_code,
            loyalty_points_used=order_data.loyalty_points_used,
            loyalty_points_earned=loyalty_points_earned,
            total=order_data.total,
            payment_method=order_data.payment_method,
            notes=order_data.notes,
            aggregator=order_data.aggregator
        )
        
        order_dict = order.model_dump()
        # Convert datetime fields to ISO strings
        for key in ['created_at', 'updated_at']:
            if order_dict.get(key):
                order_dict[key] = order_dict[key].isoformat()
        
        # Convert delivery address to dict if present
        if order_dict.get('delivery_address'):
            order_dict['delivery_address'] = dict(order_dict['delivery_address'])
        
        # Convert items to dicts
        order_dict['items'] = [dict(item) for item in order_dict['items']]
        
        await db.orders.insert_one(order_dict)
        
        # Update customer loyalty points
        if order.customer_id:
            await db.customers.update_one(
                {"user_id": order.customer_id},
                {
                    "$inc": {
                        "loyalty_points": loyalty_points_earned - order_data.loyalty_points_used,
                        "total_orders": 1,
                        "total_spent": order_data.total
                    }
                }
            )
        
        # Update coupon usage
        if order_data.coupon_code:
            await db.coupons.update_one(
                {"code": order_data.coupon_code.upper()},
                {"$inc": {"used_count": 1}}
            )
        
        return {
            "success": True,
            "order": {
                "id": order.id,
                "order_number": order_number,
                "status": order.status,
                "total": order.total,
                "loyalty_points_earned": loyalty_points_earned
            }
        }
        
    except Exception as e:
        logger.error(f"Order creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/orders")
async def get_orders(
    status: Optional[str] = None,
    branch_id: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0,
    admin = Depends(require_admin)
):
    query = {}
    if status:
        query["status"] = status
    if branch_id:
        query["branch_id"] = branch_id
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total}

@api_router.get("/orders/active")
async def get_active_orders(branch_id: Optional[str] = None, admin = Depends(require_admin)):
    query = {"status": {"$in": ["placed", "accepted", "preparing", "ready", "out_for_delivery"]}}
    if branch_id:
        query["branch_id"] = branch_id
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        # Try by order number
        order = await db.orders.find_one({"order_number": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.get("/orders/track/{order_number}")
async def track_order(order_number: str):
    order = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {
        "order_number": order.get("order_number"),
        "status": order.get("status"),
        "order_type": order.get("order_type"),
        "created_at": order.get("created_at"),
        "accepted_at": order.get("accepted_at"),
        "preparing_at": order.get("preparing_at"),
        "ready_at": order.get("ready_at"),
        "out_for_delivery_at": order.get("out_for_delivery_at"),
        "completed_at": order.get("completed_at"),
        "items": order.get("items"),
        "total": order.get("total")
    }

@api_router.get("/orders/customer/my-orders")
async def get_customer_orders(user = Depends(require_user)):
    orders = await db.orders.find(
        {"customer_id": user.get("sub")},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return orders

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, data: Dict[str, str], admin = Depends(require_admin)):
    new_status = data.get("status")
    valid_statuses = ["placed", "accepted", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]
    
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add timestamp for specific status changes
    timestamp_field = f"{new_status}_at"
    if timestamp_field in ["accepted_at", "preparing_at", "ready_at", "out_for_delivery_at", "completed_at", "cancelled_at"]:
        update_data[timestamp_field] = datetime.now(timezone.utc).isoformat()
    
    if new_status == "cancelled" and data.get("reason"):
        update_data["cancellation_reason"] = data.get("reason")
    
    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
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
    
    # Calculate discount
    if coupon.get("discount_type") == "percentage":
        discount = data.subtotal * (coupon.get("discount_value") / 100)
        if coupon.get("max_discount"):
            discount = min(discount, coupon.get("max_discount"))
    else:
        discount = coupon.get("discount_value")
    
    return {
        "valid": True,
        "code": coupon.get("code"),
        "discount": round(discount, 3),
        "discount_type": coupon.get("discount_type"),
        "description": coupon.get("description")
    }

@api_router.get("/coupons")
async def get_coupons(admin = Depends(require_admin)):
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(100)
    return coupons

@api_router.post("/coupons")
async def create_coupon(coupon: Coupon, admin = Depends(require_admin)):
    coupon_dict = coupon.model_dump()
    coupon_dict['code'] = coupon_dict['code'].upper()
    coupon_dict['valid_from'] = coupon_dict['valid_from'].isoformat()
    coupon_dict['valid_until'] = coupon_dict['valid_until'].isoformat()
    await db.coupons.insert_one(coupon_dict)
    return {"success": True, "coupon": coupon_dict}

@api_router.put("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, data: Dict[str, Any], admin = Depends(require_admin)):
    if 'valid_from' in data and isinstance(data['valid_from'], datetime):
        data['valid_from'] = data['valid_from'].isoformat()
    if 'valid_until' in data and isinstance(data['valid_until'], datetime):
        data['valid_until'] = data['valid_until'].isoformat()
    
    result = await db.coupons.update_one({"id": coupon_id}, {"$set": data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"success": True}

@api_router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, admin = Depends(require_admin)):
    await db.coupons.delete_one({"id": coupon_id})
    return {"success": True}

# ============== LOYALTY ROUTES ==============

@api_router.get("/loyalty/settings")
async def get_loyalty_settings():
    settings = await db.settings.find_one({"type": "loyalty"}, {"_id": 0})
    if not settings:
        return {
            "points_per_kwd": 10,
            "kwd_per_point": 0.01,
            "min_points_redemption": 100,
            "max_points_per_order": None
        }
    return settings

@api_router.put("/loyalty/settings")
async def update_loyalty_settings(data: LoyaltySettings, admin = Depends(require_admin)):
    settings_dict = data.model_dump()
    settings_dict["type"] = "loyalty"
    await db.settings.update_one({"type": "loyalty"}, {"$set": settings_dict}, upsert=True)
    return {"success": True}

@api_router.get("/loyalty/balance")
async def get_loyalty_balance(user = Depends(require_user)):
    customer = await db.customers.find_one({"user_id": user.get("sub")}, {"_id": 0})
    if not customer:
        return {"points": 0, "value": 0.0}
    
    settings = await db.settings.find_one({"type": "loyalty"}, {"_id": 0})
    kwd_per_point = settings.get("kwd_per_point", 0.01) if settings else 0.01
    
    points = customer.get("loyalty_points", 0)
    return {
        "points": points,
        "value": round(points * kwd_per_point, 3)
    }

# ============== CUSTOMER ROUTES ==============

@api_router.get("/customers")
async def get_customers(
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0,
    admin = Depends(require_admin)
):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    
    customers = await db.customers.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.customers.count_documents(query)
    
    return {"customers": customers, "total": total}

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, admin = Depends(require_admin)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        customer = await db.customers.find_one({"user_id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get customer orders
    orders = await db.orders.find(
        {"customer_id": customer.get("user_id")},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {**customer, "recent_orders": orders}

# ============== BRANCH ROUTES ==============

@api_router.get("/branches")
async def get_branches():
    branches = await db.branches.find({"is_active": True}, {"_id": 0}).to_list(50)
    return branches

@api_router.get("/branches/all")
async def get_all_branches(admin = Depends(require_admin)):
    branches = await db.branches.find({}, {"_id": 0}).to_list(50)
    return branches

@api_router.post("/branches")
async def create_branch(branch: Branch, admin = Depends(require_admin)):
    branch_dict = branch.model_dump()
    await db.branches.insert_one(branch_dict)
    return {"success": True, "branch": branch_dict}

@api_router.put("/branches/{branch_id}")
async def update_branch(branch_id: str, data: Dict[str, Any], admin = Depends(require_admin)):
    result = await db.branches.update_one({"id": branch_id}, {"$set": data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Branch not found")
    return {"success": True}

@api_router.delete("/branches/{branch_id}")
async def delete_branch(branch_id: str, admin = Depends(require_admin)):
    await db.branches.delete_one({"id": branch_id})
    return {"success": True}

@api_router.post("/branches/{branch_id}/check-delivery")
async def check_delivery_coverage(branch_id: str, data: Dict[str, float]):
    branch = await db.branches.find_one({"id": branch_id, "is_active": True}, {"_id": 0})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    lat = data.get("lat")
    lng = data.get("lng")
    
    if not lat or not lng:
        raise HTTPException(status_code=400, detail="Latitude and longitude required")
    
    polygon = branch.get("delivery_coverage", [])
    if not polygon:
        # No coverage defined, allow all
        return {
            "covered": True,
            "delivery_fee": branch.get("delivery_fee", 0.5),
            "min_order_amount": branch.get("min_order_amount", 0)
        }
    
    is_covered = point_in_polygon(lat, lng, polygon)
    
    return {
        "covered": is_covered,
        "delivery_fee": branch.get("delivery_fee", 0.5) if is_covered else None,
        "min_order_amount": branch.get("min_order_amount", 0) if is_covered else None
    }

# ============== REPORTS ROUTES ==============

@api_router.get("/reports/sales")
async def get_sales_report(
    start_date: str = Query(...),
    end_date: str = Query(...),
    branch_id: Optional[str] = None,
    admin = Depends(require_admin)
):
    query = {
        "status": {"$in": ["completed"]},
        "created_at": {
            "$gte": start_date,
            "$lte": end_date
        }
    }
    if branch_id:
        query["branch_id"] = branch_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    total_sales = sum(o.get("total", 0) for o in orders)
    total_orders = len(orders)
    avg_order_value = total_sales / total_orders if total_orders > 0 else 0
    
    # Sales by day
    sales_by_day = {}
    for order in orders:
        date = order.get("created_at", "")[:10]
        if date not in sales_by_day:
            sales_by_day[date] = {"orders": 0, "sales": 0}
        sales_by_day[date]["orders"] += 1
        sales_by_day[date]["sales"] += order.get("total", 0)
    
    # Sales by channel
    sales_by_channel = {}
    for order in orders:
        channel = order.get("aggregator") or "website"
        if channel not in sales_by_channel:
            sales_by_channel[channel] = {"orders": 0, "sales": 0}
        sales_by_channel[channel]["orders"] += 1
        sales_by_channel[channel]["sales"] += order.get("total", 0)
    
    return {
        "total_sales": round(total_sales, 3),
        "total_orders": total_orders,
        "avg_order_value": round(avg_order_value, 3),
        "sales_by_day": sales_by_day,
        "sales_by_channel": sales_by_channel
    }

@api_router.get("/reports/top-items")
async def get_top_items_report(
    start_date: str = Query(...),
    end_date: str = Query(...),
    limit: int = Query(10, le=50),
    admin = Depends(require_admin)
):
    query = {
        "status": {"$in": ["completed"]},
        "created_at": {"$gte": start_date, "$lte": end_date}
    }
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    item_stats = {}
    for order in orders:
        for item in order.get("items", []):
            item_id = item.get("item_id")
            if item_id not in item_stats:
                item_stats[item_id] = {
                    "item_id": item_id,
                    "item_name": item.get("item_name"),
                    "quantity": 0,
                    "revenue": 0
                }
            item_stats[item_id]["quantity"] += item.get("quantity", 0)
            item_stats[item_id]["revenue"] += item.get("subtotal", 0)
    
    top_items = sorted(item_stats.values(), key=lambda x: x["quantity"], reverse=True)[:limit]
    
    return top_items

# ============== INTEGRATION SETTINGS ROUTES ==============

@api_router.get("/settings/integrations")
async def get_integration_settings(admin = Depends(require_admin)):
    settings = await db.settings.find_one({"type": "integrations"}, {"_id": 0})
    if not settings:
        return {}
    # Remove sensitive keys from response
    return {k: "***" if v and k.endswith("_key") else v for k, v in settings.items() if k != "type"}

@api_router.put("/settings/integrations")
async def update_integration_settings(data: IntegrationSettings, admin = Depends(require_admin)):
    settings_dict = data.model_dump()
    settings_dict["type"] = "integrations"
    await db.settings.update_one({"type": "integrations"}, {"$set": settings_dict}, upsert=True)
    return {"success": True}

# ============== PAYMENT WEBHOOKS ==============

@api_router.post("/webhooks/myfatoorah")
async def myfatoorah_webhook(data: Dict[str, Any]):
    try:
        # Handle MyFatoorah payment webhook
        invoice_id = data.get("InvoiceId")
        invoice_status = data.get("InvoiceStatus")
        
        if invoice_status == "Paid":
            # Find and update order
            await db.orders.update_one(
                {"payment_reference": invoice_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        return {"success": True}
    except Exception as e:
        logger.error(f"MyFatoorah webhook error: {e}")
        return {"success": False}

@api_router.post("/webhooks/upay")
async def upay_webhook(data: Dict[str, Any]):
    try:
        # Handle UPay payment webhook
        order_id = data.get("orderId")
        status = data.get("status")
        
        if status == "SUCCESS":
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        return {"success": True}
    except Exception as e:
        logger.error(f"UPay webhook error: {e}")
        return {"success": False}

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_initial_data():
    """Seed initial data for the restaurant"""
    try:
        # Check if already seeded
        existing_categories = await db.categories.count_documents({})
        if existing_categories > 0:
            return {"message": "Data already seeded"}
        
        # Create default branch
        branch = Branch(
            id="branch-1",
            name="Kitchen Park Salwa",
            name_ar="كيتشن بارك سلوى",
            address="Kitchen Park Salwa - 834C+HH Rumaithiya, Kuwait",
            lat=29.3117,
            lng=48.0391,
            phone="+965 9474 5424",
            delivery_fee=0.5,
            min_order_amount=3.0,
            is_active=True,
            delivery_coverage=[
                [29.35, 47.95],
                [29.35, 48.15],
                [29.25, 48.15],
                [29.25, 47.95]
            ]
        )
        await db.branches.insert_one(branch.model_dump())
        
        # Create categories
        categories = [
            Category(id="cat-burgers", name="Burgers", name_ar="برجر", display_order=1, image_url="https://images.unsplash.com/photo-1603508102983-99b101395d1a?w=400"),
            Category(id="cat-meals", name="Meals", name_ar="وجبات", display_order=2, image_url="https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400"),
            Category(id="cat-sides", name="Sides", name_ar="إضافات", display_order=3, image_url="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400"),
            Category(id="cat-drinks", name="Drinks", name_ar="مشروبات", display_order=4, image_url="https://images.unsplash.com/photo-1534260164206-2a3a4a72891d?w=400"),
        ]
        for cat in categories:
            await db.categories.insert_one(cat.model_dump())
        
        # Create menu items
        items = [
            MenuItem(
                id="item-og-burger",
                name="OG Burger",
                name_ar="برجر أوجي",
                description="Our signature beef burger with special sauce",
                price=2.500,
                category_id="cat-burgers",
                image_url="https://images.unsplash.com/photo-1603508102983-99b101395d1a?w=400",
                is_popular=True,
                variants=[
                    Variant(id="var-single", name="Single", price=2.500),
                    Variant(id="var-double", name="Double", price=3.500),
                ]
            ),
            MenuItem(
                id="item-cheese-burger",
                name="Cheese Burger",
                name_ar="تشيز برجر",
                description="Classic cheese burger with melted cheddar",
                price=2.750,
                category_id="cat-burgers",
                image_url="https://images.unsplash.com/photo-1585238341710-4d3ff484184d?w=400",
                is_popular=True,
                variants=[
                    Variant(id="var-single", name="Single", price=2.750),
                    Variant(id="var-double", name="Double", price=3.750),
                ]
            ),
            MenuItem(
                id="item-spicy-burger",
                name="Spicy Burger",
                name_ar="برجر حار",
                description="Hot and spicy beef burger with jalapeños",
                price=3.000,
                category_id="cat-burgers",
                image_url="https://images.unsplash.com/photo-1552377419-5dd8980729e1?w=400",
            ),
            MenuItem(
                id="item-og-meal",
                name="OG Burger Meal",
                name_ar="وجبة برجر أوجي",
                description="OG Burger with fries and drink",
                price=4.500,
                category_id="cat-meals",
                image_url="https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400",
                is_popular=True,
            ),
            MenuItem(
                id="item-cheese-meal",
                name="Cheese Burger Meal",
                name_ar="وجبة تشيز برجر",
                description="Cheese Burger with fries and drink",
                price=4.750,
                category_id="cat-meals",
                image_url="https://images.unsplash.com/photo-1585238341710-4d3ff484184d?w=400",
            ),
            MenuItem(
                id="item-fries",
                name="French Fries",
                name_ar="بطاطس مقلية",
                description="Crispy golden fries",
                price=1.000,
                category_id="cat-sides",
                image_url="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400",
                variants=[
                    Variant(id="var-regular", name="Regular", price=1.000),
                    Variant(id="var-large", name="Large", price=1.500),
                ]
            ),
            MenuItem(
                id="item-onion-rings",
                name="Onion Rings",
                name_ar="حلقات البصل",
                description="Crispy breaded onion rings",
                price=1.250,
                category_id="cat-sides",
                image_url="https://images.unsplash.com/photo-1639024471283-03518883512d?w=400",
            ),
            MenuItem(
                id="item-cola",
                name="Cola",
                name_ar="كولا",
                description="Refreshing cola drink",
                price=0.500,
                category_id="cat-drinks",
                image_url="https://images.unsplash.com/photo-1534260164206-2a3a4a72891d?w=400",
                variants=[
                    Variant(id="var-regular", name="Regular", price=0.500),
                    Variant(id="var-large", name="Large", price=0.750),
                ]
            ),
            MenuItem(
                id="item-water",
                name="Water",
                name_ar="ماء",
                description="Bottled water",
                price=0.250,
                category_id="cat-drinks",
                image_url="https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400",
            ),
        ]
        
        for item in items:
            item_dict = item.model_dump()
            item_dict['created_at'] = item_dict['created_at'].isoformat()
            await db.menu_items.insert_one(item_dict)
        
        # Create default admin
        admin_password = "admin123"
        admin_hash = bcrypt.hashpw(admin_password.encode(), bcrypt.gensalt()).decode()
        admin = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": admin_hash,
            "name": "Admin User",
            "role": "super_admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.admins.insert_one(admin)
        
        # Create default cashier
        cashier_pin = "1234"
        pin_hash = bcrypt.hashpw(cashier_pin.encode(), bcrypt.gensalt()).decode()
        cashier = {
            "id": str(uuid.uuid4()),
            "name": "Cashier 1",
            "pin_hash": pin_hash,
            "branch_id": "branch-1",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.cashiers.insert_one(cashier)
        
        # Create loyalty settings
        loyalty_settings = {
            "type": "loyalty",
            "points_per_kwd": 10,
            "kwd_per_point": 0.01,
            "min_points_redemption": 100,
            "max_points_per_order": 500
        }
        await db.settings.insert_one(loyalty_settings)
        
        # Create sample coupon
        coupon = Coupon(
            id="coupon-welcome",
            code="WELCOME10",
            description="10% off for new customers",
            discount_type="percentage",
            discount_value=10,
            min_order_amount=5.0,
            max_discount=2.0,
            usage_limit=100,
            valid_from=datetime.now(timezone.utc) - timedelta(days=1),
            valid_until=datetime(2027, 12, 31, tzinfo=timezone.utc),
            is_active=True
        )
        coupon_dict = coupon.model_dump()
        coupon_dict['valid_from'] = coupon_dict['valid_from'].isoformat()
        coupon_dict['valid_until'] = coupon_dict['valid_until'].isoformat()
        await db.coupons.insert_one(coupon_dict)
        
        return {
            "success": True,
            "message": "Initial data seeded successfully",
            "admin_credentials": {"username": "admin", "password": "admin123"},
            "cashier_credentials": {"pin": "1234", "branch_id": "branch-1"}
        }
        
    except Exception as e:
        logger.error(f"Seed error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
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
