import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { GalleryGrid } from './components/GalleryGrid';
import { UploadModal } from './components/UploadModal';
import { AuthModal } from './components/AuthModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import { Footer } from './components/Footer';
import { MyProfilePage } from './pages/MyProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { PublicArtworkPage } from './pages/PublicArtworkPage';
import { PublicGalleryPage } from './pages/PublicGalleryPage';
import { Artwork } from './types';
import { fetchArtworkById, fetchApprovedArtworks, subscribeToApprovedArtworks, DEFAULT_CATEGORIES } from './lib/artworks';

type ActiveView = 'home' | 'artworks' | 'artwork_detail' | 'profile' | 'admin';

function MainApp() {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [publicArtworkId, setPublicArtworkId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  // Dynamic Hero Stats
  const [heroStats, setHeroStats] = useState({
    totalWorks: 0,
    totalLikes: 0,
    totalCategories: DEFAULT_CATEGORIES.length - 1
  });

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (activeView !== 'home' && activeView !== 'artworks') {
      setActiveView('artworks');
      window.history.pushState({}, '', '/artworks');
    } else if (activeView === 'home') {
      setTimeout(() => {
        const galleryEl = document.getElementById('gallery-section');
        if (galleryEl) {
          galleryEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Sync URL routes & handle browser Back/Forward (popstate)
  useEffect(() => {
    const syncRouteFromLocation = () => {
      const path = window.location.pathname;

      if (path.startsWith('/art/') || path.startsWith('/artwork/')) {
        const id = path.replace(/^\/(art|artwork)\//, '');
        if (id) {
          setPublicArtworkId(id);
          setActiveView('artwork_detail');
          fetchArtworkById(id).then((art) => {
            if (art) setSelectedArtwork(art);
          });
        }
      } else if (path === '/artworks' || path === '/gallery') {
        setActiveView('artworks');
        setSelectedArtwork(null);
      } else if (path === '/profile') {
        setActiveView('profile');
        setSelectedArtwork(null);
      } else if (path === '/admin') {
        setActiveView('admin');
        setSelectedArtwork(null);
      } else {
        setActiveView('home');
        setSelectedArtwork(null);
      }
    };

    // Initial check on page load
    syncRouteFromLocation();

    // Browser back / forward button handling
    window.addEventListener('popstate', syncRouteFromLocation);

    // Subscribe to overall hero metrics dynamically from approved artworks
    const unsubscribe = subscribeToApprovedArtworks((list) => {
      const likes = list.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
      setHeroStats({
        totalWorks: list.length,
        totalLikes: likes,
        totalCategories: DEFAULT_CATEGORIES.length - 1
      });
    }, 'الكل', '', 'newest', 500);

    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation);
      unsubscribe();
    };
  }, []);

  const handleSelectArtwork = (art: Artwork) => {
    setSelectedArtwork(art);
    setPublicArtworkId(art.id);
    setActiveView('artwork_detail');
    // Update document title and browser URL without full reload
    document.title = `${art.title} - بريشة الفنان ${art.artistName || art.userName} | معرض الفنون`;
    window.history.pushState({}, '', `/art/${art.id}`);
  };

  const handleCloseDetailModal = () => {
    setSelectedArtwork(null);
    if (activeView === 'home') {
      document.title = 'معرض الفنون - منصة الفنانين والمصورين العرب';
      window.history.pushState({}, '', '/');
    } else if (activeView === 'artworks') {
      document.title = 'المعرض العام للأعمال المقبولة - منصة الفنانين والمصورين العرب';
      window.history.pushState({}, '', '/artworks');
    } else if (activeView === 'profile') {
      document.title = 'ملفي الشخصي | معرض الفنون';
      window.history.pushState({}, '', '/profile');
    } else if (activeView === 'admin') {
      document.title = 'لوحة الإدارة | معرض الفنون';
      window.history.pushState({}, '', '/admin');
    }
  };

  const handleSelectArtworkById = (artId: string, fallbackNotif?: any) => {
    if (!artId && !fallbackNotif) return;

    fetchArtworkById(artId).then((art) => {
      if (art) {
        handleSelectArtwork(art);
      } else {
        fetchApprovedArtworks('الكل').then((allArtworks) => {
          const matched = allArtworks.find(
            (a) => a.id === artId || (fallbackNotif?.artTitle && a.title === fallbackNotif.artTitle)
          );

          if (matched) {
            handleSelectArtwork(matched);
          } else if (fallbackNotif) {
            const fallbackArt: Artwork = {
              id: artId || `art_${Date.now()}`,
              title: fallbackNotif.artTitle || fallbackNotif.title || 'عمل فني',
              imageUrl: fallbackNotif.artImageUrl || '',
              artistName: fallbackNotif.actorName || fallbackNotif.senderName || 'فنان المعرض',
              userName: fallbackNotif.actorName || fallbackNotif.senderName || 'فنان المعرض',
              userId: fallbackNotif.actorId || 'unknown',
              description: fallbackNotif.message || '',
              category: 'لوحات فنية',
              tags: [],
              status: 'approved',
              likesCount: 0,
              commentsCount: 0,
              createdAt: fallbackNotif.createdAt || new Date().toISOString()
            };
            handleSelectArtwork(fallbackArt);
          }
        });
      }
    });
  };

  const handleNavigateHome = () => {
    setActiveView('home');
    setSelectedArtwork(null);
    document.title = 'معرض الفنون - منصة الفنانين والمصورين العرب';
    window.history.pushState({}, '', '/');
  };

  const handleNavigateGallery = () => {
    setActiveView('artworks');
    setSelectedArtwork(null);
    document.title = 'المعرض العام للأعمال المقبولة - منصة الفنانين والمصورين العرب';
    window.history.pushState({}, '', '/artworks');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200" dir="rtl">
      
      {/* Navigation Header */}
      <Navbar 
        activeView={activeView} 
        setActiveView={(view) => {
          setActiveView(view);
          setSelectedArtwork(null);
          if (view === 'home') window.history.pushState({}, '', '/');
          if (view === 'artworks') window.history.pushState({}, '', '/artworks');
          if (view === 'profile') window.history.pushState({}, '', '/profile');
          if (view === 'admin') window.history.pushState({}, '', '/admin');
        }} 
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        onSelectArtwork={handleSelectArtworkById}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeView === 'home' && (
          <div className="space-y-4">
            <HeroSection
              onExploreClick={() => {
                const galleryEl = document.getElementById('gallery-section');
                if (galleryEl) {
                  galleryEl.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              onSelectArtwork={handleSelectArtwork}
              stats={heroStats}
            />

            <div id="gallery-section">
              <GalleryGrid 
                onSelectArtwork={handleSelectArtwork} 
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </div>
        )}

        {activeView === 'artworks' && (
          <PublicGalleryPage
            onSelectArtwork={handleSelectArtwork}
            onNavigateHome={handleNavigateHome}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}

        {activeView === 'artwork_detail' && (
          <PublicArtworkPage
            artworkId={publicArtworkId || (selectedArtwork?.id || '')}
            onNavigateHome={handleNavigateHome}
            onNavigateGallery={handleNavigateGallery}
            onSelectArtwork={handleSelectArtwork}
            onSelectArtist={(artistName) => {
              setSelectedCategory('الكل');
              setActiveView('artworks');
              window.history.pushState({}, '', '/artworks');
            }}
          />
        )}

        {activeView === 'profile' && (
          <MyProfilePage onSelectArtwork={handleSelectArtwork} />
        )}

        {activeView === 'admin' && (
          <AdminDashboard onSelectArtwork={handleSelectArtwork} />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals & Overlays */}
      <UploadModal onSuccess={() => setActiveView('profile')} />
      <AuthModal />
      <ThemeSettingsModal />
      <NotificationToastContainer onSelectArtwork={handleSelectArtworkById} />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
