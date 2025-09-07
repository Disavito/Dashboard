import { useState, useEffect, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Edit, ArrowUpDown, Loader2, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Ingreso as IngresoType, Cuenta } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from '@/components/ui/form';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';


// --- Form Schema for Ingreso ---
const incomeFormSchema = z.object({
  receipt_number: z.string().min(1, { message: 'El número de recibo es requerido.' }).max(255, { message: 'El número de recibo es demasiado largo.' }),
  dni: z.string().min(8, { message: 'El DNI debe tener 8 dígitos.' }).max(8, { message: 'El DNI debe tener 8 dígitos.' }).regex(/^\d{8}$/, { message: 'El DNI debe ser 8 dígitos numéricos.' }),
  full_name: z.string().min(1, { message: 'El nombre completo es requerido.' }).max(255, { message: 'El nombre completo es demasiado largo.' }),
  amount: z.preprocess(
    (val) => {
      if (val === '') return undefined; // Treat empty string as undefined
      return Number(val);
    },
    z.number({
      required_error: 'El monto es requerido.', // Message for undefined/null
      invalid_type_error: 'El monto debe ser un número.' // Message for non-numeric
    })
    .positive({ message: 'El monto debe ser positivo.' })
  ),
  account: z.string().min(1, { message: 'La cuenta es requerida.' }),
  date: z.string().min(1, { message: 'La fecha es requerida.' }),
  transaction_type: z.enum(['Ingreso', 'Anulacion', 'Devolucion'], { message: 'Tipo de transacción inválido.' }).optional(),
});

// Type for the data after Zod transformation (what onSubmit receives from resolver)
type IncomeFormValues = z.infer<typeof incomeFormSchema>;

// Type for the form's internal state (before Zod transformation, for useForm defaultValues)
type IncomeFormInputValues = {
  receipt_number: string;
  dni: string;
  full_name: string;
  amount: string; // Input field will hold a string
  account: string;
  date: string;
  transaction_type: 'Ingreso' | 'Anulacion' | 'Devolucion' | undefined;
};


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

const transactionTypes = ['Ingreso', 'Anulacion', 'Devolucion']; // Restricted transaction types

function Income() {
  const { data: incomeData, loading, error, addRecord, updateRecord, deleteRecord } = useSupabaseData<IngresoType>({ tableName: 'ingresos' });
  const { data: accountsData, loading: accountsLoading, error: accountsError } = useSupabaseData<Cuenta>({ tableName: 'cuentas' });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IngresoType | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [isDniSearching, setIsDniSearching] = useState(false);

  // State for confirmation dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dataToConfirm, setDataToConfirm] = useState<IncomeFormValues | null>(null);
  const [isConfirmingSubmission, setIsConfirmingSubmission] = useState(false);


  const form = useForm<IncomeFormInputValues>({ // Use IncomeFormInputValues here
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      receipt_number: '',
      dni: '',
      full_name: '',
      amount: '', // Changed default to empty string, now valid with IncomeFormInputValues
      account: '',
      date: '',
      transaction_type: undefined,
    },
  });

  const { handleSubmit, register, setValue, watch, formState: { errors } } = form;
  const watchedDni = watch('dni');

  // Fetch accounts from Supabase
  const availableAccounts = accountsData.map(account => account.name);

  // DNI Auto-population Logic
  const searchSocioByDni = useCallback(async (dni: string) => {
    if (!dni || dni.length !== 8) {
      setValue('full_name', '');
      return;
    }
    setIsDniSearching(true);
    const { data, error } = await supabase
      .from('socio_titulares')
      .select('nombres, apellidoPaterno, apellidoMaterno')
      .eq('dni', dni)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error searching socio by DNI:', error.message);
      toast.error('Error al buscar DNI', { description: error.message });
      setValue('full_name', '');
    } else if (data) {
      const fullName = `${data.nombres || ''} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim();
      setValue('full_name', fullName);
      toast.success('Socio encontrado', { description: `Nombre: ${fullName}` });
    } else {
      setValue('full_name', '');
      toast.warning('DNI no encontrado', { description: 'No se encontró un socio con este DNI.' });
    }
    setIsDniSearching(false);
  }, [setValue]);

  useEffect(() => {
    if (editingIncome?.dni) {
      searchSocioByDni(editingIncome.dni);
    }
  }, [editingIncome, searchSocioByDni]);

  // NEW: Function to close *only* the confirmation dialog
  const handleCloseConfirmationOnly = () => {
    setIsConfirmDialogOpen(false);
    setDataToConfirm(null);
    setIsConfirmingSubmission(false);
  };

  const handleOpenDialog = (income?: IngresoType) => {
    setEditingIncome(income || null);
    if (income) {
      form.reset({
        receipt_number: income.receipt_number || '',
        dni: income.dni || '',
        full_name: income.full_name || '',
        amount: income.amount.toString(), // Convert number to string for input value
        account: income.account || '',
        date: income.date,
        transaction_type: income.transaction_type as IncomeFormInputValues['transaction_type'] || undefined,
      });
    } else {
      form.reset({
        receipt_number: '',
        dni: '',
        full_name: '',
        amount: '', // Changed default to empty string
        account: '',
        date: '',
        transaction_type: undefined,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIncome(null);
    form.reset(); // Clears form fields
    handleCloseConfirmationOnly(); // Also ensure confirmation dialog is closed and data cleared
  };

  // Modified onSubmit to open confirmation dialog
  // Change 'values' type to IncomeFormInputValues
  const onSubmit = async (inputValues: IncomeFormInputValues, event?: React.BaseSyntheticEvent) => {
    event?.preventDefault();

    // Manually parse the input values to get the validated and transformed data
    // This step ensures 'amount' is converted to a number as per incomeFormSchema
    const parsedValues: IncomeFormValues = incomeFormSchema.parse(inputValues);

    setDataToConfirm(parsedValues); // dataToConfirm is IncomeFormValues | null
    setIsConfirmDialogOpen(true);
  };

  // Function to handle actual submission after confirmation
  const handleConfirmSubmit = async () => {
    if (!dataToConfirm) return;

    setIsConfirmingSubmission(true);
    try {
      if (editingIncome) {
        await updateRecord(editingIncome.id, dataToConfirm);
        toast.success('Ingreso actualizado', { description: 'El ingreso ha sido actualizado exitosamente.' });
        handleCloseDialog(); // Close main dialog for edits
      } else {
        await addRecord(dataToConfirm);
        toast.success('Ingreso añadido', { description: 'El nuevo ingreso ha sido registrado exitosamente.' });
        
        // For new entries: reset form, close confirmation dialog, but keep main dialog open
        form.reset({
          receipt_number: '',
          dni: '',
          full_name: '',
          amount: '', // Reset to empty string
          account: '',
          date: '',
          transaction_type: undefined,
        });
        setEditingIncome(null); // Clear editing state
        handleCloseConfirmationOnly(); // Close only the confirmation dialog
      }
    } catch (submitError: any) {
      console.error('Error al guardar el ingreso:', submitError.message);
      toast.error('Error al guardar ingreso', { description: submitError.message });
    } finally {
      setIsConfirmingSubmission(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este ingreso?')) {
      await deleteRecord(id);
      toast.success('Ingreso eliminado', { description: 'El ingreso ha sido eliminado exitosamente.' });
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

  if (loading || accountsLoading) {
    return <div className="text-center text-muted-foreground">Cargando ingresos y cuentas...</div>;
  }

  if (error) {
    return <div className="text-center text-destructive">Error al cargar ingresos: {error}</div>;
  }

  if (accountsError) {
    return <div className="text-center text-destructive">Error al cargar cuentas: {accountsError}</div>;
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
          {/* Wrap the form with the Form component */}
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4"> {/* Removed <IncomeFormValues> */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="receipt_number" className="text-right text-textSecondary">
                  Nº Recibo
                </Label>
                <Input
                  id="receipt_number"
                  {...register('receipt_number')}
                  className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
                  placeholder="Ej: 001-2024"
                />
                {errors.receipt_number && <p className="col-span-4 text-right text-error text-sm">{errors.receipt_number.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dni" className="text-right text-textSecondary">
                  DNI
                </Label>
                <div className="col-span-3 relative">
                  <Input
                    id="dni"
                    {...register('dni')}
                    onBlur={() => searchSocioByDni(watchedDni)}
                    className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300 pr-10"
                    placeholder="Ej: 12345678"
                  />
                  {isDniSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
                {errors.dni && <p className="col-span-4 text-right text-error text-sm">{errors.dni.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="full_name" className="text-right text-textSecondary">
                  Nombre Completo
                </Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  readOnly
                  className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300 cursor-not-allowed"
                  placeholder="Se auto-completa con el DNI"
                />
                {errors.full_name && <p className="col-span-4 text-right text-error text-sm">{errors.full_name.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right text-textSecondary">
                  Monto
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register('amount')}
                  className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
                  placeholder="0.00" // Added placeholder
                />
                {errors.amount && <p className="col-span-4 text-right text-error text-sm">{errors.amount.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="account" className="text-right text-textSecondary">
                  Cuenta
                </Label>
                <Select onValueChange={(value) => setValue('account', value)} value={watch('account')}>
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
                {errors.account && <p className="col-span-4 text-right text-error text-sm">{errors.account.message}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transaction_type" className="text-right text-textSecondary">
                  Tipo Transacción
                </Label>
                <Select onValueChange={(value) => setValue('transaction_type', value as IncomeFormInputValues['transaction_type'])} value={watch('transaction_type')}>
                  <SelectTrigger className="col-span-3 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                    <SelectValue placeholder="Selecciona un tipo de transacción" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                    {transactionTypes.map(type => (
                      <SelectItem key={type} value={type} className="hover:bg-muted/50 cursor-pointer">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.transaction_type && <p className="col-span-4 text-right text-error text-sm">{errors.transaction_type.message}</p>}
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
                  {editingIncome ? 'Guardar Cambios' : 'Añadir Ingreso'}
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
        title={editingIncome ? 'Confirmar Edición de Ingreso' : 'Confirmar Nuevo Ingreso'}
        description="Por favor, revisa los detalles del ingreso antes de confirmar."
        data={dataToConfirm || {}}
        confirmButtonText={editingIncome ? 'Confirmar Actualización' : 'Confirmar Registro'}
        isConfirming={isConfirmingSubmission}
      />
    </div>
  );
}

export default Income;
