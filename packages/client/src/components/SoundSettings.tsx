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
      className="bg-munch-surface border border-munch-border rounded-lg p-4 flex flex-col gap-3 font-body min-w-[220px]"
    >
      <div
        className="font-fantasy text-sm text-munch-gold font-bold tracking-wide"
      >
        Sound Settings
      </div>

      {/* Enable / Disable */}
      <label
        className="flex items-center gap-2 text-[13px] text-munch-text cursor-pointer"
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggleEnabled}
          className="accent-munch-gold"
          data-testid="sound-enabled-checkbox"
        />
        Sound Effects
      </label>

      {/* Volume + Mute row */}
      <div className={`flex items-center gap-2 ${enabled ? 'opacity-100' : 'opacity-40'}`}>
        <button
          onClick={handleToggleMute}
          disabled={!enabled}
          data-testid="sound-mute-btn"
          className={`bg-transparent border border-munch-border rounded text-munch-text text-lg w-8 h-8 flex items-center justify-center p-0 leading-none ${enabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
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
          className={`flex-1 accent-munch-gold ${enabled && !muted ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        />

        <span
          className="text-xs text-munch-text-muted min-w-[32px] text-right"
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
    <div className="relative">
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        data-testid="sound-toggle-btn"
        title={isSilent ? 'Enable sound' : 'Mute sound (right-click for settings)'}
        className="bg-munch-surface border border-munch-border rounded text-munch-text text-lg w-9 h-9 cursor-pointer flex items-center justify-center p-0 leading-none transition-[border-color] duration-200"
      >
        {icon}
      </button>

      {showPanel && (
        <>
          {/* Backdrop to close panel */}
          <div
            className="fixed inset-0 z-[999]"
            onClick={() => setShowPanel(false)}
          />
          <div
            className="absolute top-full right-0 mt-2 z-[1000]"
          >
            <SoundSettings />
          </div>
        </>
      )}
    </div>
  );
}
