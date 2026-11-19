export type BakuPlace = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  aliases: string[];
};

/** Bakı metropoliteni və ən çox axtarılan nöqtələr (lokal axtarış). */
export const BAKU_PLACES: BakuPlace[] = [
  { id: 'metro-20-yanvar', label: '20 Yanvar metro', lat: 40.38692, lng: 49.82028, aliases: ['20 yanvar', 'iyirmi yanvar', '20 janvar', '20 yanvar metro', '20 yanvar metropoliteni'] },
  { id: 'metro-28-may', label: '28 May metro', lat: 40.37775, lng: 49.84868, aliases: ['28 may', '28 may metro'] },
  { id: 'metro-genclik', label: 'Gənclik metro', lat: 40.40102, lng: 49.85173, aliases: ['gənclik', 'genclik', 'gənclik metro'] },
  { id: 'metro-narimanov', label: 'Nəriman Nərimanov metro', lat: 40.40928, lng: 49.86768, aliases: ['nərimanov', 'narimanov', 'nəriman nərimanov'] },
  { id: 'metro-iceriseher', label: 'İçərişəhər metro', lat: 40.36612, lng: 49.83518, aliases: ['içərişəhər', 'iceriseher', 'içəri şəhər'] },
  { id: 'metro-sahil', label: 'Sahil metro', lat: 40.36668, lng: 49.83742, aliases: ['sahil metro', 'sahil'] },
  { id: 'metro-neftciler', label: 'Neftçilər metro', lat: 40.41048, lng: 49.92762, aliases: ['neftçilər', 'neftchiler', 'neftçilər metro'] },
  { id: 'metro-nizami', label: 'Nizami metro', lat: 40.4049, lng: 49.8524, aliases: ['nizami metro', 'nizami metropoliteni', 'nizami stansiya'] },
  { id: 'metro-ahmadli', label: 'Əhmədli metro', lat: 40.39298, lng: 49.95188, aliases: ['əhmədli', 'ahmadli', 'əhmədli metro'] },
  { id: 'metro-elmler', label: 'Elmlər Akademiyası metro', lat: 40.37448, lng: 49.83312, aliases: ['elmlər', 'elmler akademiyası', 'elmilər'] },
  { id: 'metro-darnegul', label: 'Dərnəgül metro', lat: 40.40782, lng: 49.80862, aliases: ['dərnəgül', 'darnegul', 'dərnəgül metro'] },
  { id: 'metro-azadliq', label: 'Azadlıq Prospekti metro', lat: 40.39488, lng: 49.85078, aliases: ['azadlıq', 'azadliq prospekti'] },
  { id: 'metro-nesimi', label: 'Nəsimi metro', lat: 40.40888, lng: 49.80738, aliases: ['nəsimi', 'nesimi'] },
  { id: 'metro-cofar', label: 'Cəfər Cabbarlı metro', lat: 40.37258, lng: 49.83862, aliases: ['cəfər cabbarlı', 'cafar cabbarli', '28 mall yanı'] },
  { id: 'metro-bakmil', label: 'Bakmil metro', lat: 40.42802, lng: 49.87682, aliases: ['bakmil'] },
  { id: 'metro-koroglu', label: 'Koroğlu metro', lat: 40.42452, lng: 49.89988, aliases: ['koroğlu', 'koroglu'] },
  { id: 'metro-ulduz', label: 'Ulduz metro', lat: 40.41878, lng: 49.88278, aliases: ['ulduz'] },
  { id: 'metro-qara-qarayev', label: 'Qara Qarayev metro', lat: 40.41668, lng: 49.91488, aliases: ['qara qarayev', 'qara qarayev metro'] },
  { id: 'metro-xalqlar', label: 'Xalqlar Dostluğu metro', lat: 40.40228, lng: 49.93988, aliases: ['xalqlar dostluğu', 'xalqlar dostlugu'] },
  { id: 'landmark-genclik-mall', label: 'Gənclik Mall', lat: 40.3998, lng: 49.8525, aliases: ['gənclik mall', 'genclik mall'] },
  { id: 'landmark-port-baku', label: 'Port Baku Mall', lat: 40.3615, lng: 49.8355, aliases: ['port baku'] },
  { id: 'landmark-28-mall', label: '28 Mall', lat: 40.3728, lng: 49.8395, aliases: ['28 mall', '28 mall metro'] },
];

const azFold = (value: string) =>
  value
    .toLocaleLowerCase('az')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[ıİ]/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();

export function searchBakuPlaces(query: string, limit = 6): BakuPlace[] {
  const q = azFold(query);
  if (q.length < 2) return [];
  const scored = BAKU_PLACES.map((place) => {
    const label = azFold(place.label);
    const bestAlias = place.aliases.reduce((best, alias) => {
      const a = azFold(alias);
      if (a === q) return 100;
      if (a.startsWith(q) || q.startsWith(a)) return Math.max(best, 90);
      if (a.includes(q) || q.includes(a)) return Math.max(best, 75);
      const tokens = q.split(' ');
      if (tokens.every((t) => a.includes(t))) return Math.max(best, 70);
      return best;
    }, label === q ? 100 : label.includes(q) ? 80 : 0);
    return { place, score: bestAlias };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((row) => row.place);
}