import requests
import json

def test_order_with_correct_branch():
    """Test order creation with correct branch ID"""
    base_url = "https://kuwaitburgers.preview.emergentagent.com"
    
    # Get admin token first
    login_response = requests.post(f"{base_url}/api/auth/admin/login", 
                                 json={"username": "admin", "password": "admin123"})
    
    if login_response.status_code != 200:
        print("❌ Failed to get admin token")
        return False
    
    token = login_response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Test order with correct branch ID
    order_data = {
        "customer_name": "Fatima Al-Zahra",
        "customer_phone": "+965 5555 1234",
        "customer_email": "fatima@example.com",
        "order_type": "delivery",
        "delivery_address": {
            "lat": 29.3117,
            "lng": 48.0391,
            "address_line": "Block 8, Street 25, Salwa",
            "area": "Salwa",
            "building": "Al-Salam Complex",
            "floor": "2",
            "apartment": "205",
            "instructions": "Call when you arrive"
        },
        "branch_id": "3f9570b2-24d2-4f2d-81d7-25c6b35da76b",  # Correct UUID
        "items": [
            {
                "item_id": "item-og-burger",
                "item_name": "OG Burger",
                "variant_id": "var-single",
                "variant_name": "Single",
                "quantity": 1,
                "unit_price": 2.500,
                "modifiers": [
                    {
                        "modifier_id": "mod-extra-cheese",
                        "modifier_name": "Extra Cheese",
                        "price": 0.250
                    }
                ],
                "special_instructions": "Medium well done",
                "subtotal": 2.750
            },
            {
                "item_id": "item-chicken-burger",
                "item_name": "Chicken Burger",
                "variant_id": "var-single",
                "variant_name": "Single",
                "quantity": 1,
                "unit_price": 2.750,
                "modifiers": [],
                "special_instructions": "",
                "subtotal": 2.750
            }
        ],
        "subtotal": 5.500,
        "delivery_fee": 0.000,  # Free delivery from this branch
        "discount_amount": 0.000,
        "coupon_code": None,
        "loyalty_points_used": 0,
        "total": 5.500,
        "payment_method": "cash",
        "notes": "Test order with correct branch ID"
    }
    
    print("🔍 Testing Order Creation with Correct Branch ID...")
    response = requests.post(f"{base_url}/api/orders", json=order_data, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Order created successfully!")
        print(f"   Order Number: {result['order']['order_number']}")
        print(f"   Total: {result['order']['total']} KWD")
        print(f"   Status: {result['order']['status']}")
        return True
    else:
        print(f"❌ Order creation failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False

def test_coupon_with_different_amounts():
    """Test coupon validation with different amounts"""
    base_url = "https://kuwaitburgers.preview.emergentagent.com"
    
    test_cases = [
        {"subtotal": 5.000, "expected_discount": 0.5},   # 10% of 5 = 0.5
        {"subtotal": 10.000, "expected_discount": 1.0},  # 10% of 10 = 1.0
        {"subtotal": 25.000, "expected_discount": 2.0},  # 10% of 25 = 2.5, but max is 2.0
    ]
    
    print("\n🔍 Testing Coupon Validation with Different Amounts...")
    
    for i, case in enumerate(test_cases, 1):
        coupon_data = {
            "code": "WELCOME10",
            "subtotal": case["subtotal"]
        }
        
        response = requests.post(f"{base_url}/api/coupons/validate", json=coupon_data)
        
        if response.status_code == 200:
            result = response.json()
            actual_discount = result.get('discount', 0)
            expected_discount = case["expected_discount"]
            
            if abs(actual_discount - expected_discount) < 0.01:
                print(f"✅ Test {i}: Subtotal {case['subtotal']} KWD → Discount {actual_discount} KWD")
            else:
                print(f"❌ Test {i}: Expected {expected_discount}, got {actual_discount}")
        else:
            print(f"❌ Test {i}: Failed with status {response.status_code}")

if __name__ == "__main__":
    print("🍔 Additional BAM Burgers API Tests")
    print("=" * 50)
    
    # Test order creation with correct branch ID
    test_order_with_correct_branch()
    
    # Test coupon validation edge cases
    test_coupon_with_different_amounts()
    
    print("\n✅ Additional tests completed!")