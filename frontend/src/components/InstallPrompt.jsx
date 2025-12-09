import React, { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsStandalone(true);
        }

        // Detect iOS
        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIosDevice);

        // Capture install prompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            console.log('Install prompt captured');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        setDeferredPrompt(null);
    };

    if (isStandalone) return null;

    if (isIOS) {
        return (
            <div className="mx-4 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full text-blue-600 dark:text-blue-300">
                    <Share size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-800 dark:text-blue-200 text-sm">Instalar Aplicativo</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        Para instalar, toque no botão <strong>Compartilhar</strong> do iPhone e escolha <strong>"Adicionar à Tela de Início"</strong>.
                    </p>
                </div>
            </div>
        );
    }

    if (!deferredPrompt) return null;

    return (
        <div className="px-4 py-2">
            <button
                onClick={handleInstallClick}
                className="w-full bg-stone-800 dark:bg-stone-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 hover:bg-stone-700 transition-colors shadow-lg"
            >
                <Download size={20} />
                <span className="font-bold">Instalar Aplicativo</span>
            </button>
        </div>
    );
};

export default InstallPrompt;
