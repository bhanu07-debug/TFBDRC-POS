import React, { useState, useRef, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  X,
  Radio,
  Mic,
  MicOff,
  PhoneCall,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Send,
  Sparkles,
  CheckCircle2,
  CheckCheck,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  Signal,
  HelpCircle,
  MessageSquare,
  RotateCcw,
  ChevronDown
} from 'lucide-react';
import {
  playWalkieTalkieChirp,
  playWalkieRogerBeep,
  playWalkieCallRing
} from '../../utils/sound';
import { WalkieTalkieMessage } from '../../types';

interface GuestWalkieTalkieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestWalkieTalkieModal: React.FC<GuestWalkieTalkieModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    currentGuestTableNumber,
    getCurrentTable,
    walkieTalkieMessages,
    sendWalkieTalkieMessage,
    clearTableWalkieTalkie
  } = usePOS();

  const currentTable = getCurrentTable();
  const tableSection = 'Dine-In';
  const tableNumStr = currentGuestTableNumber < 10 ? `0${currentGuestTableNumber}` : `${currentGuestTableNumber}`;

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customText, setCustomText] = useState('');
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [callRingingState, setCallRingingState] = useState(false);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Filter messages for this table chronologically (oldest at top, newest at bottom like WhatsApp)
  const tableMessages = React.useMemo(() => {
    return [...walkieTalkieMessages]
      .filter(m => m.tableNumber === currentGuestTableNumber)
      .sort((a, b) => {
        const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (timeDiff !== 0) return timeDiff;
        return (a.id || '').localeCompare(b.id || '');
      });
  }, [walkieTalkieMessages, currentGuestTableNumber]);

  // Robust auto-scroll to bottom directly on scrollable container
  const scrollToBottom = (smooth = true) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      if (smooth) {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const handleMessagesScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Show jump to bottom button if user scrolled up more than 90px
    setShowScrollBottomBtn(scrollHeight - scrollTop - clientHeight > 90);
  };

  // When modal opens, jump to latest message at the bottom
  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
      const t1 = setTimeout(() => scrollToBottom(false), 50);
      const t2 = setTimeout(() => scrollToBottom(true), 180);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen]);

  // When new messages arrive, automatically scroll down
  useEffect(() => {
    scrollToBottom(true);
    const t = setTimeout(() => scrollToBottom(true), 60);
    return () => clearTimeout(t);
  }, [tableMessages.length]);

  // Auto-play incoming admin voice reply if modal is open
  const prevAdminCountRef = useRef(0);
  useEffect(() => {
    const adminMsgs = tableMessages.filter(m => m.sender !== 'guest');
    if (adminMsgs.length > prevAdminCountRef.current && adminMsgs.length > 0) {
      const latest = adminMsgs[adminMsgs.length - 1];
      playWalkieTalkieChirp();
      if (latest.audioDataUrl) {
        handlePlayAudio(latest.id, latest.audioDataUrl);
      }
    }
    prevAdminCountRef.current = adminMsgs.length;
  }, [tableMessages]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (_) {}
      }
    };
  }, [mediaRecorder]);

  if (!isOpen) return null;

  // Start Voice Recording
  const startRecording = async () => {
    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        setPlayingMsgId(null);
      }

      playWalkieTalkieChirp();
      setMicPermissionDenied(false);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicPermissionDenied(true);
        setInfoNotice('Voice recording not supported in this browser. You can still type messages below!');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else mimeType = '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        });

        if (audioBlob.size > 0) {
          await transmitAudioBlob(audioBlob);
        }
      };

      recorder.start(100);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 29) {
            stopRecording(recorder);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access issue:', err);
      setMicPermissionDenied(true);
      setIsRecording(false);
      setInfoNotice('Microphone access blocked. You can tap quick presets or type messages!');
    }
  };

  // Stop Recording & Send
  const stopRecording = (activeRec?: MediaRecorder | null) => {
    const rec = activeRec || mediaRecorder;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch (err) {
        console.warn('Error stopping recorder:', err);
      }
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // Convert Blob to Base64 and write to Firestore
  const transmitAudioBlob = async (blob: Blob) => {
    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        await sendWalkieTalkieMessage({
          tableNumber: currentGuestTableNumber,
          tableName: `Table ${tableNumStr}`,
          tableSection,
          sender: 'guest',
          senderName: `Guest (Table ${tableNumStr})`,
          audioDataUrl: base64Audio,
          audioDuration: recordingSeconds || 2,
          text: `Voice transmission (${recordingSeconds || 2}s)`,
          type: 'voice'
        });
        setIsSubmitting(false);
        setInfoNotice('Voice message sent to Cashier!');
        setTimeout(() => setInfoNotice(null), 3000);
      };
    } catch (err) {
      console.error('Audio transmission error:', err);
      setIsSubmitting(false);
    }
  };

  // Send Direct Call Alert (Walkie Ring)
  const handleDirectCallCashier = async () => {
    setCallRingingState(true);
    playWalkieCallRing();

    try {
      await sendWalkieTalkieMessage({
        tableNumber: currentGuestTableNumber,
        tableName: `Table ${tableNumStr}`,
        tableSection,
        sender: 'guest',
        senderName: `Guest (Table ${tableNumStr})`,
        text: `🚨 Urgent Walkie-Talkie Direct Call to Cashier / Staff!`,
        type: 'call_ring'
      });
      setInfoNotice('Ringing Cashier Desk radio!');
    } catch (err) {
      console.warn(err);
    } finally {
      setTimeout(() => {
        setCallRingingState(false);
      }, 2500);
    }
  };

  // Send Quick Preset Message
  const handleSendPreset = async (presetText: string) => {
    setIsSubmitting(true);
    scrollToBottom(true);
    try {
      playWalkieTalkieChirp();
      await sendWalkieTalkieMessage({
        tableNumber: currentGuestTableNumber,
        tableName: `Table ${tableNumStr}`,
        tableSection,
        sender: 'guest',
        senderName: `Guest (Table ${tableNumStr})`,
        text: presetText,
        type: 'roger'
      });
      setInfoNotice(`Sent: "${presetText}"`);
      setTimeout(() => setInfoNotice(null), 3000);
      setTimeout(() => scrollToBottom(true), 80);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Custom Text Transmission
  const handleSendCustomText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() || isSubmitting) return;

    const msg = customText.trim();
    setCustomText('');
    setIsSubmitting(true);
    scrollToBottom(true);

    try {
      playWalkieTalkieChirp();
      await sendWalkieTalkieMessage({
        tableNumber: currentGuestTableNumber,
        tableName: `Table ${tableNumStr}`,
        tableSection,
        sender: 'guest',
        senderName: `Guest (Table ${tableNumStr})`,
        text: msg,
        type: 'voice'
      });
      setInfoNotice('Message sent!');
      setTimeout(() => setInfoNotice(null), 2500);
      setTimeout(() => scrollToBottom(true), 80);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear my table chat manually
  const handleClearMyTableChat = async () => {
    setIsSubmitting(true);
    try {
      await clearTableWalkieTalkie(currentGuestTableNumber);
      playWalkieRogerBeep();
      setInfoNotice(`Table ${tableNumStr} chat cleared!`);
      setTimeout(() => setInfoNotice(null), 3000);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Play audio transmission
  const handlePlayAudio = (msgId: string, audioUrl?: string) => {
    if (!audioUrl) return;

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      if (playingMsgId === msgId) {
        setPlayingMsgId(null);
        activeAudioRef.current = null;
        return;
      }
    }

    try {
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      setPlayingMsgId(msgId);

      audio.onended = () => {
        setPlayingMsgId(null);
        activeAudioRef.current = null;
        playWalkieRogerBeep();
      };

      audio.onerror = () => {
        setPlayingMsgId(null);
        activeAudioRef.current = null;
      };

      audio.play().catch(e => {
        console.warn('Playback error:', e);
        setPlayingMsgId(null);
      });
    } catch (err) {
      console.warn('Audio play exception:', err);
      setPlayingMsgId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F172A] border-2 border-emerald-500/40 rounded-3xl w-full max-w-lg h-[92vh] max-h-[720px] overflow-hidden shadow-2xl flex flex-col text-slate-100">
        
        {/* WhatsApp-Style Top App Header */}
        <div className="bg-[#1F2C34] px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                <Radio className="w-5 h-5" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#1F2C34] animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Cashier & Staff Direct
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-gray-950 font-black text-[10px] uppercase">
                  Table {tableNumStr}
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>online • Live Radio Link</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Direct Call Cashier button */}
            <button
              type="button"
              onClick={handleDirectCallCashier}
              disabled={callRingingState || isSubmitting}
              className={`p-2 rounded-xl text-amber-300 hover:bg-slate-800/80 transition flex items-center gap-1 text-xs font-bold ${
                callRingingState ? 'bg-rose-600 text-white animate-bounce' : ''
              }`}
              title="Ring Cashier Desk Directly"
            >
              <PhoneCall className={`w-4 h-4 ${callRingingState ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{callRingingState ? 'Ringing...' : 'Call'}</span>
            </button>

            {/* Clear table chat */}
            {tableMessages.length > 0 && (
              <button
                type="button"
                onClick={handleClearMyTableChat}
                disabled={isSubmitting}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition"
                title="Clear table chat history"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational Toast Notice */}
        {infoNotice && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-1.5 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>{infoNotice}</span>
          </div>
        )}

        {/* ====================================================
            WhatsApp-Style Chronological Chat Feed
            Old messages scroll up, new messages come down at bottom!
           ==================================================== */}
        <div className="flex-1 min-h-0 relative flex flex-col bg-[#0B141A] overflow-hidden">
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 overscroll-contain select-text"
            style={{
              scrollBehavior: 'smooth',
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          >
            {/* WhatsApp System Date & Security Pill */}
            <div className="flex flex-col items-center gap-1.5 my-2">
              <div className="px-3.5 py-1 rounded-lg bg-[#182229] border border-slate-800 text-[#8696A0] text-[11px] font-semibold tracking-wide uppercase shadow-xs">
                TODAY
              </div>
              <div className="px-3 py-1 rounded-xl bg-[#182229]/80 border border-slate-800 text-amber-300/80 text-[10px] text-center max-w-xs flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Private Table {tableNumStr} channel • Clears upon bill settlement</span>
              </div>
            </div>

            {tableMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 mb-1">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-300">
                  Direct Chat with Cashier & Waiters
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Need extra napkins, water refill, order status, or the bill? Type below or tap a quick alert!
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium mt-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Private Encrypted Table {tableNumStr} Channel</span>
                </div>
              </div>
            ) : (
              tableMessages.map(msg => {
                const isGuest = msg.sender === 'guest';
                const isAudio = Boolean(msg.audioDataUrl);
                const isPlaying = playingMsgId === msg.id;
                const isCallRing = msg.type === 'call_ring';

                if (isCallRing) {
                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <div className="px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1.5 shadow-xs">
                        <PhoneCall className="w-3 h-3 text-rose-400 animate-pulse" />
                        <span>{msg.text || 'Direct Walkie-Talkie Call triggered'}</span>
                        <span className="text-[10px] text-rose-400/80 font-mono ml-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isGuest ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                  >
                    <div
                      className={`relative px-3.5 py-2 rounded-2xl text-xs max-w-[85%] shadow-md flex flex-col gap-1 transition ${
                        isGuest
                          ? 'bg-[#005C4B] text-white rounded-tr-xs border border-emerald-600/30'
                          : 'bg-[#202C33] text-slate-100 rounded-tl-xs border border-slate-700/60'
                      }`}
                    >
                      {/* Incoming sender label */}
                      {!isGuest && (
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                          <Radio className="w-3 h-3 text-amber-400" />
                          <span>Cashier / Staff Desk</span>
                        </span>
                      )}

                      {/* Content: Text or Voice Note */}
                      {isAudio ? (
                        <div className="flex items-center gap-3 py-1">
                          <button
                            type="button"
                            onClick={() => handlePlayAudio(msg.id, msg.audioDataUrl)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-md flex-shrink-0 cursor-pointer ${
                              isPlaying
                                ? 'bg-rose-500 text-white animate-pulse'
                                : isGuest
                                ? 'bg-emerald-400 hover:bg-emerald-300 text-gray-950'
                                : 'bg-amber-500 hover:bg-amber-400 text-gray-950'
                            }`}
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                          </button>

                          {/* Audio Waveform visualization */}
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex items-center gap-0.5 h-5">
                              {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 75, 40, 60, 30].map((h, idx) => (
                                <span
                                  key={idx}
                                  className={`w-1 rounded-full ${
                                    isPlaying ? 'bg-amber-300 animate-pulse' : isGuest ? 'bg-emerald-300/80' : 'bg-slate-400'
                                  }`}
                                  style={{ height: `${(h / 100) * 18}px` }}
                                />
                              ))}
                            </div>
                            <span className={`text-[10px] font-mono ${isGuest ? 'text-emerald-200' : 'text-slate-400'}`}>
                              {isPlaying ? 'Playing Voice Note...' : `${msg.audioDuration ? `${msg.audioDuration}s` : 'Voice Note'}`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                      )}

                      {/* Timestamp & Double Checkmarks */}
                      <div className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${
                        isGuest ? 'text-emerald-200/80' : 'text-slate-400'
                      }`}>
                        <span className="font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isGuest && (
                          <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] inline" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {/* Scroll anchor at the bottom of messages list */}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* Floating Jump to Latest Button */}
          {showScrollBottomBtn && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-3 right-4 w-9 h-9 rounded-full bg-[#202C33] hover:bg-[#2A3942] border border-slate-700/80 text-emerald-400 shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-90 z-20 cursor-pointer animate-in fade-in zoom-in-75"
              title="Jump to latest messages"
            >
              <ChevronDown className="w-5 h-5 text-emerald-400" />
            </button>
          )}
        </div>

        {/* ====================================================
            Pinned WhatsApp Bottom Input Console
            Type message at down, with quick presets & voice note
           ==================================================== */}
        <div className="bg-[#1F2C34] border-t border-slate-800 p-3 space-y-2.5 flex-shrink-0">
          
          {/* Quick Preset Action Chips (Horizontal Scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {[
              { label: '🧾 Bill Please', text: 'Please bring the bill to Table ' + tableNumStr },
              { label: '💧 Water Refill', text: 'Water refill requested for Table ' + tableNumStr },
              { label: '👨‍🍳 Food Status', text: 'Table ' + tableNumStr + ': Inquiring about order status' },
              { label: '🙋 Call Waiter', text: 'Waiter attention requested at Table ' + tableNumStr }
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendPreset(p.text)}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-full bg-[#2A3942] hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium whitespace-nowrap transition active:scale-95 flex-shrink-0 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* If Recording Voice: Show Live Voice Wave Bar */}
          {isRecording ? (
            <div className="flex items-center justify-between gap-3 p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-2xl animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-bold text-rose-300">
                  Recording Voice ({recordingSeconds}s / 30s)
                </span>
              </div>
              <button
                type="button"
                onClick={() => stopRecording()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Release to Send
              </button>
            </div>
          ) : (
            /* WhatsApp-Style Input Bar */
            <div className="flex items-center gap-2">
              {/* Voice Hold-to-Talk Button */}
              <button
                id="btn-guest-push-to-talk"
                type="button"
                onMouseDown={startRecording}
                onMouseUp={() => stopRecording()}
                onTouchStart={startRecording}
                onTouchEnd={() => stopRecording()}
                disabled={isSubmitting}
                className="w-10 h-10 rounded-full bg-[#2A3942] hover:bg-[#34444e] text-amber-400 hover:text-amber-300 flex items-center justify-center transition flex-shrink-0 shadow active:scale-95 cursor-pointer touch-none select-none"
                title="Hold to Record Voice Note"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Text Input Form */}
              <form onSubmit={handleSendCustomText} className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-[#2A3942] border border-slate-700/60 rounded-full text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!customText.trim() || isSubmitting}
                  className="w-10 h-10 rounded-full bg-[#00A884] hover:bg-[#008f72] disabled:opacity-40 text-white flex items-center justify-center transition shadow flex-shrink-0 cursor-pointer active:scale-95"
                  title="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
