import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { GalleryGrid } from './components/GalleryGrid';
import { ArtworkDetailModal } from './components/ArtworkDetailModal';
import { UploadModal } from './components/UploadModal';
import { AuthModal } from './components/AuthModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { NotificationToastContainer } from './components/NotificationToastContainer';
import { Footer } from './components/Footer';
import { MyProfilePage } from './pages/MyProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { Artwork } from './types';
import { fetchArtworkById, subscribeToApprovedArtworks, DEFAULT_CATEGORIES } from './lib/artworks';


function MainApp() {
  const [activeView, setActiveView] = useState<'home' | 'profile' | 'admin'>('home');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  // Dynamic Hero Stats
  const [heroStats, setHeroStats] = useState({
    totalWorks: 0,
    totalLikes: 0,
    totalCategories: DEFAULT_CATEGORIES.length - 1
  });

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (activeView !== 'home') {
      setActiveView('home');
    }
    setTimeout(() => {
      const galleryEl = document.getElementById('gallery-section');
      if (galleryEl) {
        galleryEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // Handle direct URL navigation to /art/:id & subscribe to realtime stats
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/art/')) {
      const artId = path.split('/art/')[1];
      if (artId) {
        fetchArtworkById(artId).then((art) => {
          if (art) {
            setSelectedArtwork(art);
          }
        });
      }
    }

    // Subscribe to overall hero metrics dynamically from approved artworks
    const unsubscribe = subscribeToApprovedArtworks((list) => {
      const likes = list.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
      setHeroStats({
        totalWorks: list.length,
        totalLikes: likes,
        totalCategories: DEFAULT_CATEGORIES.length - 1
      });
    }, 'الكل', '', 'newest', 500);

    return () => unsubscribe();
  }, []);

  const handleSelectArtwork = (art: Artwork) => {
    setSelectedArtwork(art);
    // Update document title and browser URL without full reload
    document.title = `${art.title} - بريشة الفنان ${art.artistName} | معرض الفنون`;
    window.history.pushState({}, '', `/art/${art.id}`);
  };

  const handleCloseDetailModal = () => {
    setSelectedArtwork(null);
    document.title = 'معرض الفنون - منصة اللوحات والأعمال الفنية العربية';
    window.history.pushState({}, '', '/');
  };

  const handleSelectArtworkById = (artId: string) => {
    fetchArtworkById(artId).then((art) => {
      if (art) {
        handleSelectArtwork(art);
      }
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200" dir="rtl">
      
      {/* Navigation Header */}
      <Navbar 
        activeView={activeView} 
        setActiveView={setActiveView} 
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

        {activeView === 'profile' && (
          <MyProfilePage onSelectArtwork={handleSelectArtwork} />
        )}

        {activeView === 'admin' && (
          <AdminDashboard onSelectArtwork={handleSelectArtwork} />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      <ArtworkDetailModal
        artwork={selectedArtwork}
        onClose={handleCloseDetailModal}
        onSelectArtwork={handleSelectArtwork}
      />

      <UploadModal onSuccess={() => setActiveView('profile')} />
      <AuthModal />
      <ThemeSettingsModal />
      <NotificationToastContainer />


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
