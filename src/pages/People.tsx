import { useState, useMemo, useEffect } from 'react';
import { ColumnDef, FilterFn } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlusCircle, Edit, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
// import { Input } from '@/components/ui/input'; // Eliminado, no se usa directamente
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { SocioTitular as SocioTitularType, SituacionEconomica, Ingreso } from '@/lib/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SocioTitularRegistrationForm from '@/components/custom/SocioTitularRegistrationForm';

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

function People() {
  const [globalFilter, setGlobalFilter] = useState(''); // For DNI, names, surnames
  const [selectedLocality, setSelectedLocality] = useState<string | null>(null); // For locality dropdown

  // Estado para el diálogo del formulario
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingSocioId, setEditingSocioId] = useState<string | undefined>(undefined);

  // Fetch all socio_titulares to get unique localities for the dropdown
  const { data: allSocioTitularesForLocalities, loading: loadingAllLocalities } = useSupabaseData<SocioTitularType>({
    tableName: 'socio_titulares',
    enabled: true,
  });

  // Fetch socio_titulares data, applying the locality filter
  const { data: socioTitularesData, loading, error, setFilters, deleteRecord, refreshData } = useSupabaseData<SocioTitularType>({
    tableName: 'socio_titulares',
    initialFilters: selectedLocality ? { localidad: selectedLocality } : {},
  });

  // Update filters in useSupabaseData when selectedLocality changes
  useEffect(() => {
    setFilters(selectedLocality ? { localidad: selectedLocality } : {});
  }, [selectedLocality, setFilters]);

  const { data: ingresosData, loading: loadingIngresos, error: errorIngresos } = useSupabaseData<Ingreso>({ tableName: 'ingresos' });

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este socio titular?')) {
      await deleteRecord(id);
      refreshData(); // Refrescar datos después de la eliminación
    }
  };

  const handleOpenFormDialog = (socioId?: string) => {
    setEditingSocioId(socioId);
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setIsFormDialogOpen(false);
    setEditingSocioId(undefined);
    refreshData(); // Refrescar datos después de enviar/cancelar el formulario
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
                <DropdownMenuItem onClick={() => handleOpenFormDialog(socioTitular.id)} className="hover:bg-muted/50 cursor-pointer">
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
          <Button onClick={() => handleOpenFormDialog()} className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300">
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
            globalFilterFn={socioTitularGlobalFilterFn}
          />
        </CardContent>
      </Card>

      {/* Diálogo de Registro/Edición de Socio Titular */}
      <Dialog open={isFormDialogOpen} onOpenChange={handleCloseFormDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-card border-border rounded-xl shadow-lg p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-foreground text-2xl font-bold">
              {editingSocioId ? 'Editar Socio Titular' : 'Registrar Nuevo Socio Titular'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingSocioId ? 'Actualiza la información del socio titular existente.' : 'Completa el formulario para registrar un nuevo socio titular.'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <SocioTitularRegistrationForm
              socioId={editingSocioId}
              onClose={handleCloseFormDialog}
              onSuccess={handleCloseFormDialog}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default People;
