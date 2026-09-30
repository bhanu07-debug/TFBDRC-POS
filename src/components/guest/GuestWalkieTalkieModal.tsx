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
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  Signal,
  HelpCircle,
  MessageSquare,
  RotateCcw
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
  const tableSection = currentTable?.section || 'Indoor Dining';
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

  // Filter messages for this table
  const tableMessages = walkieTalkieMessages
    .filter(m => m.tableNumber === currentGuestTableNumber)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

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
        setInfoNotice('Voice recording not supported in this browser. You can still send text walkie messages below!');
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
      setInfoNotice('Microphone access blocked or unavailable. You can tap quick presets or type to transmit!');
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
        setInfoNotice('Transmitted to Cashier & Staff!');
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
      setInfoNotice('Calling Cashier desk radio! Cashier notified.');
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
      setInfoNotice(`Transmitted: "${presetText}"`);
      setTimeout(() => setInfoNotice(null), 3000);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Custom Text Transmission
  const handleSendCustomText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    const msg = customText.trim();
    setCustomText('');
    setIsSubmitting(true);

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
      setInfoNotice('Transmitted to Cashier!');
      setTimeout(() => setInfoNotice(null), 3000);
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
      setInfoNotice(`Table ${tableNumStr} radio history cleared!`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F172A] border-2 border-amber-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-100">
        
        {/* Walkie Talkie Radio Top Antenna & Status Bar */}
        <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-900/40">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider uppercase text-amber-400">
                  Walkie-Talkie Radio
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                  <Signal className="w-2.5 h-2.5" />
                  CH-01 LIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct Link • Cashier & Floor Staff
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Walkie-Talkie"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table Identification Card */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-gray-950 font-black text-[11px] uppercase tracking-wider">
              Table {tableNumStr}
            </span>
            <span className="text-slate-300 font-medium">
              {tableSection}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>Encrypted Direct Channel</span>
          </div>
        </div>

        {/* Informational Toast notice */}
        {infoNotice && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-300 flex items-center gap-1.5 animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>{infoNotice}</span>
          </div>
        )}

        {/* Radio Body / Transmission Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Main Push to Talk & Direct Call Controls */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-4 border border-slate-800 shadow-inner flex flex-col items-center text-center">
            
            {/* Visual Audio Frequency Wave during recording */}
            <div className="h-10 flex items-center justify-center gap-1 mb-2 w-full">
              {isRecording ? (
                <>
                  {[...Array(16)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 bg-rose-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.max(8, Math.sin((i + recordingSeconds * 4) * 0.7) * 32 + 10)}px`,
                        animationDuration: `${0.3 + (i % 4) * 0.15}s`
                      }}
                    />
                  ))}
                </>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Channel Open • Ready to transmit</span>
                </div>
              )}
            </div>

            {/* Large Interactive PTT (Push-To-Talk) Button */}
            <button
              id="btn-guest-push-to-talk"
              type="button"
              onMouseDown={startRecording}
              onMouseUp={() => stopRecording()}
              onTouchStart={startRecording}
              onTouchEnd={() => stopRecording()}
              disabled={isSubmitting}
              className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-150 shadow-xl select-none touch-none cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 text-white scale-105 shadow-rose-600/50 ring-4 ring-rose-400/50 animate-pulse'
                  : 'bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 text-gray-950 hover:brightness-110 shadow-amber-500/30 active:scale-95'
              }`}
              title="Press & Hold to Speak into Walkie-Talkie"
            >
              {isRecording ? (
                <>
                  <Mic className="w-8 h-8 animate-bounce" />
                  <span className="text-[11px] font-black uppercase tracking-wider mt-1">
                    {recordingSeconds}s • TALKING
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-8 h-8 text-gray-950" />
                  <span className="text-[11px] font-black uppercase tracking-wider mt-1">
                    Hold to Talk
                  </span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 mt-3 font-medium">
              {isRecording
                ? '🔴 Recording voice transmission... Release to send!'
                : 'Press & Hold to talk (or click to record voice to cashier)'}
            </p>

            {/* Direct Call / Ring Cashier Button */}
            <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleDirectCallCashier}
                disabled={callRingingState || isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                  callRingingState
                    ? 'bg-rose-600 text-white animate-bounce'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                }`}
                title="Ring Cashier Desk Directly"
              >
                <PhoneCall className={`w-3.5 h-3.5 ${callRingingState ? 'animate-spin' : 'text-amber-400'}`} />
                <span>{callRingingState ? 'Ringing Cashier Desk...' : 'Direct Call Cashier'}</span>
              </button>
            </div>
          </div>

          {/* Quick Voice Radio Presets */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Quick Radio Alerts</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: '🧾 Bill Please', text: 'Table ' + tableNumStr + ': Please bring the bill' },
                { label: '💧 Water Refill', text: 'Table ' + tableNumStr + ': Water refill requested' },
                { label: '👨‍🍳 Food Status', text: 'Table ' + tableNumStr + ': Inquiring about order status' },
                { label: '🙋 Staff Attention', text: 'Table ' + tableNumStr + ': Staff attention needed at table' }
              ].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendPreset(p.text)}
                  disabled={isSubmitting}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white text-left font-medium transition active:scale-95 flex items-center justify-between"
                >
                  <span>{p.label}</span>
                  <Radio className="w-3 h-3 text-slate-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Text Radio Message Input */}
          <form onSubmit={handleSendCustomText} className="flex gap-2">
            <input
              type="text"
              placeholder="Or type radio message..."
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            <button
              type="submit"
              disabled={!customText.trim() || isSubmitting}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-gray-950 font-bold text-xs rounded-xl shadow transition flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>

          {/* Live Table Radio Transmissions Feed */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-amber-400" />
                <span>Radio Log (Table {tableNumStr})</span>
              </h4>
              <div className="flex items-center gap-2">
                {tableMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMyTableChat}
                    disabled={isSubmitting}
                    className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Clear radio chat for this table"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Clear Chat</span>
                  </button>
                )}
                <span className="text-[10px] text-slate-400">
                  {tableMessages.length} transmissions
                </span>
              </div>
            </div>

            {tableMessages.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center justify-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Fresh Session • Radio Channel Clean</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  All past radio chat and voice calls automatically clear upon bill settlement so each guest has a fresh session.
                </p>
                <p className="text-[10px] text-slate-500">
                  Hold the button above to speak or tap "Direct Call Cashier".
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {tableMessages.slice(-6).map(msg => {
                  const isGuest = msg.sender === 'guest';
                  const isAudio = Boolean(msg.audioDataUrl);
                  const isPlaying = playingMsgId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 transition ${
                        isGuest
                          ? 'bg-slate-900/90 border-slate-800 ml-4'
                          : 'bg-amber-500/10 border-amber-500/30 mr-4 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`font-bold ${isGuest ? 'text-slate-400' : 'text-amber-400'}`}>
                          {isGuest ? '👤 You (Table ' + tableNumStr + ')' : '📻 Cashier / Staff'}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-slate-200 text-xs">
                          {msg.text || (isAudio ? 'Voice transmission' : 'Radio call')}
                        </span>

                        {isAudio && (
                          <button
                            type="button"
                            onClick={() => handlePlayAudio(msg.id, msg.audioDataUrl)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition flex-shrink-0 ${
                              isPlaying
                                ? 'bg-rose-500 text-white animate-pulse'
                                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                            }`}
                          >
                            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                            <span>{isPlaying ? 'Playing...' : (msg.audioDuration ? `${msg.audioDuration}s` : 'Listen')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer info note */}
        <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" />
            Auto-clears on bill settlement
          </span>
          <span className="text-amber-400">Fat Buddha Walkie-Talkie v2</span>
        </div>

      </div>
    </div>
  );
};
