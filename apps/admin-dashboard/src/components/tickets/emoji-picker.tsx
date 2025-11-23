'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Smile } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  children?: React.ReactNode;
}

// Emoji categories and their emojis
const EMOJI_CATEGORIES = {
  'smileys': {
    label: 'Smileys & People',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
      '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎',
      '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺',
      '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
      '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
      '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾',
      '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
    ],
  },
  'animals': {
    label: 'Animals & Nature',
    icon: '🐾',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
      '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
      '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
      '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙',
      '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋',
      '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏',
      '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖',
      '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃',
      '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡',
      '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🌲', '🌳', '🌴',
      '🌵', '🌶️', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄',
      '🌰', '🦀', '🦞', '🦐', '🦑', '🌍', '🌎', '🌏', '🌕', '🌖',
    ],
  },
  'food': {
    label: 'Food & Drink',
    icon: '🍔',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈',
      '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
      '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞',
      '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖',
      '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗',
      '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🍤',
      '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨',
      '🍦', '🥧', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩',
      '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🍵', '🥤', '🍶',
      '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '🥄', '🍴',
      '🍽️', '🥣', '🥡', '🥢', '🧂',
    ],
  },
  'activity': {
    label: 'Activity',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🏓', '🏸', '🥅', '🏒', '🏑', '🥍', '🏏', '🥊', '🥋', '🎽',
      '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸',
      '🤺', '⛹️', '🤹', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵',
      '🚴', '🏇', '🧜', '🧚', '🧞', '🧝', '🧙', '🧛', '🧟', '🎭',
      '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸',
      '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🚗', '🚕', '🚙', '🚌',
      '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴',
      '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡',
      '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂',
      '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🚁',
      '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🛎️', '🧳', '⌛', '⏳',
    ],
  },
  'objects': {
    label: 'Objects',
    icon: '💡',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️',
      '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️',
      '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️',
      '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡',
      '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰',
      '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩',
      '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🔪', '🗡️', '⚔️',
      '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️',
      '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🧬', '🦠', '🧫',
      '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚿', '🛁', '🛀',
      '🧼', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑',
      '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒',
      '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎', '🏮',
      '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦',
      '🏷️', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃',
      '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅',
      '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '📅',
      '📊', '📈', '📉', '📊', '📈', '📉', '📊', '📈', '📉', '📊',
    ],
  },
  'flags': {
    label: 'Flags',
    icon: '🏁',
    emojis: [
      '🏁', '🚩', '🎌', '🏴', '🏳️', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇳', '🇦🇫', '🇦🇽',
      '🇦🇱', '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲',
      '🇦🇼', '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪',
      '🇧🇿', '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬',
      '🇧🇳', '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇶', '🇮🇷', '🇮🇪',
      '🇮🇲', '🇮🇱', '🇮🇹', '🇨🇮', '🇯🇲', '🇯🇵', '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪',
      '🇰🇮', '🇰🇼', '🇰🇬', '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮',
      '🇱🇹', '🇱🇺', '🇲🇴', '🇲🇰', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹',
      '🇲🇭', '🇲🇶', '🇲🇷', '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳',
      '🇲🇪', '🇲🇸', '🇲🇦', '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨',
      '🇳🇿', '🇳🇮', '🇳🇪', '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇵', '🇳🇴', '🇴🇲',
      '🇵🇰', '🇵🇼', '🇵🇸', '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱',
      '🇵🇹', '🇵🇷', '🇶🇦', '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼', '🇼🇸', '🇸🇲', '🇸🇦',
      '🇸🇳', '🇷🇸', '🇸🇨', '🇸🇱', '🇸🇬', '🇸🇽', '🇸🇰', '🇸🇮', '🇸🇧', '🇸🇴',
      '🇿🇦', '🇬🇸', '🇰🇷', '🇸🇸', '🇪🇸', '🇱🇰', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨',
      '🇵🇲', '🇻🇨', '🇸🇩', '🇸🇷', '🇸🇿', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯',
      '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬', '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲',
      '🇹🇨', '🇹🇻', '🇻🇮', '🇺🇬', '🇺🇦', '🇦🇪', '🇬🇧', '🇺🇸', '🇺🇾', '🇺🇿',
      '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫', '🇪🇭', '🇾🇪', '🇿🇲', '🇿🇼', '🏴‍☠️',
    ],
  },
};

// Frequently used emojis (can be stored in localStorage)
const FREQUENTLY_USED = [
  '👍', '❤️', '😊', '🎉', '👀', '🚀', '✅', '❌', '😀', '😍',
  '😂', '😭', '😮', '😡', '🤔', '👏', '🙏', '💪', '🔥', '💯',
];

export function EmojiPicker({ onEmojiSelect, children }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys');
  const [frequentlyUsed, setFrequentlyUsed] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('emoji-frequently-used');
      return stored ? JSON.parse(stored) : FREQUENTLY_USED;
    }
    return FREQUENTLY_USED;
  });

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    
    // Update frequently used
    const updated = [emoji, ...frequentlyUsed.filter(e => e !== emoji)].slice(0, 20);
    setFrequentlyUsed(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('emoji-frequently-used', JSON.stringify(updated));
    }
  };

  const filteredEmojis = useMemo(() => {
    if (!searchQuery) {
      return EMOJI_CATEGORIES[activeCategory].emojis;
    }
    
    const query = searchQuery.toLowerCase();
    const allEmojis: string[] = [];
    Object.values(EMOJI_CATEGORIES).forEach(category => {
      allEmojis.push(...category.emojis);
    });
    
    // Simple search - in a real app, you'd want to search by emoji name/description
    return allEmojis.filter(emoji => emoji.includes(searchQuery) || emoji.toLowerCase().includes(query));
  }, [searchQuery, activeCategory]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <button
            type="button"
            className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <Smile className="h-4 w-4" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="flex flex-col h-[400px]">
          {/* Header with Categories */}
          <div className="border-b p-2">
            <div className="flex items-center gap-1 mb-2">
              {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(key as keyof typeof EMOJI_CATEGORIES);
                    setSearchQuery('');
                  }}
                  className={cn(
                    'h-8 w-8 flex items-center justify-center rounded-md text-lg transition-colors',
                    activeCategory === key
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                  title={category.label}
                >
                  {category.icon}
                </button>
              ))}
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8 text-sm"
              />
            </div>
          </div>

          {/* Emoji Grid */}
          <ScrollArea className="flex-1">
            <div className="p-3">
              {/* Frequently Used */}
              {!searchQuery && activeCategory === 'smileys' && frequentlyUsed.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Frequently used</p>
                  <div className="grid grid-cols-8 gap-1">
                    {frequentlyUsed.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Emojis */}
              <div>
                {!searchQuery && (
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {EMOJI_CATEGORIES[activeCategory].label}
                  </p>
                )}
                <div className="grid grid-cols-8 gap-1">
                  {filteredEmojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        handleEmojiClick(emoji);
                        setOpen(false);
                      }}
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-2 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              Pick an emoji... 👆
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

