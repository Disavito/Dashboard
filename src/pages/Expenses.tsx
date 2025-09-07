import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Edit, ArrowUpDown, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Gasto as GastoType, Colaborador, Cuenta } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';


// --- Form Schema for Gasto ---
const expenseFormSchema = z.object({
  amount: z.preprocess(
    (val) => {
      if (val === '') return undefined; // Treat empty string as undefined
      return Number(val);
    },
    z.number({
      required_error: 'El monto es requerido.',
      invalid_type_error: 'El monto debe ser un número.'
    })
    .positive({ message: 'El monto debe ser positivo.' })
  ),
  account: z.string().min(1, { message: 'La cuenta es requerida.' }),
  date: z.string().min(1, { message: 'La fecha es requerida.' }),
  category: z.string().min(1, { message: 'La categoría es requerida.' }),
  sub_category: z.string().optional().nullable(), // Subcategory is optional and nullable
  description: z.string().min(1, { message: 'La descripción es requerida.' }).max(255, { message: 'La descripción es demasiado larga.' }),
  numero_gasto: z.string().optional().nullable(),
  colaborador_id: z.string().uuid().optional().nullable(),
});

// Type for the data after Zod transformation (what onSubmit receives from resolver)
type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

// Type for the form's internal state (before Zod transformation, for useForm defaultValues)
type ExpenseFormInputValues = {
  amount: string; // Input field will hold a string
  account: string;
  date: string;
  category: string;
  sub_category: string | null;
  description: string;
  numero_gasto: string | null;
  colaborador_id: string | null;
};


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

// --- New Expense Category and Subcategory Definitions ---
const MAIN_EXPENSE_CATEGORIES = [
  { value: 'Gasto Fijo', label: 'Gasto Fijo' },
  { value: 'Viáticos', label: 'Viáticos' },
  { value: 'Otros', label: 'Otros' },
];

const GASTOS_FIJOS_SUB_CATEGORIES = [
  { value: 'internet', label: 'Internet' },
  { value: 'servidor', label: 'Servidor' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'agua_mantenimiento', label: 'Agua/Mantenimiento' },
  { value: 'luz', label: 'Luz' },
  { value: 'sueldo', label: 'Sueldo' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'afp', label: 'AFP' },
  { value: 'contador', label: 'Contador' },
];

const VIATICOS_SUB_CATEGORIES = [
  { value: 'tecnicos', label: 'Técnicos' },
  { value: 'proyecto', label: 'Proyecto' },
  { value: 'representantes', label: 'Representantes' },
  { value: 'ocasional', label: 'Ocasional' },
];

// Helper function to generate the next sequential numero_gasto
const generateNextNumeroGasto = (expenses: GastoType[]): string => {
  let maxNumber = 0;

  // Filter for valid 'GAXXX' format and find the maximum number
  expenses.forEach(expense => {
    if (expense.numero_gasto && expense.numero_gasto.startsWith('GA')) {
      const numPart = parseInt(expense.numero_gasto.substring(2), 10);
      if (!isNaN(numPart) && numPart > maxNumber) {
        maxNumber = numPart;
      }
    }
  });

  const nextNumber = maxNumber + 1;
  // Pad with leading zeros to ensure a 3-digit number (e.g., 1 -> 001, 17 -> 017)
  return `GA${String(nextNumber).padStart(3, '0')}`;
};


function Expenses() {
  const { data: expenseData, loading, error, addRecord, updateRecord, deleteRecord, refreshData } = useSupabaseData<GastoType>({ tableName: 'gastos' });
  const { data: colaboradoresData } = useSupabaseData<Colaborador>({ tableName: 'colaboradores', enabled: true });
  const { data: accountsData, loading: accountsLoading, error: accountsError } = useSupabaseData<Cuenta>({ tableName: 'cuentas' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GastoType | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  // State for confirmation dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dataToConfirm, setDataToConfirm] = useState<ExpenseFormValues | null>(null);
  const [isConfirmingSubmission, setIsConfirmingSubmission] = useState(false);


  const form = useForm<ExpenseFormInputValues>({ // Use ExpenseFormInputValues here
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: '', // This is now valid as amount is string in ExpenseFormInputValues
      account: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      category: '',
      sub_category: null,
      description: '',
      numero_gasto: null,
      colaborador_id: null,
    },
  });

  const watchedCategory = form.watch('category'); // Watch the category field for dynamic subcategory rendering

  // Fetch accounts from Supabase
  const availableAccounts = accountsData.map(account => account.name);

  // Function to close *only* the confirmation dialog
  const handleCloseConfirmationOnly = () => {
    setIsConfirmDialogOpen(false);
    setDataToConfirm(null);
    setIsConfirmingSubmission(false);
  };

  const handleOpenDialog = (expense?: GastoType) => {
    setEditingExpense(expense || null);
    if (expense) {
      form.reset({
        amount: expense.amount.toString(), // Convert number to string for form input
        account: expense.account || '',
        date: expense.date,
        category: expense.category || '',
        sub_category: expense.sub_category || null, // Ensure it's null if not present
        description: expense.description || '',
        numero_gasto: expense.numero_gasto || null,
        colaborador_id: expense.colaborador_id || null,
      });
    } else {
      // For new expenses, generate the next numero_gasto
      const nextNumeroGasto = generateNextNumeroGasto(expenseData);
      form.reset({
        amount: '', // This is now valid
        account: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        category: '', // Default to empty
        sub_category: null, // Default to null
        description: '',
        numero_gasto: nextNumeroGasto, // Set the auto-generated number
        colaborador_id: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
    form.reset();
    handleCloseConfirmationOnly();
  };

  // Modified onSubmit to open confirmation dialog
  // Change 'values' type to ExpenseFormInputValues
  const onSubmit = async (inputValues: ExpenseFormInputValues, event?: React.BaseSyntheticEvent) => {
    event?.preventDefault();

    // Manually parse the input values to get the validated and transformed data
    // This step ensures 'amount' is converted to a number as per expenseFormSchema
    const parsedValues: ExpenseFormValues = expenseFormSchema.parse(inputValues);

    setDataToConfirm(parsedValues); // dataToConfirm is ExpenseFormValues | null
    setIsConfirmDialogOpen(true);
  };

  // Function to handle actual submission after confirmation
  const handleConfirmSubmit = async () => {
    if (!dataToConfirm) return; // dataToConfirm is already ExpenseFormValues

    setIsConfirmingSubmission(true);
    try {
      if (editingExpense) {
        await updateRecord(editingExpense.id, dataToConfirm);
        toast.success('Gasto actualizado', { description: 'El gasto ha sido actualizado exitosamente.' });
        handleCloseDialog();
      } else {
        // Add the new record and get the returned object
        const newRecord = await addRecord(dataToConfirm);
        toast.success('Gasto añadido', { description: 'El nuevo gasto ha sido registrado exitosamente.' });
        
        let nextNumeroGastoForForm: string | null = null;
        if (newRecord && newRecord.numero_gasto) {
          // Calculate the next number based on the just-added record's number
          const numPart = parseInt(newRecord.numero_gasto.substring(2), 10);
          if (!isNaN(numPart)) {
            nextNumeroGastoForForm = `GA${String(numPart + 1).padStart(3, '0')}`;
          }
        } else {
          // Fallback: if newRecord or its numero_gasto is missing,
          // regenerate based on the current (potentially stale) expenseData.
          // This should ideally not happen if addRecord is successful.
          nextNumeroGastoForForm = generateNextNumeroGasto(expenseData);
        }

        // Reset form with the newly calculated next numero_gasto
        form.reset({
          amount: '', // This is now valid
          account: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          category: '',
          sub_category: null,
          description: '',
          numero_gasto: nextNumeroGastoForForm, // Set the new auto-generated number
          colaborador_id: null,
        });
        setEditingExpense(null);
        handleCloseConfirmationOnly();

        // Refresh data to ensure the table is updated with the new entry
        await refreshData();
      }
    } catch (submitError: any) {
      console.error('Error al guardar el gasto:', submitError.message);
      toast.error('Error al guardar gasto', { description: submitError.message });
    } finally {
      setIsConfirmingSubmission(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
      await deleteRecord(id);
      toast.success('Gasto eliminado', { description: 'El gasto ha sido eliminado exitosamente.' });
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

  if (loading || accountsLoading) {
    return <div className="text-center text-muted-foreground">Cargando gastos y cuentas...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Error al cargar gastos: {error}</div>;
  }

  if (accountsError) {
    return <div className="text-center text-destructive">Error al cargar cuentas: {accountsError}</div>;
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
          <DataTable
            columns={columnsWithActions}
            data={expenseData}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            filterPlaceholder="Buscar gastos por descripción..."
          />
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
          <Form {...form}>
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
                  placeholder="0.00"
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
                    {availableAccounts.length > 0 ? (
                      availableAccounts.map(account => (
                        <SelectItem key={account} value={account} className="hover:bg-muted/50 cursor-pointer">
                          {account}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-accounts" disabled>No hay cuentas disponibles</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {form.formState.errors.account && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.account.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right text-textSecondary">
                  Categoría
                </Label>
                <Select onValueChange={(value) => {
                  form.setValue('category', value);
                  form.setValue('sub_category', null); // Reset sub_category when category changes
                }} value={form.watch('category')}>
                  <SelectTrigger className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                    {MAIN_EXPENSE_CATEGORIES.map(category => (
                      <SelectItem key={category.value} value={category.value} className="hover:bg-muted/50 cursor-pointer">
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.category && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.category.message}</p>}
              </div>

              {/* Conditional Subcategory Select */}
              {watchedCategory && (watchedCategory === 'Gasto Fijo' || watchedCategory === 'Viáticos') && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sub_category" className="text-right text-textSecondary">
                    Subcategoría
                  </Label>
                  <Select onValueChange={(value) => form.setValue('sub_category', value)} value={form.watch('sub_category') || ''}>
                    <SelectTrigger className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                      <SelectValue placeholder="Selecciona una subcategoría" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                      {watchedCategory === 'Gasto Fijo' && GASTOS_FIJOS_SUB_CATEGORIES.map(subCat => (
                        <SelectItem key={subCat.value} value={subCat.value} className="hover:bg-muted/50 cursor-pointer">
                          {subCat.label}
                        </SelectItem>
                      ))}
                      {watchedCategory === 'Viáticos' && VIATICOS_SUB_CATEGORIES.map(subCat => (
                        <SelectItem key={subCat.value} value={subCat.value} className="hover:bg-muted/50 cursor-pointer">
                          {subCat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.sub_category && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.sub_category.message}</p>}
                </div>
              )}

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
                  Nº Gasto
                </Label>
                <Input
                  id="numero_gasto"
                  {...form.register('numero_gasto')}
                  className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
                  readOnly // Make the field read-only
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
                        {colaborador.name} {colaborador.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.colaborador_id && <p className="col-span-4 text-right text-error text-sm">{form.formState.errors.colaborador_id.message}</p>}
              </div>
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="grid grid-cols-4 items-center gap-4">
                    <FormLabel className="text-right text-textSecondary">Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "col-span-3 w-full justify-start text-left font-normal rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(parseISO(field.value), "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border rounded-xl shadow-lg" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? parseISO(field.value) : undefined}
                          onSelect={(date) => {
                            field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                          }}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="col-span-4 text-right" />
                  </FormItem>
                )}
              />
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="rounded-lg border-border hover:bg-muted/50 transition-all duration-300">
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300">
                  {editingExpense ? 'Guardar Cambios' : 'Añadir Gasto'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCloseConfirmationOnly}
        onConfirm={handleConfirmSubmit}
        title={editingExpense ? 'Confirmar Edición de Gasto' : 'Confirmar Nuevo Gasto'}
        description="Por favor, revisa los detalles del gasto antes de confirmar."
        data={dataToConfirm || {}}
        confirmButtonText={editingExpense ? 'Confirmar Actualización' : 'Confirmar Registro'}
        isConfirming={isConfirmingSubmission}
      />
    </div>
  );
}

export default Expenses;
