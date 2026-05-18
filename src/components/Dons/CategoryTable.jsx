import * as XLSX from 'xlsx';

// Helper pour formater date et heure
const formatDateTime = (isoString) => {
  const d = new Date(isoString);
  return {
    date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
    time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  };
};

/**
 * Composant générique pour afficher un tableau de dons avec export Excel
 * @param {string} title - Titre du tableau (ex: "Fonctionnement de l'AMI")
 * @param {Array} donations - Liste des dons (enrichis avec user, userProfile, etc.)
 * @param {Array} columnsConfig - Configuration des colonnes, ex: [{ field: 'full_name', label: 'Nom' }, ...]
 *   Champs spéciaux reconnus : full_name, first_name, phone, amount, payment_method, reason,
 *   missionnaire, organizationName, destination, motifs, date, time.
 */
export default function CategoryTable({ title, donations, columnsConfig }) {
  if (!donations || donations.length === 0) return null;

  // Trier par date décroissante (les plus récents en premier)
  const sortedDonations = [...donations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = sortedDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const handleExport = () => {
    const exportData = sortedDonations.map((d, idx) => {
      const row = { '#': idx + 1 };
      columnsConfig.forEach(col => {
        let val = '';
        if (col.field === 'full_name') val = d.user?.full_name || '';
        else if (col.field === 'first_name') val = d.userProfile?.first_name || '';
        else if (col.field === 'phone') val = d.user?.phone || '';
        else if (col.field === 'amount') val = `${d.amount} FCFA`;
        else if (col.field === 'payment_method') val = (d.payment_method || '').toUpperCase();
        else if (col.field === 'reason') val = d.reason || '';
        else if (col.field === 'missionnaire') val = d.itemName || '';
        else if (col.field === 'organizationName') val = d.extra?.organizationName || '';
        else if (col.field === 'destination') val = d.extra?.destination || '';
        else if (col.field === 'motifs') val = d.extra?.reason || d.reason || '';
        else if (col.field === 'date') val = formatDateTime(d.createdAt).date;
        else if (col.field === 'time') val = formatDateTime(d.createdAt).time;
        else val = d[col.field] || '';
        row[col.label] = val;
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${title}_${new Date().toISOString().slice(0, 19)}.xlsx`);
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
        >
          📥 Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              {columnsConfig.map(col => (
                <th key={col.field} className="p-2 border text-left">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDonations.map((d, idx) => {
              const { date, time } = formatDateTime(d.createdAt);
              return (
                <tr key={d.id} className="border-b">
                  <td className="p-2 text-center">{idx + 1}</td>
                  <td className="p-2">{d.user?.full_name || ''}</td>
                  <td className="p-2">{d.userProfile?.first_name || ''}</td>
                  <td className="p-2">{d.user?.phone || ''}</td>
                  <td className="p-2 text-right">{d.amount} FCFA</td>
                  {columnsConfig.some(c => c.field === 'payment_method') && (
                    <td className="p-2">{(d.payment_method || '').toUpperCase()}</td>
                  )}
                  {columnsConfig.some(c => c.field === 'missionnaire') && (
                    <td className="p-2">{d.itemName || ''}</td>
                  )}
                  {columnsConfig.some(c => c.field === 'organizationName') && (
                    <td className="p-2">{d.extra?.organizationName || ''}</td>
                  )}
                  {columnsConfig.some(c => c.field === 'destination') && (
                    <td className="p-2">{d.extra?.destination || ''}</td>
                  )}
                  <td className="p-2">{d.extra?.reason || d.reason || ''}</td>
                  <td className="p-2">{date}</td>
                  <td className="p-2">{time}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 font-bold">
            <tr>
              <td colSpan={columnsConfig.length - 1} className="p-2 text-right">Total général :</td>
              <td className="p-2 text-right">{total} FCFA</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}