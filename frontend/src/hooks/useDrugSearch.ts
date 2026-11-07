import { useEffect, useState, useRef } from 'react';

// Bundled top Indian brand fallback list (used if API is unavailable)
const FALLBACK_DRUGS = [
  'Dolo 650', 'Dolo 500', 'Calpol', 'Crocin', 'Paracetamol',
  'Pan-D', 'Pantoprazole', 'Omeprazole', 'Rabeprazole',
  'Cetirizine', 'Levocetrizine', 'Montek LC', 'Allegra',
  'Combiflam', 'Ibuprofen', 'Brufen', 'Disprin',
  'Azithromycin', 'Amoxicillin', 'Augmentin', 'Clavam',
  'Metformin', 'Glycomet', 'Januvia', 'Galvus',
  'Amlodipine', 'Telmisartan', 'Telma', 'Olmesartan',
  'Atorvastatin', 'Rosuvastatin', 'Crestor', 'Lipitor',
  'Ecosprin', 'Aspirin', 'Clopidogrel', 'Plavix',
  'Domperidone', 'Ondansetron', 'Perinorm',
  'Dexamethasone', 'Prednisolone', 'Wysolone',
  'Deriphyllin', 'Theophylline', 'Montelukast',
  'Sumatriptan', 'Propranolol', 'Amitriptyline',
  'Metronidazole', 'Tinidazole', 'Norfloxacin', 'Ciprofloxacin',
  'Sachet ORS', 'Econorm', 'Sporlac', 'Lactobacillus',
  'Vitamin C', 'Vitamin D3', 'Zinc', 'B Complex',
  'Hydrocortisone', 'Budecort', 'Duolin', 'Asthalin',
  'Sucralfate', 'Antacid', 'Mucaine', 'Gelusil',
];

function fuzzyMatch(query: string, items: string[]): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return items
    .filter((item) => item.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStart = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bStart = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aStart - bStart || a.localeCompare(b);
    })
    .slice(0, 8);
}

export function useDrugSearch(query: string): { results: string[]; loading: boolean } {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      abortRef.current = new AbortController();

      try {
        const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(q)}`, {
          signal: abortRef.current.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const names: string[] = Array.isArray(data)
            ? data.map((d: any) => (typeof d === 'string' ? d : d.canonical_name || d.name || String(d)))
            : fuzzyMatch(q, FALLBACK_DRUGS);
          setResults(names.slice(0, 8));
        } else {
          setResults(fuzzyMatch(q, FALLBACK_DRUGS));
        }
      } catch {
        setResults(fuzzyMatch(q, FALLBACK_DRUGS));
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { results, loading };
}
