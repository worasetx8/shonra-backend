# Cloudflare Setup Guide

## สถาปัตยกรรม

```
User (HTTPS)
   ↓
Cloudflare (SSL Termination)
   ↓ HTTP
Nginx Proxy (Port 80)
   ├─ /backoffice → Backend Admin (Port 5173)
   └─ / → Redirect to /backoffice (ตอนนี้)
```

## การตั้งค่า Cloudflare

### 1. DNS Records

ไปที่ **DNS** → **Records**:

#### สำหรับ Domain หลัก (shonra.com)

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | @ | `<your-server-ip>` | 🟠 Proxied | Auto |
| A | www | `<your-server-ip>` | 🟠 Proxied | Auto |

**สำคัญ:**
- ✅ Proxy Status ต้องเป็น **Proxied** (สีส้ม) เพื่อให้ Cloudflare จัดการ SSL/TLS
- ✅ TTL ใช้ **Auto** เพื่อให้ Cloudflare จัดการ caching

#### สำหรับ API Subdomain (api.shonra.com)

| Type | Name | Content | Proxy Status | TTL |
|------|------|---------|--------------|-----|
| A | api | `<your-api-server-ip>` | 🟠 Proxied | Auto |

**หมายเหตุ:** ถ้า API อยู่ที่ server เดียวกัน ใช้ IP เดียวกันได้

### 2. SSL/TLS Settings

ไปที่ **SSL/TLS** → **Overview**:

#### SSL/TLS encryption mode

เลือก: **Full** หรือ **Flexible**

| Mode | User ↔ Cloudflare | Cloudflare ↔ Origin | แนะนำ |
|------|-------------------|---------------------|-------|
| **Full** | HTTPS | HTTPS | ✅ แนะนำ |
| **Flexible** | HTTPS | HTTP | ⚠️ ใช้ได้ แต่ไม่ปลอดภัยเท่า |
| **Full (strict)** | HTTPS | HTTPS (ต้องมี valid cert) | ❌ ไม่ใช้ (ไม่มี cert บน server) |

**แนะนำ: Full** (เพราะ nginx proxy รับ HTTP จาก Cloudflare)

#### Always Use HTTPS

✅ **On** - Redirect HTTP → HTTPS อัตโนมัติ

#### Automatic HTTPS Rewrites

✅ **On** - แก้ไข links ในหน้าเว็บให้เป็น HTTPS

### 3. Page Rules (Optional)

ไปที่ **Rules** → **Page Rules**:

#### Rule 1: Force HTTPS for all pages

```
URL Pattern: *shonra.com/*
Settings:
  - Always Use HTTPS: On
```

#### Rule 2: Cache static assets (Optional)

```
URL Pattern: *shonra.com/backoffice/assets/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

### 4. Speed Settings

ไปที่ **Speed** → **Optimization**:

#### Auto Minify

✅ **JavaScript** - Minify JS files
✅ **CSS** - Minify CSS files
✅ **HTML** - Minify HTML files

#### Brotli

✅ **On** - ใช้ Brotli compression

#### Rocket Loader

⚠️ **Off** (อาจทำให้ React app มีปัญหา)

### 5. Caching Settings

ไปที่ **Caching** → **Configuration**:

#### Caching Level

เลือก: **Standard**

#### Browser Cache TTL

เลือก: **Respect Existing Headers** (ให้ nginx จัดการ)

### 6. Network Settings

ไปที่ **Network**:

#### HTTP/2

✅ **On**

#### HTTP/3 (with QUIC)

✅ **On** (ถ้าต้องการ)

#### 0-RTT Connection Resumption

✅ **On**

#### IP Geolocation

✅ **On** (ถ้าต้องการรู้ location ของ user)

### 7. Security Settings

ไปที่ **Security** → **Settings**:

#### Security Level

เลือก: **Medium** หรือ **High**

#### Challenge Passage

- **30 minutes** (default)

#### Browser Integrity Check

✅ **On**

#### Privacy Pass Support

✅ **On**

### 8. Firewall Rules (Optional)

ไปที่ **Security** → **WAF** → **Custom rules**:

#### Rule: Block direct access to backend-admin port

```
(http.request.uri.path contains "/backoffice" and not http.request.headers["cf-connecting-ip"])
```

**หมายเหตุ:** Rule นี้ป้องกันการเข้าถึงโดยตรง (แต่ nginx proxy จะผ่านได้)

## สรุปการตั้งค่าที่สำคัญ

### ✅ ต้องตั้งค่า

1. **DNS Records**
   - A record สำหรับ `@` และ `www` → Proxied
   - A record สำหรับ `api` → Proxied

2. **SSL/TLS**
   - Mode: **Full**
   - Always Use HTTPS: **On**

3. **Speed**
   - Auto Minify: **On** (JS, CSS, HTML)
   - Brotli: **On**

### ⚠️ ควรตั้งค่า

1. **Caching**
   - Caching Level: **Standard**
   - Browser Cache TTL: **Respect Existing Headers**

2. **Security**
   - Security Level: **Medium** หรือ **High**
   - Browser Integrity Check: **On**

### 🔧 Optional

1. **Page Rules** - สำหรับ fine-tuning caching
2. **Firewall Rules** - สำหรับ security rules เพิ่มเติม

## ตรวจสอบการตั้งค่า

### 1. ตรวจสอบ DNS

```bash
# ตรวจสอบ DNS resolution
dig shonra.com
dig www.shonra.com
dig api.shonra.com
```

### 2. ตรวจสอบ SSL

```bash
# ตรวจสอบ SSL certificate
curl -I https://shonra.com
```

### 3. ตรวจสอบ Proxy

```bash
# ตรวจสอบว่า Cloudflare proxy ทำงาน
curl -I https://shonra.com/backoffice
```

ควรเห็น header:
- `CF-RAY: ...`
- `cf-cache-status: ...`

## Troubleshooting

### ปัญหา: ไม่สามารถเข้าถึงได้

1. ตรวจสอบ DNS records → ต้องเป็น Proxied
2. ตรวจสอบ SSL/TLS mode → ต้องเป็น Full หรือ Flexible
3. ตรวจสอบ server firewall → ต้องเปิด port 80

### ปัญหา: SSL Error

1. ตรวจสอบ SSL/TLS mode → ใช้ Full (ไม่ใช่ Full Strict)
2. ตรวจสอบว่า server รับ HTTP ได้ (ไม่ต้องมี SSL cert)

### ปัญหา: Real IP ไม่ถูกต้อง

1. ตรวจสอบ nginx config → ต้องมี Cloudflare IP ranges
2. ตรวจสอบ `CF-Connecting-IP` header → ต้องมีใน nginx config

## หมายเหตุสำคัญ

1. **ไม่ต้องมี SSL certificates บน server** - Cloudflare จัดการให้
2. **Nginx proxy รับ HTTP** - Cloudflare จะส่ง HTTP มา
3. **Real IP detection** - ใช้ `CF-Connecting-IP` header
4. **Caching** - ให้ nginx จัดการ static assets, Cloudflare จัดการ HTML

