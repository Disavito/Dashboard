import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react'; // Removed Search icon as it's now handled by the parent

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  globalFilter?: string; // Nuevo prop para el filtro global
  setGlobalFilter?: (filter: string) => void; // Nuevo prop para actualizar el filtro global
  filterPlaceholder?: string; // Nuevo prop para el placeholder del filtro
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  globalFilter,
  setGlobalFilter,
  filterPlaceholder = 'Buscar...',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    // Configuración para el filtro global
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter, // Añadir globalFilter al estado
    },
    onGlobalFilterChange: setGlobalFilter, // Manejar cambios en el filtro global
  });

  return (
    <Card className="rounded-xl border-border shadow-lg animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-center py-4 gap-4">
          {/* Input de búsqueda global */}
          {setGlobalFilter && (
            <div className="relative flex-1">
              {/* El icono de búsqueda se puede añadir aquí si se desea, o en el componente padre */}
              <Input
                placeholder={filterPlaceholder}
                value={globalFilter ?? ''}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="max-w-sm pl-4 rounded-lg border-border focus:ring-primary focus:border-primary transition-all duration-300"
              />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto rounded-lg border-border hover:bg-muted/50 transition-all duration-300">
                Columnas <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border rounded-lg shadow-lg">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize hover:bg-muted/50 cursor-pointer"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="text-textSecondary font-medium text-sm">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="border-border hover:bg-muted/20 transition-colors duration-200 cursor-pointer"
                    onClick={() => onRowClick && onRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No hay resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} de{' '}
            {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-lg border-border hover:bg-muted/50 transition-all duration-300"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-lg border-border hover:bg-muted/50 transition-all duration-300"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
