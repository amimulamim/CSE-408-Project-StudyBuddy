
import React, { useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { FileAttachment } from './ChatContext';

interface FileUploadProps {
  onFilesSelected: (files: FileAttachment[]) => void;
  children: React.ReactNode;
}

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export function FileUpload({ onFilesSelected, children }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length > MAX_FILES) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${MAX_FILES} files at once.`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: FileAttachment[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type not supported`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        return;
      }

      validFiles.push({
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      });
    });

    if (errors.length > 0) {
      toast({
        title: "File upload errors",
        description: errors.join('\n'),
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
      <div onClick={() => fileInputRef.current?.click()}>
        {children}
      </div>
    </>
  );
}
