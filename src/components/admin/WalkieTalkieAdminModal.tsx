import React, { useState, useRef, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  X,
  Radio,
  Mic,
  Volume2,
  Play,
  Pause,
  Send,
  PhoneCall,
  CheckCircle2,
  CheckCheck,
  Trash2,
  AlertCircle,
  Receipt,
  Layers,
  Sparkles,
  Signal,
  Clock,
  User,
  ShieldCheck,
  RotateCcw,
  ChevronDown
} from 'lucide-react';
import {
  playWalkieTalkieChirp,
  playWalkieRogerBeep,
  playWalkieCallRing
} from '../../utils/sound';
import { WalkieTalkieMessage } from '../../types';

interface WalkieTalkieAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTableNumber?: number | null;
}

export const WalkieTalkieAdminModal: React.FC<WalkieTalkieAdminModalProps> = ({
  isOpen,
  onClose,
  defaultTableNumber
}) => {
  const {
    tables,
    orders,
    walkieTalkieMessages,
    sendWalkieTalkieMessage,
    markWalkieTalkieStatus,
    deleteWalkieTalkieMessage,
    clearTableWalkieTalkie,
    setAdminActiveTab,
    currentUser
  } = usePOS();

  // Active table filter (null = all tables, or 1..10)
  const [selectedTable, setSelectedTable] = useState<number | null>(defaultTableNumber || null);

  useEffect(() => {
    if (defaultTableNumber) {
      setSelectedTable(defaultTableNumber);
    }
  }, [defaultTableNumber]);

  // Audio recording state for Admin reply
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Group messages by table or filter
  const filteredMessages = walkieTalkieMessages.filter(m => {
    if (selectedTable === null) return true;
    return m.tableNumber === selectedTable;
  });

  // Sort chronologically (oldest at top, newest at bottom like WhatsApp)
  const chatMessages = React.useMemo(() => {
    return [...filteredMessages].sort((a, b) => {
      const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (a.id || '').localeCompare(b.id || '');
    });
  }, [filteredMessages]);

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
    setShowScrollBottomBtn(scrollHeight - scrollTop - clientHeight > 90);
  };

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
  }, [isOpen, selectedTable]);

  useEffect(() => {
    scrollToBottom(true);
    const t = setTimeout(() => scrollToBottom(true), 60);
    return () => clearTimeout(t);
  }, [chatMessages.length]);

  // Target table details
  const activeTableObj = selectedTable ? tables.find(t => t.tableNumber === selectedTable) : null;
  const activeTableOrders = selectedTable
    ? orders.filter(
        o => (o.tableNumber === selectedTable || o.tableId === `T${selectedTable < 10 ? '0' + selectedTable : selectedTable}`) &&
             (o.status || '').toLowerCase() !== 'cancelled' &&
             (o.status || '').toLowerCase() !== 'completed' &&
             (o.paymentStatus || '').toLowerCase() !== 'paid'
      )
    : [];

  const tableBillTotal = activeTableOrders.reduce((sum, o) => sum + (o.finalAmount || o.total || 0), 0);

  // Count unread by table
  const unreadCountByTable = React.useMemo(() => {
    const map: Record<number, number> = {};
    walkieTalkieMessages.forEach(m => {
      if (m.sender === 'guest' && m.status === 'unread') {
        map[m.tableNumber] = (map[m.tableNumber] || 0) + 1;
      }
    });
    return map;
  }, [walkieTalkieMessages]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

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
        console.warn('Audio playback error:', e);
        setPlayingMsgId(null);
      });

      // Mark message as listened
      markWalkieTalkieStatus(msgId, 'listened');
    } catch (err) {
      console.warn('Audio play exception:', err);
      setPlayingMsgId(null);
    }
  };

  // Admin Start Recording Voice Reply
  const startRecordingReply = async () => {
    if (!selectedTable) {
      setInfoNotice('Please select a specific table to reply to!');
      setTimeout(() => setInfoNotice(null), 3000);
      return;
    }

    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        setPlayingMsgId(null);
      }

      playWalkieTalkieChirp();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setInfoNotice('Microphone not supported in browser. Use quick voice responses below.');
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
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        });

        if (audioBlob.size > 0) {
          await transmitAdminAudio(audioBlob);
        }
      };

      recorder.start(100);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 29) {
            stopRecordingReply(recorder);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Admin mic error:', err);
      setIsRecording(false);
      setInfoNotice('Mic unavailable. You can use Quick Reply presets below!');
    }
  };

  const stopRecordingReply = (activeRec?: MediaRecorder | null) => {
    const rec = activeRec || mediaRecorder;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch (_) {}
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const transmitAdminAudio = async (blob: Blob) => {
    if (!selectedTable) return;
    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        await sendWalkieTalkieMessage({
          tableNumber: selectedTable,
          tableName: `Table ${selectedTable < 10 ? '0' + selectedTable : selectedTable}`,
          tableSection: activeTableObj?.section || 'Indoor Dining',
          sender: 'admin',
          senderName: currentUser?.email ? currentUser.email.split('@')[0] : 'Cashier / Admin',
          audioDataUrl: base64Audio,
          audioDuration: recordingSeconds || 2,
          text: `Cashier voice reply (${recordingSeconds || 2}s)`,
          type: 'voice'
        });
        setIsSubmitting(false);
        setInfoNotice(`Transmitted voice reply to Table ${selectedTable}!`);
        setTimeout(() => setInfoNotice(null), 3000);
      };
    } catch (err) {
      console.warn(err);
      setIsSubmitting(false);
    }
  };

  // Quick Preset Reply from Admin to Guest Table
  const handleSendAdminPreset = async (replyText: string) => {
    if (!selectedTable) {
      setInfoNotice('Please select a table to reply to!');
      setTimeout(() => setInfoNotice(null), 3000);
      return;
    }

    setIsSubmitting(true);
    scrollToBottom(true);
    try {
      playWalkieTalkieChirp();
      await sendWalkieTalkieMessage({
        tableNumber: selectedTable,
        tableName: `Table ${selectedTable < 10 ? '0' + selectedTable : selectedTable}`,
        tableSection: activeTableObj?.section || 'Indoor Dining',
        sender: 'admin',
        senderName: 'Cashier Desk',
        text: replyText,
        type: 'roger'
      });
      setInfoNotice(`Transmitted: "${replyText}" to Table ${selectedTable}`);
      setTimeout(() => setInfoNotice(null), 3000);
      setTimeout(() => scrollToBottom(true), 80);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom text reply from Admin
  const handleSendAdminText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedTable || isSubmitting) return;

    const text = adminReplyText.trim();
    setAdminReplyText('');
    setIsSubmitting(true);
    scrollToBottom(true);

    try {
      playWalkieTalkieChirp();
      await sendWalkieTalkieMessage({
        tableNumber: selectedTable,
        tableName: `Table ${selectedTable < 10 ? '0' + selectedTable : selectedTable}`,
        tableSection: activeTableObj?.section || 'Indoor Dining',
        sender: 'admin',
        senderName: 'Cashier Desk',
        text,
        type: 'voice'
      });
      setInfoNotice(`Transmitted reply to Table ${selectedTable}`);
      setTimeout(() => setInfoNotice(null), 3000);
      setTimeout(() => scrollToBottom(true), 80);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear / Reset table radio channel (chats, voice recordings, and alerts)
  const handleResetTableChannel = async (tblNum: number) => {
    const numStr = tblNum < 10 ? `0${tblNum}` : `${tblNum}`;
    setIsSubmitting(true);
    try {
      await clearTableWalkieTalkie(tblNum);
      playWalkieRogerBeep();
      setInfoNotice(`Table ${numStr} radio chat & transmissions cleared! Fresh session for new guests.`);
      setTimeout(() => setInfoNotice(null), 3500);
    } catch (err) {
      console.warn('Error clearing table channel:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0B0F17] border-2 border-amber-500/50 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-950">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wider uppercase text-amber-400">
                  Cashier & Staff Walkie-Talkie Console
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  <Signal className="w-2.5 h-2.5" />
                  TWO-WAY RADIO ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct audio channel to guest tables • Table identification & instant replies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Walkie-Talkie Console"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Toast Notice */}
        {infoNotice && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-5 py-2 text-xs text-amber-300 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{infoNotice}</span>
          </div>
        )}

        {/* Main 2-Column Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Column: Table Selector & Overview (4 cols) */}
          <div className="md:col-span-4 border-r border-slate-800 bg-slate-950/70 p-4 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Table Channel
              </span>
              <button
                onClick={() => setSelectedTable(null)}
                className={`text-[11px] px-2 py-0.5 rounded-md font-bold transition ${
                  selectedTable === null
                    ? 'bg-amber-500 text-gray-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                All Tables
              </button>
            </div>

            {/* Table Buttons Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {tables.map(tbl => {
                const unread = unreadCountByTable[tbl.tableNumber] || 0;
                const isSelected = selectedTable === tbl.tableNumber;
                const numStr = tbl.tableNumber < 10 ? `0${tbl.tableNumber}` : `${tbl.tableNumber}`;

                return (
                  <button
                    key={tbl.id}
                    onClick={() => setSelectedTable(tbl.tableNumber)}
                    className={`relative p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Table {numStr}</span>
                      {unread > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                          {unread}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 truncate capitalize">
                      {tbl.status ? tbl.status.toLowerCase() : 'available'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Table Detail Card (if one table is selected) */}
            {selectedTable && (
              <div className="mt-auto bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-gray-950 font-black text-xs uppercase">
                      Table {selectedTable < 10 ? '0' + selectedTable : selectedTable}
                    </span>
                    <span className="text-xs text-slate-300 font-medium capitalize">
                      {activeTableObj?.status ? activeTableObj.status.toLowerCase() : 'available'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeTableOrders.length > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {activeTableOrders.length > 0 ? `${activeTableOrders.length} Active Orders` : 'No Running Orders'}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>Current Running Bill:</span>
                  <span className="font-bold text-white text-sm">
                    Rs. {tableBillTotal.toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    Auto-clears on bill settle
                  </span>
                  <button
                    type="button"
                    onClick={() => handleResetTableChannel(selectedTable)}
                    disabled={isSubmitting}
                    className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Clear all chat & reset channel fresh for next guest"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Chat</span>
                  </button>
                </div>

                {activeTableOrders.length > 0 && (
                  <button
                    onClick={() => {
                      onClose();
                      setAdminActiveTab('orders');
                    }}
                    className="w-full mt-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Orders Management</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Live Transmissions, Audio Player & Reply Console (8 cols) */}
          <div className="md:col-span-8 flex flex-col bg-slate-900/40 h-full min-h-0 overflow-hidden relative">
            
            {/* Header info */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  {selectedTable ? `Channel: Table ${selectedTable < 10 ? '0' + selectedTable : selectedTable}` : 'Channel: All Tables Stream'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {selectedTable && (
                  <button
                    type="button"
                    onClick={() => handleResetTableChannel(selectedTable)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition active:scale-95 cursor-pointer"
                    title="Clear all chat & voice messages for this table so it is clean for the next guest"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Clear Table Chat</span>
                  </button>
                )}
                <span className="text-xs text-slate-400 font-mono">
                  {filteredMessages.length} transmissions logged
                </span>
              </div>
            </div>

            {/* Transmissions Message Feed - WhatsApp Style */}
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
                  <div className="px-3 py-1 rounded-xl bg-[#182229]/80 border border-slate-800 text-amber-300/80 text-[10px] text-center max-w-sm flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>
                      {selectedTable ? `Live direct link with Table ${selectedTable < 10 ? '0' + selectedTable : selectedTable}` : 'Select a table channel to reply'} • Auto-clears on bill settlement
                    </span>
                  </div>
                </div>

                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                    <Radio className="w-10 h-10 text-slate-600 animate-pulse" />
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Channel is Fresh & Clean</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {selectedTable
                        ? `No transmissions from Table ${selectedTable < 10 ? '0' + selectedTable : selectedTable}. All past chats automatically clear upon bill settlement.`
                        : 'No walkie-talkie transmissions received from any table yet.'}
                    </p>
                    <p className="text-[11px] text-slate-600 max-w-sm">
                      When guests speak into their Walkie-Talkie or tap "Direct Call", their voice recordings and alerts appear here in real-time.
                    </p>
                  </div>
                ) : (
                  chatMessages.map(msg => {
                    const isGuest = msg.sender === 'guest';
                    const isAudio = Boolean(msg.audioDataUrl);
                    const isPlaying = playingMsgId === msg.id;
                    const isUnread = msg.status === 'unread' && isGuest;
                    const isCallRing = msg.type === 'call_ring';

                    if (isCallRing) {
                      return (
                        <div key={msg.id} className="flex justify-center my-1.5">
                          <div className="px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1.5 shadow-xs">
                            <PhoneCall className="w-3 h-3 text-rose-400 animate-pulse" />
                            <span>{msg.text || `Direct Call from Table ${msg.tableNumber}`}</span>
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
                        className={`flex ${isGuest ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                      >
                        <div
                          className={`relative px-3.5 py-2 rounded-2xl text-xs max-w-[80%] shadow-md flex flex-col gap-1 transition ${
                            isGuest
                              ? isUnread
                                ? 'bg-[#202C33] text-slate-100 rounded-tl-xs border-2 border-rose-500/60 shadow-lg shadow-rose-950/30'
                                : 'bg-[#202C33] text-slate-100 rounded-tl-xs border border-slate-700/60'
                              : 'bg-[#005C4B] text-white rounded-tr-xs border border-emerald-600/30 ml-auto'
                          }`}
                        >
                          {/* Bubble Header */}
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold text-[10px] uppercase ${
                                isGuest ? 'text-amber-400' : 'text-emerald-200'
                              }`}>
                                {isGuest ? `Table ${msg.tableNumber < 10 ? '0' + msg.tableNumber : msg.tableNumber}` : 'Cashier Desk'}
                              </span>
                              {isUnread && (
                                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                                  NEW
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-slate-400">
                              <button
                                onClick={() => deleteWalkieTalkieMessage(msg.id)}
                                className="p-0.5 text-slate-400 hover:text-rose-400 transition"
                                title="Delete log item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Content: Audio Voice Note or Text */}
                          {isAudio ? (
                            <div className="flex items-center gap-3 py-1">
                              <button
                                type="button"
                                onClick={() => handlePlayAudio(msg.id, msg.audioDataUrl)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-md flex-shrink-0 cursor-pointer ${
                                  isPlaying
                                    ? 'bg-rose-500 text-white animate-pulse'
                                    : isGuest
                                    ? 'bg-amber-500 hover:bg-amber-400 text-gray-950'
                                    : 'bg-emerald-400 hover:bg-emerald-300 text-gray-950'
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
                                        isPlaying ? 'bg-amber-300 animate-pulse' : isGuest ? 'bg-slate-400' : 'bg-emerald-300/80'
                                      }`}
                                      style={{ height: `${(h / 100) * 18}px` }}
                                    />
                                  ))}
                                </div>
                                <span className={`text-[10px] font-mono ${isGuest ? 'text-slate-400' : 'text-emerald-200'}`}>
                                  {isPlaying ? 'Playing Voice Note...' : `${msg.audioDuration ? `${msg.audioDuration}s` : 'Voice Note'}`}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                          )}

                          {/* Bubble Footer: Timestamp & WhatsApp double checkmarks */}
                          <div className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${
                            isGuest ? 'text-slate-400' : 'text-emerald-200/80'
                          }`}>
                            <span className="font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!isGuest && (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] inline" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {/* Bottom anchor for automatic downward scroll */}
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* WhatsApp Floating Scroll to Bottom Button */}
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

            {/* Bottom Admin Reply & Transmitter Console - Pinned at bottom */}
            <div className="p-3.5 border-t border-slate-800 bg-[#1F2C34] space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Mic className="w-3 h-3 text-amber-400" />
                  <span>
                    Reply to {selectedTable ? `Table ${selectedTable < 10 ? '0' + selectedTable : selectedTable}` : 'Select a table channel'}
                  </span>
                </span>

                {isRecording && (
                  <span className="text-xs font-black text-rose-400 animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    RECORDING LIVE VOICE ({recordingSeconds}s / 30s)
                  </span>
                )}
              </div>

              {/* Quick Reply Presets from Staff */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                {[
                  'Roger that! On our way.',
                  'Order being plated now, 2 mins!',
                  'Bringing your bill right now.',
                  'Water refill on the way!'
                ].map((txt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendAdminPreset(txt)}
                    disabled={!selectedTable || isSubmitting}
                    className="px-2.5 py-1 rounded-full bg-[#2A3942] hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-medium whitespace-nowrap transition active:scale-95 disabled:opacity-40 flex-shrink-0 cursor-pointer"
                  >
                    "{txt}"
                  </button>
                ))}
              </div>

              {/* If Recording Voice: Show Live Voice Wave Bar */}
              {isRecording ? (
                <div className="flex items-center justify-between gap-3 p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-bold text-rose-300">
                      Recording Voice Reply ({recordingSeconds}s / 30s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => stopRecordingReply()}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                  >
                    Release to Send
                  </button>
                </div>
              ) : (
                /* PTT Button + Text Reply Input - WhatsApp Layout */
                <div className="flex items-center gap-2">
                  {/* Hold to Talk button for Admin */}
                  <button
                    type="button"
                    onMouseDown={startRecordingReply}
                    onMouseUp={() => stopRecordingReply()}
                    onTouchStart={startRecordingReply}
                    onTouchEnd={() => stopRecordingReply()}
                    disabled={!selectedTable || isSubmitting}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow select-none touch-none flex-shrink-0 ${
                      !selectedTable
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-400 text-gray-950 cursor-pointer active:scale-95'
                    }`}
                    title="Hold to Speak voice reply"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  {/* Text reply input form */}
                  <form onSubmit={handleSendAdminText} className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={selectedTable ? `Type a message to Table ${selectedTable}...` : 'Select a table first to reply...'}
                      value={adminReplyText}
                      onChange={e => setAdminReplyText(e.target.value)}
                      disabled={!selectedTable || isSubmitting}
                      className="flex-1 px-4 py-2.5 bg-[#2A3942] border border-slate-700/60 rounded-full text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!selectedTable || !adminReplyText.trim() || isSubmitting}
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

      </div>
    </div>
  );
};
