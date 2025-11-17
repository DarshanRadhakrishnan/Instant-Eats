# 🚀 GET STARTED - Quick Start Guide

> **⏱️ 5-minute setup. No experience needed.**

---

## Step 1: Prerequisites Check (1 minute)

You need:
- ✅ Docker installed ([Get it here](https://www.docker.com/products/docker-desktop))
- ✅ Code editor (VS Code recommended)
- ✅ Terminal/Command Prompt
- ✅ Internet connection

**Verify Docker is installed:**

```bash
docker --version
docker-compose --version
```

Should show version numbers. If not, install Docker first.

---

## Step 2: Start Everything (2 minutes)

### **Windows:**
```bash
cd instant-eats
.\start.bat
```

### **Mac/Linux:**
```bash
cd instant-eats
./start.sh
```

### **Manual (any OS):**
```bash
cd instant-eats
docker-compose up -d
```

**What's happening?**
- Docker downloading images (~5 min first time)
- Starting 13 containers (databases, services, frontend)
- All services initializing

**Wait for completion message:**
```
🎉 Instant Eats Platform is starting!
```

---

## Step 3: Verify Everything Works (1 minute)

Open terminal and run:

```bash
# Check if services are healthy
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
```

Should see `{"status":"healthy",...}` for each service.

---

## Step 4: Access the Services (1 minute)

Open in browser:

| Service | URL |
|---------|-----|
| **API** | http://localhost:3000 |
| **Frontend** | http://localhost:5173 |
| **Nginx** | http://localhost |
| **RabbitMQ** | http://localhost:15672 |

---

## Step 5: Try Your First API Call (0 minutes)

### Register a User:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "role": "customer",
    "city": "san-francisco"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "...",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

### Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "city": "san-francisco"
  }'
```

Expected response includes JWT token:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "...",
    "email": "user@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Copy this token! You'll need it for other requests.**

---

## Next Steps

### 📚 Learn the System
1. Read **[README.md](README.md)** - Architecture overview
2. Read **[DEVELOPER_CHECKLIST.md](DEVELOPER_CHECKLIST.md)** - API examples
3. Check **[FILE_INDEX.md](FILE_INDEX.md)** - Navigate all files

### 🔧 View Logs
```bash
# See all service logs
docker-compose logs -f

# See specific service logs
docker-compose logs -f order-service
```

### 🛑 Stop Services
```bash
docker-compose down
```

### 🔄 Restart Services
```bash
docker-compose restart
```

### 🧹 Start Fresh
```bash
docker-compose down -v
docker-compose up -d
```

---

## Common First Issues

### "Port already in use"
```bash
# Stop other Docker containers or change port in docker-compose.yml
docker stop <container-id>
```

### "Database connection failed"
```bash
# Wait 30 seconds for databases to initialize
sleep 30
docker-compose ps  # Check all are running
```

### "Cannot connect to Docker daemon"
```bash
# Restart Docker Desktop or the Docker service
# On Mac: Click Docker icon → Restart
# On Windows: Services → Restart Docker
```

### "RabbitMQ not responding"
```bash
# Wait 15 seconds and try again
docker-compose restart rabbitmq
```

---

## 🎯 What You Have

✅ **7 Microservices** - All running and communicating
✅ **3 Database Shards** - PostgreSQL distributed by region
✅ **MongoDB** - For restaurant data
✅ **Redis** - For caching and real-time data
✅ **RabbitMQ** - For event streaming
✅ **Load Balancer** - Nginx handling traffic
✅ **Frontend** - React app ready for customization

---

## 💡 Pro Tips

### Use Postman or Insomnia
Download API testing tool for easier request management:
- [Postman](https://www.postman.com)
- [Insomnia](https://insomnia.rest)

Import the endpoints from **DEVELOPER_CHECKLIST.md**

### Monitor Services in Real-Time
```bash
# Watch Docker resource usage
docker stats
```

### Access Databases Directly

**PostgreSQL Shard A:**
```bash
psql postgresql://postgres:postgres@localhost:5432/shard_a
```

**MongoDB:**
```bash
mongo "mongodb://root:mongodb@localhost:27017/restaurants?authSource=admin"
```

**Redis:**
```bash
redis-cli -h localhost -p 6379
```

---

## 📖 Documentation Structure

```
Quick Start (this file)
    ↓
README.md (What is this?)
    ↓
SETUP_GUIDE.md (How to run it?)
    ↓
DEVELOPER_CHECKLIST.md (How to build with it?)
    ↓
IMPLEMENTATION_NOTES.md (How does it work internally?)
    ↓
FILE_INDEX.md (Where is what?)
```

---

## 🎓 Learning Path

**Day 1: Explore**
- [ ] Run the system
- [ ] Make test API calls
- [ ] Browse RabbitMQ management UI

**Day 2: Understand**
- [ ] Read README.md
- [ ] Read IMPLEMENTATION_NOTES.md
- [ ] Map out the architecture

**Day 3: Code**
- [ ] Follow DEVELOPER_CHECKLIST.md
- [ ] Add a new API endpoint
- [ ] Test it end-to-end

**Week 2: Build**
- [ ] Implement business logic
- [ ] Add validation
- [ ] Add tests

---

## 🚨 Emergency Help

### Services won't start?
```bash
# Clean slate
docker-compose down -v
docker-compose up -d
```

### Need to see everything?
```bash
# Very detailed logs
docker-compose logs --follow --timestamps
```

### Still stuck?
1. Check **DEVELOPER_CHECKLIST.md** → Troubleshooting section
2. Check service logs: `docker-compose logs service-name`
3. Verify Docker Desktop is running
4. Try restarting Docker

---

## ✨ Success Checklist

When you see these, you're good:
- [x] All services showing "healthy" on /health endpoints
- [x] RabbitMQ management accessible at localhost:15672
- [x] Can register and login users
- [x] Docker ps shows 13 containers running

---

## 🎉 Ready?

```bash
# You're ready when you can run this:
curl http://localhost:3000/health
```

And see:
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

---

## 📞 What's Next?

→ **Read [README.md](README.md)** to understand the system

→ **Read [DEVELOPER_CHECKLIST.md](DEVELOPER_CHECKLIST.md)** for API examples

→ **Explore [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md)** for deep dive

→ **Start building!** 🚀

---

**Generated:** November 15, 2025
**Project:** Instant Eats - Real-Time Food Delivery System
**Estimated Setup Time:** 5 minutes (first run may take longer for image download)
