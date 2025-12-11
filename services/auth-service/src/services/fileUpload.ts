/**
 * File Upload Service
 * Handles uploads to local storage (can be extended to S3, Cloudinary, etc.)
 */

import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

/**
 * Ensure upload directory exists
 */
function ensureUploadDirExists(subdir: string): string {
  const fullPath = path.join(UPLOAD_DIR, subdir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

/**
 * Upload file to local storage
 */
export async function uploadFile(
  file: Express.Multer.File,
  subdir: string
): Promise<string> {
  try {
    const uploadPath = ensureUploadDirExists(subdir);
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const fullPath = path.join(uploadPath, fileName);
    
    // Save file
    fs.writeFileSync(fullPath, file.buffer);
    
    // Return relative URL
    return `/${subdir}/${fileName}`;
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Upload to S3 (when configured)
 */
export async function uploadToS3(
  file: Express.Multer.File,
  subdir: string
): Promise<string> {
  // Placeholder for S3 integration
  // For now, use local storage
  return uploadFile(file, subdir);
}

/**
 * Delete file from storage
 */
export function deleteFile(fileUrl: string): void {
  try {
    const filePath = path.join(UPLOAD_DIR, fileUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('File deletion error:', error);
  }
}

/**
 * Validate file type
 */
export function validateFileType(
  file: Express.Multer.File,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(file.mimetype);
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: Express.Multer.File,
  maxSizeInMB: number
): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}
