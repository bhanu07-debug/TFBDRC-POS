import React, { useState, useRef } from 'react';
import { Upload, Link2, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle, RefreshCw, Camera } from 'lucide-react';
import { normalizeImageUrl, compressImageFile } from '../../utils/imageUtils';

interface DishImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  idPrefix?: string;
  label?: string;
}

export const DishImageUploader: React.FC<DishImageUploaderProps> = ({
  value = '',
  onChange,
  idPrefix = 'dish-image',
  label = 'Dish Image'
}) => {
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
        <label className="font-bold text-gray-900 text-xs block">{label}</label>
        {normalizedValue && (
          <button
            type="button"
            onClick={handleClearImage}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove Image</span>
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl gap-1 text-xs">
        <button
          type="button"
          id={`${idPrefix}-tab-upload`}
          onClick={() => {
            setActiveTab('upload');
            setErrorMessage(null);
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === 'upload'
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-amber-500" />
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
              ? 'bg-white text-gray-900 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Link2 className="w-3.5 h-3.5 text-blue-500" />
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
              ? 'border-amber-500 bg-amber-50/50'
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
            <div className="py-2 flex flex-col items-center gap-2 text-amber-600">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-bold">Optimizing & Uploading Image...</span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">
                  Click to Browse or Drag & Drop Photo
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
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
              className="w-full pl-3 pr-8 py-2 bg-white text-gray-900 text-xs font-medium border border-gray-300 rounded-lg placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
            />
            {linkInput && (
              <button
                type="button"
                onClick={() => handleLinkChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-500 leading-snug">
            💡 <strong>Google Drive links:</strong> Set file sharing to "Anyone with the link" and paste the share link. We automatically convert it to a direct image!
          </p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Live Image Preview Card */}
      {normalizedValue && (
        <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-300">
            {imageLoadError ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-1 text-center">
                <AlertCircle className="w-4 h-4 text-amber-500 mb-0.5" />
                <span className="text-[8px] font-bold">Failed</span>
              </div>
            ) : (
              <img
                src={normalizedValue}
                alt="Dish preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImageLoadError(true)}
                onLoad={() => setImageLoadError(false)}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-gray-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">
                {normalizedValue.startsWith('data:') ? 'Image uploaded from device' : 'Valid Image Linked'}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">
              {normalizedValue.startsWith('data:') ? 'Stored directly in dish profile' : normalizedValue}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-white border border-gray-300 hover:bg-gray-100 text-[11px] font-bold text-gray-700 shadow-2xs transition"
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
};
