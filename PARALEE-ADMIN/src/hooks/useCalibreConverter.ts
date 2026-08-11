import { invoke } from '@tauri-apps/api/core';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../lib/store';

interface ConvertOptions {
  title?: string;
  author?: string;
  bookId: number;
  coverImage?: string;
}

interface ConversionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export function useCalibreConverter() {
  const [isConverting, setIsConverting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [calibreInstalled, setCalibreInstalled] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const checkCalibre = useCallback(async (): Promise<boolean> => {
    try {
      const result = await invoke<boolean>('check_calibre');
      setCalibreInstalled(result);
      return result;
    } catch {
      setCalibreInstalled(false);
      return false;
    }
  }, []);

  const installCalibre = useCallback(async (): Promise<boolean> => {
    setIsInstalling(true);
    setStatus('Installing Calibre...');
    
    try {
      const result = await invoke<string>('install_calibre');
      setStatus(result);
      toast.success('Calibre installed successfully!');
      setCalibreInstalled(true);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      setStatus(`Installation failed: ${error}`);
      toast.error(`Installation failed: ${error}`);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, []);

  const convertToEpub = useCallback(async (
    serverFilePath: string,
    options: ConvertOptions
  ): Promise<ConversionResult> => {
    setIsConverting(true);
    setProgress(0);
    setStatus('Starting conversion...');

    try {
      const hasCalibre = await checkCalibre();
      if (!hasCalibre) {
        throw new Error('Calibre is not installed');
      }

      setProgress(5);
      setStatus('Downloading source file...');

      // Get filename and directory type from server path
      // serverFilePath is like "uploads/files/books/filename.pdf" or "uploads/temp/filename.pdf"
      const pathParts = serverFilePath.split('/');
      const filename = pathParts.pop() || `book_${options.bookId}.pdf`;
      const dirType = pathParts.pop() || 'books'; // Extract directory type (books, temp, cover_page, converted, etc.)
      
      // Use relative paths with Tauri BaseDirectory.Temp
      const inputFilename = `paralee_convert_${Date.now()}_${filename}`;
      const outputFilename = inputFilename.replace(/\.[^/.]+$/, '.epub');

      // Download file from server using browser fetch
      const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8060';
      const downloadUrl = `${apiUrl}/api/components_data/files_download/${dirType}/${encodeURIComponent(filename)}`;
      
      const token = useAuthStore.getState().token;
      
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      // Write to temp file using Tauri fs with BaseDirectory.Temp
      const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
      await writeFile(inputFilename, new Uint8Array(arrayBuffer), { baseDir: BaseDirectory.Temp });

      // Download cover image if provided
      let coverPath = null;
      if (options.coverImage) {
        setProgress(15);
        setStatus('Downloading cover image...');
        
        const coverParts = options.coverImage.split('/');
        const coverFilename = coverParts.pop() || 'cover.jpg';
        const coverDirType = coverParts.pop() || 'cover_page';
        
        const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8060';
        const coverUrl = `${apiUrl}/api/components_data/files_download/${coverDirType}/${encodeURIComponent(coverFilename)}`;
        
        const coverResponse = await fetch(coverUrl, {
          headers: { 'Authorization': token ? `Bearer ${token}` : '' }
        });
        
        if (coverResponse.ok) {
          const coverBlob = await coverResponse.blob();
          const coverArrayBuffer = await coverBlob.arrayBuffer();
          const coverInputFilename = `cover_${inputFilename}.jpg`;
          await writeFile(coverInputFilename, new Uint8Array(coverArrayBuffer), { baseDir: BaseDirectory.Temp });
          
          const pathModule = await import('@tauri-apps/api/path');
          coverPath = await pathModule.tempDir() + '\\' + coverInputFilename;
        }
      }

      setProgress(30);
      setStatus('Converting with Calibre...');

      // Run conversion
      const pathModule = await import('@tauri-apps/api/path');
      const tempDir = await pathModule.tempDir();
      const inputPath = tempDir + '\\' + inputFilename;
      const outputPath = tempDir + '\\' + outputFilename;
      
      const result = await invoke<string>('convert_to_epub', {
        inputPath: inputPath,
        outputPath: outputPath,
        title: options.title,
        author: options.author,
        coverPath: coverPath,
      });

      setProgress(80);
      setStatus('Upload converted file to server...');

      // Read converted file and upload to server via file path
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const convertedData = await readFile(outputFilename, { baseDir: BaseDirectory.Temp });
      
      // Upload using FormData with file
      const formData = new FormData();
      const convertedFile = new File([convertedData], filename.replace(/\.[^/.]+$/, '.epub'), { type: 'application/epub+zip' });
      formData.append('file', convertedFile);

      const uploadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8060/api'}/ebook-jobs/${options.bookId}/upload`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      });

      const responseText = await uploadResponse.text();
      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload converted file: ${uploadResponse.status} - ${responseText}`);
      }

      setProgress(100);
      setStatus('Conversion complete!');
      
      // Cleanup temp files
      try {
        const { remove, BaseDirectory } = await import('@tauri-apps/plugin-fs');
        await remove(inputFilename, { baseDir: BaseDirectory.Temp });
        await remove(outputFilename, { baseDir: BaseDirectory.Temp });
      } catch {}

      return { success: true, outputPath: result };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      setStatus(`Error: ${error}`);
      toast.error(`Conversion failed: ${error}`);
      return { success: false, error };
    } finally {
      setIsConverting(false);
    }
  }, [checkCalibre]);

  return {
    isConverting,
    isInstalling,
    calibreInstalled,
    progress,
    status,
    checkCalibre,
    installCalibre,
    convertToEpub,
  };
}