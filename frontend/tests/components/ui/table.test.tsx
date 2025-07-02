import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, test, expect, describe } from 'vitest'
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table'

describe('Table', () => {
  test('renders complete table structure', () => {
    render(
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>Credit Card</TableCell>
            <TableCell className="text-right">$250.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">INV002</TableCell>
            <TableCell>Pending</TableCell>
            <TableCell>PayPal</TableCell>
            <TableCell className="text-right">$150.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right">$400.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByText('A list of your recent invoices.')).toBeInTheDocument()
    expect(screen.getByText('Invoice')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Method')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
    expect(screen.getByText('INV001')).toBeInTheDocument()
    expect(screen.getByText('INV002')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('$400.00')).toBeInTheDocument()
  })

  test('renders table without caption', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John Doe</TableCell>
            <TableCell>john@example.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  test('applies custom className to table components', () => {
    render(
      <Table className="custom-table" data-testid="table">
        <TableHeader className="custom-header" data-testid="header">
          <TableRow className="custom-row" data-testid="header-row">
            <TableHead className="custom-head" data-testid="head">
              Name
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="custom-body" data-testid="body">
          <TableRow className="custom-row" data-testid="body-row">
            <TableCell className="custom-cell" data-testid="cell">
              John
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByTestId('table')).toHaveClass('custom-table')
    expect(screen.getByTestId('header')).toHaveClass('custom-header')
    expect(screen.getByTestId('body')).toHaveClass('custom-body')
    expect(screen.getByTestId('head')).toHaveClass('custom-head')
    expect(screen.getByTestId('cell')).toHaveClass('custom-cell')
  })

  test('renders empty table', () => {
    render(
      <Table data-testid="table">
        <TableHeader>
          <TableRow>
            <TableHead>No Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>No entries found</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    expect(screen.getByTestId('table')).toBeInTheDocument()
    expect(screen.getByText('No Data')).toBeInTheDocument()
    expect(screen.getByText('No entries found')).toBeInTheDocument()
  })
})