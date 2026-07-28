import React, { useState } from 'react';
import { Sparkles, Heart, PhoneCall, Mail } from 'lucide-react';
import { ContactModal } from './ContactModal';

export const Footer: React.FC = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <footer className="bg-[var(--bg-card)] border-t border-[var(--border-card)] py-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        
        {/* Brand */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold font-serif text-slate-900 dark:text-white">معرض الفنون</span>
        </div>

        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          المنصة العربية الفنية الأولى لنشر وتوثيق أروع اللوحات، الرسم الرقمي، الصور الفوتوغرافية، والفنون التشكيلية المعاصرة.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setIsContactOpen(true)}
            className="px-4 py-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 font-bold text-xs flex items-center gap-2 transition-all"
          >
            <Mail className="w-4 h-4" />
            اتصل بنا (تواصل مع المنشئ)
          </button>
        </div>

        <div className="pt-4 border-t border-[var(--border-card)] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} معرض الفنون - جميع الحقوق محفوظة للفنانين والمبدعين.</p>
          
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-[var(--border-card)]">
            <PhoneCall className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>إعداد المهندس هاني بيومي</span>
            <span className="font-mono text-[var(--color-primary)] dir-ltr font-bold">01276502639</span>
          </div>
        </div>

      </div>

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </footer>
  );
};

