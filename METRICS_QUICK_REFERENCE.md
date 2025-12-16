# Metrics API - Quick Reference Guide

## 🚀 Quick Start

### Base URL
```
http://localhost:3002/metrics
```

### Common Parameters
```
city=bangalore (required for most endpoints)
limit=10 (optional, for list endpoints)
```

---

## 📊 10 Core Metrics Endpoints

### 1️⃣ Customer Spending
```bash
GET /metrics/customer/{customerId}/spending?city=bangalore
```
**Returns:** Total spent, order count, average order value, trend
**Use:** Show on profile, loyalty dashboard

---

### 2️⃣ Most Eaten Dishes
```bash
GET /metrics/popular/dishes?city=bangalore&limit=10
```
**Returns:** Top dishes by order count, revenue, popularity
**Use:** Homepage trending section

---

### 3️⃣ Most Liked Dishes
```bash
GET /metrics/liked/dishes?city=bangalore&limit=10
```
**Returns:** Highest-rated dishes, like %, reviews
**Use:** "Loved by customers" section

---

### 4️⃣ Favorite Restaurants
```bash
GET /metrics/customer/{customerId}/favorites?city=bangalore
```
**Returns:** Top 5 restaurants, order count, spending
**Use:** Quick reorder, personalized home

---

### 5️⃣ Ordering Frequency
```bash
GET /metrics/customer/{customerId}/frequency?city=bangalore
```
**Returns:** Total orders, this month/week, loyalty tier
**Use:** Loyalty badge, engagement tracking

---

### 6️⃣ Cancellations
```bash
GET /metrics/customer/{customerId}/cancellations?city=bangalore
```
**Returns:** Cancel count, rate, reasons, refunds
**Use:** Problem identification, customer support

---

### 7️⃣ City Analytics
```bash
GET /metrics/city/{city}/analytics
```
**Returns:** Daily/monthly orders, revenue, trends
**Use:** Admin dashboard, market analysis

---

### 8️⃣ Spending Trends
```bash
GET /metrics/customer/{customerId}/trends?city=bangalore
```
**Returns:** Monthly data, growth direction
**Use:** Show progress chart, milestones

---

### 9️⃣ Restaurant Performance
```bash
GET /metrics/restaurant/{restaurantId}/performance?city=bangalore
```
**Returns:** Revenue, orders, ratings, delivery time
**Use:** Partner dashboard, KPIs

---

### 🔟 Recommendations
```bash
GET /metrics/customer/{customerId}/recommendations?city=bangalore
```
**Returns:** Top restaurants, suggestions, eligibility
**Use:** Personalized suggestions, next actions

---

## 💡 Usage Examples

### Show Customer Dashboard
```typescript
const spending = await fetch(`/metrics/customer/cust-001/spending?city=bangalore`);
const frequency = await fetch(`/metrics/customer/cust-001/frequency?city=bangalore`);
const trends = await fetch(`/metrics/customer/cust-001/trends?city=bangalore`);

// Display all metrics on dashboard
```

### Trending Section
```typescript
const popular = await fetch(`/metrics/popular/dishes?city=bangalore&limit=5`);
// Show top 5 most eaten dishes with badges
```

### Loyalty System
```typescript
const frequency = await fetch(`/metrics/customer/cust-001/frequency?city=bangalore`);
if (frequency.loyaltyTier === 'GOLD') {
  // Show gold benefits
  // Apply gold discounts
}
```

### Personalization
```typescript
const favorites = await fetch(`/metrics/customer/cust-001/favorites?city=bangalore`);
// Pin favorite restaurants to top
// Show personalized recommendations
```

### Quality Monitoring
```typescript
const restaurant = await fetch(`/metrics/restaurant/rest-001/performance?city=bangalore`);
if (restaurant.cancellationRate > 5) {
  // Flag for manual review
  // Send alert to management
}
```

---

## 📱 Frontend Integration

### React Component Example
```typescript
function CustomerMetrics({ customerId, city }) {
  const [spending, setSpending] = useState(null);
  const [frequency, setFrequency] = useState(null);
  
  useEffect(() => {
    // Fetch spending metrics
    fetch(`/metrics/customer/${customerId}/spending?city=${city}`)
      .then(r => r.json())
      .then(d => setSpending(d.data));
    
    // Fetch frequency metrics
    fetch(`/metrics/customer/${customerId}/frequency?city=${city}`)
      .then(r => r.json())
      .then(d => setFrequency(d.data));
  }, [customerId, city]);
  
  return (
    <div>
      <h2>Your Stats</h2>
      <p>Total Spent: ₹{spending?.totalSpent}</p>
      <p>Orders: {spending?.totalOrders}</p>
      <p>Loyalty: {frequency?.loyaltyTier}</p>
    </div>
  );
}
```

---

## 🎯 UX Improvements

### Homepage Enhancements
```
┌─────────────────────────────┐
│ Welcome, Darshan!           │
│ 🏆 SILVER Member           │
├─────────────────────────────┤
│ 🔥 Trending Today           │
│ • Butter Chicken (95% liked)│
│ • Biryani (342 orders)      │
├─────────────────────────────┤
│ ⭐ Your Favorites           │
│ • Haldiram's               │
│ • Domino's                 │
│ • Bikanervala              │
└─────────────────────────────┘
```

### Profile Dashboard
```
┌─────────────────────────────┐
│ Your Profile                │
├─────────────────────────────┤
│ Total Spent: ₹2,450         │
│ Orders: 24                  │
│ Avg Order: ₹204             │
│ Last Order: 2 days ago      │
│ Frequency: Regular          │
│ Cancellations: 2 (8.3%)     │
└─────────────────────────────┘
```

### Loyalty Badge
```
BRONZE    (0-20 orders)   → 5% cashback
SILVER    (21-50 orders)  → 10% cashback + free delivery
GOLD      (51-100 orders) → 15% cashback + priority support
PLATINUM  (100+ orders)   → 20% cashback + VIP perks
```

### Quick Stats Widget
```
Total Spent    Most Ordered    Favorites    Loyalty Tier
  ₹2,450    →  Butter Chicken    5 rest.   →  SILVER 🏆
```

---

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // metric specific data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "City parameter required"
}
```

---

## ⚡ Performance Tips

### Caching
- Cache metrics for 1 hour
- Invalidate on new order
- Real-time updates via WebSocket

### Batch Requests
```typescript
// Load multiple metrics in parallel
const [spending, frequency, favorites] = await Promise.all([
  fetch(`/metrics/customer/${id}/spending?city=${city}`),
  fetch(`/metrics/customer/${id}/frequency?city=${city}`),
  fetch(`/metrics/customer/${id}/favorites?city=${city}`),
]);
```

### Pagination
```typescript
// Popular dishes with limit
GET /metrics/popular/dishes?city=bangalore&limit=5
```

---

## 🔍 Debugging

### Check Spending
```bash
curl "http://localhost:3002/metrics/customer/cust-001/spending?city=bangalore"
```

### Check Popularity
```bash
curl "http://localhost:3002/metrics/popular/dishes?city=bangalore"
```

### Check Favorites
```bash
curl "http://localhost:3002/metrics/customer/cust-001/favorites?city=bangalore"
```

### Pretty Print
```bash
curl "..." | jq .
```

---

## 🚀 Deployment Checklist

- [ ] Add metrics models to database
- [ ] Run migrations: `npx prisma migrate dev`
- [ ] Deploy updated order-service
- [ ] Test all endpoints with real data
- [ ] Enable caching
- [ ] Set up monitoring
- [ ] Document in API docs
- [ ] Update mobile app UI

---

## 📈 Analytics Dashboard

**Real-time Metrics:**
- Active users
- Orders today
- Revenue today
- Trending items

**Customer Insights:**
- Top customers (by spending)
- New customers
- At-risk customers
- Loyal customers

**Business Metrics:**
- Daily/monthly revenue
- Average order value
- Cancellation rate
- Popular restaurants

---

## 🎨 UI Components

### Spending Summary Card
```typescript
<SummaryCard>
  <Title>Total Spent</Title>
  <Amount>₹{spending.totalSpent}</Amount>
  <Subtitle>{spending.totalOrders} orders</Subtitle>
  <Trend direction={spending.spendingTrend}>
    Growing 📈
  </Trend>
</SummaryCard>
```

### Loyalty Badge
```typescript
<LoyaltyBadge tier={frequency.loyaltyTier}>
  {frequency.loyaltyTier} Member
  <Progress value={ordersToNextTier} max={ordersPerTier} />
</LoyaltyBadge>
```

### Trending Dishes
```typescript
<TrendingList>
  {popularDishes.map(dish => (
    <DishCard key={dish.name}>
      <Name>{dish.name}</Name>
      <Orders>{dish.orders} orders</Orders>
      <Badge popularity={dish.popularity} />
    </DishCard>
  ))}
</TrendingList>
```

---

## 🔔 Notifications

### Milestone Alerts
```
"🎉 Congratulations! You've spent ₹1000 on Instant-Eats!"
```

### Tier Upgrades
```
"🏆 You've reached SILVER status! Enjoy 10% cashback."
```

### New Recommendations
```
"✨ Based on your orders, try Italian Corner - you'll love it!"
```

### Trending Alerts
```
"🔥 Butter Chicken is trending! Check it out."
```

---

## 📞 Support

**Documentation:** [METRICS_API_DOCUMENTATION.md](../METRICS_API_DOCUMENTATION.md)

**Issues:** Report in GitHub issues

**Status:** ✅ Production Ready

---

*Created: January 2024*
