import React, { useState } from 'react';

interface StudentAvatarProps {
  name: string;
  avatarUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Animal preset graphics mapping based on student name
const ANIMAL_AVATARS: Record<string, { bg: string; icon: string; label: string }> = {
  kevinn: { bg: 'from-orange-500 to-amber-500', icon: '🦊', label: 'Raposa' },
  gabriel: { bg: 'from-amber-600 to-orange-700', icon: '🐻', label: 'Urso' },
  'felipe freit': { bg: 'from-yellow-500 to-amber-600', icon: '🦁', label: 'Leão' },
  felipe: { bg: 'from-yellow-500 to-amber-600', icon: '🦁', label: 'Leão' },
  amanda: { bg: 'from-emerald-500 to-teal-700', icon: '🐼', label: 'Panda' },
  denys: { bg: 'from-slate-600 to-slate-800', icon: '🐨', label: 'Koala' },
  rafael: { bg: 'from-rose-500 to-orange-600', icon: '🐯', label: 'Tigre' },
  liedo: { bg: 'from-indigo-500 to-purple-600', icon: '🐰', label: 'Coelho' },
};

const DEFAULT_ANIMALS = [
  { bg: 'from-orange-500 to-amber-500', icon: '🦊', label: 'Raposa' },
  { bg: 'from-amber-600 to-orange-700', icon: '🐻', label: 'Urso' },
  { bg: 'from-yellow-500 to-amber-600', icon: '🦁', label: 'Leão' },
  { bg: 'from-emerald-500 to-teal-700', icon: '🐼', label: 'Panda' },
  { bg: 'from-slate-600 to-slate-800', icon: '🐨', label: 'Koala' },
  { bg: 'from-rose-500 to-orange-600', icon: '🐯', label: 'Tigre' },
  { bg: 'from-indigo-500 to-purple-600', icon: '🐰', label: 'Coelho' },
  { bg: 'from-blue-500 to-cyan-600', icon: '🦉', label: 'Coruja' },
];

function getAnimalForName(name: string) {
  const cleanName = name.toLowerCase().trim();
  if (ANIMAL_AVATARS[cleanName]) {
    return ANIMAL_AVATARS[cleanName];
  }
  // Deterministic fallback
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DEFAULT_ANIMALS.length;
  return DEFAULT_ANIMALS[index];
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  name,
  avatarUrl,
  className = 'w-10 h-10 rounded-xl',
}) => {
  const [imgError, setImgError] = useState(false);
  const animal = getAnimalForName(name);

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${className} object-cover shrink-0 ring-2 ring-slate-100 dark:ring-slate-800 shadow-xs`}
      />
    );
  }

  return (
    <div
      className={`${className} bg-gradient-to-br ${animal.bg} text-white flex items-center justify-center font-bold shrink-0 shadow-xs ring-2 ring-slate-100 dark:ring-slate-800 select-none overflow-hidden`}
      title={`${name} (${animal.label || 'Animal'})`}
    >
      <span className="text-xl leading-none filter drop-shadow-xs transform hover:scale-110 transition-transform">
        {animal.icon}
      </span>
    </div>
  );
};
