import React, { useState, useRef } from 'react';
import { Upload, X, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { optimizeImage, IMAGE_CONFIGS, formatFileSize, getCompressionRatio } from '../utils/imageOptimizer';

/**
 * Optimized Image Upload Component
 * Automatically compresses and resizes images before upload
 */
const OptimizedImageUpload = ({
    type = 'product',
    currentImage,
    onImageOptimized,
    onUpload,
    label,
    className = ''
}) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [preview, setPreview] = useState(null);
    const [optimizationInfo, setOptimizationInfo] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const config = IMAGE_CONFIGS[type] || IMAGE_CONFIGS.product;

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Por favor, selecione uma imagem válida');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const result = await optimizeImage(file, type);

            setPreview(result.dataUrl);
            setOptimizationInfo({
                originalSize: result.originalSize,
                optimizedSize: result.optimizedSize,
                width: result.width,
                height: result.height,
                saved: getCompressionRatio(result.originalSize, result.optimizedSize)
            });

            // Notify parent with optimized file
            if (onImageOptimized) {
                onImageOptimized(result.file, result.dataUrl);
            }

            // Auto-upload if handler provided
            if (onUpload) {
                await onUpload(result.file);
            }
        } catch (err) {
            console.error('Image optimization error:', err);
            setError('Erro ao processar imagem. Tente novamente.');
        } finally {
            setIsProcessing(false);
        }
    };

    const clearImage = () => {
        setPreview(null);
        setOptimizationInfo(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const displayImage = preview || currentImage;

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Label with recommendation */}
            <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {label || config.label}
                </label>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1">
                    <ImageIcon size={10} />
                    {config.recommendation}
                </span>
            </div>

            {/* Upload Area */}
            <div className="relative">
                {displayImage ? (
                    <div className="relative group">
                        <img
                            src={displayImage}
                            alt="Preview"
                            className="w-full h-40 object-cover rounded-lg border border-stone-200 dark:border-stone-700"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 bg-white rounded-full text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <Upload size={18} />
                            </button>
                            <button
                                type="button"
                                onClick={clearImage}
                                className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Optimization badge */}
                        {optimizationInfo && (
                            <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                                <Check size={10} />
                                Otimizada: {formatFileSize(optimizationInfo.optimizedSize)} (-{optimizationInfo.saved})
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full h-40 border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-lg flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-stone-400 hover:text-stone-500 dark:hover:border-stone-500 transition-colors disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-stone-300 border-t-stone-600"></div>
                                <span className="text-xs">Otimizando...</span>
                            </>
                        ) : (
                            <>
                                <Upload size={24} />
                                <span className="text-xs">Clique para enviar</span>
                                <span className="text-[10px] text-stone-400">
                                    Será otimizada automaticamente
                                </span>
                            </>
                        )}
                    </button>
                )}

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Error message */}
            {error && (
                <div className="flex items-center gap-1 text-red-500 text-xs">
                    <AlertCircle size={12} />
                    {error}
                </div>
            )}

            {/* Size info */}
            {optimizationInfo && (
                <div className="text-[10px] text-stone-400 dark:text-stone-500">
                    Original: {formatFileSize(optimizationInfo.originalSize)} →
                    Otimizada: {formatFileSize(optimizationInfo.optimizedSize)}
                    ({optimizationInfo.width}x{optimizationInfo.height}px)
                </div>
            )}
        </div>
    );
};

export default OptimizedImageUpload;
