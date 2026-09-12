import React, { useState, useRef } from 'react';
import { Upload, Link2, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle, RefreshCw, Camera } from 'lucide-react';
import { normalizeImageUrl, compressImageFile } from '../../utils/imageUtils';

interface DishImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  idPrefix?: string;
  label?: string;
  theme?: 'light' | 'dark';
}

export const DishImageUploader: React.FC<DishImageUploaderProps> = ({
  value = '',
  onChange,
  idPrefix = 'dish-image',
  label = 'Dish Image',
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [linkInput, setLinkInput] = useState(value && !value.startsWith('data:') ? value : '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizedValue = normalizeImageUrl(value);

  const handleFileSelection = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setImageLoadError(false);

      // Compress and convert to lightweight base64 data URL
      const compressedDataUrl = await compressImageFile(file, 800, 0.82);
      onChange(compressedDataUrl);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setErrorMessage(err.message || 'Failed to process image. Please try another file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
    // Reset file input value so same file can be re-selected if needed
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleLinkChange = (rawUrl: string) => {
    setLinkInput(rawUrl);
    setErrorMessage(null);
    setImageLoadError(false);
    const cleanUrl = normalizeImageUrl(rawUrl);
    onChange(cleanUrl);
  };

  const handleClearImage = () => {
    onChange('');
    setLinkInput('');
    setErrorMessage(null);
    setImageLoadError(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`font-bold text-xs block ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>{label}</label>
        {normalizedValue && (
          <button
            type="button"
            onClick={handleClearImage}
            className={`text-[11px] font-bold flex items-center gap-1 transition ${
              isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove Image</span>
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className={`flex p-1 rounded-xl gap-1 text-xs ${isDark ? 'bg-[#0B0F17] border border-slate-800' : 'bg-gray-100'}`}>
        <button
          type="button"
          id={`${idPrefix}-tab-upload`}
          onClick={() => {
            setActiveTab('upload');
            setErrorMessage(null);
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === 'upload'
              ? isDark
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-gray-900 shadow-xs'
              : isDark
              ? 'text-slate-400 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-300' : 'text-amber-500'}`} />
          <span>Upload from Device</span>
        </button>

        <button
          type="button"
          id={`${idPrefix}-tab-link`}
          onClick={() => {
            setActiveTab('link');
            setErrorMessage(null);
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === 'link'
              ? isDark
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-gray-900 shadow-xs'
              : isDark
              ? 'text-slate-400 hover:text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Link2 className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-300' : 'text-blue-500'}`} />
          <span>Google / Web Link</span>
        </button>
      </div>

      {/* Tab 1: Upload from Device */}
      {activeTab === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
            isDragOver
              ? isDark
                ? 'border-indigo-500 bg-indigo-950/40'
                : 'border-amber-500 bg-amber-50/50'
              : isDark
              ? 'border-slate-700 hover:border-indigo-500 bg-[#0B0F17] hover:bg-slate-900/60'
              : 'border-gray-300 hover:border-amber-400 bg-gray-50/70 hover:bg-amber-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
            onChange={handleFileInputChange}
            className="hidden"
            id={`${idPrefix}-file-input`}
          />

          {isProcessing ? (
            <div className={`py-2 flex flex-col items-center gap-2 ${isDark ? 'text-indigo-400' : 'text-amber-600'}`}>
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-bold">Optimizing & Uploading Image...</span>
            </div>
          ) : (
            <>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-2xs ${
                isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-100 text-amber-600'
              }`}>
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                  Click to Browse or Drag & Drop Photo
                </p>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  Supports JPG, PNG, WEBP from your phone, tablet, or PC
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Google / Web Image URL Input */}
      {activeTab === 'link' && (
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              id={`${idPrefix}-url-input`}
              value={linkInput}
              onChange={(e) => handleLinkChange(e.target.value)}
              placeholder="Paste Google Drive share link, Google Image link, or Web URL..."
              className={`w-full pl-3 pr-8 py-2 text-xs font-medium border rounded-lg shadow-2xs focus:outline-none ${
                isDark
                  ? 'bg-[#0B0F17] text-white border-slate-700 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                  : 'bg-white text-gray-900 border-gray-300 placeholder:text-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
              }`}
            />
            {linkInput && (
              <button
                type="button"
                onClick={() => handleLinkChange('')}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                ✕
              </button>
            )}
          </div>
          <p className={`text-[10px] leading-snug ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            💡 <strong>Google Drive links:</strong> Set file sharing to "Anyone with the link" and paste the share link. We automatically convert it to a direct image!
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className={`p-2 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${
          isDark ? 'bg-rose-950/50 border border-rose-800 text-rose-300' : 'bg-rose-50 border border-rose-200 text-rose-700'
        }`}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Live Image Preview Card */}
      {normalizedValue && (
        <div className={`p-2.5 rounded-xl flex items-center gap-3 border ${
          isDark ? 'bg-[#0B0F17] border-slate-800' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className={`relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-200 border-gray-300'
          }`}>
            {imageLoadError ? (
              <div className={`w-full h-full flex flex-col items-center justify-center p-1 text-center ${
                isDark ? 'bg-slate-900 text-slate-500' : 'bg-gray-100 text-gray-400'
              }`}>
                <AlertCircle className="w-4 h-4 text-amber-500 mb-0.5" />
                <span className="text-[8px] font-bold">Failed</span>
              </div>
            ) : (
              <img
                src={normalizedValue}
                alt="Product preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImageLoadError(true)}
                onLoad={() => setImageLoadError(false)}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-1 text-[11px] font-bold ${
              isDark ? 'text-slate-200' : 'text-gray-800'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">
                {normalizedValue.startsWith('data:') ? 'Photo uploaded from device' : 'Valid Image Linked'}
              </span>
            </div>
            <p className={`text-[10px] truncate mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-gray-500'
            }`}>
              {normalizedValue.startsWith('data:') ? 'Stored directly in product profile' : normalizedValue}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs transition border ${
              isDark
                ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'
            }`}
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
};
