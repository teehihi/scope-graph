import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileArchive, AlertCircle, Loader2 } from 'lucide-react';
import { uploadRepositoryZip } from '../api/client';
import { Repository } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (repo: Repository) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.zip')) {
        setError(t('upload.error_zip_only'));
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);

    try {
      const repo = await uploadRepositoryZip(selectedFile, user?.email);
      onUploadSuccess(repo);
      onClose();
    } catch (err: any) {
      setError(err.message || t('upload.error_failed'));
    } finally {
      setIsUploading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#151923]/60 backdrop-blur-xs p-4 sm:p-6 animate-fade-in font-sans">
      <div className="bg-white rounded-3xl border border-[#E4E7E1] shadow-2xl max-w-md w-full p-6 space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E7E1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#526BEE]/10 text-[#526BEE] flex items-center justify-center shadow-2xs">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#151923] tracking-tight">{t('upload.title')}</h3>
              <p className="text-xs text-[#8B929E]">{t('upload.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8B929E] hover:text-[#151923] hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <label className="border-2 border-dashed border-[#E4E7E1] hover:border-[#526BEE] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-[#F7F8F5] hover:bg-blue-50/20 group">
          <input
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#E4E7E1] flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6 text-[#526BEE]" />
          </div>
          <p className="text-xs font-bold text-[#151923]">{t('upload.drop_label')}</p>
          <p className="text-[11px] text-[#8B929E] mt-1 text-center">{t('upload.limit_note')}</p>
          {selectedFile && (
            <div className="mt-3.5 flex items-center gap-2 text-xs text-[#151923] bg-white border border-[#E4E7E1] px-3.5 py-1.5 rounded-xl font-mono shadow-2xs max-w-full truncate">
              <FileArchive className="w-4 h-4 text-[#526BEE] shrink-0" />
              <span className="truncate">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
            </div>
          )}
        </label>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-[#E4E7E1] text-[#151923] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {t('upload.btn_cancel')}
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="text-xs font-bold px-4 py-2.5 rounded-xl bg-[#151923] text-white hover:bg-[#C7F36B] hover:text-[#151923] disabled:opacity-40 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C7F36B]" />
                <span>{t('upload.extracting')}</span>
              </>
            ) : (
              <span>{t('upload.btn_upload')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
