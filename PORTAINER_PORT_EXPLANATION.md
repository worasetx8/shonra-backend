# ทำไมไม่แสดง Port 5173 ใน Portainer?

## คำถาม
ทำไมไม่แสดง port `5173:5173` ใน Portainer สำหรับ `shonra-backend-admin`?

## คำตอบ

### สาเหตุ
ใน `docker-compose.new.yml` ใช้ `expose:` แทน `ports:`

```yaml
expose:
  - '5173'  # ← ไม่แสดงใน Portainer
```

### ความแตกต่าง

#### `expose:` (ปัจจุบัน)
- ✅ เปิด port ให้ containers อื่นใน network เดียวกันเท่านั้น
- ✅ nginx-proxy สามารถเข้าถึงได้
- ❌ ไม่แสดงใน Portainer
- ❌ ไม่สามารถเข้าถึงจาก host โดยตรง

#### `ports:` (ถ้าต้องการแสดงใน Portainer)
- ✅ แสดงใน Portainer
- ✅ สามารถเข้าถึงจาก host โดยตรง
- ⚠️ อาจไม่ปลอดภัย (เข้าถึงได้โดยไม่ผ่าน nginx)

## ทางเลือก

### ทางเลือกที่ 1: ใช้ `expose:` (แนะนำ) ✅

**ข้อดี:**
- ปลอดภัยกว่า (เข้าถึงได้ผ่าน nginx เท่านั้น)
- ตาม best practice (internal services ไม่ควร expose ไปยัง host)

**ข้อเสีย:**
- ไม่แสดงใน Portainer

**เมื่อไหร่ควรใช้:**
- เมื่อต้องการให้เข้าถึงผ่าน nginx-proxy เท่านั้น
- เมื่อไม่ต้องการเข้าถึงโดยตรงจาก host

### ทางเลือกที่ 2: เพิ่ม `ports:` (ถ้าต้องการ debug)

แก้ไข `docker-compose.new.yml`:
```yaml
backend-admin:
  # ...
  expose:
    - '5173'  # สำหรับ nginx-proxy
  ports:
    - '5173:5173'  # สำหรับ direct access จาก host
```

**ข้อดี:**
- แสดงใน Portainer
- สามารถเข้าถึงโดยตรงจาก host (http://localhost:5173)

**ข้อเสีย:**
- อาจไม่ปลอดภัย (เข้าถึงได้โดยไม่ผ่าน nginx)
- ไม่ได้ใช้ nginx-proxy

**เมื่อไหร่ควรใช้:**
- เมื่อต้องการ debug
- เมื่อต้องการเข้าถึงโดยตรงจาก host

## คำแนะนำ

### สำหรับ Production (แนะนำ)
ใช้ `expose:` เท่านั้น:
- ปลอดภัยกว่า
- เข้าถึงผ่าน nginx-proxy เท่านั้น
- ไม่แสดงใน Portainer แต่ไม่เป็นปัญหา

### สำหรับ Development/Debug
เพิ่ม `ports:`:
- แสดงใน Portainer
- เข้าถึงโดยตรงได้
- แต่ควรลบออกก่อน deploy production

## สรุป

**ไม่แสดง port ใน Portainer = ปกติ** ✅

เพราะใช้ `expose:` ซึ่งเป็นวิธีที่ถูกต้องสำหรับ internal services ที่ควรเข้าถึงผ่าน reverse proxy (nginx) เท่านั้น

## ตรวจสอบว่า Port ทำงาน

```bash
# ตรวจสอบว่า backend-admin expose port แล้ว
docker-compose -f docker-compose.new.yml exec backend-admin netstat -tlnp

# ตรวจสอบว่า nginx-proxy สามารถเข้าถึงได้
docker-compose -f docker-compose.new.yml exec nginx-proxy wget -O- http://backend-admin:5173/backoffice

# ตรวจสอบ logs
docker-compose -f docker-compose.new.yml logs backend-admin
```

