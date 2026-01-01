import requests
import sys
import json
from datetime import datetime

class BAMBurgersAPITester:
    def __init__(self, base_url="https://burger-mgmt-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                try:
                    return False, response.json()
                except:
                    return False, response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_seed_data(self):
        """Test seeding initial data"""
        return self.run_test("Seed Initial Data", "POST", "api/seed", 200)

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/admin/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and isinstance(response, dict) and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_get_categories(self):
        """Test getting menu categories"""
        return self.run_test("Get Categories", "GET", "api/menu/categories", 200)

    def test_get_menu_items(self):
        """Test getting menu items"""
        return self.run_test("Get Menu Items", "GET", "api/menu/items", 200)

    def test_get_branches(self):
        """Test getting branches"""
        return self.run_test("Get Branches", "GET", "api/branches", 200)

    def test_create_order(self):
        """Test creating an order"""
        order_data = {
            "customer_name": "Test Customer",
            "customer_phone": "+965 1234 5678",
            "customer_email": "test@example.com",
            "order_type": "delivery",
            "delivery_address": {
                "lat": 29.3117,
                "lng": 48.0391,
                "address_line": "Test Street, Test Area",
                "area": "Test Area",
                "building": "Test Building",
                "floor": "1",
                "apartment": "101",
                "instructions": "Test delivery instructions"
            },
            "branch_id": "branch-1",
            "items": [
                {
                    "item_id": "item-og-burger",
                    "item_name": "OG Burger",
                    "variant_id": "var-single",
                    "variant_name": "Single",
                    "quantity": 2,
                    "unit_price": 2.500,
                    "modifiers": [],
                    "special_instructions": "",
                    "subtotal": 5.000
                }
            ],
            "subtotal": 5.000,
            "delivery_fee": 0.500,
            "discount": 0.000,
            "coupon_code": None,
            "loyalty_points_used": 0,
            "total": 5.500,
            "payment_method": "cash",
            "notes": "Test order"
        }
        return self.run_test("Create Order", "POST", "api/orders", 200, data=order_data)

    def test_get_orders(self):
        """Test getting orders (admin required)"""
        if not self.admin_token:
            print("❌ Skipping Get Orders - No admin token")
            return False
        return self.run_test("Get Orders", "GET", "api/orders", 200)

    def test_validate_coupon(self):
        """Test coupon validation"""
        coupon_data = {
            "code": "WELCOME10",
            "subtotal": 10.000,
            "items": []
        }
        return self.run_test("Validate Coupon", "POST", "api/coupons/validate", 200, data=coupon_data)

    def test_track_order(self):
        """Test order tracking"""
        # First create an order to track
        success, order_response = self.test_create_order()
        if success and isinstance(order_response, dict) and 'order' in order_response:
            order_number = order_response['order']['order_number']
            return self.run_test(f"Track Order {order_number}", "GET", f"api/orders/track/{order_number}", 200)
        else:
            print("❌ Skipping Track Order - Could not create test order")
            return False

def main():
    print("🍔 BAM Burgers API Testing Suite")
    print("=" * 50)
    
    # Setup
    tester = BAMBurgersAPITester()
    
    # Run tests in order
    tests = [
        tester.test_health_check,
        tester.test_seed_data,
        tester.test_admin_login,
        tester.test_get_categories,
        tester.test_get_menu_items,
        tester.test_get_branches,
        tester.test_validate_coupon,
        tester.test_create_order,
        tester.test_get_orders,
        tester.test_track_order,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            tester.failed_tests.append({
                'name': test.__name__,
                'error': str(e)
            })

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            if 'error' in failure:
                error_msg = failure['error']
            else:
                error_msg = f"Expected {failure.get('expected')}, got {failure.get('actual')}"
            print(f"   - {failure['name']}: {error_msg}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())