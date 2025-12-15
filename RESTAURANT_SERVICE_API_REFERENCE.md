# Restaurant Service - Complete API Reference

## Base URL
```
http://localhost:3000/restaurants
```

---

## 📚 Endpoints Summary

| Method | Endpoint | Purpose | Cache |
|--------|----------|---------|-------|
| GET | `/` | List all restaurants | 1 hour |
| GET | `/:id` | Get single restaurant | 2 hours |
| GET | `/:id/menu` | Get restaurant menu | 1 hour |
| POST | `/` | Create restaurant | ❌ |
| GET | `/certified` | List certified restaurants | 30 min |
| POST | `/:id/certifications` | Add certification | ❌ |
| GET | `/:id/certifications` | Get certifications | 2 hours |
| DELETE | `/:id/certifications/:certId` | Revoke certification | ❌ |

---

# ENDPOINTS DETAIL

## 1️⃣ GET `/` - List All Restaurants

### Request
```bash
GET /restaurants?city=NewYork&limit=10&page=1
```

### Query Parameters
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| city | string | ❌ | all | Filter by city |
| limit | number | ❌ | 10 | Items per page |
| page | number | ❌ | 1 | Page number |

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "_id": "uuid-1",
      "name": "Taj Mahal",
      "city": "NewYork",
      "address": "123 Food St",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "phoneNumber": "9876543210",
      "email": "taj@restaurant.com",
      "ownerUserId": "owner-uuid",
      "rating": 4.5,
      "isActive": true,
      "healthScore": 92,
      "isCertified": true,
      "certificationLevel": "GOLD",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "cached": false
}
```

### Response (500 Error)
```json
{
  "success": false,
  "error": "Failed to fetch restaurants"
}
```

---

## 2️⃣ GET `/:id` - Get Single Restaurant

### Request
```bash
GET /restaurants/uuid-1
```

### Path Parameters
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | ✅ | Restaurant UUID |

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "_id": "uuid-1",
    "name": "Taj Mahal",
    "city": "NewYork",
    "address": "123 Food St",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "phoneNumber": "9876543210",
    "email": "taj@restaurant.com",
    "ownerUserId": "owner-uuid",
    "rating": 4.5,
    "isActive": true,
    "healthScore": 92,
    "isCertified": true,
    "certificationLevel": "GOLD",
    "lastInspectionDate": "2025-01-15T00:00:00Z",
    "certifications": ["cert-uuid-1", "cert-uuid-2"],
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  },
  "cached": true
}
```

### Response (404 Not Found)
```json
{
  "success": false,
  "error": "Restaurant not found"
}
```

---

## 3️⃣ GET `/:id/menu` - Get Restaurant Menu

### Request
```bash
GET /restaurants/uuid-1/menu
```

### Path Parameters
| Param | Type | Required |
|-------|------|----------|
| id | string | ✅ |

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "_id": "menu-uuid-1",
      "restaurantId": "uuid-1",
      "name": "Butter Chicken",
      "description": "Creamy chicken curry with spices",
      "price": 12.99,
      "category": "Main Course",
      "isAvailable": true,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    },
    {
      "_id": "menu-uuid-2",
      "restaurantId": "uuid-1",
      "name": "Naan",
      "description": "Indian bread",
      "price": 3.99,
      "category": "Bread",
      "isAvailable": true,
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "cached": true
}
```

---

## 4️⃣ POST `/` - Create Restaurant

### Request
```bash
POST /restaurants
Content-Type: application/json

{
  "name": "Taj Mahal",
  "city": "NewYork",
  "address": "123 Food St",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "phoneNumber": "9876543210",
  "email": "taj@restaurant.com",
  "ownerUserId": "owner-uuid"
}
```

### Body Parameters
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | ✅ | Restaurant name |
| city | string | ✅ | City location |
| address | string | ✅ | Full address |
| latitude | number | ❌ | GPS coordinate |
| longitude | number | ❌ | GPS coordinate |
| phoneNumber | string | ❌ | Contact number |
| email | string | ✅ | Unique email |
| ownerUserId | string | ✅ | User ID from auth service |

### Response (201 Created)
```json
{
  "success": true,
  "message": "Restaurant created successfully",
  "data": {
    "_id": "uuid-1",
    "name": "Taj Mahal",
    "city": "NewYork",
    "address": "123 Food St",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "phoneNumber": "9876543210",
    "email": "taj@restaurant.com",
    "ownerUserId": "owner-uuid",
    "rating": 0,
    "isActive": true,
    "healthScore": 0,
    "isCertified": false,
    "certificationLevel": "NONE",
    "certifications": [],
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  }
}
```

### Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

---

## 5️⃣ GET `/certified` - List Certified Healthy Restaurants

### Request
```bash
GET /restaurants/certified?city=NewYork&minHealthScore=80&limit=20&page=1
```

### Query Parameters
| Param | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| city | string | ❌ | all | Filter by city |
| minHealthScore | number | ❌ | 70 | Minimum health score |
| limit | number | ❌ | 10 | Items per page |
| page | number | ❌ | 1 | Page number |

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "_id": "uuid-1",
      "name": "Taj Mahal",
      "city": "NewYork",
      "healthScore": 92,
      "isCertified": true,
      "certificationLevel": "GOLD",
      "rating": 4.8,
      "isActive": true
    },
    {
      "_id": "uuid-2",
      "name": "Healthy Bistro",
      "city": "NewYork",
      "healthScore": 85,
      "isCertified": true,
      "certificationLevel": "SILVER",
      "rating": 4.6,
      "isActive": true
    }
  ],
  "count": 2,
  "cached": true
}
```

**Note:** Only shows restaurants with `isCertified: true` and `healthScore >= minHealthScore`

---

## 6️⃣ POST `/:id/certifications` - Add Certification

### Request
```bash
POST /restaurants/uuid-1/certifications
Content-Type: application/json

{
  "certificationName": "MICHELIN_STAR",
  "certificationLevel": "GOLD",
  "certificationBody": "Michelin Guide",
  "score": 90,
  "certificationDate": "2025-01-15T00:00:00Z",
  "expiryDate": "2026-01-15T00:00:00Z",
  "inspectionDetails": {
    "hygiene": 95,
    "foodQuality": 92,
    "nutritionValue": 88,
    "sanitation": 90
  },
  "verificationUrl": "https://guide.michelin.com/restaurants/taj-mahal"
}
```

### Body Parameters
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| certificationName | string | ✅ | See certification types |
| certificationLevel | string | ✅ | GOLD/SILVER/BRONZE/CERTIFIED |
| certificationBody | string | ✅ | Authority name (e.g., "Michelin Guide") |
| score | number | ✅ | 0-100 |
| certificationDate | date | ❌ | Default: now |
| expiryDate | date | ✅ | Expiration date |
| inspectionDetails | object | ❌ | Detailed scores |
| verificationUrl | string | ❌ | Link to verify |

### Certification Types
```
MICHELIN_STAR
FSSAI_GRADE
ORGANIC_CERTIFIED
HEALTHYEATING_VERIFIED
HYGIENE_CERTIFIED
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "Certification added and health score updated",
  "data": {
    "certification": {
      "_id": "cert-uuid-1",
      "restaurantId": "uuid-1",
      "certificationName": "MICHELIN_STAR",
      "certificationLevel": "GOLD",
      "certificationBody": "Michelin Guide",
      "score": 90,
      "expiryDate": "2026-01-15T00:00:00Z",
      "isActive": true,
      "verificationUrl": "https://guide.michelin.com/restaurants/taj-mahal"
    },
    "restaurant": {
      "_id": "uuid-1",
      "healthScore": 90,
      "isCertified": true,
      "certificationLevel": "GOLD",
      "lastInspectionDate": "2025-01-15T10:00:00Z"
    },
    "healthScore": 90,
    "certificationLevel": "GOLD"
  }
}
```

### Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Missing required certification fields"
}
```

### Response (404 Not Found)
```json
{
  "success": false,
  "error": "Restaurant not found"
}
```

---

## 7️⃣ GET `/:id/certifications` - Get Restaurant Certifications

### Request
```bash
GET /restaurants/uuid-1/certifications
```

### Path Parameters
| Param | Type | Required |
|-------|------|----------|
| id | string | ✅ |

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "_id": "cert-uuid-1",
      "restaurantId": "uuid-1",
      "certificationName": "MICHELIN_STAR",
      "certificationLevel": "GOLD",
      "certificationBody": "Michelin Guide",
      "score": 90,
      "certificationDate": "2025-01-15T00:00:00Z",
      "expiryDate": "2026-01-15T00:00:00Z",
      "isActive": true,
      "verificationUrl": "https://guide.michelin.com/restaurants/taj-mahal",
      "inspectionDetails": {
        "hygiene": 95,
        "foodQuality": 92,
        "nutritionValue": 88,
        "sanitation": 90
      },
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z"
    },
    {
      "_id": "cert-uuid-2",
      "restaurantId": "uuid-1",
      "certificationName": "FSSAI_GRADE",
      "certificationLevel": "GOLD",
      "certificationBody": "FSSAI",
      "score": 100,
      "expiryDate": "2026-06-15T00:00:00Z",
      "isActive": true
    }
  ],
  "count": 2,
  "cached": true
}
```

---

## 8️⃣ DELETE `/:id/certifications/:certId` - Revoke Certification

### Request
```bash
DELETE /restaurants/uuid-1/certifications/cert-uuid-1
```

### Path Parameters
| Param | Type | Required |
|-------|------|----------|
| id | string | ✅ |
| certId | string | ✅ |

### Response (200 OK)
```json
{
  "success": true,
  "message": "Certification revoked",
  "data": {
    "restaurant": {
      "_id": "uuid-1",
      "healthScore": 100,
      "isCertified": true,
      "certificationLevel": "GOLD",
      "certifications": ["cert-uuid-2"]
    },
    "healthScore": 100
  }
}
```

### Response (404 Not Found)
```json
{
  "success": false,
  "error": "Certification not found"
}
```

---

# 🧪 Testing with cURL

## Create Restaurant
```bash
curl -X POST http://localhost:3000/restaurants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Taj Mahal",
    "city": "NewYork",
    "address": "123 Food St",
    "email": "taj@test.com",
    "ownerUserId": "owner-1",
    "phoneNumber": "9876543210",
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

## Add Certification
```bash
curl -X POST http://localhost:3000/restaurants/UUID/certifications \
  -H "Content-Type: application/json" \
  -d '{
    "certificationName": "MICHELIN_STAR",
    "certificationBody": "Michelin Guide",
    "score": 90,
    "expiryDate": "2026-01-15T00:00:00Z"
  }'
```

## Get Certified Restaurants
```bash
curl "http://localhost:3000/restaurants/certified?city=NewYork&minHealthScore=80"
```

## Get All Restaurants
```bash
curl "http://localhost:3000/restaurants?city=NewYork&limit=10&page=1"
```

---

# ✅ Status Codes Reference

| Code | Meaning | Scenario |
|------|---------|----------|
| 200 | OK | Successful GET/DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Missing required fields |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Database/server error |

---

# 📊 Response Format

All responses follow this structure:

```json
{
  "success": true/false,
  "data": {},
  "error": "error message (if applicable)",
  "message": "success message (if applicable)",
  "cached": true/false,
  "count": number
}
```

---

**API Reference Complete! 🎉**

For more details, see:
- [Phase 1 Implementation](PHASE_1_IMPLEMENTATION.md) - Caching & Indexes
- [Phase 2 Implementation](PHASE_2_IMPLEMENTATION.md) - Certifications
- [Phase 2 Quick Reference](PHASE_2_QUICK_REFERENCE.md) - Quick start
