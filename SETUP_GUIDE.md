# Setup Guide: Nginx Proxy with Base Path

## สถาปัตยกรรม

```
Internet
   ↓
Nginx Proxy (Port 80/443)
   ├─ /backoffice → Backend Admin (Port 5173)
   └─ / → Client Frontend (Port 3000)
```

## ขั้นตอนการ Setup

### 1. แก้ไขไฟล์ที่เกี่ยวข้อง

#### `vite.config.ts`
- เพิ่ม `base: '/backoffice'` เพื่อให้ Vite build ด้วย base path

#### `Dockerfile`
- เปลี่ยน port จาก 80 เป็น 5173
- Backend admin จะ serve ที่ root path `/` ภายใน container

#### `nginx-proxy.conf`
- Proxy `/backoffice` → `http://backend-admin:5173/backoffice`
- Proxy `/` → `http://client-frontend:3000`

### 2. Cloudflare Setup

เนื่องจากใช้ Cloudflare Free:
- Cloudflare จะจัดการ SSL/TLS termination
- Nginx proxy รับ HTTP (port 80) จาก Cloudflare
- ไม่ต้องมี SSL certificates บน server

**Cloudflare Settings:**
- SSL/TLS mode: **Flexible** หรือ **Full** (แนะนำ Full)
- Proxy status: **Proxied** (สีส้ม)
- Auto HTTPS Rewrites: **On**

### 3. แก้ไข docker-compose.yml

ใช้ไฟล์ `docker-compose.new.yml` เป็น template หรือแก้ไข `docker-compose.yml` เดิม:

```yaml
services:
  nginx-proxy:
    # ... (ดู docker-compose.new.yml)
  
  backend-admin:
    expose:
      - '5173'  # ไม่ต้อง expose port ไปยัง host
    # ...
  
  client-frontend:
    # ... (client frontend ของคุณ)
```

### 4. Build และ Deploy

```bash
# Build backend admin
docker-compose build backend-admin

# Start all services
docker-compose up -d

# ตรวจสอบ logs
docker-compose logs -f nginx-proxy
docker-compose logs -f backend-admin
```

### 5. ตรวจสอบ

- Backend Admin: `https://shonra.com/backoffice`
- Client Frontend: `https://shonra.com/`
- API: `https://api.shonra.com/api/...`

## หมายเหตุสำคัญ

1. **Base Path**: Vite จะ build ด้วย base path `/backoffice` ดังนั้น:
   - HTML จะ reference assets เป็น `/backoffice/assets/...`
   - Nginx proxy ต้อง forward `/backoffice/assets` ไปยัง backend-admin

2. **API Calls**: API calls จะยังใช้ `https://api.shonra.com` ตามปกติ (ไม่ต้องแก้)

3. **Client Frontend**: ต้องแน่ใจว่า client frontend serve ที่ port 3000 และรองรับ root path `/`

4. **Cloudflare**: ใช้ Cloudflare Free สำหรับ SSL/TLS termination ไม่ต้องมี certificates บน server

## Troubleshooting

### รูปภาพไม่แสดง
- ตรวจสอบว่า `VITE_API_URL` ใน `stack.env` เป็น `https://api.shonra.com`
- Rebuild Docker image ใหม่

### 404 Not Found
- ตรวจสอบ nginx logs: `docker-compose logs nginx-proxy`
- ตรวจสอบว่า base path ถูกต้องใน `vite.config.ts`

### Static Assets ไม่โหลด
- ตรวจสอบ network tab ใน browser console
- ตรวจสอบว่า path เป็น `/backoffice/assets/...` ไม่ใช่ `/assets/...`

