import { useState, useRef, useEffect } from 'react'

interface MusicPlayerProps {
  url: string
  autoplay?: boolean
}

/**
 * MusicPlayer Component
 * Classic MySpace auto-playing music player
 */
export default function MusicPlayer({ url, autoplay = true }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      if (autoplay) {
        // Note: Modern browsers block autoplay without user interaction
        audioRef.current.play().catch(() => {
          // Autoplay blocked, user needs to click play
        })
      }
    }
  }, [autoplay, volume])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  // Check if it's a YouTube URL
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')

  if (isYouTube) {
    // Extract video ID and embed
    const videoId = url.includes('youtu.be') 
      ? url.split('/').pop()
      : new URL(url).searchParams.get('v')
    
    return (
      <div className="music-player">
        <div className="now-playing">🎵 Now Playing</div>
        <iframe
          width="100%"
          height="80"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}`}
          title="Profile Music"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          style={{ borderRadius: '5px' }}
        />
      </div>
    )
  }

  return (
    <div className="music-player">
      <div className="now-playing">🎵 Now Playing</div>
      
      <audio 
        ref={audioRef} 
        src={url} 
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      <div className="controls">
        <button onClick={togglePlay}>
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <button onClick={() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0
          }
        }}>
          ⏮️
        </button>
      </div>
      
      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🔈</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          style={{ 
            flex: 1,
            accentColor: 'var(--accent-pink)',
            height: '5px'
          }}
        />
        <span>🔊</span>
      </div>
      
      <p style={{ 
        fontSize: '0.7rem', 
        color: 'var(--text-secondary)',
        marginTop: '0.5rem'
      }}>
        Click play to start the vibes ✨
      </p>
    </div>
  )
}
