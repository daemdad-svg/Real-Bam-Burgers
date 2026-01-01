# BAM Burgers - Website + Admin Panel (POS + KDS)

## Project Overview
Full-stack restaurant management system with customer ordering website and admin panel including POS and KDS functionality.

## Architecture

### Tech Stack
- **Frontend**: React + TailwindCSS + Framer Motion + Shadcn/UI
- **Backend**: FastAPI (Python) + MongoDB
- **Auth**: Supabase (configured but using custom JWT for admin)
- **Database**: MongoDB for data storage
- **Real-time**: Polling-based order updates

### Directory Structure
```
/app/
├── backend/
│   ├── server.py          # FastAPI server with all endpoints
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/        # Customer & Admin pages
│   │   ├── layouts/      # CustomerLayout, AdminLayout
│   │   ├── context/      # Auth, Cart, AdminAuth contexts
│   │   ├── lib/          # API client, Supabase client
│   │   └── components/   # UI components
│   └── .env              # Frontend environment variables
```

## User Personas

### Customer
- Browse menu with categories and Arabic names
- Add items to cart with variants (Single/Double, Regular/Large)
- Checkout with delivery/pickup options
- Track order status in real-time
- Use coupon codes
- Earn and redeem loyalty points

### Admin/Staff
- **Dashboard**: View and manage incoming orders with new order alerts
- **POS Mode**: Create manual orders for walk-in/aggregator customers
- **KDS Mode**: Kitchen display with order bumping
- **Menu Management**: CRUD for categories and items
- **Reports**: Sales analytics and top items

## Core Requirements (Static)

### Customer Website
- [x] Hero banner with "OG BURGER MEAL"
- [x] Mobile-first responsive design
- [x] Menu with categories (Burgers, Meals, Sides, Drinks)
- [x] Bilingual support (English/Arabic)
- [x] Cart with delivery/pickup selection
- [x] Coupon validation
- [x] Loyalty points display
- [x] Order tracking page

### Admin Panel (RIWA POS)
- [x] Admin login with credentials
- [x] Order inbox with new order alerts (buzzer sound)
- [x] Order status lifecycle (Placed → Accepted → Preparing → Ready → Out for Delivery → Completed)
- [x] POS mode with category sidebar and item grid
- [x] Aggregator selector (Talabat, Keeta, Jahez, Deliveroo, Cari)
- [x] KDS mode with order bumping
- [x] Menu management CRUD
- [x] Reports with sales analytics

### Design Colors
- **Website**: Primary #c31c1c, Secondary #faf2f1, Accent #c47071
- **Admin**: Primary #1e3a5f, Secondary #a8c5e6, Accent #d4af37

## What's Been Implemented

### January 1, 2026
- ✅ Complete FastAPI backend with all endpoints
- ✅ MongoDB integration for data storage
- ✅ Supabase configuration for auth
- ✅ Customer website with full ordering flow
- ✅ Admin panel with RIWA POS branding
- ✅ Order inbox with new order alerts
- ✅ POS mode for manual order creation
- ✅ KDS mode for kitchen display
- ✅ Menu management page
- ✅ Reports page with sales analytics
- ✅ Seed data with sample menu and admin credentials

## API Endpoints

### Auth
- POST /api/auth/register - Customer registration
- POST /api/auth/login - Customer login
- POST /api/auth/admin/login - Admin login
- POST /api/auth/cashier/login - Cashier PIN login

### Menu
- GET /api/menu/categories - Get active categories
- GET /api/menu/items - Get menu items
- POST/PUT/DELETE /api/menu/categories - CRUD
- POST/PUT/DELETE /api/menu/items - CRUD

### Orders
- POST /api/orders - Create order
- GET /api/orders - List orders (admin)
- GET /api/orders/active - Active orders
- PUT /api/orders/{id}/status - Update status
- GET /api/orders/track/{number} - Track order

### Other
- POST /api/coupons/validate - Validate coupon
- GET /api/loyalty/settings - Loyalty config
- GET /api/reports/sales - Sales report
- POST /api/seed - Seed initial data

## Credentials
- **Admin**: username: `admin`, password: `admin123`
- **Cashier**: PIN: `1234`, branch_id: `branch-1`
- **Sample Coupon**: `WELCOME10` (10% off, min 5 KWD)

## Prioritized Backlog

### P0 (Critical) - Done
- [x] Menu display and cart
- [x] Order creation
- [x] Admin login and order management
- [x] POS functionality

### P1 (High Priority) - Pending
- [ ] Payment gateway integration (MyFatoorah, UPay)
- [ ] Delivery API integration (Armada, Wiyak)
- [ ] Real-time WebSocket updates (currently polling)
- [ ] Receipt printing

### P2 (Medium Priority) - Pending
- [ ] Customer registration with Supabase Auth
- [ ] Customer order history
- [ ] Full loyalty program UI
- [ ] Coupon management UI
- [ ] Customer management UI
- [ ] Settings/Integrations UI

### P3 (Low Priority) - Pending
- [ ] Map integration for delivery coverage
- [ ] Aggregator API integrations
- [ ] Offline POS with IndexedDB sync
- [ ] Multi-branch support

## Next Tasks
1. Implement payment gateway integration (MyFatoorah/UPay)
2. Add real-time WebSocket for order updates
3. Complete customer auth with Supabase
4. Add map for delivery address selection
5. Implement receipt printing
