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

// Helper to generate social share Cloudinary URL
function getSocialImageUrl(url: string): string {
  if (!url || !url.includes('cloudinary.com')) return url || '';
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;
  return url.slice(0, uploadIndex + 8) + 'f_auto,q_auto,w_1200,h_630,c_pad,b_auto:predominant/' + url.slice(uploadIndex + 8);
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
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
  }

  // Dynamic Open Graph handler for artwork pages /art/:id
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

      let templateHtml = '';
      if (!isProd && vite) {
        templateHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        templateHtml = await vite.transformIndexHtml(req.originalUrl, templateHtml);
      } else {
        templateHtml = fs.readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf-8');
      }

      if (artworkData) {
        const title = `${artworkData.title || 'عمل فني'} - للفنان ${artworkData.artistName || 'معرض الفنون'}`;
        const description = artworkData.description || `استكشف اللوحة الفنية "${artworkData.title}" على منصة معرض الفنون العربية.`;
        const imageUrl = getSocialImageUrl(artworkData.imageUrl);
        const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

        const ogTags = `
    <!-- Dynamic Open Graph Meta Tags for Social Media Sharing -->
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:site_name" content="معرض الفنون" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
`;

        templateHtml = templateHtml.replace('</head>', `${ogTags}\n</head>`);
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).end(templateHtml);
    } catch (err) {
      console.error('Error rendering Open Graph tags:', err);
      next();
    }
  });

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
