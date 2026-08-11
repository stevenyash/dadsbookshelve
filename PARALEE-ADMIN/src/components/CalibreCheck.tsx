import { useEffect } from 'react';
import { useCalibreConverter } from '../hooks/useCalibreConverter';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertCircle, Download, CheckCircle } from 'lucide-react';

interface CalibreCheckProps {
  onReady?: () => void;
}

export function CalibreCheck({ onReady }: CalibreCheckProps) {
  const { 
    calibreInstalled, 
    checkCalibre, 
    installCalibre, 
    isInstalling,
    status 
  } = useCalibreConverter();

  useEffect(() => {
    checkCalibre();
  }, [checkCalibre]);

  useEffect(() => {
    if (calibreInstalled === true) {
      onReady?.();
    }
  }, [calibreInstalled, onReady]);

  if (calibreInstalled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-slate-500">Checking Calibre installation...</p>
        </div>
      </div>
    );
  }

  if (calibreInstalled === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="mx-auto text-error mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Calibre Not Found
            </h2>
            <p className="text-slate-500 mb-6">
              Calibre is required for ebook conversion. Please install it to use the conversion features.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={installCalibre} 
                isLoading={isInstalling}
                className="w-full"
              >
                <Download size={18} className="mr-2" />
                {isInstalling ? 'Installing...' : 'Install Calibre'}
              </Button>
              
              <a
                href="https://calibre-ebook.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="ghost" className="w-full">
                  Download Manually
                </Button>
              </a>
            </div>

            {status && (
              <div className="mt-4 p-3 bg-slate-100 rounded-lg text-sm">
                {status}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <CheckCircle className="mx-auto text-success mb-4" size={48} />
        <p className="text-slate-500">Calibre is ready!</p>
      </div>
    </div>
  );
}