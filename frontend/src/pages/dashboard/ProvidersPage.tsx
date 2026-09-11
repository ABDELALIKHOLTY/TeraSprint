import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateApiKeys, fetchModels } from '../../services/api';
import { Bot, Key, Search, ToggleLeft, ToggleRight, CheckCircle2, ChevronRight, Save, LayoutGrid } from 'lucide-react';

export const ProvidersPage: React.FC = () => {
  const { user } = useAuth();
  
  // API Keys State
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [openRouterKeyInput, setOpenRouterKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [hasGroqKey, setHasGroqKey] = useState(false);
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  // Models State
  const [models, setModels] = useState<any[]>([]);
  const [hiddenModels, setHiddenModels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);

  // General Filter State (maintained for backward compatibility with other parts of the app)
  const [showGroq, setShowGroq] = useState(() => localStorage.getItem('filter_showGroq') !== 'false');
  const [showGemini, setShowGemini] = useState(() => localStorage.getItem('filter_showGemini') !== 'false');
  const [showOrFree, setShowOrFree] = useState(() => localStorage.getItem('filter_showOrFree') !== 'false');
  const [showOrPremium, setShowOrPremium] = useState(() => localStorage.getItem('filter_showOrPremium') === 'true');

  useEffect(() => {
    if (user) {
      setHasGroqKey(user.has_groq_key || false);
      // @ts-ignore
      setHasOpenRouterKey(user.has_openrouter_key || false);
      // @ts-ignore
      setHasGeminiKey(user.has_gemini_key || false);
    }
  }, [user]);

  const loadModelsData = async () => {
    try {
      const storedHidden = localStorage.getItem('filter_hiddenModels');
      if (storedHidden) setHiddenModels(JSON.parse(storedHidden));
      
      setLoadingModels(true);
      const data = await fetchModels();
      if (data) setModels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadModelsData();
  }, []);

  const handleSaveKeys = async () => {
    setSavingKey(true);
    try {
      await updateApiKeys(groqKeyInput, openRouterKeyInput, geminiKeyInput);
      if (groqKeyInput.trim()) setHasGroqKey(true);
      if (openRouterKeyInput.trim()) setHasOpenRouterKey(true);
      if (geminiKeyInput.trim()) setHasGeminiKey(true);
      setGroqKeyInput('');
      setOpenRouterKeyInput('');
      setGeminiKeyInput('');
      
      // Dispatch event to refresh models if keys changed globally
      window.dispatchEvent(new Event('apiKeysChanged'));
      
      // Reload models locally to reflect the newly unlocked provider
      await loadModelsData();
    } catch (err) {
      alert("Erreur lors de la sauvegarde des clés.");
    } finally {
      setSavingKey(false);
    }
  };

  const toggleModel = (modelId: string) => {
    setHiddenModels((prev) => {
      let newHidden;
      if (prev.includes(modelId)) newHidden = prev.filter(id => id !== modelId);
      else newHidden = [...prev, modelId];
      
      localStorage.setItem('filter_hiddenModels', JSON.stringify(newHidden));
      window.dispatchEvent(new Event('modelFiltersChanged'));
      return newHidden;
    });
  };

  const toggleProviderFilter = (type: 'groq' | 'gemini' | 'orFree' | 'orPremium', currentState: boolean) => {
    const newState = !currentState;
    if (type === 'groq') { setShowGroq(newState); localStorage.setItem('filter_showGroq', String(newState)); }
    if (type === 'gemini') { setShowGemini(newState); localStorage.setItem('filter_showGemini', String(newState)); }
    if (type === 'orFree') { setShowOrFree(newState); localStorage.setItem('filter_showOrFree', String(newState)); }
    if (type === 'orPremium') { setShowOrPremium(newState); localStorage.setItem('filter_showOrPremium', String(newState)); }
    window.dispatchEvent(new Event('modelFiltersChanged'));
  };

  const allowedProviders = [];
  if (hasGroqKey) allowedProviders.push('groq');
  if (hasOpenRouterKey) allowedProviders.push('openrouter');
  if (hasGeminiKey) allowedProviders.push('gemini');

  const handleHideAll = () => {
    const allAllowedIds = models.filter(m => allowedProviders.includes(m.provider)).map(m => m.id);
    setHiddenModels(allAllowedIds);
    localStorage.setItem('filter_hiddenModels', JSON.stringify(allAllowedIds));
    window.dispatchEvent(new Event('modelFiltersChanged'));
  };

  const handleShowAll = () => {
    setHiddenModels([]);
    localStorage.setItem('filter_hiddenModels', JSON.stringify([]));
    window.dispatchEvent(new Event('modelFiltersChanged'));
  };

  const modelsToShow = models.filter(m => {
    // Basic Search
    const isSearching = searchQuery.trim().length > 0;
    const matchSearch = isSearching ? (m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.id.toLowerCase().includes(searchQuery.toLowerCase())) : true;
    
    // Check if the provider is allowed based on configured keys
    const isAllowedProvider = allowedProviders.includes(m.provider);

    // Apply category filters
    let passesCategoryFilter = true;
    if (m.provider === 'groq' && !showGroq) passesCategoryFilter = false;
    if (m.provider === 'gemini' && !showGemini) passesCategoryFilter = false;
    if (m.provider === 'openrouter') {
      if (m.badge === 'OR Premium' && !showOrPremium) passesCategoryFilter = false;
      if (m.badge === 'OR Free' && !showOrFree) passesCategoryFilter = false;
    }

    // If actively searching, search overrides category filters
    if (isSearching) {
      return matchSearch && isAllowedProvider;
    }

    return isAllowedProvider && passesCategoryFilter;
  });

  const groupedModels = modelsToShow.reduce((acc: any, model: any) => {
    const groupName = model.badge || model.provider || 'Autres';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(model);
    return acc;
  }, {});

  return (
    <div className="absolute inset-0 overflow-x-hidden overflow-y-auto custom-scrollbar p-6 lg:p-10 bg-white dark:bg-[#0c0c0e]">
      <div className="max-w-7xl mx-auto space-y-12 pb-16">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <LayoutGrid className="w-8 h-8 mr-3 text-cyan-500" />
            Providers & Modèles IA
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-3xl">
            Gérez vos fournisseurs d'intelligence artificielle. Ajoutez vos clés API pour débloquer l'accès aux modèles, puis filtrez finement les modèles que vous souhaitez utiliser dans vos espaces de travail.
          </p>
        </div>

        {/* API KEYS SECTION */}
        <section>
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 dark:border-[#27272a] pb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Key className="w-5 h-5 mr-2 text-cyan-500" />
              Configuration des Providers (Clés API)
            </h2>
            <button
              onClick={handleSaveKeys}
              disabled={savingKey || (!groqKeyInput.trim() && !openRouterKeyInput.trim() && !geminiKeyInput.trim())}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {savingKey ? 'Sauvegarde...' : 'Enregistrer les clés'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* OpenRouter Card */}
            <div className={`p-6 rounded-2xl border transition-all ${hasOpenRouterKey ? 'bg-cyan-50/30 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800/50' : 'bg-gray-50 dark:bg-[#121214] border-gray-200 dark:border-[#27272a]'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">OpenRouter</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Recommandé pour le code (Claude, GPT-4)</p>
                </div>
                {hasOpenRouterKey && (
                  <span className="flex items-center text-[10px] uppercase tracking-wider font-bold text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full border border-green-200 dark:border-green-800/50">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Configuré
                  </span>
                )}
              </div>
              <input
                type="password"
                value={openRouterKeyInput}
                onChange={(e) => setOpenRouterKeyInput(e.target.value)}
                placeholder={hasOpenRouterKey ? "••••••••••••••••••••" : "sk-or-v1-..."}
                className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
              />
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-[#27272a] pt-3">
                <span className="text-xs font-semibold text-gray-500">Filtrage Rapide</span>
                <div className="flex space-x-2">
                  <button onClick={() => toggleProviderFilter('orFree', showOrFree)} className={`text-xs px-2 py-1 rounded border ${showOrFree ? 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-800 dark:text-cyan-400' : 'bg-transparent border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400'}`}>Gratuits</button>
                  <button onClick={() => toggleProviderFilter('orPremium', showOrPremium)} className={`text-xs px-2 py-1 rounded border ${showOrPremium ? 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-800 dark:text-cyan-400' : 'bg-transparent border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400'}`}>Premium</button>
                </div>
              </div>
            </div>

            {/* Groq Card */}
            <div className={`p-6 rounded-2xl border transition-all ${hasGroqKey ? 'bg-cyan-50/30 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800/50' : 'bg-gray-50 dark:bg-[#121214] border-gray-200 dark:border-[#27272a]'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">Groq</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Génération ultra-rapide (Llama 3)</p>
                </div>
                {hasGroqKey && (
                  <span className="flex items-center text-[10px] uppercase tracking-wider font-bold text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full border border-green-200 dark:border-green-800/50">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Configuré
                  </span>
                )}
              </div>
              <input
                type="password"
                value={groqKeyInput}
                onChange={(e) => setGroqKeyInput(e.target.value)}
                placeholder={hasGroqKey ? "••••••••••••••••••••" : "gsk_..."}
                className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
              />
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-[#27272a] pt-3">
                <span className="text-xs font-semibold text-gray-500">Filtrage Rapide</span>
                <button onClick={() => toggleProviderFilter('groq', showGroq)} className={`text-xs px-2 py-1 rounded border ${showGroq ? 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-800 dark:text-cyan-400' : 'bg-transparent border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400'}`}>Activer tout Groq</button>
              </div>
            </div>

            {/* Gemini Card */}
            <div className={`p-6 rounded-2xl border transition-all ${hasGeminiKey ? 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50' : 'bg-gray-50 dark:bg-[#121214] border-gray-200 dark:border-[#27272a]'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">Google AI Studio</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Modèles natifs (Gemini 1.5 Pro)</p>
                </div>
                {hasGeminiKey && (
                  <span className="flex items-center text-[10px] uppercase tracking-wider font-bold text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full border border-green-200 dark:border-green-800/50">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Configuré
                  </span>
                )}
              </div>
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder={hasGeminiKey ? "••••••••••••••••••••" : "AIzaSy..."}
                className="w-full bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
              />
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-[#27272a] pt-3">
                <span className="text-xs font-semibold text-gray-500">Filtrage Rapide</span>
                <button onClick={() => toggleProviderFilter('gemini', showGemini)} className={`text-xs px-2 py-1 rounded border ${showGemini ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' : 'bg-transparent border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400'}`}>Activer tout Google</button>
              </div>
            </div>

          </div>
        </section>

        {/* INDIVIDUAL MODELS SECTION */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 border-b border-gray-200 dark:border-[#27272a] pb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Bot className="w-5 h-5 mr-2 text-cyan-500" />
              Sélection Détaillée des Modèles
            </h2>
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-0 w-full sm:w-auto">
              <button 
                onClick={handleShowAll}
                className="px-3 py-1.5 text-xs font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors shrink-0"
              >
                Tout sélectionner
              </button>
              <button 
                onClick={handleHideAll}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-[#1a1a1f] dark:text-gray-300 border border-gray-200 dark:border-[#3f3f46] rounded-lg hover:bg-gray-200 dark:hover:bg-[#27272a] transition-colors shrink-0"
              >
                Tout désélectionner
              </button>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Rechercher par nom ou ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#3f3f46] text-gray-900 dark:text-gray-100 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition-colors shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Alert if no provider keys are configured (and we want to enforce it for external providers) */}
          {!hasGroqKey && !hasOpenRouterKey && !hasGeminiKey && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl mb-6 text-sm text-amber-800 dark:text-amber-200 flex items-start">
              <ChevronRight className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
              <p>Vous n'avez pas configuré de clés API pour Groq, OpenRouter ou Gemini. Veuillez ajouter vos clés dans la section ci-dessus pour débloquer les modèles.</p>
            </div>
          )}

          {loadingModels ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin"></div>
            </div>
          ) : Object.keys(groupedModels).length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-[#121214] rounded-2xl border border-gray-200 dark:border-[#27272a]">
              <p className="text-gray-500 font-medium">Aucun modèle disponible. Veuillez vérifier vos clés API ou votre recherche.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {Object.entries(groupedModels).map(([group, groupModels]: [string, any]) => (
                <div key={group} className="bg-gray-50/50 dark:bg-[#121214]/50 rounded-2xl p-6 border border-gray-100 dark:border-[#27272a]">
                  <div className="flex items-center mb-6">
                    <span className="w-2 h-6 bg-cyan-500 rounded-full mr-3"></span>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                      Famille : {group}
                    </h3>
                    <span className="ml-3 bg-gray-200 dark:bg-[#27272a] text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs font-bold">
                      {groupModels.length} modèles
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groupModels.map((model: any) => {
                      const isVisible = !hiddenModels.includes(model.id);
                      return (
                        <div 
                          key={model.id}
                          onClick={() => toggleModel(model.id)}
                          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 shadow-sm ${
                            isVisible 
                              ? 'bg-white dark:bg-[#1a1a1f] border-cyan-200 dark:border-cyan-800/50 hover:shadow-md' 
                              : 'bg-gray-100 dark:bg-[#0c0c0e] border-gray-200 dark:border-[#27272a] opacity-60 hover:opacity-100 grayscale hover:grayscale-0'
                          }`}
                        >
                          <div className="overflow-hidden flex-1 mr-4">
                            <p className={`text-sm font-bold truncate ${isVisible ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                              {model.name}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate font-mono bg-gray-50 dark:bg-[#121214] inline-block px-1.5 py-0.5 rounded">
                              {model.id}
                            </p>
                          </div>
                          <div className={`${isVisible ? 'text-cyan-500' : 'text-gray-400'}`}>
                            {isVisible ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
