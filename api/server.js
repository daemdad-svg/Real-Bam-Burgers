const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// MongoDB client
let db;
const mongoClient = new MongoClient(process.env.MONGO_URL);

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.DB_NAME || 'bam_burgers');
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
  }
}

connectDB();

// Helper to get tenant ID
const TENANT_ID = 'd82147fa-f5e3-474c-b18c-85efaacf0ae2';

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ========== MENU ENDPOINTS ==========

// Get categories
app.get('/api/menu/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'active')
      .order('display_order', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ detail: error.message });
  }
});

// Get menu items
app.get('/api/menu/items', async (req, res) => {
  try {
    const categoryId = req.query.category_id;
    
    let query = supabase
      .from('items')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'active');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: items, error } = await query.order('display_order', { ascending: true });
    if (error) throw error;

    // Get modifier groups
    const { data: itemModGroups } = await supabase
      .from('item_modifier_groups')
      .select('*');

    const { data: modifierGroups } = await supabase
      .from('modifier_groups')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .eq('status', 'active');

    const { data: modifiers } = await supabase
      .from('modifiers')
      .select('*')
      .eq('status', 'active');

    // Attach modifiers to items
    const itemsWithModifiers = items.map(item => {
      const itemModGroupIds = itemModGroups
        ?.filter(img => img.item_id === item.id)
        .map(img => img.modifier_group_id) || [];

      const itemModGroups = modifierGroups
        ?.filter(mg => itemModGroupIds.includes(mg.id))
        .map(mg => ({
          ...mg,
          modifiers: modifiers?.filter(m => m.modifier_group_id === mg.id) || []
        })) || [];

      return {
        ...item,
        modifier_groups: itemModGroups
      };
    });

    res.json(itemsWithModifiers);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ detail: error.message });
  }
});

// ========== BRANCHES ==========
app.get('/api/branches', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('tenant_id', TENANT_ID);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// ========== COUPONS ==========

// Get all coupons
app.get('/api/coupons', async (req, res) => {
  try {
    const coupons = await db.collection('coupons').find({}).toArray();
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Validate coupon
app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    
    const coupon = await db.collection('coupons').findOne({
      code: code.toUpperCase(),
      is_active: true
    });

    if (!coupon) {
      return res.status(404).json({ detail: 'Invalid coupon code' });
    }

    const now = new Date();
    if (new Date(coupon.valid_from) > now || new Date(coupon.valid_until) < now) {
      return res.status(400).json({ detail: 'Coupon has expired' });
    }

    if (subtotal < coupon.min_order_amount) {
      return res.status(400).json({ 
        detail: `Minimum order amount is ${coupon.min_order_amount} KWD` 
      });
    }

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ detail: 'Coupon usage limit reached' });
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount) {
        discount = Math.min(discount, coupon.max_discount);
      }
    } else {
      discount = coupon.discount_value;
    }

    res.json({
      valid: true,
      discount,
      coupon
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Create coupon
app.post('/api/coupons', async (req, res) => {
  try {
    const coupon = {
      ...req.body,
      id: new ObjectId().toString(),
      used_count: 0,
      created_at: new Date()
    };
    await db.collection('coupons').insertOne(coupon);
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Update coupon
app.put('/api/coupons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('coupons').updateOne(
      { id },
      { $set: req.body }
    );
    res.json({ message: 'Coupon updated' });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Delete coupon
app.delete('/api/coupons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('coupons').deleteOne({ id });
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// ========== LOYALTY ==========

app.get('/api/loyalty/settings', async (req, res) => {
  try {
    const settings = await db.collection('loyalty_settings').findOne({});
    res.json(settings || {
      points_per_kwd: 10,
      kwd_per_point: 0.01,
      min_points_redemption: 100
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.put('/api/loyalty/settings', async (req, res) => {
  try {
    await db.collection('loyalty_settings').updateOne(
      {},
      { $set: req.body },
      { upsert: true }
    );
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// ========== ORDERS ==========

app.post('/api/orders', async (req, res) => {
  try {
    const order = {
      ...req.body,
      id: new ObjectId().toString(),
      created_at: new Date(),
      status: 'pending'
    };
    
    await db.collection('orders').insertOne(order);
    res.json(order);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.collection('orders')
      .find({})
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await db.collection('orders').updateOne(
      { id },
      { $set: { status, updated_at: new Date() } }
    );
    
    res.json({ message: 'Order status updated' });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// ========== CUSTOMERS ==========

app.get('/api/customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', TENANT_ID);

    if (error) throw error;

    const customersWithStats = await Promise.all(
      data.map(async (customer) => {
        const orders = await db.collection('orders')
          .find({ customer_id: customer.id })
          .toArray();
        
        return {
          ...customer,
          total_orders: orders.length,
          total_spent: orders.reduce((sum, o) => sum + (o.total || 0), 0)
        };
      })
    );

    res.json({ customers: customersWithStats });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// ========== ADMIN AUTH ==========

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await db.collection('admin_users').findOne({ username });
    
    if (!admin || admin.password !== password) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    res.json({
      token: 'admin-token-' + Date.now(),
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name
      }
    });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// ========== INTEGRATION SETTINGS ==========

app.get('/api/settings/integrations', async (req, res) => {
  try {
    const settings = await db.collection('integration_settings').findOne({});
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

app.put('/api/settings/integrations', async (req, res) => {
  try {
    await db.collection('integration_settings').updateOne(
      {},
      { $set: req.body },
      { upsert: true }
    );
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// ========== SEED DATA ==========

app.post('/api/seed', async (req, res) => {
  try {
    // Check if already seeded
    const existingAdmin = await db.collection('admin_users').findOne({});
    if (existingAdmin) {
      return res.json({ message: 'Data already seeded' });
    }

    // Seed admin user
    await db.collection('admin_users').insertOne({
      id: new ObjectId().toString(),
      username: 'admin',
      password: 'admin123',
      name: 'Administrator',
      created_at: new Date()
    });

    // Seed sample coupon
    await db.collection('coupons').insertOne({
      id: new ObjectId().toString(),
      code: 'WELCOME10',
      description_en: '10% off for new customers',
      description_ar: 'خصم 10% للعملاء الجدد',
      discount_type: 'percentage',
      discount_value: 10,
      min_order_amount: 5,
      max_discount: 2,
      usage_limit: 100,
      used_count: 0,
      valid_from: new Date(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      is_active: true,
      created_at: new Date()
    });

    // Seed loyalty settings
    await db.collection('loyalty_settings').insertOne({
      points_per_kwd: 10,
      kwd_per_point: 0.01,
      min_points_redemption: 100
    });

    res.json({ message: 'Initial data seeded successfully' });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
});

module.exports = app;
