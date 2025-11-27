import React from 'react';
import { Card, InputRow, inp } from './components';
import type { Profile } from './types';

interface ProfileSectionProps {
  profile: Profile | null;
  displayName: string;
  setDisplayName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  locationTxt: string;
  setLocationTxt: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
  busy: string | null;
  onSave: () => void;
}

export function ProfileSection({
  profile,
  displayName,
  setDisplayName,
  bio,
  setBio,
  locationTxt,
  setLocationTxt,
  website,
  setWebsite,
  birthDate,
  setBirthDate,
  busy,
  onSave,
}: ProfileSectionProps) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-sky-300">Профиль</h2>

      <InputRow label="Отображаемое имя">
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inp()} />
      </InputRow>

      <InputRow label="О себе">
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className={inp()} />
      </InputRow>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputRow label="Город/местоположение">
          <input value={locationTxt} onChange={(e) => setLocationTxt(e.target.value)} className={inp()} />
        </InputRow>
        <InputRow label="Сайт">
          <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inp()} placeholder="https://…" />
        </InputRow>
      </div>

      <InputRow label="Дата рождения">
        <input
          type="date"
          value={birthDate || ''}
          onChange={(e) => setBirthDate(e.target.value || '')}
          className={inp()}
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
        />
        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-400">
          {birthDate &&
            (() => {
              try {
                const birth = new Date(birthDate);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const monthDiff = today.getMonth() - birth.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                  age--;
                }
                return (
                  <span>
                    Возраст: {age} {age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}
                  </span>
                );
              } catch {
                return null;
              }
            })()}
          {profile?.registeredAt &&
            (() => {
              try {
                const reg = new Date(profile.registeredAt);
                const today = new Date();
                let years = today.getFullYear() - reg.getFullYear();
                const monthDiff = today.getMonth() - reg.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < reg.getDate())) {
                  years--;
                }
                return (
                  <span>
                    С нами {years > 0 ? `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}` : 'менее года'}
                  </span>
                );
              } catch {
                return null;
              }
            })()}
        </div>
      </InputRow>

      <div className="mt-4 flex justify-end">
        <button
          disabled={busy === 'profile'}
          onClick={onSave}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/20 transition-all"
        >
          💾 Сохранить профиль
        </button>
      </div>
    </Card>
  );
}
