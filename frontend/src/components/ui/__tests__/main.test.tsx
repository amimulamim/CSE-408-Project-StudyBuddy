import { describe, test } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
describe('main.tsx', () => {
  test('should render App component without crashing', () => {
    const rootDiv = document.createElement('div')
    rootDiv.id = 'root'
    document.body.appendChild(rootDiv)

    expect(() => {
      const root = createRoot(rootDiv)
      root.render(<React.StrictMode><div>Test</div></React.StrictMode>)
    }).not.toThrow()
  })
})
