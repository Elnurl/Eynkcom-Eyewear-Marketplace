import { useRef, useState } from 'react';
import { AlertCircle, Check, Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import {
  BULK_TEMPLATE_CSV,
  fetchGoogleSheetRows,
  parseBulkSpreadsheet,
  submitBulkProducts,
  type ParsedBulkRow,
} from '@/lib/bulk-product-import';

type Props = {
  onClose: () => void;
  onDone: () => Promise<void>;
};

export function SellerBulkImport({ onClose, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [preview, setPreview] = useState<ParsedBulkRow[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; failed: number } | null>(null);

  const validProducts = preview.filter((row) => row.product).map((row) => row.product!);
  const previewErrors = preview.filter((row) => row.error);

  const loadFile = async (file: File) => {
    setMessage('');
    setResult(null);
    const rows = await parseBulkSpreadsheet(file);
    setPreview(rows);
    if (!rows.length) setMessage('Faylda məhsul sətri tapılmadı.');
  };

  const loadSheet = async () => {
    setMessage('');
    setResult(null);
    setBusy(true);
    try {
      const rows = await fetchGoogleSheetRows(sheetUrl);
      setPreview(rows);
      if (!rows.length) setMessage('Cədvəldə məhsul sətiri yoxdur.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Google Sheets oxunmadı.');
    } finally {
      setBusy(false);
    }
  };

  const importRows = async () => {
    if (!validProducts.length) {
      setMessage('İmport üçün ən azı bir düzgün sətir lazımdır.');
      return;
    }
    if (validProducts.length > 200) {
      setMessage('Bir dəfəyə maksimum 200 məhsul yükləyə bilərsiniz.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await submitBulkProducts(validProducts);
      setResult({ created: response.created, skipped: response.skipped, failed: response.failed.length });
      if (response.failed.length) {
        setMessage(
          `${response.failed.length} sətir uğursuz oldu: ${response.failed
            .slice(0, 3)
            .map((item) => `${item.row}. ${item.name}`)
            .join('; ')}${response.failed.length > 3 ? '…' : ''}`,
        );
      }
      await onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Toplu import alınmadı.');
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([`\uFEFF${BULK_TEMPLATE_CSV}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eynek-mehsul-toplu-import.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="seller-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="seller-modal seller-modal--wide" data-testid="modal-bulk-import">
        <div className="seller-modal-header">
          <h2>Toplu məhsul əlavə et</h2>
          <button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Bağla">
            <X size={20} />
          </button>
        </div>
        <div className="seller-modal-body bulk-import-body">
          <p className="bulk-import-lead">
            Excel (.xlsx), CSV və ya Google Sheets ilə çoxlu məhsul yükləyin. Hər sətir ayrı məhsuldur; şəkillər
            <code> front_image </code>
            və
            <code> side_image </code>
            sütunlarında olmalıdır (paneldən yüklənmiş
            <code>/objects/uploads/...</code>
            yolu və ya
            <code>product-images/...</code>
            ).
          </p>

          <div className="bulk-import-actions">
            <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
              <Download size={15} />
              Nümunə CSV yüklə
            </button>
            <button type="button" className="btn btn-blue" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload size={15} />
              Fayl seç (CSV / Excel)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void loadFile(file).catch((err) => setMessage(err instanceof Error ? err.message : 'Fayl oxunmadı.'));
              }}
            />
          </div>

          <div className="bulk-import-sheet">
            <label htmlFor="bulk-sheet-url">Google Sheets linki</label>
            <div className="bulk-import-sheet-row">
              <input
                id="bulk-sheet-url"
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
              />
              <button type="button" className="btn btn-secondary" disabled={busy || !sheetUrl.trim()} onClick={() => void loadSheet()}>
                <FileSpreadsheet size={15} />
                Yüklə
              </button>
            </div>
            <small className="field-help">Cədvəl “İnternetdə paylaş → Hər kəs linklə b0xa bilsin” olmalıdır, və ya Fayl → Yüklə → CSV seçin.</small>
          </div>

          {preview.length > 0 && (
            <div className="bulk-import-preview">
              <strong>
                Önbaxış: {validProducts.length} düzgün, {previewErrors.length} xətalı sətir
              </strong>
              <ul>
                {preview.slice(0, 8).map((row) => (
                  <li key={row.row}>
                    {row.product ? (
                      <span>
                        <Check size={14} />
                        {row.row}. {row.product.name} — {row.product.price} AZN
                      </span>
                    ) : (
                      <span className="text-danger">
                        <AlertCircle size={14} />
                        {row.row}. {row.error}
                      </span>
                    )}
                  </li>
                ))}
                {preview.length > 8 ? <li>… və daha {preview.length - 8} sətir</li> : null}
              </ul>
            </div>
          )}

          {result ? (
            <div className="info-ribbon" role="status">
              <Check size={16} />
              <span>
                {result.created} məhsul əlavə olundu, {result.skipped} təkrar keçildi, {result.failed} xətalı.
              </span>
            </div>
          ) : null}
          {message ? (
            <div className="commerce-error" role="alert">
              <AlertCircle size={16} />
              {message}
            </div>
          ) : null}
        </div>
        <div className="seller-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Bağla
          </button>
          <button
            type="button"
            className="btn btn-blue"
            disabled={busy || !validProducts.length}
            onClick={() => void importRows()}
            data-testid="button-run-bulk-import"
          >
            {busy ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
            {busy ? 'İmport olunur…' : `${validProducts.length} məhsulu import et`}
          </button>
        </div>
      </div>
    </div>
  );
}
