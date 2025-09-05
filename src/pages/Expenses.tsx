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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Gasto as GastoType, Colaborador } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// --- Form Schema for Gasto ---
const expenseFormSchema = z.object({
  amount: z.preprocess(
    (val) => Number(val),
    z.number().positive({ message: 'El monto debe ser positivo.' })
  ),
  account: z.string().min(1, { message: 'La cuenta es requerida.' }),
  date: z.string().min(1, { message: 'La fecha es requerida.' }),
  category: z.string().min(1, { message: 'La categoría es requerida.' }),
  sub_category: z.string().optional().nullable(),
  description: z.string().min(1, { message: 'La descripción es requerida.' }).max(255, { message: 'La descripción es demasiado larga.' }),
  numero_gasto: z.string().optional().nullable(),
  colaborador_id: z.string().uuid().optional().nullable(), // UUID for foreign key
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

// --- Column Definitions for Gasto ---
const expenseColumns: ColumnDef<GastoType>[] = [
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
    accessorKey: 'numero_gasto',
    header: 'Nº Gasto',
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue('numero_gasto') || 'N/A'}</span>,
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue('description')}</span>,
  },
  {
    accessorKey: 'category',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Categoría
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('category')}</span>,
  },
  {
    accessorKey: 'sub_category',
    header: 'Subcategoría',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('sub_category') || 'N/A'}</span>,
  },
  {
    accessorKey: 'account',
    header: 'Cuenta',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('account')}</span>,
  },
  {
    accessorKey: 'colaborador_id',
    header: 'ID Colaborador',
    cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.getValue('colaborador_id') ? (row.getValue('colaborador_id') as string).substring(0, 8) + '...' : 'N/A'}</span>,
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
      return <div className="text-right font-semibold text-error">{formattedAmount}</div>;
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

const expenseCategories = ['Alquiler', 'Comida', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Educación', 'Software', 'Oficina', 'Otros'];
const accounts = ['Caja Principal', 'Banco Ahorros', 'Tarjeta Crédito']; // Example accounts

function Expenses() {
  const { data: expenseData, loading, error, addRecord, updateRecord, deleteRecord } = useSupabaseData<GastoType>({ tableName: 'gastos' });
  const { data: colaboradoresData } = useSupabaseData<Colaborador>({ tableName: 'colaboradores', enabled: true }); // Enabled to fetch data for dropdown
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GastoType | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: 0,
      account: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      category: '',
      sub_category: null,
      description: '',
      numero_gasto: null,
      colaborador_id: null,
    },
  });

  const handleOpenDialog = (expense?: GastoType) => {
    setEditingExpense(expense || null);
    if (expense) {
      form.reset({
        amount: expense.amount,
        account: expense.account || '',
        date: expense.date,
        category: expense.category || '',
        sub_category: expense.sub_category || null,
        description: expense.description || '',
        numero_gasto: expense.numero_gasto || null,
        colaborador_id: expense.colaborador_id || null,
      });
    } else {
      form.reset({
        amount: 0,
        account: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        category: '',
        sub_category: null,
        description: '',
        numero_gasto: null,
        colaborador_id: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
    form.reset();
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    if (editingExpense) {
      await updateRecord(editingExpense.id, values);
    } else {
      await addRecord(values);
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => { // Gasto ID is string (UUID)
    if (window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      await deleteRecord(id);
    }
  };

  // Update column actions to use the new handlers
  const columnsWithActions: ColumnDef<GastoType>[] = expenseColumns.map(col => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: ({ row }) => {
          const expense = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border rounded-lg shadow-lg">
                <DropdownMenuItem onClick={() => handleOpenDialog(expense)} className="hover:bg-muted/50 cursor-pointer">
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(expense.id)} className="hover:bg-destructive/20 text-destructive cursor-pointer">
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
    return <div className="text-center text-muted-foreground">Cargando gastos...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Error al cargar gastos: {error}</div>;
  }

  return (
    <div className="space-y-8">
      <Card className="rounded-xl border-border shadow-lg animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Gestión de Gastos</CardTitle>
            <CardDescription className="text-muted-foreground">
              Visualiza, busca y gestiona tus gastos.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300">
            <PlusCircle className="h-4 w-4" />
            Añadir Gasto
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable columns={columnsWithActions} data={expenseData} searchColumn="description" searchPlaceholder="Buscar gastos por descripción..." />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingExpense ? 'Editar Gasto' : 'Añadir Nuevo Gasto'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingExpense ? 'Realiza cambios en el gasto existente aquí.' : 'Añade un nuevo registro de gasto a tu sistema.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
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
              <Label htmlFor="category" className="text-right text-textSecondary">
                Categoría
              </Label>
              <Select onValueChange={(value) => form.setValue('category', value)} value={form.watch('category')}>
                <SelectTrigger className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                  {expenseCategories.map(category => (
                    <SelectItem key={category} value={category} className="hover:bg-muted/50 cursor-pointer">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.category.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sub_category" className="text-right text-textSecondary">
                Subcategoría (Opcional)
              </Label>
              <Input
                id="sub_category"
                {...form.register('sub_category')}
                className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
              />
              {form.formState.errors.sub_category && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.sub_category.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right text-textSecondary">
                Descripción
              </Label>
              <Textarea
                id="description"
                {...form.register('description')}
                className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
              />
              {form.formState.errors.description && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="numero_gasto" className="text-right text-textSecondary">
                Nº Gasto (Opcional)
              </Label>
              <Input
                id="numero_gasto"
                {...form.register('numero_gasto')}
                className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
              />
              {form.formState.errors.numero_gasto && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.numero_gasto.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="colaborador_id" className="text-right text-textSecondary">
                Colaborador (Opcional)
              </Label>
              <Select onValueChange={(value) => form.setValue('colaborador_id', value)} value={form.watch('colaborador_id') || ''}>
                <SelectTrigger className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                  <SelectValue placeholder="Selecciona un colaborador" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                  {colaboradoresData.map(colaborador => (
                    <SelectItem key={colaborador.id} value={colaborador.id} className="hover:bg-muted/50 cursor-pointer">
                      {colaborador.name} {colaborador.apellidos} {/* Updated to use 'name' and 'apellidos' */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.colaborador_id && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.colaborador_id.message}</p>}
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
                {editingExpense ? 'Guardar Cambios' : 'Añadir Gasto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Expenses;
