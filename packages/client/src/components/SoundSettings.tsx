import React, { useState, useCallback } from 'react';
import { useSoundStore } from '../stores/useSoundStore';
import { playButtonClick } from '../audio/SoundEngine';

/** Full sound settings panel with volume slider and mute toggle. */
export function SoundSettings() {
  const { volume, muted, enabled, setVolume, toggleMute, setEnabled } = useSoundStore();

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(parseFloat(e.target.value));
    },
    [setVolume],
  );

  const handleToggleMute = useCallback(() => {
    toggleMute();
    playButtonClick();
  }, [toggleMute]);

  const handleToggleEnabled = useCallback(() => {
    setEnabled(!enabled);
  }, [enabled, setEnabled]);

  const speakerIcon = muted || !enabled ? '\u{1F507}' : volume > 0.5 ? '\u{1F50A}' : '\u{1F509}';

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'var(--font-body)',
        minWidth: '220px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-fantasy)',
          fontSize: '14px',
          color: 'var(--color-gold)',
          fontWeight: 700,
          letterSpacing: '0.5px',
        }}
      >
        Sound Settings
      </div>

      {/* Enable / Disable */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          color: 'var(--color-text)',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggleEnabled}
          style={{ accentColor: 'var(--color-gold)' }}
          data-testid="sound-enabled-checkbox"
        />
        Sound Effects
      </label>

      {/* Volume + Mute row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: enabled ? 1 : 0.4 }}>
        <button
          onClick={handleToggleMute}
          disabled={!enabled}
          data-testid="sound-mute-btn"
          style={{
            background: 'none',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text)',
            fontSize: '18px',
            width: '32px',
            height: '32px',
            cursor: enabled ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            lineHeight: 1,
          }}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {speakerIcon}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          disabled={!enabled || muted}
          data-testid="sound-volume-slider"
          style={{
            flex: 1,
            accentColor: 'var(--color-gold)',
            cursor: enabled && !muted ? 'pointer' : 'not-allowed',
          }}
        />

        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            minWidth: '32px',
            textAlign: 'right',
          }}
        >
          {muted ? '0' : Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}

/** Compact sound toggle button for the game HUD. */
export function SoundToggleButton() {
  const { muted, enabled, volume, toggleMute, setEnabled } = useSoundStore();
  const [showPanel, setShowPanel] = useState(false);

  const isSilent = !enabled || muted;
  const icon = isSilent ? '\u{1F507}' : volume > 0.5 ? '\u{1F50A}' : '\u{1F509}';

  const handleClick = useCallback(() => {
    if (enabled) {
      toggleMute();
    } else {
      setEnabled(true);
    }
  }, [enabled, toggleMute, setEnabled]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setShowPanel((p) => !p);
    },
    [],
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        data-testid="sound-toggle-btn"
        title={isSilent ? 'Enable sound' : 'Mute sound (right-click for settings)'}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text)',
          fontSize: '18px',
          width: '36px',
          height: '36px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
          transition: 'border-color 0.2s',
        }}
      >
        {icon}
      </button>

      {showPanel && (
        <>
          {/* Backdrop to close panel */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999,
            }}
            onClick={() => setShowPanel(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              zIndex: 1000,
            }}
          >
            <SoundSettings />
          </div>
        </>
      )}
    </div>
  );
}
