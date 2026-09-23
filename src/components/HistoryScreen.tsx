import React, { useState } from 'react';
import {
  History,
  Sprout,
  ShieldAlert,
  Trash2,
  Calendar,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Language, t } from '../utils/translations';
import { HistoryRecord, historyService } from '../services/historyService';
import { voiceService } from '../services/voiceService';

interface HistoryScreenProps {
  locale: Language;
  records: HistoryRecord[];
  onReload: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  locale,
  records,
  onReload,
}) => {
  const [filter, setFilter] = useState<'all' | 'crop' | 'health'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredRecords = records.filter((r) =>
    filter === 'all' ? true : r.type === filter
  );

  const handleDelete = (id: number) => {
    historyService.delete(id);
    onReload();
  };

  const handleClearAll = () => {
    if (records.length === 0) return;
    if (confirm('Clear all saved screening records?')) {
      historyService.clear();
      onReload();
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(locale === 'ha' ? 'ha-NG' : 'en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1f7a4c]">
            {t(locale, 'history')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {records.length} saved diagnostic screenings
          </p>
        </div>

        {records.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            {t(locale, 'clearAll')}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'crop', 'health'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setFilter(tabKey)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer border ${
              filter === tabKey
                ? 'bg-[#1f7a4c] text-white border-[#1f7a4c]'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            {tabKey === 'all'
              ? t(locale, 'allGuidance')
              : tabKey === 'crop'
              ? t(locale, 'crop')
              : t(locale, 'health')}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3 pt-1">
        {filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
            <History className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-semibold">{t(locale, 'noHistory')}</p>
            <p className="text-xs text-slate-400 mt-1">
              Screenings conducted in the Crop or Health tabs will appear here.
            </p>
          </div>
        ) : (
          filteredRecords.map((item) => {
            const isCrop = item.type === 'crop';
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-4 flex items-start justify-between cursor-pointer hover:bg-slate-50/50"
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isCrop
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {isCrop ? (
                        <Sprout className="w-5 h-5" />
                      ) : (
                        <ShieldAlert className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800 capitalize">
                        {item.title}
                      </h2>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700 capitalize">
                          {isCrop ? t(locale, 'crop') : t(locale, 'health')}
                        </span>
                        <span>·</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      title={t(locale, 'deleteRecord')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/40 text-xs text-slate-700 space-y-3">
                    {item.confidence > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>{t(locale, 'confidence')}</span>
                          <span>{(item.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className={`h-full rounded-full ${
                              isCrop ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(100, item.confidence * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {item.detail && (
                      <div>
                        <span className="font-bold text-slate-500 uppercase block text-[10px]">
                          Reported Signs / Breakdown
                        </span>
                        <p className="mt-0.5 whitespace-pre-line text-slate-800 font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                          {item.detail}
                        </p>
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-slate-500 uppercase block text-[10px]">
                        {t(locale, 'advice')}
                      </span>
                      <p className="mt-0.5 whitespace-pre-line text-slate-800 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                        {item.advice}
                      </p>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() =>
                          voiceService.speak(`${item.title}. ${item.advice}`, locale)
                        }
                        className="flex items-center space-x-1.5 text-xs text-emerald-800 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors font-medium cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{t(locale, 'speakResult')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
