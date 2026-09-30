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
  Trash2,
  AlertCircle,
  Receipt,
  Layers,
  Sparkles,
  Signal,
  Clock,
  User,
  ShieldCheck,
  RotateCcw
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

  // Group messages by table or filter
  const filteredMessages = walkieTalkieMessages.filter(m => {
    if (selectedTable === null) return true;
    return m.tableNumber === selectedTable;
  });

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
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom text reply from Admin
  const handleSendAdminText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedTable) return;

    const text = adminReplyText.trim();
    setAdminReplyText('');
    setIsSubmitting(true);

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
          <div className="md:col-span-8 flex flex-col bg-slate-900/40 overflow-hidden">
            
            {/* Header info */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
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

            {/* Transmissions Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredMessages.length === 0 ? (
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
                filteredMessages.map(msg => {
                  const isGuest = msg.sender === 'guest';
                  const isAudio = Boolean(msg.audioDataUrl);
                  const isPlaying = playingMsgId === msg.id;
                  const isUnread = msg.status === 'unread' && isGuest;

                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-2xl border text-xs transition flex flex-col gap-1.5 ${
                        isGuest
                          ? isUnread
                            ? 'bg-rose-950/30 border-rose-500/60 shadow-lg shadow-rose-950/30'
                            : 'bg-slate-900 border-slate-800'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-200 ml-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                            isGuest ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500 text-gray-950'
                          }`}>
                            {isGuest ? `Table ${msg.tableNumber < 10 ? '0' + msg.tableNumber : msg.tableNumber}` : 'Cashier Desk'}
                          </span>
                          <span className="text-slate-400">
                            Live Radio
                          </span>
                          {isUnread && (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse">
                              NEW CALL
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="font-mono text-[10px]">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => deleteWalkieTalkieMessage(msg.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Delete log item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex items-center justify-between gap-3 mt-1">
                        <p className={`text-xs ${isGuest ? 'text-white' : 'text-amber-100'} font-medium`}>
                          {msg.text || (isAudio ? 'Voice transmission from guest' : 'Radio alert')}
                        </p>

                        {/* Audio Playback button */}
                        {isAudio && (
                          <button
                            type="button"
                            onClick={() => handlePlayAudio(msg.id, msg.audioDataUrl)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                              isPlaying
                                ? 'bg-rose-600 text-white shadow-lg animate-pulse'
                                : 'bg-amber-500 hover:bg-amber-400 text-gray-950 shadow'
                            }`}
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                            <span>{isPlaying ? 'Listening...' : `Play Voice (${msg.audioDuration ? `${msg.audioDuration}s` : 'Audio'})`}</span>
                          </button>
                        )}
                      </div>

                      {/* Reply shortcut if from guest */}
                      {isGuest && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                          <span>Status: {msg.status.toUpperCase()}</span>
                          <button
                            onClick={() => {
                              setSelectedTable(msg.tableNumber);
                              markWalkieTalkieStatus(msg.id, 'resolved');
                            }}
                            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Resolved / Reply</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Admin Reply & Transmitter Console */}
            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Mic className="w-3 h-3 text-amber-400" />
                  <span>
                    Reply to {selectedTable ? `Table ${selectedTable < 10 ? '0' + selectedTable : selectedTable}` : 'Select a table above'}
                  </span>
                </span>

                {isRecording && (
                  <span className="text-xs font-black text-rose-500 animate-pulse flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    RECORDING LIVE VOICE ({recordingSeconds}s / 30s)
                  </span>
                )}
              </div>

              {/* Quick Reply Presets from Staff */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[11px]">
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
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-medium whitespace-nowrap transition active:scale-95 disabled:opacity-40"
                  >
                    "{txt}"
                  </button>
                ))}
              </div>

              {/* PTT Button + Text Reply Input */}
              <div className="flex items-center gap-2 mt-1">
                {/* Hold to Talk button for Admin */}
                <button
                  type="button"
                  onMouseDown={startRecordingReply}
                  onMouseUp={() => stopRecordingReply()}
                  onTouchStart={startRecordingReply}
                  onTouchEnd={() => stopRecordingReply()}
                  disabled={!selectedTable || isSubmitting}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md select-none touch-none ${
                    !selectedTable
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : isRecording
                      ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                      : 'bg-amber-500 hover:bg-amber-400 text-gray-950 cursor-pointer active:scale-95'
                  }`}
                  title="Hold to Speak voice reply to selected Table"
                >
                  <Mic className="w-4 h-4" />
                  <span>{isRecording ? 'Release to Send' : 'Hold to Talk'}</span>
                </button>

                {/* Text reply input */}
                <form onSubmit={handleSendAdminText} className="flex-1 flex gap-2">
                  <input
                    type="text"
                    placeholder={selectedTable ? `Type radio response to Table ${selectedTable}...` : 'Select a table first to reply...'}
                    value={adminReplyText}
                    onChange={e => setAdminReplyText(e.target.value)}
                    disabled={!selectedTable || isSubmitting}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!selectedTable || !adminReplyText.trim() || isSubmitting}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
