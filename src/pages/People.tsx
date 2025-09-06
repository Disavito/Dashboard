import { useState, useMemo, useEffect } from 'react';
import { ColumnDef, FilterFn } from '@tanstack/react-table'; // Import FilterFn
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
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { SocioTitular as SocioTitularType, SituacionEconomica, Ingreso } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// --- Form Schema ---
const socioTitularFormSchema = z.object({
  nombres: z.string().min(1, { message: 'Los nombres son requeridos.' }).max(255, { message: 'Los nombres son demasiado largos.' }),
  apellidoMaterno: z.string().min(1, { message: 'El apellido materno es requerido.' }).max(255, { message: 'El apellido materno es demasiado largo.' }),
  apellidoPaterno: z.string().min(1, { message: 'El apellido paterno es requerido.' }).max(255, { message: 'El apellido paterno es demasiado largo.' }),
  dni: z.string().min(1, { message: 'El DNI es requerido.' }).max(20, { message: 'El DNI es demasiado largo.' }).optional().nullable(),
  ubicacionReferencia: z.string().optional().nullable(),
  direccionDNI: z.string().optional().nullable(),
  edad: z.preprocess(
    (val) => (val === '' ? null : Number(val)),
    z.number().int().positive({ message: 'La edad debe ser un número positivo.' }).optional().nullable()
  ),
  distritoDNI: z.string().optional().nullable(),
  provinciaDNI: z.string().optional().nullable(),
  regionDNI: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(), // YYYY-MM-DD format
  celular: z.string().optional().nullable(),
  direccionVivienda: z.string().optional().nullable(),
  mz: z.string().optional().nullable(),
  lote: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  distritoVivienda: z.string().optional().nullable(),
  provinciaVivienda: z.string().optional().nullable(),
  regionVivienda: z.string().optional().nullable(),
  situacionEconomica: z.enum(['Pobre', 'Extremo Pobre']).optional().nullable(),
  genero: z.string().optional().nullable(),
});

type SocioTitularFormValues = z.infer<typeof socioTitularFormSchema>;

// --- Tipo extendido para incluir el estado de pago ---
type SocioTitularWithPaymentStatus = SocioTitularType & {
  paymentStatus: 'Pagado' | 'Exonerado' | 'No Pagado';
};

// --- Custom global filter function for SocioTitularWithPaymentStatus ---
const socioTitularGlobalFilterFn: FilterFn<SocioTitularWithPaymentStatus> = (row, _columnId, filterValue) => {
  const search = String(filterValue).toLowerCase().trim();
  if (!search) return true; // If search is empty, show all rows

  const searchTokens = search.split(/\s+/).filter(Boolean); // Split by spaces and remove empty strings
  const originalRow = row.original;

  const nombres = String(originalRow.nombres || '').toLowerCase();
  const apellidoPaterno = String(originalRow.apellidoPaterno || '').toLowerCase();
  const apellidoMaterno = String(originalRow.apellidoMaterno || '').toLowerCase();
  const dni = String(originalRow.dni || '').toLowerCase();

  // Check for DNI match first
  if (dni.includes(search)) {
    return true;
  }

  // Combine name fields for flexible search
  const combinedName = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.toLowerCase();

  // Check if all search tokens are present in the combined name
  return searchTokens.every(token => combinedName.includes(token));
};

// --- Column Definitions ---
const socioTitularBaseColumns: ColumnDef<SocioTitularWithPaymentStatus>[] = [
  {
    accessorKey: 'nombres',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="px-0 hover:bg-transparent"
      >
        Nombres
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue('nombres')}</span>,
  },
  {
    accessorKey: 'apellidoPaterno',
    header: 'Apellido Paterno',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('apellidoPaterno')}</span>,
  },
  {
    accessorKey: 'apellidoMaterno',
    header: 'Apellido Materno',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('apellidoMaterno')}</span>,
  },
  {
    accessorKey: 'dni',
    header: 'DNI',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('dni') || 'N/A'}</span>,
  },
  {
    accessorKey: 'celular',
    header: 'Celular',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('celular') || 'N/A'}</span>,
  },
  {
    accessorKey: 'direccionVivienda',
    header: 'Dirección Vivienda',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('direccionVivienda') || 'N/A'}</span>,
  },
  {
    accessorKey: 'localidad', // Añadir localidad para búsqueda
    header: 'Localidad',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('localidad') || 'N/A'}</span>,
  },
  {
    accessorKey: 'situacionEconomica',
    header: 'Situación Económica',
    cell: ({ row }) => {
      const situacion = row.getValue('situacionEconomica') as SituacionEconomica | null;
      return (
        <span className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          situacion === 'Pobre' && 'bg-yellow-400/20 text-yellow-400',
          situacion === 'Extremo Pobre' && 'bg-red-400/20 text-red-400',
          !situacion && 'bg-gray-400/20 text-gray-400'
        )}>
          {situacion || 'No especificado'}
        </span>
      );
    },
  },
  {
    accessorKey: 'paymentStatus', // Nueva columna para el estado de pago
    header: 'Estado de Pago',
    cell: ({ row }) => {
      const status = row.original.paymentStatus;
      return (
        <span className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          status === 'Pagado' && 'bg-green-400/20 text-green-400',
          status === 'Exonerado' && 'bg-blue-400/20 text-blue-400',
          status === 'No Pagado' && 'bg-red-400/20 text-red-400'
        )}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Registrado',
    cell: ({ row }) => {
      const createdAt = row.getValue('created_at') as string | null;
      return createdAt ? format(parseISO(createdAt), 'dd MMM yyyy', { locale: es }) : 'N/A';
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

const economicSituations: SituacionEconomica[] = ['Pobre', 'Extremo Pobre'];
const genders = ['Masculino', 'Femenino', 'Otro'];

function People() {
  // State for filters
  const [globalFilter, setGlobalFilter] = useState(''); // For DNI, names, surnames
  const [selectedLocality, setSelectedLocality] = useState<string | null>(null); // For locality dropdown

  // Fetch all socio_titulares to get unique localities for the dropdown
  const { data: allSocioTitularesForLocalities, loading: loadingAllLocalities } = useSupabaseData<SocioTitularType>({
    tableName: 'socio_titulares',
    enabled: true,
  });

  // Fetch socio_titulares data, applying the locality filter
  const { data: socioTitularesData, loading, error, addRecord, updateRecord, deleteRecord, setFilters } = useSupabaseData<SocioTitularType>({
    tableName: 'socio_titulares',
    initialFilters: selectedLocality ? { localidad: selectedLocality } : {},
  });

  // Update filters in useSupabaseData when selectedLocality changes
  useEffect(() => {
    setFilters(selectedLocality ? { localidad: selectedLocality } : {});
  }, [selectedLocality, setFilters]);

  const { data: ingresosData, loading: loadingIngresos, error: errorIngresos } = useSupabaseData<Ingreso>({ tableName: 'ingresos' });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSocioTitular, setEditingSocioTitular] = useState<SocioTitularType | null>(null);

  const form = useForm<SocioTitularFormValues>({
    resolver: zodResolver(socioTitularFormSchema),
    defaultValues: {
      nombres: '',
      apellidoMaterno: '',
      apellidoPaterno: '',
      dni: null,
      ubicacionReferencia: null,
      direccionDNI: null,
      edad: null,
      distritoDNI: null,
      provinciaDNI: null,
      regionDNI: null,
      fechaNacimiento: null,
      celular: null,
      direccionVivienda: null,
      mz: null,
      lote: null,
      localidad: null,
      distritoVivienda: null,
      provinciaVivienda: null,
      regionVivienda: null,
      situacionEconomica: null,
      genero: null,
    },
  });

  const handleOpenDialog = (socioTitular?: SocioTitularType) => {
    setEditingSocioTitular(socioTitular || null);
    if (socioTitular) {
      form.reset({
        nombres: socioTitular.nombres || '',
        apellidoMaterno: socioTitular.apellidoMaterno || '',
        apellidoPaterno: socioTitular.apellidoPaterno || '',
        dni: socioTitular.dni || null,
        ubicacionReferencia: socioTitular.ubicacionReferencia || null,
        direccionDNI: socioTitular.direccionDNI || null,
        edad: socioTitular.edad || null,
        distritoDNI: socioTitular.distritoDNI || null,
        provinciaDNI: socioTitular.provinciaDNI || null,
        regionDNI: socioTitular.regionDNI || null,
        fechaNacimiento: socioTitular.fechaNacimiento || null,
        celular: socioTitular.celular || null,
        direccionVivienda: socioTitular.direccionVivienda || null,
        mz: socioTitular.mz || null,
        lote: socioTitular.lote || null,
        localidad: socioTitular.localidad || null,
        distritoVivienda: socioTitular.distritoVivienda || null,
        provinciaVivienda: socioTitular.provinciaVivienda || null,
        regionVivienda: socioTitular.regionVivienda || null,
        situacionEconomica: socioTitular.situacionEconomica || null,
        genero: socioTitular.genero || null,
      });
    } else {
      form.reset({
        nombres: '',
        apellidoMaterno: '',
        apellidoPaterno: '',
        dni: null,
        ubicacionReferencia: null,
        direccionDNI: null,
        edad: null,
        distritoDNI: null,
        provinciaDNI: null,
        regionDNI: null,
        fechaNacimiento: null,
        celular: null,
        direccionVivienda: null,
        mz: null,
        lote: null,
        localidad: null,
        distritoVivienda: null,
        provinciaVivienda: null,
        regionVivienda: null,
        situacionEconomica: null,
        genero: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSocioTitular(null);
    form.reset();
  };

  const onSubmit = async (values: SocioTitularFormValues) => {
    if (editingSocioTitular) {
      await updateRecord(editingSocioTitular.id, values);
    } else {
      await addRecord(values);
    }
    handleCloseDialog();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este socio titular?')) {
      await deleteRecord(id);
    }
  };

  // Derive unique localities from all fetched socio_titulares for the dropdown
  const uniqueLocalities = useMemo(() => {
    if (!allSocioTitularesForLocalities) return [];
    const localities = new Set<string>();
    allSocioTitularesForLocalities.forEach(socio => {
      if (socio.localidad) {
        localities.add(socio.localidad);
      }
    });
    return Array.from(localities).sort();
  }, [allSocioTitularesForLocalities]);

  // Process socio titulares data to include payment status
  const processedSocioTitulares = useMemo(() => {
    if (!socioTitularesData || !ingresosData) return [];

    const paidDnis = new Set(ingresosData.map(ingreso => ingreso.dni).filter(Boolean) as string[]);

    return socioTitularesData.map(socio => {
      let paymentStatus: 'Pagado' | 'Exonerado' | 'No Pagado' = 'No Pagado';

      if (socio.situacionEconomica === 'Extremo Pobre') {
        paymentStatus = 'Exonerado';
      } else if (socio.dni && socio.situacionEconomica === 'Pobre' && paidDnis.has(socio.dni)) {
        paymentStatus = 'Pagado';
      }

      return { ...socio, paymentStatus };
    });
  }, [socioTitularesData, ingresosData]);

  // Update column actions to use the new handlers, defined inside the component
  const columnsWithActions: ColumnDef<SocioTitularWithPaymentStatus>[] = socioTitularBaseColumns.map(col => {
    if (col.id === 'actions') {
      return {
        ...col,
        cell: ({ row }) => {
          const socioTitular = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border rounded-lg shadow-lg">
                <DropdownMenuItem onClick={() => handleOpenDialog(socioTitular)} className="hover:bg-muted/50 cursor-pointer">
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(socioTitular.id)} className="hover:bg-destructive/20 text-destructive cursor-pointer">
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

  const overallLoading = loading || loadingIngresos || loadingAllLocalities;
  const overallError = error || errorIngresos;

  if (overallLoading) {
    return <div className="text-center text-muted-foreground">Cargando socios titulares y datos de ingresos...</div>;
  }

  if (overallError) {
    return <div className="text-center text-destructive">Error al cargar datos: {overallError}</div>;
  }

  return (
    <div className="space-y-8">
      <Card className="rounded-xl border-border shadow-lg animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Gestión de Titulares</CardTitle>
            <CardDescription className="text-muted-foreground">
              Gestiona los perfiles de los titulares y su estado de pago.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300">
            <PlusCircle className="h-4 w-4" />
            Registrar Persona
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="grid gap-2 flex-1 max-w-xs">
              <Label htmlFor="localityFilter" className="text-textSecondary">Filtrar por Localidad</Label>
              <Select
                onValueChange={(value) => setSelectedLocality(value === 'all' ? null : value)}
                value={selectedLocality || 'all'}
              >
                <SelectTrigger id="localityFilter" className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                  <SelectValue placeholder="Todas las localidades" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                  <SelectItem value="all" className="hover:bg-muted/50 cursor-pointer">Todas las localidades</SelectItem>
                  {uniqueLocalities.map(loc => (
                    <SelectItem key={loc} value={loc} className="hover:bg-muted/50 cursor-pointer">
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DataTable
            columns={columnsWithActions}
            data={processedSocioTitulares}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            filterPlaceholder="Buscar por DNI, nombres o apellidos..."
            globalFilterFn={socioTitularGlobalFilterFn} // Pass the custom filter function
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border rounded-xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingSocioTitular ? 'Editar Socio Titular' : 'Añadir Nuevo Socio Titular'}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingSocioTitular ? 'Realiza cambios en el perfil del socio existente aquí.' : 'Añade un nuevo perfil de socio titular.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombres" className="text-textSecondary">Nombres</Label>
              <Input id="nombres" {...form.register('nombres')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.nombres && <p className="text-error text-sm">{form.formState.errors.nombres.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apellidoPaterno" className="text-textSecondary">Apellido Paterno</Label>
              <Input id="apellidoPaterno" {...form.register('apellidoPaterno')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.apellidoPaterno && <p className="text-error text-sm">{form.formState.errors.apellidoPaterno.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apellidoMaterno" className="text-textSecondary">Apellido Materno</Label>
              <Input id="apellidoMaterno" {...form.register('apellidoMaterno')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.apellidoMaterno && <p className="text-error text-sm">{form.formState.errors.apellidoMaterno.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dni" className="text-textSecondary">DNI</Label>
              <Input id="dni" {...form.register('dni')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.dni && <p className="text-error text-sm">{form.formState.errors.dni.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="celular" className="text-textSecondary">Celular</Label>
              <Input id="celular" {...form.register('celular')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.celular && <p className="text-error text-sm">{form.formState.errors.celular.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edad" className="text-textSecondary">Edad</Label>
              <Input id="edad" type="number" {...form.register('edad')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.edad && <p className="text-error text-sm">{form.formState.errors.edad.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fechaNacimiento" className="text-textSecondary">Fecha de Nacimiento</Label>
              <Input id="fechaNacimiento" type="date" {...form.register('fechaNacimiento')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.fechaNacimiento && <p className="text-error text-sm">{form.formState.errors.fechaNacimiento.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="genero" className="text-textSecondary">Género</Label>
              <Select onValueChange={(value) => form.setValue('genero', value)} value={form.watch('genero') || ''}>
                <SelectTrigger className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                  <SelectValue placeholder="Selecciona un género" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                  {genders.map(g => (
                    <SelectItem key={g} value={g} className="hover:bg-muted/50 cursor-pointer">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.genero && <p className="text-error text-sm">{form.formState.errors.genero.message}</p>}
            </div>
            <div className="grid gap-2 col-span-2">
              <Label htmlFor="direccionVivienda" className="text-textSecondary">Dirección de Vivienda</Label>
              <Textarea id="direccionVivienda" {...form.register('direccionVivienda')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.direccionVivienda && <p className="text-error text-sm">{form.formState.errors.direccionVivienda.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mz" className="text-textSecondary">Mz</Label>
              <Input id="mz" {...form.register('mz')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.mz && <p className="text-error text-sm">{form.formState.errors.mz.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lote" className="text-textSecondary">Lote</Label>
              <Input id="lote" {...form.register('lote')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.lote && <p className="text-error text-sm">{form.formState.errors.lote.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="localidad" className="text-textSecondary">Localidad</Label>
              <Input id="localidad" {...form.register('localidad')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.localidad && <p className="text-error text-sm">{form.formState.errors.localidad.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="distritoVivienda" className="text-textSecondary">Distrito (Vivienda)</Label>
              <Input id="distritoVivienda" {...form.register('distritoVivienda')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.distritoVivienda && <p className="text-error text-sm">{form.formState.errors.distritoVivienda.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provinciaVivienda" className="text-textSecondary">Provincia (Vivienda)</Label>
              <Input id="provinciaVivienda" {...form.register('provinciaVivienda')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.provinciaVivienda && <p className="text-error text-sm">{form.formState.errors.provinciaVivienda.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="regionVivienda" className="text-textSecondary">Región (Vivienda)</Label>
              <Input id="regionVivienda" {...form.register('regionVivienda')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.regionVivienda && <p className="text-error text-sm">{form.formState.errors.regionVivienda.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="situacionEconomica" className="text-textSecondary">Situación Económica</Label>
              <Select onValueChange={(value) => form.setValue('situacionEconomica', value as SituacionEconomica)} value={form.watch('situacionEconomica') || ''}>
                <SelectTrigger className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300">
                  <SelectValue placeholder="Selecciona una situación" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-lg shadow-lg">
                  {economicSituations.map(situacion => (
                    <SelectItem key={situacion} value={situacion} className="hover:bg-muted/50 cursor-pointer">
                      {situacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.situacionEconomica && <p className="text-error text-sm">{form.formState.errors.situacionEconomica.message}</p>}
            </div>
            <div className="grid gap-2 col-span-2">
              <Label htmlFor="ubicacionReferencia" className="text-textSecondary">Ubicación de Referencia</Label>
              <Textarea id="ubicacionReferencia" {...form.register('ubicacionReferencia')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.ubicacionReferencia && <p className="text-error text-sm">{form.formState.errors.ubicacionReferencia.message}</p>}
            </div>
            <div className="grid gap-2 col-span-2">
              <Label htmlFor="direccionDNI" className="text-textSecondary">Dirección según DNI</Label>
              <Textarea id="direccionDNI" {...form.register('direccionDNI')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.direccionDNI && <p className="text-error text-sm">{form.formState.errors.direccionDNI.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="distritoDNI" className="text-textSecondary">Distrito (DNI)</Label>
              <Input id="distritoDNI" {...form.register('distritoDNI')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.distritoDNI && <p className="text-error text-sm">{form.formState.errors.distritoDNI.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="provinciaDNI" className="text-textSecondary">Provincia (DNI)</Label>
              <Input id="provinciaDNI" {...form.register('provinciaDNI')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.provinciaDNI && <p className="text-error text-sm">{form.formState.errors.provinciaDNI.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="regionDNI" className="text-textSecondary">Región (DNI)</Label>
              <Input id="regionDNI" {...form.register('regionDNI')} className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300" />
              {form.formState.errors.regionDNI && <p className="text-error text-sm">{form.formState.errors.regionDNI.message}</p>}
            </div>
            <DialogFooter className="mt-4 col-span-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="rounded-lg border-border hover:bg-muted/50 transition-all duration-300">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300">
                {editingSocioTitular ? 'Guardar Cambios' : 'Añadir Socio Titular'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default People;
