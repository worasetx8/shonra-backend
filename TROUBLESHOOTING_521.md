# แก้ไข Error 521 - Web server is down

## ปัญหา
Error 521 จาก Cloudflare = Cloudflare ไม่สามารถเชื่อมต่อกับ origin server ได้

## สาเหตุที่เป็นไปได้

### 1. Nginx Proxy Container ไม่ได้รัน
### 2. Port 80 ไม่ได้เปิดหรือถูก block
### 3. Firewall block port 80
### 4. Docker network ไม่ถูกต้อง
### 5. Nginx config มีปัญหา

## วิธีแก้ไข

### ขั้นตอนที่ 1: ตรวจสอบ Containers

```bash
# ตรวจสอบว่า containers รันอยู่หรือไม่
docker-compose -f docker-compose.new.yml ps

# ควรเห็น:
# - shonra-nginx-proxy (running)
# - shonra-backend-admin (running)
```

### ขั้นตอนที่ 2: ตรวจสอบ Logs

```bash
# ดู logs ของ nginx-proxy
docker-compose -f docker-compose.new.yml logs nginx-proxy

# ดู logs ของ backend-admin
docker-compose -f docker-compose.new.yml logs backend-admin
```

### ขั้นตอนที่ 3: ตรวจสอบ Port 80

```bash
# ตรวจสอบว่า port 80 เปิดอยู่หรือไม่
netstat -tlnp | grep :80
# หรือ
ss -tlnp | grep :80

# ตรวจสอบว่า nginx-proxy ฟัง port 80
docker-compose -f docker-compose.new.yml exec nginx-proxy netstat -tlnp
```

### ขั้นตอนที่ 4: ตรวจสอบ Nginx Config

```bash
# ตรวจสอบ nginx config
docker-compose -f docker-compose.new.yml exec nginx-proxy nginx -t

# ควรเห็น:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### ขั้นตอนที่ 5: ตรวจสอบ Network

```bash
# ตรวจสอบว่า containers อยู่ใน network เดียวกัน
docker network inspect shonra-network

# ตรวจสอบว่า nginx-proxy สามารถเข้าถึง backend-admin ได้
docker-compose -f docker-compose.new.yml exec nginx-proxy wget -O- http://backend-admin:5173/backoffice
```

### ขั้นตอนที่ 6: ตรวจสอบ Firewall

```bash
# ตรวจสอบ firewall (Ubuntu/Debian)
sudo ufw status

# ถ้า port 80 ถูก block ให้เปิด:
sudo ufw allow 80/tcp

# ตรวจสอบ firewall (CentOS/RHEL)
sudo firewall-cmd --list-all

# ถ้า port 80 ถูก block ให้เปิด:
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

### ขั้นตอนที่ 7: ทดสอบจาก Server โดยตรง

```bash
# ทดสอบว่า nginx-proxy ทำงาน
curl http://localhost/backoffice

# ทดสอบว่า backend-admin ทำงาน
curl http://localhost:5173/backoffice

# ทดสอบจาก nginx-proxy ไปยัง backend-admin
docker-compose -f docker-compose.new.yml exec nginx-proxy curl http://backend-admin:5173/backoffice
```

## วิธีแก้ไขที่พบบ่อย

### ปัญหา 1: Container ไม่ได้รัน

```bash
# Start containers
docker-compose -f docker-compose.new.yml up -d

# ตรวจสอบ
docker-compose -f docker-compose.new.yml ps
```

### ปัญหา 2: Port 80 ถูก block

```bash
# เปิด port 80
sudo ufw allow 80/tcp

# หรือ
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

### ปัญหา 3: Nginx Config มีปัญหา

```bash
# Rebuild nginx-proxy
docker-compose -f docker-compose.new.yml build nginx-proxy

# Restart
docker-compose -f docker-compose.new.yml up -d nginx-proxy
```

### ปัญหา 4: Docker Network ไม่ถูกต้อง

```bash
# Recreate network
docker-compose -f docker-compose.new.yml down
docker-compose -f docker-compose.new.yml up -d
```

## Checklist

- [ ] Containers รันอยู่ (nginx-proxy, backend-admin)
- [ ] Port 80 เปิดและไม่ถูก block
- [ ] Nginx config ไม่มี error
- [ ] Containers อยู่ใน network เดียวกัน
- [ ] nginx-proxy สามารถเข้าถึง backend-admin ได้
- [ ] Firewall อนุญาต port 80

## ตรวจสอบเพิ่มเติม

### ตรวจสอบจาก Cloudflare

1. ไปที่ Cloudflare Dashboard
2. ไปที่ **Analytics** → **Web Traffic**
3. ดู Error rate และ Error types

### ตรวจสอบจาก Server

```bash
# ดู real-time logs
docker-compose -f docker-compose.new.yml logs -f nginx-proxy

# ทดสอบ connection
curl -v http://localhost/backoffice
```

## ถ้ายังแก้ไม่ได้

1. ตรวจสอบว่า server IP ใน Cloudflare DNS ถูกต้อง
2. ตรวจสอบว่า server สามารถรับ connection จากภายนอกได้
3. ตรวจสอบว่าไม่มี service อื่นใช้ port 80
4. ลอง restart ทั้งหมด:
   ```bash
   docker-compose -f docker-compose.new.yml down
   docker-compose -f docker-compose.new.yml up -d
   ```

