import React, { useState, useEffect } from 'react';
import {
  getMemoryStats,
  getRecentMemories,
  getImportantMemories,
  searchMemories,
  deleteMemory,
  clearSemanticMemory,
  type MemoryEntry,
  type MemoryStats,
} from '@/lib/memory/semantic-memory';
import {
  getFormDataPreferences,
  getFrequentSites,
  clearAllPreferences,
  type FormFieldPreference,
  type SitePreference,
} from '@/lib/memory/preference-memory';
import {
  getLearningStats,
  getLearnedPatterns,
  deletePattern,
  clearLearningData,
  type LearnedPattern,
} from '@/lib/memory/learning-engine';
import {
  getAllSessions,
  clearAllContextMemory,
  type ConversationSession,
} from '@/lib/memory/context-memory';

type MemoryTab = 'semantic' | 'preferences' | 'learning' | 'conversations';

export const MemoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MemoryTab>('semantic');
  const [loading, setLoading] = useState(true);
  
  // Semantic memory state
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemoryEntry[]>([]);
  
  // Preferences state
  const [formPrefs, setFormPrefs] = useState<FormFieldPreference[]>([]);
  const [frequentSites, setFrequentSites] = useState<SitePreference[]>([]);
  
  // Learning state
  const [learningStats, setLearningStats] = useState<{
    totalPatterns: number;
    avgConfidence: number;
    totalFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
    topPatterns: LearnedPattern[];
  } | null>(null);
  const [patterns, setPatterns] = useState<LearnedPattern[]>([]);
  
  // Conversations state
  const [sessions, setSessions] = useState<ConversationSession[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'semantic':
          const [stats, recent, important] = await Promise.all([
            getMemoryStats(),
            getRecentMemories(20),
            getImportantMemories(10),
          ]);
          setMemoryStats(stats);
          setMemories([...important, ...recent.filter(r => !important.find(i => i.id === r.id))]);
          break;
          
        case 'preferences':
          const [form, sites] = await Promise.all([
            getFormDataPreferences(),
            getFrequentSites(10),
          ]);
          setFormPrefs(form);
          setFrequentSites(sites);
          break;
          
        case 'learning':
          const [lStats, allPatterns] = await Promise.all([
            getLearningStats(),
            getLearnedPatterns(),
          ]);
          setLearningStats(lStats);
          setPatterns(allPatterns);
          break;
          
        case 'conversations':
          const allSessions = await getAllSessions();
          setSessions(allSessions);
          break;
      }
    } catch (error) {
      console.error('Failed to load memory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = await searchMemories(searchQuery, { limit: 20 });
    setSearchResults(results.map(r => r.entry));
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id);
    setMemories(memories.filter(m => m.id !== id));
    setSearchResults(searchResults.filter(m => m.id !== id));
  };

  const handleDeletePattern = async (id: string) => {
    await deletePattern(id);
    setPatterns(patterns.filter(p => p.id !== id));
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all memory data? This cannot be undone.')) {
      return;
    }
    
    await Promise.all([
      clearSemanticMemory(),
      clearAllPreferences(),
      clearLearningData(),
      clearAllContextMemory(),
    ]);
    
    loadData();
  };

  const handleExportMemory = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      semantic: {
        stats: memoryStats,
        memories: memories,
      },
      preferences: {
        formPreferences: formPrefs,
        frequentSites: frequentSites,
      },
      learning: {
        stats: learningStats,
        patterns: patterns,
      },
      conversations: sessions,
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mirmirops-memory-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'semantic' as const, label: 'Semantic', icon: BrainIcon },
    { id: 'preferences' as const, label: 'Preferences', icon: SettingsIcon },
    { id: 'learning' as const, label: 'Learning', icon: TrendingIcon },
    { id: 'conversations' as const, label: 'Sessions', icon: ChatIcon },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Memory</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMemory}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={handleClearAll}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Tabs - horizontally scrollable */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'semantic' && (
            <SemanticMemoryTab
              stats={memoryStats}
              memories={memories}
              searchQuery={searchQuery}
              searchResults={searchResults}
              onSearchChange={setSearchQuery}
              onSearch={handleSearch}
              onDelete={handleDeleteMemory}
            />
          )}
          
          {activeTab === 'preferences' && (
            <PreferencesTab
              formPrefs={formPrefs}
              frequentSites={frequentSites}
            />
          )}
          
          {activeTab === 'learning' && (
            <LearningTab
              stats={learningStats}
              patterns={patterns}
              onDeletePattern={handleDeletePattern}
            />
          )}
          
          {activeTab === 'conversations' && (
            <ConversationsTab sessions={sessions} />
          )}
        </>
      )}
    </div>
  );
};

// Semantic Memory Tab
const SemanticMemoryTab: React.FC<{
  stats: MemoryStats | null;
  memories: MemoryEntry[];
  searchQuery: string;
  searchResults: MemoryEntry[];
  onSearchChange: (q: string) => void;
  onSearch: () => void;
  onDelete: (id: string) => void;
}> = ({ stats, memories, searchQuery, searchResults, onSearchChange, onSearch, onDelete }) => (
  <div className="space-y-4">
    {/* Stats */}
    {stats && (
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Total" value={stats.totalEntries} />
        <StatCard label="Avg Importance" value={(stats.avgImportance * 100).toFixed(0) + '%'} />
        <StatCard 
          label="Types" 
          value={Object.keys(stats.entriesByType).length.toString()} 
        />
      </div>
    )}

    {/* Search */}
    <div className="flex gap-2">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        placeholder="Search memories..."
        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
      <button
        onClick={onSearch}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        Search
      </button>
    </div>

    {/* Results or Memories */}
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {searchResults.length > 0 ? 'Search Results' : 'Recent & Important'}
      </h3>
      {(searchResults.length > 0 ? searchResults : memories).map((memory) => (
        <MemoryCard key={memory.id} memory={memory} onDelete={onDelete} />
      ))}
      {memories.length === 0 && searchResults.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No memories yet. Interact with the agent to build memory.
        </p>
      )}
    </div>
  </div>
);

// Memory Card
const MemoryCard: React.FC<{
  memory: MemoryEntry;
  onDelete: (id: string) => void;
}> = ({ memory, onDelete }) => (
  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <div className="flex justify-between items-start">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white truncate">
          {memory.content.slice(0, 100)}
          {memory.content.length > 100 && '...'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
            {memory.metadata.type}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {(memory.metadata.importance * 100).toFixed(0)}% importance
          </span>
          {memory.metadata.domain && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {memory.metadata.domain}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(memory.id)}
        className="ml-2 p-1 text-gray-400 hover:text-red-600"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Preferences Tab
const PreferencesTab: React.FC<{
  formPrefs: FormFieldPreference[];
  frequentSites: SitePreference[];
}> = ({ formPrefs, frequentSites }) => (
  <div className="space-y-4">
    {/* Form Preferences */}
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Form Data
      </h3>
      {formPrefs.length > 0 ? (
        <div className="space-y-2">
          {formPrefs.map((pref, i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {pref.fieldType}
                  {pref.label && <span className="text-gray-500 ml-1">({pref.label})</span>}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {pref.value.slice(0, 30)}
                  {pref.value.length > 30 && '...'}
                </p>
              </div>
              <span className="text-xs text-gray-500">Priority: {pref.priority}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No form preferences saved yet.
        </p>
      )}
    </div>

    {/* Frequent Sites */}
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Frequent Sites
      </h3>
      {frequentSites.length > 0 ? (
        <div className="space-y-2">
          {frequentSites.map((site, i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-900 dark:text-white">{site.domain}</span>
              <span className="text-xs text-gray-500">{site.visitCount} visits</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No site preferences recorded yet.
        </p>
      )}
    </div>
  </div>
);

// Learning Tab
const LearningTab: React.FC<{
  stats: {
    totalPatterns: number;
    avgConfidence: number;
    totalFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
    topPatterns: LearnedPattern[];
  } | null;
  patterns: LearnedPattern[];
  onDeletePattern: (id: string) => void;
}> = ({ stats, patterns, onDeletePattern }) => (
  <div className="space-y-4">
    {/* Stats */}
    {stats && (
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Patterns" value={stats.totalPatterns} />
        <StatCard label="Feedback" value={stats.totalFeedback} />
        <StatCard 
          label="Positive" 
          value={stats.totalFeedback > 0 
            ? Math.round((stats.positiveFeedback / stats.totalFeedback) * 100) + '%' 
            : '0%'
          } 
        />
      </div>
    )}

    {/* Patterns */}
    <div>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Learned Patterns
      </h3>
      {patterns.length > 0 ? (
        <div className="space-y-2">
          {patterns.slice(0, 20).map((pattern) => (
            <div key={pattern.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {pattern.trigger.intent || pattern.trigger.keywords?.join(', ') || 'Pattern'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    → {pattern.response.action}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    pattern.confidence > 0.7 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : pattern.confidence > 0.4
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {(pattern.confidence * 100).toFixed(0)}%
                  </span>
                  <button
                    onClick={() => onDeletePattern(pattern.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No patterns learned yet. Use the agent and provide feedback to build patterns.
        </p>
      )}
    </div>
  </div>
);

// Conversations Tab
const ConversationsTab: React.FC<{
  sessions: ConversationSession[];
}> = ({ sessions }) => (
  <div className="space-y-2">
    {sessions.length > 0 ? (
      sessions.slice(0, 20).map((session) => (
        <div key={session.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(session.startedAt).toLocaleDateString()} {new Date(session.startedAt).toLocaleTimeString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {session.messages.length} messages
                {session.context.currentTask && ` • Task: ${session.context.currentTask}`}
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {formatTimeAgo(session.lastMessageAt)}
            </span>
          </div>
          {session.summary && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">
              {session.summary}
            </p>
          )}
        </div>
      ))
    ) : (
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        No conversation sessions yet.
      </p>
    )}
  </div>
);

// Stat Card
const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
    <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
  </div>
);

// Icons
const BrainIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TrendingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const ChatIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

// Helper
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default MemoryView;
