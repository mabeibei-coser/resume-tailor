'use client';

import { useState } from 'react';
import { useAudioRecorder } from '@/lib/hooks/use-audio-recorder';
import { useAudioPlayer } from '@/lib/hooks/use-audio-player';

export default function DevAudioPage() {
  const recorder = useAudioRecorder();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobInfo, setBlobInfo] = useState<{ size: number; mimeType: string; durationSec: number } | null>(null);
  const [playStatus, setPlayStatus] = useState<string>('');

  const player = useAudioPlayer(() => {
    console.log('播放完毕');
    setPlayStatus('播放完毕');
  });

  const handleStart = async () => {
    setPlayStatus('');
    setBlobInfo(null);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    await recorder.start();
  };

  const handleStop = async () => {
    const result = await recorder.stop();
    const url = URL.createObjectURL(result.blob);
    setBlobUrl(url);
    setBlobInfo({ size: result.blob.size, mimeType: result.mimeType, durationSec: result.durationSec });
    console.log('[dev/audio] stopped', { size: result.blob.size, mimeType: result.mimeType, durationSec: result.durationSec });
  };

  const handlePlay = () => {
    if (!blobUrl) return;
    setPlayStatus('播放中');
    player.play(blobUrl);
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 600 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>音频 Hooks 调试页（/__dev/audio）</h1>
      <p style={{ color: '#666', marginTop: 8 }}>
        临时调试页，验证 useAudioRecorder + useAudioPlayer。Step 6 后保留。
      </p>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          id="btn-start"
          onClick={handleStart}
          disabled={recorder.isRecording}
          style={{ padding: '8px 16px', fontSize: 14 }}
        >
          开始录音
        </button>
        <button
          id="btn-stop"
          onClick={handleStop}
          disabled={!recorder.isRecording}
          style={{ padding: '8px 16px', fontSize: 14 }}
        >
          停止
        </button>
        <button
          id="btn-play"
          onClick={handlePlay}
          disabled={!blobUrl || player.isPlaying}
          style={{ padding: '8px 16px', fontSize: 14 }}
        >
          播放刚才的录音
        </button>
      </div>

      <div style={{ marginTop: 24, padding: 12, background: '#f5f5f5', fontSize: 13 }}>
        <div>
          isRecording: <span id="status-recording">{String(recorder.isRecording)}</span>
        </div>
        <div>
          durationSec: <span id="status-duration">{recorder.durationSec}</span>
        </div>
        <div>
          isPlaying: <span id="status-playing">{String(player.isPlaying)}</span>
        </div>
        <div>
          blob.size: <span id="status-size">{blobInfo ? blobInfo.size : '-'}</span>
        </div>
        <div>
          mimeType: <span id="status-mime">{blobInfo ? blobInfo.mimeType : '-'}</span>
        </div>
        <div>
          播放状态: <span id="status-play">{playStatus || '-'}</span>
        </div>
      </div>
    </div>
  );
}
