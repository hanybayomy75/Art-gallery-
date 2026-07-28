import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfigData from './firebase-applet-config.json';

const app = express();
const PORT = 3000;

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

// Helper to generate social share Cloudinary URL (1200x630 format)
function getSocialImageUrl(url: string): string {
  if (!url) return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&h=630&fit=crop';
  if (!url.includes('cloudinary.com')) return url;
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;
  return url.slice(0, uploadIndex + 8) + 'f_auto,q_auto,w_1200,h_630,c_fill,g_auto/' + url.slice(uploadIndex + 8);
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'معرض الفنون API' });
});

async function startServer() {
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
        return next();
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

      const artist = artworkData.artistName || 'فنان المعرض';
      const rawTitle = artworkData.title || 'عمل فني';
      const pageTitle = `${rawTitle} - بريشة الفنان ${artist} | معرض الفنون`;
      const description = artworkData.description
        ? (artworkData.description.length > 160 ? artworkData.description.slice(0, 157) + '...' : artworkData.description)
        : `استكشف اللوحة الفنية "${rawTitle}" بريشة الفنان ${artist} في منصة معرض الفنون العربية.`;
      const imageUrl = getSocialImageUrl(artworkData.imageUrl);
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'https';
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      // Clean existing tags to avoid duplicates
      templateHtml = templateHtml.replace(/<title>.*?<\/title>/gi, '');
      templateHtml = templateHtml.replace(/<meta\s+property="og:[^"]*"\s*\/?>/gi, '');
      templateHtml = templateHtml.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
      templateHtml = templateHtml.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');

      const ogTags = `
    <!-- Dynamic Open Graph & Social Sharing Meta Tags -->
    <title>${pageTitle}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${rawTitle} - بريشة الفنان ${artist}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:site_name" content="معرض الفنون" />
    
    <!-- Twitter / X Summary Large Image Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${rawTitle} - بريشة الفنان ${artist}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:image:alt" content="${rawTitle}" />
`;

      templateHtml = templateHtml.replace('</head>', `${ogTags}\n</head>`);

      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(templateHtml);
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

  // Fallback for SPA routing in production
  if (isProd) {
    app.get('*all', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`معرض الفنون - Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
