"""Medicine alias matcher and high-performance clinical reference index.

Provides microsecond Trie-based prefix search, token inverted indexing,
and candidate matching for dictated medications.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_DATASET_PATH = Path(__file__).parent.parent.parent / "data" / "medicines" / "medicine_aliases.json"

_MEDICINES: list[dict[str, Any]] = []
_ALIAS_TO_ENTRY: dict[str, dict[str, Any]] = {}
_TOKEN_TO_ENTRIES: dict[str, list[dict[str, Any]]] = {}
_ALL_SEARCH_TERMS: list[str] = []


class TrieNode:
    """Node in the in-memory prefix trie for sub-millisecond drug prefix lookups."""
    __slots__ = ("children", "entries", "is_leaf")

    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.entries: list[dict[str, Any]] = []
        self.is_leaf: bool = False


class MedicineTrie:
    """Prefix tree indexing medicine names and aliases for high-throughput matching."""

    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, term: str, entry: dict[str, Any]) -> None:
        node = self.root
        for char in term.lower():
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            if entry not in node.entries:
                node.entries.append(entry)
        node.is_leaf = True

    def find_prefix(self, prefix: str) -> list[dict[str, Any]]:
        node = self.root
        for char in prefix.lower():
            if char not in node.children:
                return []
            node = node.children[char]
        return node.entries


_TRIE = MedicineTrie()


# Common modifier words that must NEVER be indexed as drug identifiers
MEDICINE_STOPWORDS = {
    "plus", "forte", "ds", "duo", "tablet", "tablets", "capsule", "capsules",
    "syrup", "drop", "drops", "injection", "inj", "suspension", "gel", "cream",
    "ointment", "sachet", "dry", "solution", "oral", "tab", "cap", "syp"
}


def _load_dataset() -> None:
    global _MEDICINES, _ALIAS_TO_ENTRY, _TOKEN_TO_ENTRIES, _ALL_SEARCH_TERMS, _TRIE
    if _MEDICINES:
        return

    if not _DATASET_PATH.exists():
        return

    with open(_DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    _MEDICINES = data.get("medicines", [])
    _ALIAS_TO_ENTRY = {}
    _TOKEN_TO_ENTRIES = {}
    _TRIE = MedicineTrie()
    terms = set()

    for med in _MEDICINES:
        canonical = med["canonical_name"].lower()
        _ALIAS_TO_ENTRY[canonical] = med
        terms.add(med["canonical_name"])
        _TRIE.insert(canonical, med)

        for b in med.get("brand_names", []):
            b_lower = b.lower()
            _ALIAS_TO_ENTRY[b_lower] = med
            terms.add(b)
            _TRIE.insert(b_lower, med)

        for a in med.get("aliases", []):
            a_lower = a.lower()
            _ALIAS_TO_ENTRY[a_lower] = med
            terms.add(a)
            _TRIE.insert(a_lower, med)

        # Build token index for fast word lookup (excluding generic stopwords)
        all_words = set(canonical.split())
        for b in med.get("brand_names", []):
            all_words.update(b.lower().split())
        for a in med.get("aliases", []):
            all_words.update(a.lower().split())

        for w in all_words:
            if len(w) >= 3 and w not in MEDICINE_STOPWORDS:
                _TOKEN_TO_ENTRIES.setdefault(w, []).append(med)

    # Sort descending by length so longer phrases match before subphrases
    _ALL_SEARCH_TERMS = sorted(terms, key=len, reverse=True)


def get_all_search_terms() -> list[str]:
    """Return all known medicine names and aliases sorted by length descending."""
    _load_dataset()
    return list(_ALL_SEARCH_TERMS)


def search_medicines(query: str, limit: int = 10) -> list[dict[str, Any]]:
    """Fast auto-complete lookup for drug search queries."""
    _load_dataset()
    clean = query.strip().lower()
    if not clean:
        return []

    # 1. Check Trie prefix
    results: list[dict[str, Any]] = []
    seen = set()

    prefix_matches = _TRIE.find_prefix(clean)
    for entry in prefix_matches:
        c_name = entry["canonical_name"]
        if c_name not in seen:
            seen.add(c_name)
            results.append({
                "canonical_name": c_name,
                "generic_name": entry.get("generic_name"),
                "default_form": entry.get("default_form"),
                "brand_names": entry.get("brand_names", []),
            })
            if len(results) >= limit:
                return results

    # 2. Check token index
    for token, entries in _TOKEN_TO_ENTRIES.items():
        if clean in token or token in clean:
            for entry in entries:
                c_name = entry["canonical_name"]
                if c_name not in seen:
                    seen.add(c_name)
                    results.append({
                        "canonical_name": c_name,
                        "generic_name": entry.get("generic_name"),
                        "default_form": entry.get("default_form"),
                        "brand_names": entry.get("brand_names", []),
                    })
                    if len(results) >= limit:
                        return results

    return results


def match_medicine(raw_phrase: str) -> dict[str, Any]:
    """Find candidate matches for a dictated medicine phrase in sub-millisecond time.

    Returns:
        dict with keys:
            - canonical_name: Optional[str]
            - candidate_matches: list[str]
            - status: "extracted" | "needs_review"
            - confidence: float
            - requires_confirmation: bool
            - default_form: Optional[str]
            - default_route: Optional[str]
    """
    _load_dataset()
    clean = raw_phrase.strip().lower()

    # 1. Exact hash map lookup O(1)
    if clean in _ALIAS_TO_ENTRY:
        entry = _ALIAS_TO_ENTRY[clean]
        requires_conf = clean in [a.lower() for a in entry.get("requires_confirmation_for", [])]
        candidates = list(entry.get("candidate_matches", []))

        status = "needs_review" if requires_conf else "extracted"
        conf = 0.65 if requires_conf else 0.95

        return {
            "canonical_name": entry["canonical_name"],
            "candidate_matches": candidates,
            "status": status,
            "confidence": conf,
            "requires_confirmation": requires_conf,
            "default_form": entry.get("default_form"),
            "default_route": entry.get("default_route"),
        }

    # 2. Token Inverted Index Lookup (Only for distinctive, non-stopword tokens >= 4 chars)
    tokens = [t for t in clean.split() if len(t) >= 4 and t not in MEDICINE_STOPWORDS]
    for t in tokens:
        if t in _TOKEN_TO_ENTRIES:
            entry = _TOKEN_TO_ENTRIES[t][0]
            candidates = list(entry.get("candidate_matches", []))
            return {
                "canonical_name": entry["canonical_name"],
                "candidate_matches": candidates,
                "status": "needs_review",
                "confidence": 0.60,
                "requires_confirmation": True,
                "default_form": entry.get("default_form"),
                "default_route": entry.get("default_route"),
            }

    # 3. Controlled prefix matching (Requires significant query length >= 5 and exact prefix overlap)
    if len(clean) >= 5 and clean not in MEDICINE_STOPWORDS:
        prefix_entries = [
            e for e in _TRIE.find_prefix(clean)
            if e["canonical_name"].lower().startswith(clean) or clean.startswith(e["canonical_name"].lower())
        ]
        if prefix_entries:
            entry = prefix_entries[0]
            candidates = list(entry.get("candidate_matches", []))
            return {
                "canonical_name": entry["canonical_name"],
                "candidate_matches": candidates,
                "status": "needs_review",
                "confidence": 0.55,
                "requires_confirmation": True,
                "default_form": entry.get("default_form"),
                "default_route": entry.get("default_route"),
            }

    return {
        "canonical_name": None,
        "candidate_matches": [],
        "status": "needs_review",
        "confidence": 0.50,
        "requires_confirmation": True,
        "default_form": None,
        "default_route": None,
    }
