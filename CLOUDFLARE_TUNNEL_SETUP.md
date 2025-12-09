# Cloudflare Tunnel Setup Guide

## สถาปัตยกรรมปัจจุบัน

จากรูปภาพที่เห็น คุณใช้ **Cloudflare Tunnel** แทน DNS A record แบบปกติ:

- `portainer.shonra.com` → `https://localhost:9443`
- `api.shonra.com` → `http://localhost:3002`
- `backend.shonra.com` → `http://localhost:5173`

## สิ่งที่ต้องเพิ่มใน Cloudflare Tunnel

### 1. เพิ่ม Route สำหรับ shonra.com/backoffice

ไปที่ **Cloudflare Dashboard** → **Zero Trust** → **Networks** → **Tunnels** → **shonra-tunnel** → **Published application routes**

#### เพิ่ม Route ใหม่:

| Field | Value |
|-------|-------|
| **Published application route** | `shonra.com` |
| **Path** | `/backoffice*` |
| **Service** | `http://localhost:80` |

**หรือถ้าต้องการให้ครอบคลุมทุก path:**

| Field | Value |
|-------|-------|
| **Published application route** | `shonra.com` |
| **Path** | `*` |
| **Service** | `http://localhost:80` |

### 2. ลำดับความสำคัญของ Routes

**สำคัญ:** Routes จะ match จากบนลงล่าง ดังนั้นต้องเรียงลำดับให้ถูกต้อง:

1. **Specific paths ก่อน** (เช่น `/backoffice*`)
2. **Catch-all หลัง** (เช่น `*`)

#### ตัวอย่างลำดับที่ถูกต้อง:

```
1. shonra.com /backoffice* → http://localhost:80
2. shonra.com * → http://localhost:80 (หรือ client frontend ในอนาคต)
```

### 3. ถ้ามี Client Frontend ในอนาคต

เมื่อมี client frontend แล้ว ให้เพิ่ม route:

```
1. shonra.com /backoffice* → http://localhost:80
2. shonra.com * → http://localhost:3000 (client frontend)
```

## ขั้นตอนการเพิ่ม Route

### วิธีที่ 1: เพิ่ม Route สำหรับ /backoffice เท่านั้น

1. ไปที่ **Published application routes**
2. คลิก **"+ Add a published application route"**
3. กรอกข้อมูล:
   - **Published application route**: `shonra.com`
   - **Path**: `/backoffice*`
   - **Service**: `http://localhost:80`
4. คลิก **Save**

### วิธีที่ 2: เพิ่ม Route สำหรับทั้ง domain (แนะนำ)

1. ไปที่ **Published application routes**
2. คลิก **"+ Add a published application route"**
3. กรอกข้อมูล:
   - **Published application route**: `shonra.com`
   - **Path**: `*` (catch-all)
   - **Service**: `http://localhost:80`
4. คลิก **Save**

**หมายเหตุ:** ถ้าใช้ catch-all (`*`) nginx-proxy จะจัดการ routing ภายใน (เช่น redirect `/` → `/backoffice`)

## ตรวจสอบการตั้งค่า

### 1. ตรวจสอบ Routes

หลังจากเพิ่ม route แล้ว ควรเห็น:

```
Published application routes:
- shonra.com /backoffice* → http://localhost:80
- (หรือ shonra.com * → http://localhost:80)
```

### 2. ทดสอบการเข้าถึง

```bash
# ทดสอบจาก server
curl http://localhost/backoffice

# ควรเห็น HTML response จาก backend-admin
```

### 3. ทดสอบจาก Browser

เปิด browser และไปที่:
- `https://shonra.com/backoffice`

ควรเห็น backend admin panel

## สรุป Routes ที่ควรมี

### ตอนนี้ (ไม่มี client frontend):

| Published application route | Path | Service |
|---------------------------|------|---------|
| `shonra.com` | `/backoffice*` | `http://localhost:80` |
| `shonra.com` | `*` | `http://localhost:80` (redirect to /backoffice) |

### เมื่อมี client frontend แล้ว:

| Published application route | Path | Service |
|---------------------------|------|---------|
| `shonra.com` | `/backoffice*` | `http://localhost:80` |
| `shonra.com` | `*` | `http://localhost:3000` (client frontend) |

## หมายเหตุสำคัญ

1. **Port 80** = nginx-proxy (ไม่ใช่ backend-admin โดยตรง)
2. **nginx-proxy** จะจัดการ routing ภายใน (เช่น `/backoffice` → `backend-admin:5173`)
3. **Cloudflare Tunnel** จะส่ง request ไปยัง `http://localhost:80` (nginx-proxy)
4. **nginx-proxy** จะ forward ไปยัง `backend-admin:5173` ภายใน Docker network

## Troubleshooting

### ถ้ายัง Error 521:

1. ตรวจสอบว่า nginx-proxy container รันอยู่:
   ```bash
   docker-compose -f docker-compose.new.yml ps
   ```

2. ตรวจสอบว่า nginx-proxy ฟัง port 80:
   ```bash
   docker-compose -f docker-compose.new.yml exec nginx-proxy netstat -tlnp
   ```

3. ตรวจสอบ logs:
   ```bash
   docker-compose -f docker-compose.new.yml logs nginx-proxy
   ```

4. ทดสอบจาก server:
   ```bash
   curl http://localhost/backoffice
   ```

### ถ้า Route ไม่ทำงาน:

1. ตรวจสอบลำดับ routes (specific ก่อน catch-all)
2. ตรวจสอบว่า service URL ถูกต้อง (`http://localhost:80`)
3. รอสักครู่ให้ Cloudflare Tunnel อัพเดท (อาจใช้เวลา 1-2 นาที)

