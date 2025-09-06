import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Edit, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Ingreso as IngresoType } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// --- Form Schema for Ingreso ---
const incomeFormSchema = z.object({
  receipt_number: z.string().min(1, { message: 'El número de recibo es requerido.' }).max(255, { message: 'El número de recibo es demasiado largo.' }),
  dni: z.string().min(1, { message: 'El DNI es requerido.' }).max(20, { message: 'El DNI es demasiado largo.' }),
  full_name: z.string().min(1, { message: 'El nombre completo es requerido.' }).max(255, { message: 'El nombre completo es demasiado largo.' }),
  amount: z.preprocess(
    (val) => Number(val),
    z.number().positive({ message: 'El monto debe ser positivo.' })
  ),
  account: z.string().min(1, { message: 'La cuenta es requerida.' }),
  date: z.string().min(1, { message: 'La fecha es requerida.' }),
  transaction_type: z.string().min(1, { message: 'El tipo de transacción es requerido.' }),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

// --- Column Definitions for Ingreso ---
const incomeColumns: ColumnDef<IngresoType>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Fecha
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd MMM yyyy', { locale: es }),
  },
  {
    accessorKey: 'receipt_number',
    header: 'Nº Recibo',
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue('receipt_number')}</span>,
  },
  {
    accessorKey: 'full_name',
    header: 'Nombre Completo',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('full_name')}</span>,
  },
  {
    accessorKey: 'dni',
    header: 'DNI',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('dni')}</span>,
  },
  {
    accessorKey: 'account',
    header: 'Cuenta',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('account')}</span>,
  },
  {
    accessorKey: 'transaction_type',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Tipo Transacción
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('transaction_type')}</span>,
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Monto</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const formattedAmount = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
      }).format(amount);
      return <div className="text-right font-semibold text-success">{formattedAmount}</div>;
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: () => {
      // Actions will be defined dynamically inside the component
      return null;
    },
  },
];

const transactionTypes = ['Aporte', 'Donación', 'Cuota', 'Otros']; // Example transaction types for Ingreso
const accounts = ['Caja Principal', 'Banco Ahorros', 'Inversión']; // Example accounts

function Income() {
  const { data: incomeData, loading, error, addRecord, updateRecord, deleteRecord } = useSupabaseData<IngresoType>({ tableName: 'ingresos' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IngresoType | null>(null);
  const [globalFilter, setGlobalFilter] = useState(''); // Estado para el filtro global

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      receipt_number: '',
      dni: '',
      full_name: '',
      amount: 0,
      account: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      transaction_type: '',
    },
  });

  const handleOpenDialog = (income?: IngresoType) => {
    setEditingIncome(income || null);
    if (income) {
      form.reset({
        receipt_number: income.receipt_number || '',
        dni: income.dni || '',
        full_name: income.full_name || '',
        amount: income.amount,
        account: income.account || '',
        date: income.date,
        transaction_type: income.transaction_type || '',
      });
    } else {
      form.reset({
        receipt_number: '',
        dni: '',
        full_name: '',
        amount: 0,
        account: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        transaction_type: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIncome(null);
    form.reset();
  };

  const onSubmit = async (values: IncomeFormValues) => {
    if (editingIncome) {
      await updateRecord(editingIncome.id, values);
    } else {
      await addRecord(values);
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: number) => { // Ingreso ID is number
    if (window.confirm('¿Estás seguro de que quieres eliminar este ingreso?')) {
      await deleteRecord(id);
    }
  };

  // Update column actions to use the new handlers
  const columnsWithActions: ColumnDef<IngresoType>[] = incomeColumns.map(col => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: ({ row }) => {
          const income = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border rounded-lg shadow-lg">
                <DropdownMenuItem onClick={() => handleOpenDialog(income)} className="hover:bg-muted/50 cursor-pointer">
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(income.id)} className="hover:bg-destructive/20 text-destructive cursor-pointer">
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      };
    }
    return col;
  });

  if (loading) {
    return <div className="text-center text-muted-foreground">Cargando ingresos...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Error al cargar ingresos: {error}</div>;
  }

  return (
    <div className="space-y-8">
      <Card className="rounded-xl border-border shadow-lg animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Gestión de Ingresos</CardTitle>
            <CardDescription className="text-muted-foreground">
              Visualiza, busca y gestiona tus ingresos.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300">
            <PlusCircle className="h-4 w-4" />
            Añadir Ingreso
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columnsWithActions}
            data={incomeData}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            filterPlaceholder="Buscar ingresos por nombre..."
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingIncome ? 'Editar Ingreso' : 'Añadir Nuevo Ingreso'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingIncome ? 'Realiza cambios en el ingreso existente aquí.' : 'Añade un nuevo registro de ingreso a tu sistema.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="receipt_number" className="text-right text-textSecondary">
                Nº Recibo
              </Label>
              <Input
                id="receipt_number"
                {...form.register('receipt_number')}
                className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
              />
              {form.formState.errors.receipt_number && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.receipt_number.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dni" className="text-right text-textSecondary">
                DNI
              </Label>
              <Input
                id="dni"
                {...form.register('dni')}
                className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
              />
              {form.formState.errors.dni && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.dni.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="full_name" className="text-right text-textSecondary">
                Nombre Completo
              </Label>
              <Input
                id="full_name"
                {...form.register('full_name')}
                className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
              />
              {form.formState.errors.full_name && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.full_name.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right text-textSecondary">
                Monto
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...form.register('amount')}
                className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
              />
              {form.formState.errors.amount && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.amount.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="account" className="text-right text-textSecondary">
                Cuenta
              </Label>
              <Select onValueChange={(value) => form.setValue('account', value)} value={form.watch('account')}>
                <SelectTrigger className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                  <SelectValue placeholder="Selecciona una cuenta" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                  {accounts.map(account => (
                    <SelectItem key={account} value={account} className="hover:bg-muted/50 cursor-pointer">
                      {account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.account && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.account.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transaction_type" className="text-right text-textSecondary">
                Tipo Transacción
              </Label>
              <Select onValueChange={(value) => form.setValue('transaction_type', value)} value={form.watch('transaction_type')}>
                <SelectTrigger className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                  {transactionTypes.map(type => (
                    <SelectItem key={type} value={type} className="hover:bg-muted/50 cursor-pointer">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.transaction_type && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.transaction_type.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right text-textSecondary">
                Fecha
              </Label>
              <Input
                id="date"
                type="date"
                {...form.register('date')}
                className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
              />
              {form.formState.errors.date && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.date.message}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="rounded-lg border-border hover:bg-muted/50 transition-all duration-300">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300">
                {editingIncome ? 'Guardar Cambios' : 'Añadir Ingreso'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Income;
