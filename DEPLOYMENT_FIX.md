# แก้ไข Deployment Error

## ปัญหา
```
error mounting "/data/compose/32/nginx-proxy.conf" to rootfs at "/etc/nginx/conf.d/default.conf": 
not a directory: Are you trying to mount a directory onto a file (or vice-versa)?
```

## สาเหตุ
- ไฟล์ `nginx-proxy.conf` ไม่มีอยู่บน production server
- หรือ path ไม่ถูกต้อง (relative path `./nginx-proxy.conf` ไม่ทำงาน)

## วิธีแก้ไข

### วิธีที่ 1: สร้าง Docker Image สำหรับ Nginx (แนะนำ) ✅

ใช้ `Dockerfile.nginx-proxy` ที่สร้างไว้แล้ว:

```bash
# Build nginx-proxy image
docker-compose -f docker-compose.new.yml build nginx-proxy

# Deploy
docker-compose -f docker-compose.new.yml up -d
```

**ข้อดี:**
- ไม่ต้องมีไฟล์บน server
- Config ถูก embed ใน Docker image
- Deploy ง่ายขึ้น

### วิธีที่ 2: อัพโหลดไฟล์ nginx-proxy.conf ไปยัง server

1. อัพโหลด `nginx-proxy.conf` ไปยัง server (ใน directory เดียวกับ docker-compose.new.yml)
2. ตรวจสอบว่าไฟล์มีอยู่:
   ```bash
   ls -la nginx-proxy.conf
   ```
3. Deploy:
   ```bash
   docker-compose -f docker-compose.new.yml up -d
   ```

### วิธีที่ 3: ใช้ Absolute Path

แก้ไข `docker-compose.new.yml`:
```yaml
volumes:
  - /absolute/path/to/nginx-proxy.conf:/etc/nginx/conf.d/default.conf:ro
```

## ขั้นตอนการ Deploy

1. **อัพโหลดไฟล์ทั้งหมดไปยัง server:**
   - `docker-compose.new.yml`
   - `Dockerfile.nginx-proxy`
   - `nginx-proxy.conf`
   - `Dockerfile` (สำหรับ backend-admin)
   - `stack.env`

2. **Build images:**
   ```bash
   docker-compose -f docker-compose.new.yml build
   ```

3. **Deploy:**
   ```bash
   docker-compose -f docker-compose.new.yml up -d
   ```

4. **ตรวจสอบ logs:**
   ```bash
   docker-compose -f docker-compose.new.yml logs -f nginx-proxy
   docker-compose -f docker-compose.new.yml logs -f backend-admin
   ```

## ตรวจสอบ

```bash
# ตรวจสอบ containers
docker-compose -f docker-compose.new.yml ps

# ตรวจสอบ nginx config
docker-compose -f docker-compose.new.yml exec nginx-proxy nginx -t

# ตรวจสอบ network
docker network ls | grep shonra
```

