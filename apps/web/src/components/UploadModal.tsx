import React, { useState } from 'react';
import { X, Upload, FileArchive, AlertCircle } from 'lucide-react';
import { uploadRepositoryZip } from '../api/client';
import { Repository } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (repo: Repository) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.zip')) {
        setError('Only .zip archives are supported');
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
      const repo = await uploadRepositoryZip(selectedFile);
      onUploadSuccess(repo);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Repository</h3>
              <p className="text-xs text-slate-500">Upload a source repository ZIP to analyze</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Area */}
        <label className="border-2 border-dashed border-slate-200 hover:border-sky-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-sky-50/30">
          <input
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-xs font-semibold text-slate-700">Click to select a .zip archive</p>
          <p className="text-[11px] text-slate-500 mt-1">Max 25MB archive size (safe sandboxed extraction)</p>
          {selectedFile && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-sky-700 bg-sky-100 px-3 py-1 rounded-lg font-mono">
              <FileArchive className="w-3.5 h-3.5" />
              <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
            </div>
          )}
        </label>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
          >
            {isUploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Extracting & Indexing...</span>
              </>
            ) : (
              <span>Upload & Index</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
