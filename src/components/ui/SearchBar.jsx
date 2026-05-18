import { useState } from 'react';

/**
 * Barre de recherche réutilisable avec icône de loupe et placeholder personnalisable.
 * @param {string} placeholder - Texte d'invite (défaut: "Chercher...")
 * @param {function} onSearch - Callback appelée à chaque changement de valeur (ou via onSearchDelayed)
 * @param {boolean} debounce - Si true, déclenche onSearch après un délai (utile pour les recherches en temps réel)
 * @param {number} delay - Délai en ms pour le debounce (défaut: 300)
 * @param {string} className - Classes CSS additionnelles
 * @param {string} value - Valeur contrôlée (optionnel, sinon interne)
 * @param {function} onChange - Callback si valeur contrôlée
 */
export default function SearchBar({
  placeholder = "Chercher par nom",
  onSearch = () => {},
  debounce = false,
  delay = 300,
  className = "",
  value: externalValue,
  onChange: externalOnChange
}) {
  const [internalValue, setInternalValue] = useState('');
  const [timeoutId, setTimeoutId] = useState(null);

  const isControlled = externalValue !== undefined && externalOnChange !== undefined;
  const searchValue = isControlled ? externalValue : internalValue;

  const handleChange = (e) => {
    const newValue = e.target.value;
    if (isControlled) {
      externalOnChange(newValue);
    } else {
      setInternalValue(newValue);
    }

    if (debounce) {
      if (timeoutId) clearTimeout(timeoutId);
      const newTimeoutId = setTimeout(() => {
        onSearch(newValue);
      }, delay);
      setTimeoutId(newTimeoutId);
    } else {
      onSearch(newValue);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchValue}
        onChange={handleChange}
        className="w-full md:w-80 px-4 py-2 pl-10 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
    </div>
  );
}