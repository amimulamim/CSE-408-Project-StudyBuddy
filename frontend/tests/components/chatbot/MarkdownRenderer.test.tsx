import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, beforeEach, test, expect, describe } from 'vitest'
import MarkdownRenderer from '@/components/chatbot/MarkdownRenderer'

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders plain text content', () => {
    const content = 'Hello, world!'
    render(<MarkdownRenderer content={content} />)

    expect(screen.getByText('Hello, world!')).toBeInTheDocument()
  })

  test('renders with correct prose styling', () => {
    const content = 'Test content'
    const { container } = render(<MarkdownRenderer content={content} />)

    const proseContainer = container.querySelector('.prose')
    expect(proseContainer).toHaveClass(
      'prose',
      'prose-neutral',
      'dark:prose-invert',
      'max-w-none',
      'text-sm'
    )
  })

  test('renders markdown headings', () => {
    const content = '# Heading 1\n## Heading 2\n### Heading 3'
    render(<MarkdownRenderer content={content} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading 1')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading 2')
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Heading 3')
  })

  test('renders markdown lists', () => {
    const content = '- Item 1\n- Item 2\n- Item 3'
    const { container } = render(<MarkdownRenderer content={content} />)

    const list = container.querySelector('ul')
    expect(list).toBeInTheDocument()
    
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  test('renders markdown emphasis and strong text', () => {
    const content = '*italic text* and **bold text**'
    const { container } = render(<MarkdownRenderer content={content} />)

    const italic = container.querySelector('em')
    const bold = container.querySelector('strong')
    
    expect(italic).toHaveTextContent('italic text')
    expect(bold).toHaveTextContent('bold text')
  })

  test('renders links with custom styling and attributes', () => {
    const content = '[OpenAI](https://openai.com)'
    render(<MarkdownRenderer content={content} />)

    const link = screen.getByRole('link', { name: 'OpenAI' })
    expect(link).toHaveAttribute('href', 'https://openai.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveClass('text-blue-600', 'hover:underline', 'dark:text-blue-400')
  })

  test('renders inline code with custom styling', () => {
    const content = 'Use `console.log()` to debug'
    const { container } = render(<MarkdownRenderer content={content} />)

    const code = container.querySelector('code')
    expect(code).toHaveTextContent('console.log()')
    expect(code).toHaveClass('bg-muted', 'px-1', 'py-0.5', 'rounded', 'text-sm')
  })

  test('renders code blocks', () => {
    const content = '```javascript\nconst x = 42;\nconsole.log(x);\n```'
    const { container } = render(<MarkdownRenderer content={content} />)

    const codeBlock = container.querySelector('pre')
    expect(codeBlock).toBeInTheDocument()
    expect(codeBlock).toHaveTextContent('const x = 42;')
    expect(codeBlock).toHaveTextContent('console.log(x);')
  })

  test('handles GitHub Flavored Markdown - strikethrough', () => {
    const content = '~~strikethrough text~~'
    const { container } = render(<MarkdownRenderer content={content} />)

    const strikethrough = container.querySelector('del')
    expect(strikethrough).toHaveTextContent('strikethrough text')
  })

  test('handles GitHub Flavored Markdown - tables', () => {
    const content = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
    `
    const { container } = render(<MarkdownRenderer content={content} />)

    const table = container.querySelector('table')
    expect(table).toBeInTheDocument()
    
    expect(screen.getByText('Header 1')).toBeInTheDocument()
    expect(screen.getByText('Header 2')).toBeInTheDocument()
    expect(screen.getByText('Cell 1')).toBeInTheDocument()
    expect(screen.getByText('Cell 4')).toBeInTheDocument()
  })

  test('handles GitHub Flavored Markdown - task lists', () => {
    const content = `
- [x] Completed task
- [ ] Incomplete task
    `
    const { container } = render(<MarkdownRenderer content={content} />)

    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(2)
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
  })

  test('handles raw HTML through rehypeRaw plugin', () => {
    const content = 'This is <strong>bold</strong> and this is <em>italic</em>'
    const { container } = render(<MarkdownRenderer content={content} />)

    const strong = container.querySelector('strong')
    const em = container.querySelector('em')
    
    expect(strong).toHaveTextContent('bold')
    expect(em).toHaveTextContent('italic')
  })

  test('handles empty content gracefully', () => {
    render(<MarkdownRenderer content="" />)
    
    // Should not crash and should render the container
    const container = document.querySelector('.prose')
    expect(container).toBeInTheDocument()
  })

  test('handles special characters', () => {
    const content = 'Special chars: & < > " \''
    render(<MarkdownRenderer content={content} />)

    expect(screen.getByText(/Special chars: & < > " '/)).toBeInTheDocument()
  })

  test('preserves line breaks in code blocks', () => {
    const content = '```\nLine 1\nLine 2\nLine 3\n```'
    const { container } = render(<MarkdownRenderer content={content} />)

    const pre = container.querySelector('pre')
    expect(pre?.textContent).toContain('Line 1')
    expect(pre?.textContent).toContain('Line 2')
    expect(pre?.textContent).toContain('Line 3')
  })

  test('handles malformed markdown gracefully', () => {
    const content = '### Incomplete heading\n[Broken link\n**Unclosed bold'
    
    expect(() => render(<MarkdownRenderer content={content} />)).not.toThrow()
    expect(screen.getByText(/Incomplete heading/)).toBeInTheDocument()
  })

  test('handles very long content', () => {
    const longContent = 'A'.repeat(10000)
    
    expect(() => render(<MarkdownRenderer content={longContent} />)).not.toThrow()
    expect(screen.getByText(longContent)).toBeInTheDocument()
  })

  test('handles nested markdown structures', () => {
    const content = `
# Main Heading
## Subheading
- List item with **bold text**
- Another item with [link](https://example.com)
  - Nested item with \`code\`
    `
    
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Heading')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Subheading')
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com')
  })
})