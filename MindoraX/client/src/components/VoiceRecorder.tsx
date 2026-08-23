import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Props {
  type: 'voice' | 'video';
  onRecordingComplete: (blob: Blob, transcript: string) => void;
  onCancel: () => void;
}

const VoiceRecorder: React.FC<Props> = ({ type, onRecordingComplete, onCancel }) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    timerRef.current && clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const startRecording = async () => {
    chunksRef.current = [];
    setTranscript('');
    setSeconds(0);

    try {
      const constraints = type === 'video'
        ? { audio: true, video: { facingMode: 'user', width: 640, height: 480 } }
        : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Show live video preview
      if (type === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      // Determine supported MIME type
      const mimeType = type === 'video'
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm')
        : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm');

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        if (type === 'video') setVideoUrl(url);
        stopAll();
        onRecordingComplete(blob, transcript);
      };

      mr.start(250); // collect every 250ms
      setRecording(true);

      // Timer
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 120) { stopRecording(); return s; } // max 2 minutes
          return s + 1;
        });
      }, 1000);

      // SpeechRecognition for live transcript (audio channel of video too)
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        let finalTranscript = '';
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
            else interim += event.results[i][0].transcript;
          }
          setTranscript(finalTranscript + interim);
        };
        recognition.onerror = () => {}; // silent fail
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err: any) {
      toast.error(`Could not access ${type === 'video' ? 'camera/microphone' : 'microphone'}. Please allow access.`);
      onCancel();
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="voice-recorder">
      {/* Video preview (recording) */}
      {type === 'video' && (
        <video
          ref={videoPreviewRef}
          className="recorder-video-preview"
          muted
          style={{ display: recording ? 'block' : 'none' }}
        />
      )}

      <div className="recorder-controls">
        {recording ? (
          <>
            <div className="recorder-pulse" />
            <span className="recorder-timer">{fmt(seconds)}</span>
            {transcript && (
              <span className="recorder-transcript-preview">{transcript.slice(-60)}…</span>
            )}
            <button className="btn btn-sm" style={{ background: 'var(--error)', color: '#fff' }} onClick={stopRecording}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Stop
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-sm" onClick={startRecording}>
              {type === 'video' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 10l4.553-2.277A1 1 0 0121 8.5v7a1 1 0 01-1.447.894L15 14M4 8h8a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 008 8.94V23h2v-2.06A9 9 0 0021 12v-2h-2z"/></svg>
              )}
              Start {type === 'video' ? 'Video' : 'Voice'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
