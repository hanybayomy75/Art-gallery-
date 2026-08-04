import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
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

// Helper to generate social share Cloudinary or Unsplash URL (1200x630 JPEG format)
function getSocialImageUrl(url: string): string {
  if (!url) return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&h=630&fit=crop&q=85&fm=jpg';
  if (url.startsWith('data:image/')) return '';
  if (url.includes('cloudinary.com')) {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex !== -1) {
      return url.slice(0, uploadIndex + 8) + 'f_jpg,q_auto,w_1200,h_630,c_fill/' + url.slice(uploadIndex + 8);
    }
  }
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?w=1200&h=630&fit=crop&q=85&fm=jpg`;
  }
  return url;
}

function isPhotographyCategory(category?: string): boolean {
  if (!category) return false;
  const clean = category.trim().toLowerCase();
  return (
    clean === 'تصوير فوتوغرافي' ||
    clean === 'تصوير' ||
    clean === 'فوتوغرافي' ||
    clean === 'photography' ||
    clean === 'photo' ||
    clean.includes('تصوير') ||
    clean.includes('photograph')
  );
}

function getArtistPrefix(category?: string): string {
  if (isPhotographyCategory(category)) {
    return 'تصوير الفنان';
  }
  return 'بريشة الفنان';
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'معرض الفنون API' });
});

// Serve Google Search Console verification file
app.get('/google59bc9d2a341975c0.html', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send('google-site-verification: google59bc9d2a341975c0.html');
});

// Serve robots.txt dynamically with absolute sitemap URL
app.get('/robots.txt', (req, res) => {
  const xProto = req.get('x-forwarded-proto');
  const xHost = req.get('x-forwarded-host');
  const protocol = xProto ? xProto.split(',')[0] : req.protocol;
  const host = xHost || req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  const robots = `User-agent: *
Allow: /
Allow: /art/
Allow: /api/artwork-image/
Disallow: /admin

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(robots.trim());
});

// Serve sitemap.xml dynamically with all approved artwork pages
app.get('/sitemap.xml', async (req, res) => {
  const xProto = req.get('x-forwarded-proto');
  const xHost = req.get('x-forwarded-host');
  const protocol = xProto ? xProto.split(',')[0] : req.protocol;
  const host = xHost || req.get('host') || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  const urls: string[] = [
    `  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`
  ];

  try {
    const qApproved = query(collection(db, 'artworks'), where('status', '==', 'approved'));
    const snap = await getDocs(qApproved);
    snap.forEach((docSnap) => {
      const art = docSnap.data();
      const artId = docSnap.id;
      const updatedAt = art.updatedAt?.toDate?.() || art.createdAt?.toDate?.() || new Date();
      const lastMod = updatedAt.toISOString().split('T')[0];

      urls.push(`  <url>
    <loc>${baseUrl}/art/${artId}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    });
  } catch (e) {
    console.error('Error generating dynamic sitemap.xml:', e);
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(sitemapXml.trim());
});

// API endpoint to serve artwork images directly (supports base64, external links, and .jpg extension for crawlers)
app.get(['/api/artwork-image/:id', '/api/artwork-image/:id.jpg'], async (req, res) => {
  const rawId = req.params.id || '';
  const artId = rawId.replace(/\.jpg$/i, '');
  try {
    if (artId) {
      const artDoc = await getDoc(doc(db, 'artworks', artId));
      if (artDoc.exists()) {
        const artData = artDoc.data();
        if (artData && artData.imageUrl) {
          const url = artData.imageUrl;

          // 1. Base64 encoded image -> stream decoded buffer directly
          if (url.startsWith('data:image/')) {
            const matches = url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const buffer = Buffer.from(matches[2], 'base64');
              res.setHeader('Content-Type', mimeType.includes('png') ? 'image/png' : 'image/jpeg');
              res.setHeader('Cache-Control', 'public, max-age=86400');
              res.setHeader('Content-Length', buffer.length);
              return res.send(buffer);
            }
          }

          // 2. Direct HTTP/HTTPS Image URL -> 302 redirect directly to CDN image
          const socialUrl = getSocialImageUrl(url);
          return res.redirect(302, socialUrl);
        }
      }
    }
  } catch (e) {
    console.error('Error serving artwork image API:', e);
  }
  return res.redirect(302, 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&h=630&fit=crop&q=85&fm=jpg');
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

  // Dynamic Open Graph & Twitter Cards handler for artwork pages /art/:id or ?artId=:id
  // MUST be registered BEFORE static / vite middleware so crawlers get SSR Open Graph tags
  const renderArtworkOpenGraph = async (artId: string, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
          description: 'استكشف هذه اللوحة الفنية الرائعة والعديد من الأعمال الفنية في منصة الفنانين والمصورين العرب.',
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
      const prefix = getArtistPrefix(artworkData.category);
      const pageTitle = `${rawTitle} - ${prefix} ${artist} | معرض الفنون`;
      const description = artworkData.description
        ? (artworkData.description.length > 160 ? artworkData.description.slice(0, 157) + '...' : artworkData.description)
        : `استكشف اللوحة الفنية "${rawTitle}" ${prefix} ${artist} في منصة الفنانين والمصورين العرب.`;
      
      const xProto = req.get('x-forwarded-proto');
      const xHost = req.get('x-forwarded-host');
      const host = xHost || req.get('host') || 'localhost:3000';
      let protocol = (xProto && xProto.split(',')[0].trim()) || (req.secure ? 'https' : req.protocol) || 'https';
      if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        protocol = 'https';
      }
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      // Determine absolute social thumbnail image URL
      let imageUrl = '';
      if (artworkData && artworkData.imageUrl) {
        if (artworkData.imageUrl.startsWith('http://') || artworkData.imageUrl.startsWith('https://')) {
          // Direct public CDN image URL (Cloudinary / Unsplash) for 100% compatibility with WhatsApp, Facebook, X, etc.
          imageUrl = getSocialImageUrl(artworkData.imageUrl);
        } else if (artworkData.imageUrl.startsWith('data:image/')) {
          // Base64 image served via dedicated endpoint
          imageUrl = `${protocol}://${host}/api/artwork-image/${artId}.jpg`;
        } else {
          imageUrl = artworkData.imageUrl;
        }
      }
      if (!imageUrl) {
        imageUrl = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&h=630&fit=crop&q=85&fm=jpg';
      }

      // Ensure HTTPS protocol for external links if secure
      if (imageUrl.startsWith('http://') && !imageUrl.includes('localhost')) {
        imageUrl = imageUrl.replace('http://', 'https://');
      }

      // Clean existing head tags thoroughly to prevent duplicates for Facebook/Twitter/WhatsApp crawlers
      templateHtml = templateHtml.replace(/<title>[\s\S]*?<\/title>/gi, '');
      templateHtml = templateHtml.replace(/<meta\s+[^>]*?(?:name|property)=["'](?:og:[^"']+|twitter:[^"']+|description|title)["'][^>]*?\/?>/gi, '');
      templateHtml = templateHtml.replace(/<link\s+[^>]*?rel=["'](?:canonical|image_src)["'][^>]*?\/?>/gi, '');

      const ogTags = `
    <!-- Dynamic Open Graph & Social Sharing Meta Tags -->
    <title>${pageTitle}</title>
    <meta name="title" content="${pageTitle}" />
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${fullUrl}" />

    <!-- Open Graph / Facebook / WhatsApp / LinkedIn / Telegram -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="معرض الفنون العربية" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:title" content="${rawTitle} - ${prefix} ${artist}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:url" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${rawTitle} - ${prefix} ${artist}" />

    <!-- Twitter / X Summary Large Image Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@ArabArtGallery" />
    <meta name="twitter:domain" content="${host}" />
    <meta name="twitter:url" content="${fullUrl}" />
    <meta name="twitter:title" content="${rawTitle} - ${prefix} ${artist}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:src" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="${rawTitle}" />

    <!-- Messaging Apps Preview Fallback (WhatsApp / iMessage) -->
    <link rel="image_src" href="${imageUrl}" />

    <!-- Schema.org JSON-LD Structured Data for Crawlers -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "VisualArtwork",
      "name": "${rawTitle}",
      "description": "${description}",
      "image": "${imageUrl}",
      "url": "${fullUrl}",
      "creator": {
        "@type": "Person",
        "name": "${artist}"
      }
    }
    </script>
`;

      templateHtml = templateHtml.replace('</head>', `${ogTags}\n</head>`);

      return res.status(200).set({ 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }).send(templateHtml);
    } catch (err) {
      console.error('Error rendering Open Graph tags:', err);
      return next();
    }
  };

  app.get('/art/:id', async (req, res, next) => {
    const rawId = req.params.id || '';
    const artId = rawId.replace(/\.jpg$/i, '');
    return renderArtworkOpenGraph(artId, req, res, next);
  });

  // Serve Vite / Static files AFTER SSR routes
  if (!isProd && vite) {
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
  }

  // Universal Fallback for SPA routing (prevents 404 on direct link navigation or refreshing)
  app.get('*', async (req, res, next) => {
    try {
      const artQuery = (req.query.artId || req.query.art || '') as string;
      if (artQuery) {
        return renderArtworkOpenGraph(artQuery, req, res, next);
      }

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
