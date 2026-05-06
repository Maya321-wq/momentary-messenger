# 🚀 PRODUCTION DEPLOYMENT GUIDE

## Overview

This guide covers deploying Momentary Messenger to production environments (Heroku, AWS, DigitalOcean, etc.).

---

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Firebase service account key secured
- [ ] MongoDB instance provisioned (optional but recommended)
- [ ] Redis instance provisioned (optional but recommended)
- [ ] Twilio account verified (optional)
- [ ] Domain name registered and DNS configured
- [ ] SSL/TLS certificates ready
- [ ] CORS origins updated for production domain

---

## Backend Deployment

### Environment Setup

**Production .env**
```env
NODE_ENV=production
PORT=5000

# Firebase (REQUIRED)
# Place serviceAccountKey.json in server/ root

# Database (RECOMMENDED)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Cache (RECOMMENDED)
REDIS_URL=redis://:password@host:port

# MFA (OPTIONAL)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
MFA_PHONE_NUMBER=+1234567890

# CORS
CLIENT_URL=https://yourdomain.com
```

### Heroku Deployment

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production -a your-app-name
heroku config:set MONGO_URI=mongodb+srv://... -a your-app-name
heroku config:set REDIS_URL=redis://... -a your-app-name
heroku config:set CLIENT_URL=https://yourdomain.com -a your-app-name

# Add Firebase service account (base64 encoded)
cat server/serviceAccountKey.json | base64
heroku config:set FIREBASE_SERVICE_ACCOUNT=<base64_string> -a your-app-name

# Deploy
git push heroku main

# View logs
heroku logs --tail -a your-app-name
```

### AWS EC2 Deployment

```bash
# SSH into instance
ssh -i key.pem ubuntu@your-instance.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/yourrepo/momentary-messenger
cd momentary-messenger/server

# Install dependencies
npm install

# Create .env file
nano .env
# Paste production configuration

# Install PM2 (process manager)
sudo npm install -g pm2

# Start server
pm2 start src/index.js --name "messenger-api"
pm2 save
pm2 startup

# Setup reverse proxy (Nginx)
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/default
```

**Nginx Config**
```nginx
upstream messenger_api {
    server localhost:5000;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://messenger_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### DigitalOcean App Platform

1. Connect GitHub repo
2. Create new app
3. Configure backend service:
   - Source: GitHub → your-repo → server directory
   - Runtime: Node.js
   - Build: `npm install`
   - Run: `npm start`
   - Port: 5000
4. Add environment variables from production `.env`
5. Add MongoDB add-on (optional)
6. Add Redis add-on (optional)
7. Deploy

---

## Frontend Deployment

### Environment Setup

**Production .env.production**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourproject.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=yourproject
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=yourproject.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_CHAT_TTL_SECONDS=120
```

### Vercel Deployment (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in dashboard:
# - NEXT_PUBLIC_FIREBASE_API_KEY
# - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
# - NEXT_PUBLIC_FIREBASE_PROJECT_ID
# - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
# - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
# - NEXT_PUBLIC_FIREBASE_APP_ID
# - NEXT_PUBLIC_API_URL
# - NEXT_PUBLIC_CHAT_TTL_SECONDS

# Re-deploy to apply env vars
vercel --prod
```

### Netlify Deployment

1. Connect GitHub repo
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Add environment variables
4. Deploy

### AWS S3 + CloudFront

```bash
# Build
npm run build && npm run export

# Upload to S3
aws s3 cp out/ s3://your-bucket/ --recursive

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Database Setup

### MongoDB Atlas (Cloud)

1. Create MongoDB Atlas account
2. Create cluster (M0 free tier)
3. Create database user
4. Whitelist IP addresses
5. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/db`
6. Set `MONGO_URI` in `.env`

### MongoDB Docker

```bash
docker run -d \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest
```

### Redis Cloud

1. Sign up for Redis Cloud
2. Create database
3. Get connection URL: `redis://:password@host:port`
4. Set `REDIS_URL` in `.env`

### Redis Docker

```bash
docker run -d \
  -p 6379:6379 \
  redis:latest \
  redis-server --requirepass yourpassword
```

---

## Firewall & Security

### Backend Security

```bash
# Only allow HTTPS traffic
sudo ufw allow 443
sudo ufw allow 80  # for Let's Encrypt
sudo ufw deny 5000  # block direct access

# Enable CORS only for your domain
# In server/src/index.js:
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

# Rate limiting
npm install express-rate-limit
```

### SSL/TLS Certificates

**Let's Encrypt (Free)**
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d api.yourdomain.com
sudo certbot renew --dry-run  # Test auto-renewal
```

---

## Monitoring & Logging

### Server Logs

```bash
# PM2
pm2 logs messenger-api
pm2 monit

# Heroku
heroku logs --tail

# AWS CloudWatch
aws logs tail /aws/ec2/messenger-api --follow
```

### Database Monitoring

**MongoDB**
- Atlas Dashboard → Metrics tab
- Monitor: connections, operations, memory

**Redis**
- Redis Insights
- Monitor: connections, commands, memory

### Uptime Monitoring

```bash
# UptimeRobot (free tier)
# - Monitor: https://api.yourdomain.com/health
# - Interval: 5 minutes
# - Alerts: Email on downtime
```

### Error Tracking

**Sentry**
```bash
npm install @sentry/node

# In server/src/index.js:
const Sentry = require("@sentry/node");
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

---

## Performance Optimization

### Backend

1. **Enable compression**
```js
app.use(compression());
```

2. **Connection pooling**
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db?maxPoolSize=10
REDIS_URL=redis://...?maxRetriesPerRequest=null
```

3. **Caching headers**
```js
app.use(express.static('public', {
  maxAge: '1d',
  etag: false
}));
```

### Frontend

1. **Image optimization**
   - Use Next.js `<Image>` component
   - Enable ISR (Incremental Static Regeneration)

2. **Code splitting**
   - Next.js does this automatically

3. **CDN**
   - Use Vercel Edge Network
   - Or CloudFlare

### Database

1. **Indexes**
```js
userSchema.index({ uid: 1 });
```

2. **Redis caching**
   - Store presence in Redis only (no DB queries)
   - Cache user profiles

3. **Connection pooling**
   - See Backend section above

---

## Backup & Recovery

### MongoDB Backup

```bash
# Atlas automatic backups (enabled by default)
# or manual backup:
mongodump --uri "mongodb+srv://..." --out ./backup

# Restore:
mongorestore --uri "mongodb+srv://..." ./backup
```

### Redis Backup

```bash
# RDB snapshots
CONFIG GET save

# AOF persistence
CONFIG SET appendonly yes
```

### Daily Backup Script

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
mongodump --uri "$MONGO_URI" --out ./backups/mongo_$DATE
gzip -r ./backups/mongo_$DATE
aws s3 cp ./backups/mongo_$DATE.tar.gz s3://backup-bucket/
```

---

## Scaling

### Horizontal Scaling

1. **Load Balancer**
   - AWS ELB, Nginx, HAProxy
   - Route traffic across multiple server instances

2. **Socket.io Adapter**
   ```js
   const { createAdapter } = require("@socket.io/redis-adapter");
   io.adapter(createAdapter(pubClient, subClient));
   ```

3. **Session Store**
   ```js
   const RedisStore = require("connect-redis").default;
   app.use(session({
     store: new RedisStore({ client: redis }),
     secret: process.env.SESSION_SECRET,
     resave: false,
     saveUninitialized: false,
   }));
   ```

### Vertical Scaling

1. Increase server RAM
2. Use faster CPU
3. Upgrade database tier

---

## Rollback Plan

1. **Keep previous version in Git**
   ```bash
   git tag production-v1.0
   git push --tags
   ```

2. **Rollback on Vercel**
   ```bash
   vercel rollback
   ```

3. **Rollback on Heroku**
   ```bash
   heroku releases:info
   heroku releases:rollback v10
   ```

4. **Rollback on AWS**
   ```bash
   git reset --hard <previous-commit>
   git push -f production main
   ```

---

## Production Checklist

- [ ] All env vars configured
- [ ] Firebase service account secured
- [ ] CORS configured for production domain
- [ ] MongoDB/Redis provisioned and tested
- [ ] SSL/TLS enabled
- [ ] Health check endpoint working
- [ ] Error logging configured (Sentry)
- [ ] Uptime monitoring enabled
- [ ] Database backups configured
- [ ] Domain DNS configured
- [ ] Email notifications set up
- [ ] Rate limiting enabled
- [ ] DDOS protection (CloudFlare)
- [ ] Tested full login flow
- [ ] Tested real-time messaging
- [ ] Tested TTL expiry

---

## Support & Monitoring

**24/7 Uptime Monitoring**
- UptimeRobot (monitors /health endpoint)
- CloudWatch alarms
- PagerDuty integration

**Log Aggregation**
- CloudWatch Logs
- DataDog
- Splunk

**Performance Monitoring**
- New Relic
- DataDog
- AWS Performance Insights

---

**Happy Deploying! 🚀**
