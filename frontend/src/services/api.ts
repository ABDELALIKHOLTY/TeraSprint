import type { Backlog } from '../types/backlog';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const generateProjectBacklog = async (idea: string, model: string = 'groq_llama3'): Promise<Backlog> => {
  const res = await fetch(`${API_BASE_URL}/projects/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ idea, ai_model: model })
  });

  if (!res.ok) {
    throw new Error('Erreur lors de la génération. (Vérifiez les logs backend)');
  }

  return res.json();
};

export const generateProjectBacklogStream = async (
  idea: string, 
  model: string = 'groq_llama3',
  onProgress: (message: string) => void
): Promise<Backlog> => {
  const res = await fetch(`${API_BASE_URL}/projects/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ idea, ai_model: model })
  });

  if (!res.ok) {
    let errDetail = 'Erreur lors de la génération.';
    try {
      const err = await res.json();
      errDetail = err.detail || err.message || errDetail;
    } catch (e) {}
    throw new Error(errDetail);
  }

  if (!res.body) throw new Error("Le serveur n'a pas retourné de flux de données.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      try {
        const event = JSON.parse(line);
        if (event.type === 'progress') {
          onProgress(event.message);
        } else if (event.type === 'result') {
          return event.data as Backlog;
        } else if (event.type === 'error') {
          throw new Error(event.message);
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.warn("Ligne JSON invalide ignorée:", line);
        } else {
          throw e;
        }
      }
    }
  }

  throw new Error("Le flux s'est terminé sans renvoyer de résultat.");
};

export const negotiateTask = async (taskId: string, message: string, currentTaskData: any, model: string = 'qwen2.5:14b', history: any[] = []): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/graph/refine`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ task_id: taskId, message: message, current_task: currentTaskData, ai_model: model, chat_history: history }),
  });

  if (!response.ok) {
    let errDetail = 'Erreur lors de la négociation avec l\'IA';
    try {
      const err = await response.json();
      errDetail = err.detail || err.message || errDetail;
    } catch (e) {}
    throw new Error(errDetail);
  }

  return response.json();
};
const apiCache = new Map<string, { timestamp: number, data: any }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache duration

export const clearApiCache = () => {
  apiCache.clear();
};

export const apiCall = async (endpoint: string, method: string = 'GET', body: any = null, token?: string | null, forceRefresh: boolean = false): Promise<any> => {
  const cacheKey = `${method}:${endpoint}`;
  
  if (method === 'GET' && !forceRefresh) {
    const cached = apiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }
  }

  const headers: any = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  else Object.assign(headers, getAuthHeaders());
  
  const config: RequestInit = {
    method,
    headers,
  };
  if (body) config.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE_URL}${endpoint}`, config);
  if (!res.ok) {
    let errDetail = 'Erreur API';
    try {
      const err = await res.json();
      errDetail = err.detail || err.message || errDetail;
    } catch (e) {}
    throw new Error(errDetail);
  }
  
  const data = await res.json();
  
  if (method === 'GET') {
    apiCache.set(cacheKey, { timestamp: Date.now(), data });
  } else {
    // Invalidate cache on mutations (POST, PUT, DELETE) 
    // to ensure subsequent GETs fetch fresh data from the database
    apiCache.clear();
  }
  
  return data;
};

export const updateApiKeys = async (groqKey?: string, openRouterKey?: string, geminiKey?: string): Promise<any> => {
  return await apiCall('/auth/me/api-keys', 'PUT', { groq_api_key: groqKey || undefined, openrouter_api_key: openRouterKey || undefined, gemini_api_key: geminiKey || undefined });
};

export const fetchModels = async (): Promise<any[]> => {
  return await apiCall('/projects/models', 'GET');
};

export const fetchFilteredModels = async (): Promise<any[]> => {
  const models = await fetchModels();
  
  const showGroq = localStorage.getItem('filter_showGroq') !== 'false';
  const showGemini = localStorage.getItem('filter_showGemini') !== 'false';
  const showOrFree = localStorage.getItem('filter_showOrFree') !== 'false';
  const showOrPremium = localStorage.getItem('filter_showOrPremium') === 'true';

  let hiddenModels: string[] = [];
  try {
    const stored = localStorage.getItem('filter_hiddenModels');
    if (stored) hiddenModels = JSON.parse(stored);
  } catch (e) {}

  return models.filter(m => {
    if (hiddenModels.includes(m.id)) return false;
    if (m.provider === 'groq' && !showGroq) return false;
    if (m.provider === 'gemini' && !showGemini) return false;
    if (m.provider === 'openrouter') {
      if (m.badge === 'OR Premium' && !showOrPremium) return false;
      if (m.badge === 'OR Free' && !showOrFree) return false;
    }
    return true;
  });
};
