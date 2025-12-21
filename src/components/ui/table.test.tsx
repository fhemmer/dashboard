import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from './table'

describe('Table', () => {
  it('renders correctly', () => {
    render(
      <Table>
        <TableCaption>A list of recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>INV001</TableCell>
            <TableCell>Paid</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByText('A list of recent invoices.')).toBeDefined()
    expect(screen.getByText('Invoice')).toBeDefined()
    expect(screen.getByText('INV001')).toBeDefined()
    expect(screen.getByText('Total')).toBeDefined()
  })
})
