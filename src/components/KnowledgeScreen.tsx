import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Volume2,
  Sprout,
  ShieldAlert,
  Calendar,
  Droplet,
  Egg,
  ExternalLink,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import { KNOWLEDGE_ITEMS, KnowledgeItem } from '../data/knowledgeData';
import { voiceService } from '../services/voiceService';

interface KnowledgeScreenProps {
  locale: Language;
}

type CategoryFilter = 'all' | 'crop' | 'health' | 'farm' | 'water' | 'poultry';

const CATEGORY_STYLES: Record<
  KnowledgeItem['category'],
  { label: string; hausaLabel: string; bg: string; text: string; icon: React.ReactNode }
> = {
  crop: {
    label: 'Crop',
    hausaLabel: 'Amfanin gona',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    text: 'text-[#1f7a4c]',
    icon: <Sprout className="w-3.5 h-3.5 text-emerald-700" />,
  },
  health: {
    label: 'Health',
    hausaLabel: 'Lafiya',
    bg: 'bg-red-50 text-red-800 border-red-200',
    text: 'text-[#b33b3b]',
    icon: <ShieldAlert className="w-3.5 h-3.5 text-red-600" />,
  },
  farm: {
    label: 'Farm planning',
    hausaLabel: 'Tsarin noma',
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'text-[#a0641b]',
    icon: <Calendar className="w-3.5 h-3.5 text-amber-600" />,
  },
  water: {
    label: 'Water safety',
    hausaLabel: 'Tsararren ruwa',
    bg: 'bg-sky-50 text-sky-800 border-sky-200',
    text: 'text-[#16739a]',
    icon: <Droplet className="w-3.5 h-3.5 text-sky-600" />,
  },
  poultry: {
    label: 'Poultry',
    hausaLabel: 'Kaji',
    bg: 'bg-purple-50 text-purple-800 border-purple-200',
    text: 'text-[#8052a6]',
    icon: <Egg className="w-3.5 h-3.5 text-purple-600" />,
  },
};

export const KnowledgeScreen: React.FC<KnowledgeScreenProps> = ({ locale }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);

  const filterTabs: { id: CategoryFilter; key: string }[] = [
    { id: 'all', key: 'allGuidance' },
    { id: 'crop', key: 'cropsCategory' },
    { id: 'health', key: 'healthCategory' },
    { id: 'farm', key: 'farmCategory' },
    { id: 'water', key: 'waterCategory' },
    { id: 'poultry', key: 'poultryCategory' },
  ];

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    return KNOWLEDGE_ITEMS.filter((item) => {
      const matchCat = category === 'all' || item.category === category;
      const matchText =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.hausa && item.hausa.toLowerCase().includes(q)) ||
        item.body.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [search, category]);

  const handleSpeak = async (item: KnowledgeItem) => {
    if (activeSpeechId === item.id) {
      voiceService.stopSpeaking();
      setActiveSpeechId(null);
      return;
    }

    setActiveSpeechId(item.id);
    const textToRead =
      locale === 'ha'
        ? `${item.hausa || item.title}. ${item.body}`
        : `${item.title}. ${item.hausa ? `In Hausa: ${item.hausa}. ` : ''}${item.body}`;
    await voiceService.speak(textToRead, locale);
    setActiveSpeechId(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1f7a4c]">
          {t(locale, 'knowledgeTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          {locale === 'ha'
            ? 'Cikakkun bayanai ba tare da bukatar intanet ba'
            : 'Offline verified agricultural, water, poultry and health guidance'}
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(locale, 'search')}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategory(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
              category === tab.id
                ? 'bg-[#1f7a4c] text-white border-[#1f7a4c]'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {t(locale, tab.key)}
          </button>
        ))}
      </div>

      {/* Cards List */}
      <div className="space-y-3 pt-1">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No matching guidance found.</p>
            <p className="text-xs text-slate-400 mt-1">
              Try searching with a different word or category.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const style = CATEGORY_STYLES[item.category];
            const isSpeaking = activeSpeechId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-emerald-200 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${style.bg}`}
                  >
                    {style.icon}
                    <span>{locale === 'ha' ? style.hausaLabel : style.label}</span>
                  </span>

                  <button
                    onClick={() => handleSpeak(item)}
                    className="flex items-center space-x-1 text-xs text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                    title={t(locale, 'speakResult')}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {isSpeaking ? 'Stop' : t(locale, 'speakResult')}
                    </span>
                  </button>
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">
                    {item.title}
                  </h2>
                  {item.hausa && (
                    <span className="text-xs text-emerald-800 font-semibold block mt-0.5">
                      Hausa: {item.hausa}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {item.body}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {t(locale, 'sourceBasis')}:{' '}
                    <strong className="text-slate-600 font-medium">{item.source}</strong>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
