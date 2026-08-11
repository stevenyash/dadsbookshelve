import { X, Minus, Plus, BookOpen, AlignLeft } from 'lucide-react'
import type { ThemeMode, FontFamily, ReadingMode, AutoScrollSpeed } from '../../config/readerConfig'
import { themes, fontFamilies } from '../../config/readerConfig'

interface ReaderSettingsPanelProps {
  theme: ThemeMode
  fontSize: number
  fontFamily: FontFamily
  lineHeight: number
  margin: number
  readingMode: ReadingMode
  autoScrollSpeed: AutoScrollSpeed
  showSettings: boolean
  onClose: () => void
  onThemeChange: (theme: ThemeMode) => void
  onFontSizeChange: (size: number) => void
  onFontFamilyChange: (family: FontFamily) => void
  onLineHeightChange: (height: number) => void
  onMarginChange: (margin: number) => void
  onReadingModeChange: (mode: ReadingMode) => void
  onAutoScrollSpeedChange: (speed: AutoScrollSpeed) => void
}

export function ReaderSettingsPanel({
  theme,
  fontSize,
  fontFamily,
  lineHeight,
  margin,
  readingMode,
  autoScrollSpeed,
  showSettings,
  onClose,
  onThemeChange,
  onFontSizeChange,
  onFontFamilyChange,
  onLineHeightChange,
  onMarginChange,
  onReadingModeChange,
  onAutoScrollSpeedChange,
}: ReaderSettingsPanelProps) {
  return (
    <div className={`absolute top-16 right-4 z-30 transition-all duration-300 ${
      showSettings ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'
    }`}>
      <div className={`w-72 p-4 rounded-2xl shadow-xl ${
        theme === 'dark' ? 'bg-neutral-800' : 'bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className={`font-semibold ${theme === 'dark' ? 'text-neutral-100' : 'text-neutral-900'}`}>Reading Settings</h4>
          <button onClick={onClose} className="btn btn-ghost btn-xs btn-circle">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Theme */}
        <div className="mb-4">
          <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Theme</label>
          <div className="flex gap-2">
            {(Object.keys(themes) as ThemeMode[]).map(t => (
              <button
                key={t}
                onClick={() => onThemeChange(t)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  theme === t 
                    ? 'ring-2 ring-primary ring-offset-2' 
                    : ''
                } ${t === 'light' ? 'bg-white text-neutral-900 border' : t === 'dark' ? 'bg-neutral-900 text-neutral-100' : 'bg-[#f4ecd8] text-[#5b4636]'}`}
              >
                {themes[t].name}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="mb-4">
          <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Font Size: {fontSize}px</label>
          <div className="flex items-center gap-3">
            <button onClick={() => onFontSizeChange(prev => Math.max(12, prev - 2))} className={`btn btn-sm btn-circle ${theme === 'dark' ? 'btn-neutral' : 'btn-ghost'}`}>
              <Minus className="w-4 h-4" />
            </button>
            <input 
              type="range" min="12" max="32" value={fontSize} 
              onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
              className="flex-1 range range-primary range-sm"
            />
            <button onClick={() => onFontSizeChange(prev => Math.min(32, prev + 2))} className={`btn btn-sm btn-circle ${theme === 'dark' ? 'btn-neutral' : 'btn-ghost'}`}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Font Family */}
        <div className="mb-4">
          <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Font</label>
          <select 
            value={fontFamily} 
            onChange={(e) => onFontFamilyChange(e.target.value as FontFamily)}
            className={`select select-sm w-full ${theme === 'dark' ? 'select-bordered' : ''}`}
          >
            <option value="Georgia">Georgia</option>
            <option value="Merriweather">Merriweather</option>
            <option value="OpenDyslexic">OpenDyslexic</option>
            <option value="System">System</option>
          </select>
        </div>

        {/* Line Height */}
        <div className="mb-4">
          <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Line Spacing: {lineHeight}</label>
          <input 
            type="range" min="1" max="2.5" step="0.1" value={lineHeight}
            onChange={(e) => onLineHeightChange(parseFloat(e.target.value))}
            className="range range-primary range-sm"
          />
        </div>

        {/* Margins */}
        <div className="mb-4">
          <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Margins: {margin}px</label>
          <input 
            type="range" min="10" max="50" value={margin}
            onChange={(e) => onMarginChange(parseInt(e.target.value))}
            className="range range-primary range-sm"
          />
        </div>

        {/* Reading Mode */}
        <div>
          <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>Reading Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => onReadingModeChange('paginated')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                readingMode === 'paginated' 
                  ? 'ring-2 ring-primary ring-offset-2' 
                  : ''
              } ${theme === 'dark' ? 'bg-neutral-700 text-neutral-200' : 'bg-neutral-100 text-neutral-700'}`}
            >
              <BookOpen className="w-4 h-4 inline mr-1" /> Flip
            </button>
            <button
              onClick={() => onReadingModeChange('scrolled')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                readingMode === 'scrolled' 
                  ? 'ring-2 ring-primary ring-offset-2' 
                  : ''
              } ${theme === 'dark' ? 'bg-neutral-700 text-neutral-200' : 'bg-neutral-100 text-neutral-700'}`}
            >
              <AlignLeft className="w-4 h-4 inline mr-1" /> Scroll
            </button>
          </div>

          {/* Auto-scroll speed control */}
          {readingMode === 'scrolled' && (
            <div className="mt-4">
              <label className={`text-xs font-medium mb-2 block ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Auto-scroll: {autoScrollSpeed === 0 ? 'Off' : `${autoScrollSpeed}x`}
              </label>
              <div className="flex gap-2">
                {([0, 1, 2, 3, 4] as AutoScrollSpeed[]).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => onAutoScrollSpeedChange(speed)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium ${
                      autoScrollSpeed === speed 
                        ? 'bg-primary text-white' 
                        : theme === 'dark' ? 'bg-neutral-700 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {speed === 0 ? 'Off' : speed}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}