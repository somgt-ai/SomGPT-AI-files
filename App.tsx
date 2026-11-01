import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Send,
  Square,
  Paperclip,
  Mic,
  Globe,
  RotateCw,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Edit3,
  X,
  Sparkles,
  ArrowRight,
  BookOpen,
  Search,
  Code2,
  Compass,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Camera,
  Wand2,
  Maximize2,
  Download,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import {
  ChatMessage,
  Conversation,
  AppLanguage,
  AppMode,
  AppSettings,
  Attachment,
  GeneratedImage,
  UserProfile,
} from './types';
import {
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
  getActiveChatId,
  setActiveChatId,
} from './utils/storage';
import {
  apiGetCurrentUser,
  apiLogout,
  apiGetConversations,
  apiSaveConversation,
  apiDeleteConversation,
  apiSendHeartbeat,
  authHeaders,
} from './utils/auth';
import { translations } from './utils/translations';
import { BrandLogo } from './components/BrandLogo';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { GroundingSources } from './components/GroundingSources';
import { VoiceModal } from './components/VoiceModal';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { ExploreModal } from './components/ExploreModal';
import { ImageModal } from './components/ImageModal';
import { ImageStudioModal } from './components/ImageStudioModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { AuthModal } from './components/AuthModal';
import { ComplaintModal } from './components/ComplaintModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { UserMenu } from './components/UserMenu';
import { downloadImage } from './utils/imageUtils';

// 9 Core Image Generation Styles with Photorealistic as Default
const IMAGE_STYLES = [
  { id: 'photorealistic', name: 'Photorealistic (Default)', icon: '📸', desc: 'Ultra-realistic photography, authentic skin & lighting' },
  { id: 'cinematic', name: 'Cinematic Photography', icon: '🎬', desc: 'Dramatic lighting, anamorphic lens, film still' },
  { id: 'portrait', name: 'Professional Portrait', icon: '👤', desc: 'Studio lighting, 85mm f/1.4 shallow depth of field' },
  { id: 'landscape', name: 'Landscape Photography', icon: '🏞️', desc: 'Golden hour, wide angle, hyper-detailed nature' },
  { id: 'product', name: 'Product Photography', icon: '📦', desc: 'Commercial studio lighting, clean background' },
  { id: '3d', name: '3D Rendering', icon: '🧊', desc: 'Octane render, Raytracing, hyper-realistic 3D' },
  { id: 'cartoon', name: 'Cartoon', icon: '🎨', desc: 'Vibrant colors, playful cartoon character styling' },
  { id: 'anime', name: 'Anime', icon: '✨', desc: 'Japanese animation, Makoto Shinkai aesthetic' },
  { id: 'digital_art', name: 'Digital Art', icon: '🖌️', desc: 'Concept art, detailed digital illustration' },
];

export default function App() {
  // App state
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeChatIdState, setActiveChatIdState] = useState<string | null>(getActiveChatId);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Input & message flow state
  const [inputPrompt, setInputPrompt] = useState('');
  const [currentMode, setCurrentMode] = useState<AppMode>('standard');
  const [useSearch, setUseSearch] = useState<boolean>(false);
  const [attachedImage, setAttachedImage] = useState<Attachment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Image Style Selection (Default: Photorealistic)
  const [selectedImageStyle, setSelectedImageStyle] = useState<string>('photorealistic');
  const [showStyleMenu, setShowStyleMenu] = useState<boolean>(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Modals
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<GeneratedImage | null>(null);

  // User Auth & Admin Modals
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register'>('login');
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // TTS audio player tracking
  const [playingAudioMessageId, setPlayingAudioMessageId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Copy feedback state
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyPrompt = (promptText: string, messageId: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPromptId(messageId);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const t = translations[settings.language];

  // Apply theme to document
  useEffect(() => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-[#090d16] text-slate-100 antialiased';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-slate-50 text-slate-900 antialiased';
    }
  }, [settings.theme]);

  // Sync settings
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
  };

  // Auth session hydration and real-time heartbeat
  useEffect(() => {
    apiGetCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
        apiGetConversations().then((dbChats) => {
          if (dbChats && dbChats.length > 0) {
            setConversations(dbChats);
            saveConversations(dbChats);
          }
        });
      }
    });

    apiSendHeartbeat();
    const heartbeatTimer = setInterval(apiSendHeartbeat, 30000);
    return () => clearInterval(heartbeatTimer);
  }, []);

  const handleAuthSuccess = async (user: UserProfile) => {
    setCurrentUser(user);
    try {
      const dbChats = await apiGetConversations();
      if (dbChats && dbChats.length > 0) {
        setConversations(dbChats);
        saveConversations(dbChats);
        setActiveChatIdState(dbChats[0]?.id || null);
        setActiveChatId(dbChats[0]?.id || null);
      } else if (conversations.length > 0) {
        for (const c of conversations) {
          await apiSaveConversation(c);
        }
      }
    } catch (e) {
      console.error('Failed to sync conversations on auth:', e);
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setCurrentUser(null);
    setIsAdminPanelOpen(false);
    setIsComplaintModalOpen(false);
    setConversations([]);
    saveConversations([]);
    setActiveChatIdState(null);
    setActiveChatId(null);
  };

  // Active conversation
  const activeConversation = conversations.find((c) => c.id === activeChatIdState);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isGenerating]);

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Create new chat
  const handleNewChat = (mode: AppMode = 'standard') => {
    setCurrentMode(mode);
    setUseSearch(mode === 'research');
    setAttachedImage(null);
    setInputPrompt('');
    setActiveChatIdState(null);
    setActiveChatId(null);
  };

  // Select existing chat
  const handleSelectChat = (id: string) => {
    setActiveChatIdState(id);
    setActiveChatId(id);
    const selected = conversations.find((c) => c.id === id);
    if (selected) {
      setCurrentMode(selected.mode || 'standard');
      setUseSearch(selected.useSearch ?? (selected.mode === 'research'));
    }
  };

  // Rename chat
  const handleRenameChat = (id: string, newTitle: string) => {
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c
    );
    setConversations(updated);
    saveConversations(updated);

    const changed = updated.find((c) => c.id === id);
    if (changed && currentUser) {
      apiSaveConversation(changed);
    }
  };

  // Delete chat
  const handleDeleteChat = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    saveConversations(updated);
    if (currentUser) {
      apiDeleteConversation(id);
    }
    if (activeChatIdState === id) {
      setActiveChatIdState(null);
      setActiveChatId(null);
    }
  };

  // Clear all chats
  const handleClearAllChats = () => {
    if (currentUser) {
      for (const c of conversations) {
        apiDeleteConversation(c.id);
      }
    }
    setConversations([]);
    saveConversations([]);
    setActiveChatIdState(null);
    setActiveChatId(null);
    setIsSettingsOpen(false);
  };

  // Export chats
  const handleExportChats = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(conversations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `somgpt-ai-chats-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle file / image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Fadlan soo geli sawir (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setAttachedImage({
        id: Math.random().toString(36).slice(2),
        name: file.name,
        mimeType: file.type,
        data: base64Data,
        previewUrl: result,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Stop active generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    if (activeChatIdState) {
      setConversations((prev) => {
        const next = prev.map((conv) => {
          if (conv.id !== activeChatIdState) return conv;
          return {
            ...conv,
            messages: conv.messages.map((m) =>
              m.isStreaming ? { ...m, isStreaming: false, statusMessage: undefined } : m
            ),
          };
        });
        saveConversations(next);
        return next;
      });
    }
  };

  // Helper to update a specific message in state & storage (with optional storage persistence to avoid blocking the main thread during high-frequency streaming)
  const updateAssistantMessage = (
    convId: string,
    messageId: string,
    patch: Partial<ChatMessage>,
    persistToStorage: boolean = false
  ) => {
    setConversations((prev) => {
      const next = prev.map((conv) => {
        if (conv.id !== convId) return conv;
        return {
          ...conv,
          messages: conv.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
        };
      });
      if (persistToStorage) {
        saveConversations(next);
      }
      return next;
    });
  };

  // Send message
  const handleSendMessage = async (textToSend?: string, attachedImgOverride?: Attachment | null) => {
    const prompt = (textToSend !== undefined ? textToSend : inputPrompt).trim();
    const currentAttachment = attachedImgOverride !== undefined ? attachedImgOverride : attachedImage;

    // Prevent empty or multiple concurrent submissions
    if (!prompt && !currentAttachment) return;
    if (isGenerating) return;

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setInputPrompt('');
    setAttachedImage(null);

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      image: currentAttachment
        ? {
            data: currentAttachment.data,
            mimeType: currentAttachment.mimeType,
            previewUrl: currentAttachment.previewUrl,
            name: currentAttachment.name,
          }
        : undefined,
    };

    const assistantPlaceholderId = Math.random().toString(36).slice(2);
    // Display status immediately as required by requirement 3
    const initialStatus = t.status.preparing || 'SomGPT AI is preparing your answer...';

    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
      statusMessage: initialStatus,
    };

    let targetConversationId = activeChatIdState;
    let currentConversationMessages: ChatMessage[] = [];

    if (!targetConversationId) {
      // Create new conversation
      const newTitle = prompt.length > 35 ? prompt.slice(0, 35) + '...' : prompt || 'Image Analysis';
      const newConversation: Conversation = {
        id: Math.random().toString(36).slice(2),
        title: newTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [userMessage, assistantMessage],
        mode: currentMode,
        useSearch: useSearch,
      };

      targetConversationId = newConversation.id;
      setActiveChatIdState(targetConversationId);
      setActiveChatId(targetConversationId);

      currentConversationMessages = [userMessage, assistantMessage];
      const updated = [newConversation, ...conversations];
      setConversations(updated);
      saveConversations(updated);
    } else {
      // Append to active conversation
      const existingConv = conversations.find((c) => c.id === targetConversationId);
      const existingMessages = existingConv ? existingConv.messages : [];
      currentConversationMessages = [...existingMessages, userMessage, assistantMessage];

      const updated = conversations.map((c) =>
        c.id === targetConversationId
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: currentConversationMessages,
            }
          : c
      );
      setConversations(updated);
      saveConversations(updated);
    }

    // Call server API with streaming
    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      // Find reference image if editing is requested and none attached currently
      let referenceImageAttachment = currentAttachment
        ? { data: currentAttachment.data, mimeType: currentAttachment.mimeType }
        : undefined;

      if (!referenceImageAttachment && activeConversation) {
        const lowerPrompt = prompt.toLowerCase();
        const isEditRequest =
          lowerPrompt.includes('edit') ||
          lowerPrompt.includes('improve') ||
          lowerPrompt.includes('change background') ||
          lowerPrompt.includes('make it') ||
          lowerPrompt.includes('convert') ||
          lowerPrompt.includes('hagaaji') ||
          lowerPrompt.includes('beddel') ||
          lowerPrompt.includes('qurxi');

        if (isEditRequest) {
          for (let i = activeConversation.messages.length - 1; i >= 0; i--) {
            const m = activeConversation.messages[i];
            if (m.image?.data) {
              referenceImageAttachment = {
                data: m.image.data,
                mimeType: m.image.mimeType || 'image/jpeg',
              };
              break;
            } else if (m.generatedImage?.url && m.generatedImage.url.includes('base64,')) {
              const parts = m.generatedImage.url.split('base64,');
              const mime = m.generatedImage.url.split(';')[0].replace('data:', '');
              referenceImageAttachment = {
                data: parts[1],
                mimeType: mime || 'image/png',
              };
              break;
            }
          }
        }
      }

      // Prepare previous message history
      const historyPayload = currentConversationMessages
        .filter((m) => m.id !== assistantPlaceholderId)
        .map((m) => ({
          role: m.role,
          text: m.content,
          image: m.image ? { data: m.image.data, mimeType: m.image.mimeType } : undefined,
        }));

      // If a reference image was found for editing, attach it to the latest user message in payload
      if (referenceImageAttachment && historyPayload.length > 0 && !historyPayload[historyPayload.length - 1].image) {
        historyPayload[historyPayload.length - 1].image = referenceImageAttachment;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: authHeaders(),
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: historyPayload,
          mode: currentMode,
          useSearch: useSearch,
          language: settings.language,
          style: selectedImageStyle,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let streamedAnswer = '';
      let collectedSources: any[] = [];
      let generatedImageResult: GeneratedImage | null = null;

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'status' && event.message && !streamedAnswer) {
                  updateAssistantMessage(
                    targetConversationId,
                    assistantPlaceholderId,
                    { statusMessage: event.message },
                    false
                  );
                } else if (event.type === 'image' && event.image) {
                  generatedImageResult = event.image;
                  updateAssistantMessage(
                    targetConversationId,
                    assistantPlaceholderId,
                    { generatedImage: event.image },
                    false
                  );
                } else if (event.type === 'chunk' && event.text) {
                  streamedAnswer += event.text;
                  // Immediately clear status indicator the instant text chunks arrive
                  updateAssistantMessage(
                    targetConversationId,
                    assistantPlaceholderId,
                    {
                      content: streamedAnswer,
                      statusMessage: undefined,
                    },
                    false
                  );
                } else if (event.type === 'grounding' && event.sources) {
                  collectedSources = event.sources;
                  updateAssistantMessage(
                    targetConversationId,
                    assistantPlaceholderId,
                    { sources: collectedSources },
                    false
                  );
                } else if (event.type === 'error') {
                  updateAssistantMessage(
                    targetConversationId,
                    assistantPlaceholderId,
                    {
                      error: event.error || 'Failed to complete generation',
                      isStreaming: false,
                      statusMessage: undefined,
                    },
                    true
                  );
                }
              } catch {}
            }
          }
        }
      }

      // Mark generation as finished and persist complete response to storage
      updateAssistantMessage(
        targetConversationId,
        assistantPlaceholderId,
        {
          content: streamedAnswer,
          generatedImage: generatedImageResult || undefined,
          sources: collectedSources.length > 0 ? collectedSources : undefined,
          isStreaming: false,
          statusMessage: undefined,
        },
        true
      );

      return streamedAnswer;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err);
        updateAssistantMessage(
          targetConversationId,
          assistantPlaceholderId,
          {
            error: err?.message || 'Khalad ayaa dhacay. Fadlan mar kale isku day.',
            isStreaming: false,
            statusMessage: undefined,
          },
          true
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate last response
  const handleRegenerate = async (messageId: string) => {
    if (!activeConversation || isGenerating) return;

    const messageIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    // Find preceding user message
    const prevUserMessage = activeConversation.messages
      .slice(0, messageIndex)
      .reverse()
      .find((m) => m.role === 'user');

    if (!prevUserMessage) return;

    // Remove this message and any subsequent messages
    const trimmedMessages = activeConversation.messages.slice(0, messageIndex);
    const updated = conversations.map((c) =>
      c.id === activeConversation.id ? { ...c, messages: trimmedMessages } : c
    );
    setConversations(updated);
    saveConversations(updated);

    // Resend
    handleSendMessage(prevUserMessage.content, prevUserMessage.image as any);
  };

  // Save edit and resubmit
  const handleSaveEditAndResend = (messageId: string) => {
    if (!activeConversation || !editText.trim()) return;

    const messageIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    // Slice history up to this message
    const trimmed = activeConversation.messages.slice(0, messageIndex);
    const updated = conversations.map((c) =>
      c.id === activeConversation.id ? { ...c, messages: trimmed } : c
    );
    setConversations(updated);
    saveConversations(updated);

    setEditingMessageId(null);
    handleSendMessage(editText.trim());
  };

  // Text-to-speech for AI response
  const handlePlayTTS = async (messageId: string, text: string) => {
    if (playingAudioMessageId === messageId) {
      // Stop current playback
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPlayingAudioMessageId(null);
      return;
    }

    // Stop any existing playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setPlayingAudioMessageId(messageId);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: settings.ttsVoice,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
          currentAudioRef.current = audio;
          audio.onended = () => setPlayingAudioMessageId(null);
          audio.onerror = () => fallbackTTS(messageId, text);
          await audio.play();
          return;
        }
      }
      fallbackTTS(messageId, text);
    } catch {
      fallbackTTS(messageId, text);
    }
  };

  const fallbackTTS = (messageId: string, text: string) => {
    if (!window.speechSynthesis) {
      setPlayingAudioMessageId(null);
      return;
    }
    const clean = text.replace(/[*#`_\[\]]/g, '').slice(0, 500);
    const utterance = new SpeechSynthesisUtterance(clean);
    if (settings.language === 'ar') utterance.lang = 'ar-SA';
    else if (settings.language === 'so') utterance.lang = 'so-SO';
    else utterance.lang = 'en-US';

    utterance.onend = () => setPlayingAudioMessageId(null);
    utterance.onerror = () => setPlayingAudioMessageId(null);
    window.speechSynthesis.speak(utterance);
  };

  // Copy full message
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const modeIcons = {
    standard: Sparkles,
    research: Search,
    study: BookOpen,
    religion: Compass,
    code: Code2,
    image: ImageIcon,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeChatId={activeChatIdState}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        language={settings.language}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenExplore={() => setIsExploreOpen(true)}
        currentMode={currentMode}
        onSelectMode={(m) => {
          setCurrentMode(m);
          setUseSearch(m === 'research');
        }}
        currentUser={currentUser}
        onOpenLogin={() => {
          setAuthModalInitialMode('login');
          setIsAuthModalOpen(true);
        }}
        onOpenRegister={() => {
          setAuthModalInitialMode('register');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminPanelOpen(true)}
        onOpenComplaints={() => setIsComplaintModalOpen(true)}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative bg-[#0b0f17]">
        {/* Top Header Navbar */}
        <header className="h-14 sm:h-16 px-4 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 lg:hidden transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand Logo & Name */}
            <div
              onClick={() => handleNewChat()}
              className="cursor-pointer flex items-center gap-2"
            >
              <BrandLogo size="sm" showText={false} isAnimated={isGenerating} />
              <div className="hidden sm:flex flex-col">
                <span className="font-extrabold text-sm tracking-tight text-white font-['Plus_Jakarta_Sans']">
                  SomGPT AI
                </span>
                <span className="text-[10px] text-cyan-400 font-medium -mt-0.5">
                  {t.modes[currentMode]}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Pills (Desktop) */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
            {(['standard', 'research', 'study', 'religion', 'code'] as AppMode[]).map((mode) => {
              const Icon = modeIcons[mode];
              const isSelected = currentMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setCurrentMode(mode);
                    setUseSearch(mode === 'research');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.modes[mode]}</span>
                </button>
              );
            })}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Web Search Grounding Toggle */}
            <button
              onClick={() => setUseSearch(!useSearch)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                useSearch
                  ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={useSearch ? t.webSearchActive : t.webSearch}
            >
              <Globe className={`w-3.5 h-3.5 ${useSearch ? 'text-cyan-400 animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{t.webSearch}</span>
            </button>

            {/* Voice Mode Button */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500/10 to-teal-500/10 hover:from-cyan-500/20 hover:to-teal-500/20 border border-cyan-500/30 text-cyan-300 transition-all shadow-sm"
              title={t.voiceMode}
            >
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{t.voiceMode}</span>
            </button>

            {/* User Profile & Auth Menu */}
            <UserMenu
              currentUser={currentUser}
              onOpenLogin={() => {
                setAuthModalInitialMode('login');
                setIsAuthModalOpen(true);
              }}
              onOpenRegister={() => {
                setAuthModalInitialMode('register');
                setIsAuthModalOpen(true);
              }}
              onLogout={handleLogout}
              onOpenAdmin={() => setIsAdminPanelOpen(true)}
              onOpenComplaints={() => setIsComplaintModalOpen(true)}
              language={settings.language}
            />
          </div>
        </header>

        {/* Conversation Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:px-8 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Empty Welcome Screen */}
            {(!activeConversation || activeConversation.messages.length === 0) && (
              <div className="py-6 sm:py-10 flex flex-col items-center text-center">
                <BrandLogo size="xl" showText={false} isAnimated={true} />
                
                <h1 className="mt-5 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {t.welcomeHeading}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-xl leading-relaxed">
                  {t.welcomeSub}
                </p>

                {/* Quick Starter Grid */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full text-left">
                  {t.starters.map((item, index) => {
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          setCurrentMode(item.mode);
                          setUseSearch(item.mode === 'research');
                          handleSendMessage(item.desc);
                        }}
                        className="group p-4 rounded-2xl bg-[#0e1626]/80 hover:bg-[#131f36] border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 mb-1">
                            <span>{item.title}</span>
                            <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Message Thread */}
            {activeConversation?.messages.map((message) => {
              const isUser = message.role === 'user';
              const isEditing = editingMessageId === message.id;

              return (
                <div
                  key={message.id}
                  className={`flex w-full ${
                    isUser ? 'justify-end' : 'justify-start items-start gap-3 sm:gap-4'
                  } group`}
                >
                  {/* AI Avatar on LEFT */}
                  {!isUser && (
                    <div className="shrink-0 mt-1">
                      <BrandLogo size="sm" showText={false} isAnimated={message.isStreaming} />
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm transition-all ${
                      isUser
                        ? 'max-w-[85%] sm:max-w-[72%] bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md rounded-tr-sm border border-cyan-400/20'
                        : 'w-full max-w-[95%] sm:max-w-[90%] bg-white dark:bg-[#0f1728] border border-slate-200/90 dark:border-slate-800/90 text-slate-900 dark:text-slate-100 rounded-2xl sm:rounded-3xl rounded-tl-sm'
                    }`}
                  >
                    {/* User Edit Mode */}
                    {isUser && isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-slate-900/90 p-2.5 rounded-xl text-sm text-white border border-cyan-400 focus:outline-none"
                          rows={3}
                        />
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button
                            onClick={() => setEditingMessageId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                          >
                            {t.cancel}
                          </button>
                          <button
                            onClick={() => handleSaveEditAndResend(message.id)}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500 font-semibold text-slate-950 hover:bg-cyan-400"
                          >
                            {t.saveAndSubmit}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Attached Image Preview */}
                        {message.image && (
                          <div className="mb-3 rounded-2xl overflow-hidden border border-white/20 max-w-sm shadow-md">
                            <img
                              src={message.image.previewUrl || `data:${message.image.mimeType};base64,${message.image.data}`}
                              alt={message.image.name || 'Uploaded content'}
                              className="w-full h-auto max-h-60 object-contain bg-black/40 cursor-pointer"
                              onClick={() =>
                                setSelectedLightboxImage({
                                  id: Math.random().toString(36).slice(2),
                                  url: message.image?.previewUrl || `data:${message.image?.mimeType};base64,${message.image?.data}`,
                                  prompt: message.image?.name || 'Uploaded image',
                                })
                              }
                            />
                            {message.image.name && (
                              <div className="p-1.5 bg-black/60 text-[11px] text-slate-300 truncate">
                                {message.image.name}
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI Generated or Edited Image Card */}
                        {message.generatedImage && (
                          <div className="mb-3.5 rounded-2xl overflow-hidden border border-cyan-500/40 bg-slate-950/90 shadow-xl group/img relative">
                            <div className="relative overflow-hidden flex items-center justify-center bg-[#070c16] min-h-[220px]">
                              <img
                                src={message.generatedImage.url}
                                alt={message.generatedImage.prompt}
                                loading="eager"
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  const fallbackUrl = `https://pollinations.ai/p/${encodeURIComponent(message.generatedImage?.expandedPrompt || message.generatedImage?.prompt || 'artwork')}`;
                                  if (target.src !== fallbackUrl) {
                                    target.src = fallbackUrl;
                                  }
                                }}
                                className="w-full max-h-[380px] sm:max-h-[460px] object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
                                onClick={() => setSelectedLightboxImage(message.generatedImage || null)}
                              />

                              {/* Badge */}
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-950/85 text-cyan-300 border border-cyan-500/40 backdrop-blur-md flex items-center gap-1 shadow-md">
                                  <Sparkles className="w-3 h-3 text-cyan-400" />
                                  {message.generatedImage.isEdited
                                    ? settings.language === 'so' ? 'La Hagaajiyay (AI Edited)' : 'AI Edited'
                                    : settings.language === 'so' ? 'AI Sameeyay (AI Generated)' : 'AI Generated'}
                                </span>
                              </div>

                              {/* Action Buttons Overlay */}
                              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setSelectedLightboxImage(message.generatedImage || null)}
                                  className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 backdrop-blur-md shadow-md"
                                  title="Fullscreen Zoom"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => downloadImage(message.generatedImage!.url, `somgpt-${Date.now()}.jpg`)}
                                  className="p-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold backdrop-blur-md shadow-md"
                                  title="Download Image"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Caption Bar with Quick Actions */}
                            <div className="p-2.5 bg-[#090e18] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="text-[11px] text-slate-300 truncate max-w-xs font-medium">
                                {message.generatedImage.prompt}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                {/* Copy Prompt Button */}
                                <button
                                  type="button"
                                  onClick={() => handleCopyPrompt(message.generatedImage!.prompt, message.id)}
                                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-[11px] flex items-center gap-1 transition-colors"
                                  title="Copy Prompt"
                                >
                                  {copiedPromptId === message.id ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">{settings.language === 'so' ? 'La koobiyeey' : 'Copied'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-slate-400" />
                                      <span>{settings.language === 'so' ? 'Koobiyeey' : 'Copy'}</span>
                                    </>
                                  )}
                                </button>

                                {/* Variation Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSendMessage(
                                      settings.language === 'so'
                                        ? `Abuur sawir kale oo la mid ah (variation): ${message.generatedImage!.prompt}`
                                        : settings.language === 'ar'
                                        ? `أنشئ نسخة مختلفة لهذه الصورة: ${message.generatedImage!.prompt}`
                                        : `Create a variation of this image: ${message.generatedImage!.prompt}`
                                    );
                                  }}
                                  className="px-2 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  title="Generate Variation"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>{settings.language === 'so' ? 'Mid Kale' : 'Variation'}</span>
                                </button>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const imgUrl = message.generatedImage!.url;
                                    setAttachedImage({
                                      id: Math.random().toString(36).slice(2),
                                      name: 'Reference-Image.jpg',
                                      mimeType: 'image/jpeg',
                                      data: imgUrl.includes('base64,') ? imgUrl.split('base64,')[1] : '',
                                      previewUrl: imgUrl,
                                    });
                                    setInputPrompt(
                                      settings.language === 'so'
                                        ? 'Hagaaji sawirkan oo '
                                        : settings.language === 'ar'
                                        ? 'عدّل هذه الصورة و '
                                        : 'Improve this image by '
                                    );
                                    textareaRef.current?.focus();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                                >
                                  <Wand2 className="w-3 h-3" />
                                  <span>{settings.language === 'so' ? 'Hagaaji' : 'Edit'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Live Processing Indicator */}
                        {message.isStreaming && !message.content && message.statusMessage && (
                          message.statusMessage.toLowerCase().includes('sawir') || message.statusMessage.toLowerCase().includes('image') ? (
                            <div className="p-3.5 my-2 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900/70 to-blue-950/50 border border-cyan-500/40 shadow-xl space-y-2 animate-pulse">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs truncate">
                                  <Sparkles className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                                  <span className="truncate">{message.statusMessage}</span>
                                </div>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                                  Photorealistic 8K
                                </span>
                              </div>
                              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-1.5 rounded-full animate-pulse" style={{ width: '85%' }}></div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>📸 Hasselblad Medium Format (85mm f/1.4)</span>
                                <span>Flux Realism Neural Diffusion</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 py-1">
                              <Sparkles className="w-4 h-4 animate-spin" />
                              <span>{message.statusMessage}</span>
                            </div>
                          )
                        )}

                        {/* Message Content */}
                        {message.content && (
                          <div className={isUser ? 'text-sm whitespace-pre-wrap leading-relaxed' : ''}>
                            {isUser ? (
                              message.content
                            ) : (
                              <MarkdownRenderer content={message.content} />
                            )}
                          </div>
                        )}

                        {/* Inline Audio Voice Player for AI Response */}
                        {!isUser && message.content && (
                          <AudioPlayerBar
                            text={message.content}
                            voice={settings.ttsVoice}
                            language={settings.language}
                            isPlaying={playingAudioMessageId === message.id}
                            onPlayStateChange={(playing) => {
                              setPlayingAudioMessageId(playing ? message.id : null);
                            }}
                          />
                        )}

                        {/* Error Notice */}
                        {message.error && (
                          <div className="mt-2 p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>{message.error}</span>
                            </div>
                            <button
                              onClick={() => handleRegenerate(message.id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white font-semibold text-xs shrink-0 transition-colors shadow-sm"
                            >
                              {t.tryAgain || 'Try Again'}
                            </button>
                          </div>
                        )}

                        {/* Verified Search Grounding Sources */}
                        {message.sources && message.sources.length > 0 && (
                          <GroundingSources
                            sources={message.sources}
                            language={settings.language}
                          />
                        )}

                        {/* Message Action Toolbar */}
                        <div
                          className={`mt-3 pt-2 border-t flex items-center justify-between text-xs ${
                            isUser ? 'border-white/20 text-white/80' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <span className="text-[10px] opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Copy full text */}
                            <button
                              onClick={() => handleCopyMessage(message.id, message.content)}
                              className="p-1 rounded hover:bg-white/10 transition-colors"
                              title={t.copy}
                            >
                              {copiedMessageId === message.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* User edit button */}
                            {isUser && (
                              <button
                                onClick={() => {
                                  setEditingMessageId(message.id);
                                  setEditText(message.content);
                                }}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                title={t.editMessage}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* AI TTS voice player */}
                            {!isUser && message.content && (
                              <button
                                onClick={() => handlePlayTTS(message.id, message.content)}
                                className={`p-1 rounded hover:bg-white/10 transition-colors ${
                                  playingAudioMessageId === message.id ? 'text-cyan-400' : ''
                                }`}
                                title={
                                  playingAudioMessageId === message.id
                                    ? t.stopAudio
                                    : t.readAloud
                                }
                              >
                                {playingAudioMessageId === message.id ? (
                                  <VolumeX className="w-3.5 h-3.5 text-cyan-400" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Regenerate for AI */}
                            {!isUser && !message.isStreaming && (
                              <button
                                onClick={() => handleRegenerate(message.id)}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                title={t.regenerate}
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Sticky Input Bar at Bottom (Modern ChatGPT Style) */}
        <footer className="p-2.5 sm:p-4 bg-[#090d16]/95 border-t border-slate-800/80 z-20 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Quick Action Pills for Multimodal Capabilities */}
            <div className="flex items-center gap-2 mb-2.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
              <button
                type="button"
                onClick={() => setIsImageStudioOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 transition-all shrink-0 text-xs font-medium shadow-sm hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{settings.language === 'so' ? '🎨 Sawir Dabiici Ah' : settings.language === 'ar' ? '🎨 توليد صورة واقعية' : '🎨 Realistic Image'}</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-slate-600 transition-all shrink-0 text-xs font-medium shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span>{settings.language === 'so' ? '📸 Kaamiro' : settings.language === 'ar' ? '📸 كاميرا' : '📸 Camera'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-slate-600 transition-all shrink-0 text-xs font-medium shadow-sm"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>{settings.language === 'so' ? '🔍 Falanqee Sawir' : settings.language === 'ar' ? '🔍 تحليل صورة' : '🔍 Analyze Image'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-slate-600 transition-all shrink-0 text-xs font-medium shadow-sm"
              >
                <Mic className="w-3.5 h-3.5 text-slate-400" />
                <span>{settings.language === 'so' ? '🎙️ Cod' : settings.language === 'ar' ? '🎙️ تحدث بالصوت' : '🎙️ Voice AI'}</span>
              </button>
            </div>

            {/* Main Interactive Input Card (Modern ChatGPT-style Container) */}
            <div className="relative bg-[#0e1627]/95 border border-slate-800/90 focus-within:border-cyan-500/70 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-2xl transition-all">
              {/* Hidden File Picker */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
              />

              {/* Hidden Camera Picker (Environment / Rear Camera on Mobile) */}
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              {/* Image Attachment Preview Badge */}
              {attachedImage && (
                <div className="mb-2.5 inline-flex items-center gap-2 p-1.5 pr-3 rounded-2xl bg-slate-900/95 border border-cyan-500/40 text-xs text-slate-200 shadow-md">
                  <img
                    src={attachedImage.previewUrl}
                    alt="Thumbnail"
                    className="w-8 h-8 rounded-xl object-cover bg-black ring-1 ring-cyan-500/30"
                  />
                  <div className="flex flex-col text-left pr-1">
                    <span className="truncate max-w-[200px] text-xs font-medium text-slate-200">
                      {attachedImage.name}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {attachedImage.size ? `${Math.round(attachedImage.size / 1024)} KB` : 'Image attached'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Full-width Auto-expanding Textarea with Smooth Typography & RTL/LTR support */}
              <div className="w-full relative px-1">
                <textarea
                  ref={textareaRef}
                  value={inputPrompt}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!isGenerating && (inputPrompt.trim() || attachedImage)) {
                        handleSendMessage();
                      }
                    }
                  }}
                  disabled={isGenerating}
                  dir="auto"
                  rows={1}
                  placeholder={
                    isGenerating
                      ? t.status.preparing
                      : window.innerWidth < 640
                      ? t.inputPlaceholderMobile
                      : t.inputPlaceholder
                  }
                  className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none min-h-[44px] max-h-48 py-1 leading-relaxed disabled:opacity-50 tracking-normal"
                />
              </div>

              {/* Bottom Action Toolbar inside the Card (ChatGPT style) */}
              <div className="flex items-center justify-between gap-1.5 pt-2 mt-1 border-t border-slate-800/60">
                {/* Left Toolbar Actions */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
                    title={t.attachImage || 'Attach Image'}
                  >
                    <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Camera Button */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
                    title={t.takePhoto || 'Camera'}
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Image Style Selector Dropdown / Pill */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowStyleMenu(!showStyleMenu)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        selectedImageStyle === 'photorealistic'
                          ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 hover:border-cyan-400/50'
                          : 'bg-indigo-950/40 text-indigo-300 border-indigo-500/40 hover:border-indigo-400'
                      }`}
                      title="Image Generation Style (Default: Photorealistic)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="hidden sm:inline">
                        {IMAGE_STYLES.find(s => s.id === selectedImageStyle)?.name || '📸 Photorealistic'}
                      </span>
                      <span className="sm:hidden">
                        {IMAGE_STYLES.find(s => s.id === selectedImageStyle)?.icon || '📸'} Style
                      </span>
                    </button>

                    {showStyleMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setShowStyleMenu(false)}
                        />
                        <div className="absolute bottom-full mb-2 left-0 w-64 bg-[#0a101d] border border-cyan-500/40 rounded-2xl p-2 shadow-2xl z-30 animate-in fade-in slide-in-from-bottom-2">
                          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {settings.language === 'so' ? 'Dooro Qaabka Sawirka' : 'Select Image Style'}
                          </div>
                          <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                            {IMAGE_STYLES.map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  setSelectedImageStyle(st.id);
                                  setShowStyleMenu(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                                  selectedImageStyle === st.id
                                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                                    : 'text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span>{st.icon}</span>
                                  <span className="truncate">{st.name}</span>
                                </span>
                                {selectedImageStyle === st.id && (
                                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Advanced Image Studio Button */}
                  <button
                    type="button"
                    onClick={() => setIsImageStudioOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/50 border border-cyan-500/30 transition-colors text-xs font-medium"
                    title={t.imageStudio || 'Image Studio'}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Studio</span>
                  </button>

                  {/* Voice Mode Button */}
                  <button
                    type="button"
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
                    title={t.voiceMode}
                  >
                    <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Right Toolbar Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Web Search Toggle */}
                  <button
                    type="button"
                    onClick={() => setUseSearch(!useSearch)}
                    className={`p-1.5 sm:p-2 rounded-xl text-xs font-medium flex items-center gap-1 transition-all ${
                      useSearch
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                    title={useSearch ? 'Web Search Active' : 'Toggle Web Search'}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="hidden lg:inline text-[11px]">{useSearch ? 'Search On' : 'Search'}</span>
                  </button>

                  {/* Clear Button if input exists */}
                  {inputPrompt && !isGenerating && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputPrompt('');
                        if (textareaRef.current) {
                          textareaRef.current.style.height = 'auto';
                        }
                      }}
                      className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
                      title="Clear text"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Send or Stop Generation Button */}
                  {isGenerating ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="p-2 sm:p-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 transition-all shrink-0 shadow-lg shadow-rose-950/40"
                      title={t.stop}
                    >
                      <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputPrompt.trim() && !attachedImage}
                      className={`p-2 sm:p-2.5 rounded-2xl transition-all shrink-0 ${
                        inputPrompt.trim() || attachedImage
                          ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95'
                          : 'bg-slate-800/80 text-slate-600 cursor-not-allowed'
                      }`}
                      title={t.send}
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Disclaimer Caption */}
            <div className="mt-2 text-center text-[10px] text-slate-500 px-2 truncate">
              {t.disclaimer}
            </div>
          </div>
        </footer>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        language={settings.language}
        onLanguageChange={(lang) => handleUpdateSettings({ language: lang })}
        onSendMessage={async (spoken) => {
          return await handleSendMessage(spoken);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClearAllChats={handleClearAllChats}
        onExportChats={handleExportChats}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        language={settings.language}
      />

      {/* Explore Capabilities Modal */}
      <ExploreModal
        isOpen={isExploreOpen}
        onClose={() => setIsExploreOpen(false)}
        language={settings.language}
        onSelectFeature={(mode, prompt, openVoice) => {
          setCurrentMode(mode);
          setUseSearch(mode === 'research');
          if (openVoice) {
            setIsVoiceModalOpen(true);
          } else if (prompt) {
            handleSendMessage(prompt);
          }
        }}
      />

      {/* Fullscreen Lightbox Image Viewer */}
      <ImageModal
        isOpen={!!selectedLightboxImage}
        onClose={() => setSelectedLightboxImage(null)}
        image={selectedLightboxImage}
        language={settings.language}
        onGenerateVariation={(prompt, style) => {
          setSelectedLightboxImage(null);
          const variationText =
            settings.language === 'so'
              ? `Abuur sawir kale oo la mid ah (variation): ${prompt}${style ? ` in ${style} style` : ''}`
              : settings.language === 'ar'
              ? `أنشئ نسخة مختلفة لهذه الصورة: ${prompt}${style ? ` بنمط ${style}` : ''}`
              : `Create a variation of this image: ${prompt}${style ? ` in ${style} style` : ''}`;
          handleSendMessage(variationText);
        }}
        onEditImage={(img) => {
          setSelectedLightboxImage(null);
          setAttachedImage({
            id: Math.random().toString(36).slice(2),
            name: 'Reference-Image.jpg',
            mimeType: img.url.includes('image/svg') ? 'image/svg+xml' : 'image/jpeg',
            data: img.url.includes('base64,') ? img.url.split('base64,')[1] : '',
            previewUrl: img.url,
          });
          setInputPrompt(
            settings.language === 'so'
              ? 'Hagaaji sawirkan oo '
              : settings.language === 'ar'
              ? 'عدّل هذه الصورة و '
              : 'Improve this image by '
          );
          textareaRef.current?.focus();
        }}
      />

      {/* Advanced Image Studio Modal */}
      <ImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        language={settings.language}
        initialAttachment={attachedImage}
        onGenerate={(prompt, style, aspect, refAttachment) => {
          setIsImageStudioOpen(false);
          let fullPrompt = prompt;
          if (style && style !== 'natural') {
            fullPrompt += ` in ${style} style`;
          }
          if (aspect && aspect !== '1:1') {
            fullPrompt += ` with ${aspect} aspect ratio`;
          }
          handleSendMessage(fullPrompt, refAttachment || attachedImage);
        }}
      />

      {/* User Registration & Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        language={settings.language}
        initialMode={authModalInitialMode}
      />

      {/* User Complaint & Feedback Modal */}
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        currentUser={currentUser}
        language={settings.language}
        onOpenAuth={() => {
          setAuthModalInitialMode('login');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Admin Panel Modal (Strictly for administrators) */}
      {currentUser && currentUser.role === 'admin' && (
        <AdminPanelModal
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          currentUser={currentUser}
          language={settings.language}
        />
      )}
    </div>
  );
}
