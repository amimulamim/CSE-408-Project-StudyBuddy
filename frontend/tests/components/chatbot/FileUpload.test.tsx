import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import { FileUpload } from '@/components/chatbot/FileUpload'

// Hoisted mock functions
const mockToast = vi.hoisted(() => vi.fn())
const mockUseToast = vi.hoisted(() => ({ toast: mockToast }))

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => mockUseToast,
}))

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

describe('FileUpload', () => {
  const mockOnFilesSelected = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders children and hidden file input', () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    expect(screen.getByText('Upload Files')).toBeInTheDocument()
    
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveClass('hidden')
    expect(fileInput).toHaveAttribute('multiple')
  })

  test('opens file dialog when children are clicked', () => {
    const mockClick = vi.fn()
    
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fileInput.click = mockClick

    fireEvent.click(screen.getByText('Upload Files'))
    expect(mockClick).toHaveBeenCalled()
  })

  test('accepts allowed file types', () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toHaveAttribute('accept')
    
    const acceptAttr = fileInput?.getAttribute('accept')
    expect(acceptAttr).toContain('image/jpeg')
    expect(acceptAttr).toContain('application/pdf')
    expect(acceptAttr).toContain('text/plain')
    expect(acceptAttr).toContain('application/msword')
    expect(acceptAttr).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  })

  test('rejects files with invalid types', async () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const file = new File(['test'], 'test.exe', { type: 'application/x-executable' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "File upload errors",
        description: "test.exe: File type not supported",
        variant: "destructive",
      })
    })

    expect(mockOnFilesSelected).not.toHaveBeenCalled()
  })

  test('rejects files that are too large', async () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    // Create a file with large size
    const largeFile = new File(['x'.repeat(1000)], 'large.pdf', { type: 'application/pdf' })
    
    // Override the size property to simulate a large file
    Object.defineProperty(largeFile, 'size', {
      value: 11 * 1024 * 1024, // 11MB
      writable: false,
      configurable: true
    })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [largeFile] } })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "File upload errors",
        description: "large.pdf: File too large (max 10MB)",
        variant: "destructive",
      })
    })

    expect(mockOnFilesSelected).not.toHaveBeenCalled()
  })

  test('rejects more than 5 files', async () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const files = Array.from({ length: 6 }, (_, i) => 
      new File(['test'], `test${i}.pdf`, { type: 'application/pdf' })
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files } })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Too many files",
        description: "You can only upload up to 5 files at once.",
        variant: "destructive",
      })
    })

    expect(mockOnFilesSelected).not.toHaveBeenCalled()
  })

  test('processes mixed valid and invalid files shows error for invalid', async () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const validFile = new File(['test'], 'valid.pdf', { type: 'application/pdf' })
    const invalidFile = new File(['test'], 'invalid.exe', { type: 'application/x-executable' })
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [validFile, invalidFile] } })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "File upload errors",
        description: "invalid.exe: File type not supported",
        variant: "destructive",
      })
    })
  })

  test('handles no files selected', () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: null } })

    expect(mockOnFilesSelected).not.toHaveBeenCalled()
    expect(mockToast).not.toHaveBeenCalled()
  })

  test('handles empty file list', () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [] } })

    expect(mockOnFilesSelected).not.toHaveBeenCalled()
    expect(mockToast).not.toHaveBeenCalled()
  })

  test('resets file input value after processing', async () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const file = new File(['test'], 'test.exe', { type: 'application/x-executable' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    // Set initial value
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Wait for processing to complete
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalled()
    })

    // Check that input value is reset
    expect(fileInput.value).toBe('')
  })

  test('file input has correct attributes', () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveAttribute('multiple')
    expect(fileInput).toHaveClass('hidden')
    expect(fileInput).toHaveAttribute('accept')
  })

  test('shows multiple error messages for multiple invalid files', async () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const invalidFile1 = new File(['test'], 'invalid1.exe', { type: 'application/x-executable' })
    const invalidFile2 = new File(['test'], 'invalid2.bat', { type: 'application/x-bat' })
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [invalidFile1, invalidFile2] } })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "File upload errors",
        description: expect.stringContaining("invalid1.exe: File type not supported"),
        variant: "destructive",
      })
    })
  })

  test('handles files with same name', async () => {
    render(
      <FileUpload onFilesSelected={mockOnFilesSelected}>
        <button>Upload Files</button>
      </FileUpload>
    )

    const file1 = new File(['test1'], 'document.pdf', { type: 'application/pdf' })
    const file2 = new File(['test2'], 'document.pdf', { type: 'application/pdf' })
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file1, file2] } })

    // Should not show any errors for same-named files
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(mockToast).not.toHaveBeenCalled()
  })
})