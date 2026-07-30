import express from 'express';
import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfigData from './firebase-applet-config.json';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Firebase server side for Open Graph SSR
const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const databaseId = firebaseConfigData.firestoreDatabaseId || '(default)';
const db = getFirestore(fbApp, databaseId);

// Helper to generate social share Cloudinary or Unsplash URL (1200x630 format)
function getSocialImageUrl(url: string): string {
  if (!url) return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&h=630&fit=crop';
  if (url.includes('cloudinary.com')) {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      return url.slice(0, uploadIndex + 8) + 'f_auto,q_auto,w_1200,h_630,c_fill,g_auto/' + url.slice(uploadIndex + 8);
    }
  }
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?w=1200&h=630&fit=crop&q=85`;
  }
  return url;
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'معرض الفنون API' });
});

// API endpoint to serve artwork images directly (supports base64 local fallback images for crawlers)
app.get('/api/artwork-image/:id', async (req, res) => {
  const artId = req.params.id;
  try {
    if (artId) {
      const artDoc = await getDoc(doc(db, 'artworks', artId));
      if (artDoc.exists()) {
        const artData = artDoc.data();
        if (artData && artData.imageUrl) {
          const url = artData.imageUrl;
          if (url.startsWith('data:image/')) {
            const matches = url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const buffer = Buffer.from(matches[2], 'base64');
              res.setHeader('Content-Type', mimeType);
              res.setHeader('Cache-Control', 'public, max-age=86400');
              res.setHeader('Content-Length', buffer.length);
              return res.send(buffer);
            }
          } else {
            return res.redirect(302, getSocialImageUrl(url));
          }
        }
      }
    }
  } catch (e) {
    console.error('Error serving artwork image API:', e);
  }
  return res.redirect(302, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&h=630&fit=crop');
});

// Helper function to create Mail Transporter
function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  // Fallback to jsonTransport (for serverless/preview environment without strict credentials)
  return nodemailer.createTransport({
    jsonTransport: true
  });
}

// API endpoint to send email summary notifications to artists when offline
app.post('/api/send-artist-email-summary', async (req, res) => {
  const {
    artistEmail,
    artistName = 'الفنان',
    interactionType = 'summary',
    senderName = 'مستكشف في المعرض',
    artTitle = 'لوحة فنية',
    artId = '',
    artImageUrl = '',
    messageContent = '',
    count = 1
  } = req.body || {};

  if (!artistEmail) {
    return res.status(400).json({
      success: false,
      message: 'عنوان البريد الإلكتروني للفنان مطلوب (artistEmail)'
    });
  }

  try {
    const transporter = getMailTransporter();
    const fromAddress = process.env.FROM_EMAIL || 'notifications@arabartgallery.com';
    const xProto = req.get('x-forwarded-proto');
    const xHost = req.get('x-forwarded-host');
    const host = xHost || req.get('host') || 'localhost:3000';
    let protocol = (xProto && xProto.split(',')[0].trim()) || (req.secure ? 'https' : 'http');
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      protocol = 'https';
    }
    const artLink = artId ? `${protocol}://${host}/art/${artId}` : `${protocol}://${host}`;

    let subject = `🎨 إشعار جديد من معرض الفنون العربية على عملك: ${artTitle}`;
    if (interactionType === 'like') {
      subject = `❤️ إعجاب جديد بكتلوجك الفني: "${artTitle}"`;
    } else if (interactionType === 'comment') {
      subject = `💬 تعليق جديد من ${senderName} على لوحتك "${artTitle}"`;
    } else if (interactionType === 'rating') {
      subject = `⭐ تقييم جديد على عملك الفني "${artTitle}"`;
    } else if (interactionType === 'favorite') {
      subject = `🔖 تم حفظ لوحتك "${artTitle}" في قائمة المفضلة`;
    } else if (interactionType === 'summary') {
      subject = `📊 ملخص التفاعلات الجديدة على أعمالك الفنية في معرض الفنون`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; direction: rtl; text-align: right; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 20px; padding: 32px; border: 1px solid #334155; }
          .header { text-align: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 800; color: #f59e0b; text-decoration: none; }
          .badge { display: inline-block; background: #f59e0b20; color: #f59e0b; padding: 6px 16px; border-radius: 99px; font-size: 13px; font-weight: bold; margin-top: 10px; border: 1px solid #f59e0b40; }
          .artwork-card { background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #334155; margin: 20px 0; }
          .artwork-img { width: 100%; max-height: 320px; object-fit: cover; display: block; }
          .artwork-details { padding: 16px; }
          .artwork-title { font-size: 18px; font-weight: bold; color: #ffffff; margin-bottom: 6px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff !important; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 12px; margin-top: 20px; text-align: center; }
          .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="${protocol}://${host}" class="logo">🏛️ معرض الفنون العربية</a>
            <div><span class="badge">إشعار تفاعل الفنان الخارجي</span></div>
          </div>
          
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 12px;">مرحباً بالفنان ${artistName} 👋</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            نحييك من منصة معرض الفنون! نود إعلامك بأن هناك تفاعلاً جديداً تم على عملك الفني بينما كنت خارج المنصة:
          </p>

          <div class="artwork-card">
            ${artImageUrl ? `<img src="${artImageUrl}" alt="${artTitle}" class="artwork-img" />` : ''}
            <div class="artwork-details">
              <div class="artwork-title">${artTitle}</div>
              <p style="color: #fbbf24; font-size: 14px; font-weight: bold; margin: 8px 0 0 0;">
                ${messageContent || `قام ${senderName} بالتفاعل مع عملك الفني`}
              </p>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${artLink}" class="btn">مشاهدة اللوحة والتفاعل مع الزوار 🎨</a>
          </div>

          <div class="footer">
            <p>تصلك هذه الرسالة لأنك مسجل كفنان في منصة معرض الفنون العربية.</p>
            <p>© 2026 معرض الفنون - جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"معرض الفنون العربية" <${fromAddress}>`,
      to: artistEmail,
      subject: subject,
      html: htmlContent
    });

    console.log('Artist offline email processed successfully:', info);

    const isRealSmtp = Boolean(process.env.SMTP_HOST);

    return res.json({
      success: true,
      message: isRealSmtp
        ? `تم إرسال ملخص البريد الإلكتروني بنجاح إلى ${artistEmail}`
        : `تم معالجة ملخص البريد بنجاح لـ ${artistEmail} (محاكاة جاري العمل)`,
      isRealSmtp,
      emailInfo: info
    });
  } catch (err: any) {
    console.error('Error in sending artist email summary:', err);
    return res.status(500).json({
      success: false,
      message: `فشل إرسال البريد الإلكتروني: ${err.message || err}`
    });
  }
});


async function startServer() {
  app.set('trust proxy', true);

  const isProd = process.env.NODE_ENV === 'production';
  let vite: any = null;

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
  }

  // Dynamic Open Graph & Twitter Cards handler for artwork pages /art/:id
  // MUST be registered BEFORE static / vite middleware so crawlers get SSR Open Graph tags
  app.get('/art/:id', async (req, res, next) => {
    const artId = req.params.id;
    try {
      let artworkData: any = null;
      if (artId) {
        const artDoc = await getDoc(doc(db, 'artworks', artId));
        if (artDoc.exists()) {
          artworkData = artDoc.data();
        }
      }

      if (!artworkData) {
        artworkData = {
          title: 'عمل فني مميز',
          artistName: 'فنان المعرض',
          description: 'استكشف هذه اللوحة الفنية الرائعة والعديد من الأعمال الفنية في منصة معرض الفنون العربية.',
          imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&h=630&fit=crop'
        };
      }

      let templateHtml = '';
      if (!isProd && vite) {
        const indexPath = path.join(process.cwd(), 'index.html');
        templateHtml = fs.readFileSync(indexPath, 'utf-8');
        templateHtml = await vite.transformIndexHtml(req.originalUrl, templateHtml);
      } else {
        const distIndexPath = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(distIndexPath)) {
          templateHtml = fs.readFileSync(distIndexPath, 'utf-8');
        } else {
          templateHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        }
      }

      const artist = artworkData.artistName || artworkData.userName || 'فنان المعرض';
      const rawTitle = artworkData.title || 'عمل فني';
      const pageTitle = `${rawTitle} - بريشة الفنان ${artist} | معرض الفنون`;
      const description = artworkData.description
        ? (artworkData.description.length > 160 ? artworkData.description.slice(0, 157) + '...' : artworkData.description)
        : `استكشف اللوحة الفنية "${rawTitle}" بريشة الفنان ${artist} في منصة معرض الفنون العربية.`;
      
      const xProto = req.get('x-forwarded-proto');
      const xHost = req.get('x-forwarded-host');
      const host = xHost || req.get('host') || 'localhost:3000';
      let protocol = (xProto && xProto.split(',')[0].trim()) || (req.secure ? 'https' : req.protocol) || 'https';
      if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        protocol = 'https';
      }
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      let imageUrl = '';
      if (artworkData.imageUrl && artworkData.imageUrl.startsWith('data:image/')) {
        imageUrl = `${protocol}://${host}/api/artwork-image/${artId}`;
      } else {
        imageUrl = getSocialImageUrl(artworkData.imageUrl);
      }

      // Clean existing head tags to prevent duplicates for Facebook/Twitter/WhatsApp crawlers
      templateHtml = templateHtml.replace(/<title>[\s\S]*?<\/title>/gi, '');
      templateHtml = templateHtml.replace(/<meta\s+(?:name|property)="(?:og:|twitter:|description|title)[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');

      const ogTags = `
    <!-- Dynamic Open Graph & Social Sharing Meta Tags -->
    <title>${pageTitle}</title>
    <meta name="title" content="${pageTitle}" />
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${fullUrl}" />

    <!-- Open Graph / Facebook / WhatsApp / LinkedIn / Telegram -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="معرض الفنون" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:title" content="${rawTitle} - بريشة الفنان ${artist}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${rawTitle} - بريشة الفنان ${artist}" />
    <meta property="og:image:type" content="image/jpeg" />

    <!-- Twitter / X Summary Large Image Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@ArabArtGallery" />
    <meta name="twitter:domain" content="${host}" />
    <meta name="twitter:url" content="${fullUrl}" />
    <meta name="twitter:title" content="${rawTitle} - بريشة الفنان ${artist}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:src" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="${rawTitle}" />

    <!-- Messaging Apps Preview Fallback (WhatsApp / iMessage) -->
    <link rel="image_src" href="${imageUrl}" />
`;

      templateHtml = templateHtml.replace('</head>', `${ogTags}\n</head>`);

      res.status(200).set({ 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }).end(templateHtml);
    } catch (err) {
      console.error('Error rendering Open Graph tags:', err);
      next();
    }
  });

  // Serve Vite / Static files AFTER SSR routes
  if (!isProd && vite) {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
  }

  // Universal Fallback for SPA routing (prevents 404 on direct link navigation or refreshing)
  app.get('*', async (req, res) => {
    try {
      if (isProd) {
        const distIndexPath = path.join(process.cwd(), 'dist', 'index.html');
        if (fs.existsSync(distIndexPath)) {
          return res.sendFile(distIndexPath);
        }
      }
      const indexPath = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf-8');
        if (!isProd && vite) {
          html = await vite.transformIndexHtml(req.originalUrl, html);
        }
        return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
      }
      res.status(404).send('Not Found');
    } catch (e) {
      console.error('Error in SPA fallback handler:', e);
      res.status(500).send('Internal Server Error');
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`معرض الفنون - Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
