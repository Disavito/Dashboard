import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ColumnDef,
  Row, // Import Row type from @tanstack/react-table
} from '@tanstack/react-table';
import { ArrowUpDown, PlusCircle, Loader2, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { SocioTitular } from '@/lib/types';
import SocioTitularRegistrationForm from '@/components/custom/SocioTitularRegistrationForm';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { Link } from 'react-router-dom';
import { DataTable } from '@/components/ui-custom/DataTable';

function People() {
  const [socios, setSocios] = useState<SocioTitular[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [socioToDelete, setSocioToDelete] = useState<SocioTitular | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  const fetchSocios = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('socio_titulares')
      .select('*')
      .order('apellidoPaterno', { ascending: true });

    if (error) {
      console.error('Error fetching socios:', error.message);
      setError('Error al cargar los socios. Por favor, inténtalo de nuevo.');
      setSocios([]);
      toast.error('Error al cargar socios', { description: error.message });
    } else {
      setSocios(data || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSocios();
  }, [fetchSocios]);

  const handleDeleteSocio = async () => {
    if (!socioToDelete) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('socio_titulares')
      .delete()
      .eq('id', socioToDelete.id);

    if (error) {
      console.error('Error deleting socio:', error.message);
      toast.error('Error al eliminar socio', { description: error.message });
    } else {
      toast.success('Socio eliminado', { description: `El socio ${socioToDelete.nombres} ${socioToDelete.apellidoPaterno} ha sido eliminado.` });
      fetchSocios();
      setIsDeleteDialogOpen(false);
      setSocioToDelete(null);
    }
    setIsDeleting(false);
  };

  const columns: ColumnDef<SocioTitular>[] = useMemo(
    () => [
      {
        accessorKey: 'dni',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-text hover:text-primary"
          >
            DNI
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue('dni')}</div>,
      },
      {
        accessorKey: 'nombres',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-text hover:text-primary"
          >
            Nombres
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('nombres')}</div>,
      },
      {
        accessorKey: 'apellidoPaterno',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-text hover:text-primary"
          >
            Apellido Paterno
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('apellidoPaterno')}</div>,
      },
      {
        accessorKey: 'apellidoMaterno',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-text hover:text-primary"
          >
            Apellido Materno
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('apellidoMaterno')}</div>,
      },
      {
        accessorKey: 'celular',
        header: 'Celular',
        cell: ({ row }) => <div>{row.getValue('celular') || 'N/A'}</div>,
      },
      {
        accessorKey: 'localidad',
        header: 'Localidad',
        cell: ({ row }) => <div>{row.getValue('localidad') || 'N/A'}</div>,
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const socio = row.original;
          return (
            <div className="flex space-x-2">
              <Link to={`/edit-socio/${socio.id}`}>
                <Button variant="ghost" size="icon" className="text-accent hover:bg-accent/10">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setSocioToDelete(socio);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const customGlobalFilterFn = useCallback((row: Row<SocioTitular>, _columnId: string, filterValue: any) => {
    const search = String(filterValue).toLowerCase(); // Ensure filterValue is a string for comparison
    const socio = row.original; // Access the original SocioTitular object

    const dni = socio.dni?.toLowerCase() || '';
    const nombres = socio.nombres?.toLowerCase() || '';
    const apellidoPaterno = socio.apellidoPaterno?.toLowerCase() || '';
    const apellidoMaterno = socio.apellidoMaterno?.toLowerCase() || '';
    const celular = socio.celular?.toLowerCase() || '';
    const localidad = socio.localidad?.toLowerCase() || '';

    return (
      dni.includes(search) ||
      nombres.includes(search) ||
      apellidoPaterno.includes(search) ||
      apellidoMaterno.includes(search) ||
      celular.includes(search) ||
      localidad.includes(search)
    );
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text font-sans flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Cargando socios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-text font-sans flex items-center justify-center">
        <p className="text-destructive text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text font-sans p-6">
      <header className="relative h-48 md:h-64 flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg mb-8">
        <img
          src="https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Community building"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 text-center p-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg leading-tight">
            Gestión de Socios Titulares
          </h1>
          <p className="mt-2 text-lg md:text-xl text-white text-opacity-90 max-w-2xl mx-auto">
            Administra la información de todos los socios registrados.
          </p>
        </div>
      </header>

      <div className="container mx-auto py-10 bg-surface rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex items-center w-full max-w-md">
            <Search className="absolute left-3 h-5 w-5 text-textSecondary" />
            <Input
              placeholder="Buscar por DNI, nombre, apellido o celular..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300 w-full"
            />
          </div>
          <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                Registrar Nuevo Socio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] bg-card text-text border-border rounded-xl shadow-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold text-primary">Registrar Socio Titular</DialogTitle>
                <DialogDescription className="text-textSecondary">
                  Completa los datos para registrar un nuevo socio.
                </DialogDescription>
              </DialogHeader>
              <SocioTitularRegistrationForm
                onClose={() => setIsRegistrationDialogOpen(false)}
                onSuccess={() => {
                  setIsRegistrationDialogOpen(false);
                  fetchSocios();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <DataTable
          columns={columns}
          data={socios}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          customGlobalFilterFn={customGlobalFilterFn}
        />
      </div>

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSocio}
        title="Confirmar Eliminación"
        description={`¿Estás seguro de que deseas eliminar al socio ${socioToDelete?.nombres} ${socioToDelete?.apellidoPaterno}? Esta acción no se puede deshacer.`}
        confirmButtonText="Eliminar"
        isConfirming={isDeleting}
        data={socioToDelete || {}} // Pass socioToDelete here, or an empty object if null
      />
    </div>
  );
}

export default People;
