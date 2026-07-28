import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { GalleryGrid } from './components/GalleryGrid';
import { ArtworkDetailModal } from './components/ArtworkDetailModal';
import { UploadModal } from './components/UploadModal';
import { AuthModal } from './components/AuthModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { Footer } from './components/Footer';
import { MyProfilePage } from './pages/MyProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { Artwork } from './types';
import { fetchArtworkById, fetchApprovedArtworks, DEFAULT_CATEGORIES } from './lib/artworks';

function MainApp() {
  const [activeView, setActiveView] = useState<'home' | 'profile' | 'admin'>('home');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  // Hero Stats
  const [heroStats, setHeroStats] = useState({
    totalWorks: 12,
    totalLikes: 48,
    totalCategories: DEFAULT_CATEGORIES.length - 1
  });

  // Handle direct URL navigation to /art/:id
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

    // Load overall hero metrics
    fetchApprovedArtworks('الكل', '', 'newest', 100).then((list) => {
      if (list.length > 0) {
        const likes = list.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
        setHeroStats({
          totalWorks: list.length,
          totalLikes: likes,
          totalCategories: DEFAULT_CATEGORIES.length - 1
        });
      }
    });
  }, []);

  const handleSelectArtwork = (art: Artwork) => {
    setSelectedArtwork(art);
    // Update browser URL without full reload for shareability
    window.history.pushState({}, '', `/art/${art.id}`);
  };

  const handleCloseDetailModal = () => {
    setSelectedArtwork(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200" dir="rtl">
      
      {/* Navigation Header */}
      <Navbar activeView={activeView} setActiveView={setActiveView} />

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
              stats={heroStats}
            />

            <div id="gallery-section">
              <GalleryGrid onSelectArtwork={handleSelectArtwork} />
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
