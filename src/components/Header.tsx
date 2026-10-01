import React, { useState } from 'react';
import {
  RefreshCw,
  Menu,
  X,
  User as UserIcon,
  ChevronDown,
  Info,
  HelpCircle,
  LogOut,
  Home,
  Key,
  Settings
} from 'lucide-react';
import { ConnectionStatus } from '../types';
import { Language, translations } from '../utils/i18n';
import { User } from '../firebase/config';
import { DriveSyncStatusType } from '../services/googleDriveService';

interface HeaderProps {
  currentTab: 'home' | 'auth' | 'video_prompts_tool' | 'text_voice_tool' | 'thumbnail_tool' | 'story_prompts_tool' | 'movie_recap_tool' | 'text_to_image_tool' | 'editor' | 'settings' | 'account' | 'about' | 'contact';
  onSelectTab: (tab: 'home' | 'auth' | 'video_prompts_tool' | 'text_voice_tool' | 'thumbnail_tool' | 'story_prompts_tool' | 'movie_recap_tool' | 'text_to_image_tool' | 'editor' | 'settings' | 'account' | 'about' | 'contact') => void;
  apiKeyStatus: ConnectionStatus;
  hasApiKey: boolean;
  language: Language;
  onToggleLanguage: () => void;
  user: User | null;
  onLogout: () => void;
  driveSyncState?: DriveSyncStatusType;
  isDriveConnected?: boolean;
  onConnectDrive?: () => void;
  onManualDriveSync?: () => void;
  onSignUpClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  apiKeyStatus,
  language,
  onToggleLanguage,
  user,
  onLogout,
  onSignUpClick
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const t = translations[language];

  const getCompactApiStatusBadge = () => {
    switch (apiKeyStatus) {
      case 'Connected':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="hidden min-[420px]:inline">{t.connected}</span>
          </span>
        );
      case 'Testing':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
            <RefreshCw className="w-2.5 h-2.5 animate-spin shrink-0" />
            <span className="hidden min-[420px]:inline">{t.testingKey}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span className="hidden sm:inline">{t.noApiKey}</span>
            <span className="inline sm:hidden">No API</span>
          </span>
        );
    }
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'MKP BURMESE';
  const displayEmail = user?.email || 'mkpburmese@gmail.com';

  const handleNavClick = (tab: HeaderProps['currentTab']) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
      {/* Container without overflow clipping to allow absolute dropdown menus to render without clipping */}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 relative">
        {/* ================= LEFT: APP LOGO ================= */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none shrink-0"
        >
          <img src="/favicon.png" alt="MKP VidPrompts" className="w-8 h-8 sm:w-9 sm:h-9 object-contain bg-transparent drop-shadow-sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white group-hover:text-sky-400 transition-colors whitespace-nowrap">
                MKP VidPrompts <span className="hidden sm:inline text-sky-400 font-semibold text-xs sm:text-sm">Master</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium hidden md:block truncate">
              AI Creator Platform
            </p>
          </div>
        </div>

        {/* ================= GUEST / LOGGED-OUT STATE ================= */}
        {!user && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition-colors shadow-sm cursor-pointer select-none"
              title={language === 'mm' ? 'Switch to English' : 'Switch to Burmese'}
            >
              <span>{language === 'mm' ? '🇲🇲 MM' : '🇺🇸 EN'}</span>
            </button>

            {/* Sign Up / Login Action Button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onSignUpClick) {
                  onSignUpClick();
                } else {
                  onSelectTab('auth');
                }
              }}
              className="relative z-30 cursor-pointer pointer-events-auto px-3.5 py-1.5 sm:px-4 sm:py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 whitespace-nowrap"
            >
              {language === 'mm' ? 'အကောင့်ဖွင့်မည်' : 'Sign Up'}
            </button>
          </div>
        )}

        {/* ================= AUTHENTICATED / LOGGED-IN STATE ================= */}
        {user && (
          <>
            {/* 1. DESKTOP CENTER NAVIGATION LINKS (Visible on lg: screens and above) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold text-zinc-300">
              <button
                type="button"
                onClick={() => handleNavClick('home')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'home'
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold'
                    : 'hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>{t.home}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('settings')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'settings'
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold'
                    : 'hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>{t.apiSettings}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('contact')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'contact'
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold'
                    : 'hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{t.helpAndSupport}</span>
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('about')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'about'
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold'
                    : 'hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>{t.about}</span>
              </button>
            </nav>

            {/* 2. DESKTOP RIGHT CONTROLS (Visible on lg: screens and above) */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {/* API Status Badge */}
              <button
                type="button"
                onClick={() => handleNavClick('settings')}
                className="flex items-center transition-transform hover:scale-105 cursor-pointer"
                title={language === 'mm' ? 'API Key ဆက်တင်များ' : 'API Key Settings'}
              >
                {getCompactApiStatusBadge()}
              </button>

              {/* Language Selector */}
              <button
                type="button"
                onClick={onToggleLanguage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition-colors shadow-sm cursor-pointer select-none"
                title={language === 'mm' ? 'Switch to English' : 'Switch to Burmese'}
              >
                <span>{language === 'mm' ? '🇲🇲 MM' : '🇺🇸 EN'}</span>
              </button>

              {/* User Profile Dropdown Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm select-none"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-zinc-950 font-black text-[11px] shadow-sm shrink-0">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{displayName}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Small Desktop Profile Dropdown (User Email, Account Settings, Logout ONLY) */}
                {profileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn pointer-events-auto">
                      {/* User Email header */}
                      <div className="px-4 py-2 border-b border-zinc-900">
                        <p className="text-xs font-bold text-white truncate">{displayName}</p>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5">{displayEmail}</p>
                      </div>

                      {/* Account Settings ONLY */}
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => handleNavClick('account')}
                          className="w-full px-4 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t.accountSettings}</span>
                        </button>
                      </div>

                      {/* Logout ONLY */}
                      <div className="pt-1 border-t border-zinc-900">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full px-4 py-2 text-left text-xs text-rose-400 hover:bg-zinc-900 flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{t.logout}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 3. MOBILE & TABLET RIGHT CONTROLS (Visible below lg: breakpoint, lg:hidden) */}
            <div className="flex lg:hidden items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Compact API Status Badge */}
              <button
                type="button"
                onClick={() => handleNavClick('settings')}
                className="flex items-center cursor-pointer shrink-0"
              >
                {getCompactApiStatusBadge()}
              </button>

              {/* Language Selector */}
              <button
                type="button"
                onClick={onToggleLanguage}
                className="flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition-colors shadow-sm cursor-pointer select-none shrink-0"
              >
                <span>{language === 'mm' ? '🇲🇲' : '🇺🇸'}</span>
              </button>

              {/* Prominent Hamburger Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className={`p-2 rounded-xl transition-all cursor-pointer shadow-sm shrink-0 border ${
                  mobileMenuOpen
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700/60 text-white'
                }`}
                title={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ================= MOBILE & TABLET SLIDE-OUT / DROPDOWN DRAWER (lg:hidden) ================= */}
      {user && mobileMenuOpen && (
        <div className="lg:hidden border-t border-zinc-800 bg-zinc-950/98 px-4 py-4 space-y-3 animate-fadeIn backdrop-blur-xl">
          {/* User Info Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-zinc-900">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-zinc-950 font-black text-xs shadow-md shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">{displayEmail}</p>
            </div>
          </div>

          {/* Navigation Links in exact order */}
          <div className="space-y-1">
            {/* Home */}
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                currentTab === 'home'
                  ? 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Home className="w-4 h-4 text-amber-400" />
              <span>{t.home}</span>
            </button>

            {/* API Settings */}
            <button
              type="button"
              onClick={() => handleNavClick('settings')}
              className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>{t.apiSettings}</span>
            </button>

            {/* Help & Support */}
            <button
              type="button"
              onClick={() => handleNavClick('contact')}
              className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                currentTab === 'contact'
                  ? 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>{t.helpAndSupport}</span>
            </button>

            {/* About */}
            <button
              type="button"
              onClick={() => handleNavClick('about')}
              className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                currentTab === 'about'
                  ? 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>{t.about}</span>
            </button>

            {/* Account */}
            <button
              type="button"
              onClick={() => handleNavClick('account')}
              className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                currentTab === 'account'
                  ? 'bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4 text-amber-400" />
              <span>{t.account}</span>
            </button>
          </div>

          {/* Logout */}
          <div className="pt-2 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-rose-400 hover:bg-zinc-900 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.logout}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
