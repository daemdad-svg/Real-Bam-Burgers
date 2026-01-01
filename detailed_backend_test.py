import requests
import json
from datetime import datetime

class DetailedBAMBurgersAPITester:
    def __init__(self, base_url="https://kuwaitburgers.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.detailed_results = {}

    def run_detailed_test(self, name, method, endpoint, expected_status, data=None, headers=None, validation_func=None):
        """Run a detailed API test with custom validation"""
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

            # Check status code
            status_ok = response.status_code == expected_status
            
            # Parse response
            try:
                response_data = response.json()
            except:
                response_data = response.text

            # Run custom validation if provided
            validation_ok = True
            validation_details = ""
            if validation_func and status_ok:
                validation_ok, validation_details = validation_func(response_data)

            success = status_ok and validation_ok
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if validation_details:
                    print(f"   {validation_details}")
            else:
                print(f"❌ Failed - Status: {response.status_code}")
                if not status_ok:
                    print(f"   Expected status {expected_status}, got {response.status_code}")
                if not validation_ok:
                    print(f"   Validation failed: {validation_details}")
                print(f"   Response: {str(response_data)[:300]}")
                self.failed_tests.append({
                    'name': name,
                    'status_expected': expected_status,
                    'status_actual': response.status_code,
                    'validation_failed': not validation_ok,
                    'validation_details': validation_details,
                    'response': str(response_data)[:300]
                })

            self.detailed_results[name] = {
                'success': success,
                'status_code': response.status_code,
                'response_data': response_data,
                'validation_details': validation_details
            }
            
            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def setup_admin_token(self):
        """Get admin token for authenticated requests"""
        success, response = self.run_detailed_test(
            "Admin Login Setup",
            "POST",
            "api/auth/admin/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and isinstance(response, dict) and 'access_token' in response:
            self.admin_token = response['access_token']
            return True
        return False

    def validate_categories(self, response_data):
        """Validate categories response"""
        if not isinstance(response_data, list):
            return False, "Response should be a list"
        
        if len(response_data) != 7:
            return False, f"Expected 7 categories, got {len(response_data)}"
        
        # Check if categories have required fields
        required_fields = ['id', 'name', 'name_ar']
        for category in response_data:
            for field in required_fields:
                if field not in category:
                    return False, f"Category missing field: {field}"
            
            # Check if Arabic name exists
            if not category.get('name_ar'):
                return False, f"Category {category.get('name')} missing Arabic name"
        
        return True, f"Found {len(response_data)} categories with Arabic names"

    def validate_menu_items(self, response_data):
        """Validate menu items response"""
        if not isinstance(response_data, list):
            return False, "Response should be a list"
        
        if len(response_data) != 39:
            return False, f"Expected 39 items, got {len(response_data)}"
        
        # Check if items have required fields including modifiers
        required_fields = ['id', 'name', 'name_ar', 'price', 'modifier_groups']
        items_with_modifiers = 0
        
        for item in response_data:
            for field in required_fields:
                if field not in item:
                    return False, f"Item missing field: {field}"
            
            # Check if Arabic name exists
            if not item.get('name_ar'):
                return False, f"Item {item.get('name')} missing Arabic name"
            
            # Count items with modifiers
            if item.get('modifier_groups') and len(item['modifier_groups']) > 0:
                items_with_modifiers += 1
        
        return True, f"Found {len(response_data)} items, {items_with_modifiers} with modifiers, all have Arabic names"

    def validate_coupon_response(self, response_data):
        """Validate coupon validation response"""
        if not isinstance(response_data, dict):
            return False, "Response should be a dict"
        
        required_fields = ['valid', 'code', 'discount', 'discount_type']
        for field in required_fields:
            if field not in response_data:
                return False, f"Missing field: {field}"
        
        if not response_data.get('valid'):
            return False, "Coupon should be valid"
        
        if response_data.get('code') != 'WELCOME10':
            return False, f"Expected code WELCOME10, got {response_data.get('code')}"
        
        # Check discount calculation (10% of 10.000 = 1.000)
        expected_discount = 1.0
        actual_discount = response_data.get('discount', 0)
        if abs(actual_discount - expected_discount) > 0.01:
            return False, f"Expected discount ~{expected_discount}, got {actual_discount}"
        
        return True, f"Coupon valid with {actual_discount} KWD discount"

    def validate_loyalty_settings(self, response_data):
        """Validate loyalty settings response"""
        if not isinstance(response_data, dict):
            return False, "Response should be a dict"
        
        required_fields = ['points_per_kwd', 'kwd_per_point', 'min_points_redemption']
        for field in required_fields:
            if field not in response_data:
                return False, f"Missing field: {field}"
        
        return True, f"Loyalty settings: {response_data.get('points_per_kwd')} points per KWD"

    def validate_branches(self, response_data):
        """Validate branches response"""
        if not isinstance(response_data, list):
            return False, "Response should be a list"
        
        if len(response_data) == 0:
            return False, "No branches found"
        
        # Check if branches have required fields
        for branch in response_data:
            if 'id' not in branch or 'name' not in branch:
                return False, "Branch missing required fields"
        
        return True, f"Found {len(response_data)} branches"

    def validate_order_creation(self, response_data):
        """Validate order creation response"""
        if not isinstance(response_data, dict):
            return False, "Response should be a dict"
        
        if not response_data.get('success'):
            return False, "Order creation should be successful"
        
        order = response_data.get('order', {})
        required_fields = ['id', 'order_number', 'status', 'total']
        for field in required_fields:
            if field not in order:
                return False, f"Order missing field: {field}"
        
        return True, f"Order created: {order.get('order_number')} with total {order.get('total')} KWD"

    def run_all_tests(self):
        """Run all detailed tests"""
        print("🍔 BAM Burgers Detailed API Testing Suite")
        print("=" * 60)
        
        # Setup admin token
        if not self.setup_admin_token():
            print("❌ Failed to get admin token, some tests will be skipped")
        
        # Test 1: Menu Categories (should return 7 categories from Supabase)
        self.run_detailed_test(
            "Menu Categories (7 from Supabase)",
            "GET",
            "api/menu/categories",
            200,
            validation_func=self.validate_categories
        )
        
        # Test 2: Menu Items (should return 39 items with modifiers)
        self.run_detailed_test(
            "Menu Items (39 with modifiers)",
            "GET",
            "api/menu/items",
            200,
            validation_func=self.validate_menu_items
        )
        
        # Test 3: Coupon Validation (WELCOME10 with subtotal 10.000)
        self.run_detailed_test(
            "Coupon Validation (WELCOME10)",
            "POST",
            "api/coupons/validate",
            200,
            data={"code": "WELCOME10", "subtotal": 10.000},
            validation_func=self.validate_coupon_response
        )
        
        # Test 4: Loyalty Settings
        self.run_detailed_test(
            "Loyalty Settings",
            "GET",
            "api/loyalty/settings",
            200,
            validation_func=self.validate_loyalty_settings
        )
        
        # Test 5: Branches
        self.run_detailed_test(
            "Branches",
            "GET",
            "api/branches",
            200,
            validation_func=self.validate_branches
        )
        
        # Test 6: Order Creation Flow
        order_data = {
            "customer_name": "Ahmed Al-Mansouri",
            "customer_phone": "+965 9876 5432",
            "customer_email": "ahmed@example.com",
            "order_type": "delivery",
            "delivery_address": {
                "lat": 29.3117,
                "lng": 48.0391,
                "address_line": "Block 5, Street 15, Salmiya",
                "area": "Salmiya",
                "building": "Al-Noor Tower",
                "floor": "3",
                "apartment": "302",
                "instructions": "Ring the bell twice"
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
                    "modifiers": [
                        {
                            "modifier_id": "mod-extra-cheese",
                            "modifier_name": "Extra Cheese",
                            "price": 0.250
                        }
                    ],
                    "special_instructions": "No onions please",
                    "subtotal": 5.500
                }
            ],
            "subtotal": 5.500,
            "delivery_fee": 0.500,
            "discount_amount": 0.000,
            "coupon_code": None,
            "loyalty_points_used": 0,
            "total": 6.000,
            "payment_method": "cash",
            "notes": "Test order with realistic data"
        }
        
        self.run_detailed_test(
            "Order Creation Flow",
            "POST",
            "api/orders",
            200,
            data=order_data,
            validation_func=self.validate_order_creation
        )

    def print_results(self):
        """Print detailed test results"""
        print("\n" + "=" * 60)
        print(f"📊 Detailed Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"\n   🔴 {failure['name']}:")
                if 'error' in failure:
                    print(f"      Error: {failure['error']}")
                else:
                    if failure.get('status_expected') != failure.get('status_actual'):
                        print(f"      Status: Expected {failure.get('status_expected')}, got {failure.get('status_actual')}")
                    if failure.get('validation_failed'):
                        print(f"      Validation: {failure.get('validation_details')}")
                    if failure.get('response'):
                        print(f"      Response: {failure['response']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        # Print summary of what was tested
        print(f"\n📋 Test Summary:")
        print(f"   ✓ Menu Categories: Expected 7 from Supabase")
        print(f"   ✓ Menu Items: Expected 39 with modifiers and Arabic names")
        print(f"   ✓ Coupon Validation: WELCOME10 with 10.000 KWD subtotal")
        print(f"   ✓ Loyalty Settings: Points system configuration")
        print(f"   ✓ Branches: Available branches list")
        print(f"   ✓ Order Creation: Full order flow with realistic data")
        
        return self.tests_passed == self.tests_run

def main():
    tester = DetailedBAMBurgersAPITester()
    tester.run_all_tests()
    success = tester.print_results()
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())