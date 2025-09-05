import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Users, UserCheck } from 'lucide-react';
import { Chart } from '@/components/ui/chart';
import { Line } from 'recharts';
import { DataTable } from '@/components/ui-custom/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Ingreso, Gasto, Colaborador, SocioTitular, Transaction } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Importar componentes de Tabs

// --- Column Definitions for Recent Transactions ---
const recentTransactionsColumns: ColumnDef<Transaction>[] = [
  {
    accessorKey: 'date',
    header: 'Fecha',
    cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd MMM yyyy', { locale: es }),
  },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ row }) => {
      const transaction = row.original;
      let descriptionText = 'N/A';
      if ('description' in transaction && transaction.description) {
        descriptionText = transaction.description;
      } else if ('full_name' in transaction && transaction.full_name) {
        descriptionText = `Pago de ${transaction.full_name}`;
      }
      return (
        <span className="font-medium text-foreground">
          {descriptionText}
        </span>
      );
    },
  },
  {
    accessorKey: 'category',
    header: 'Categoría/Tipo',
    cell: ({ row }) => {
      const transaction = row.original;
      let categoryText = 'General';
      if ('category' in transaction && transaction.category) {
        categoryText = transaction.category;
      } else if ('transaction_type' in transaction && transaction.transaction_type) {
        categoryText = transaction.transaction_type;
      }
      return (
        <span className="text-muted-foreground">
          {categoryText}
        </span>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Monto</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const isIngreso = 'receipt_number' in row.original;
      const formattedAmount = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
      }).format(amount);

      return (
        <div className={cn(
          'text-right font-semibold',
          isIngreso ? 'text-success' : 'text-error'
        )}>
          {isIngreso ? '+' : '-'} {formattedAmount}
        </div>
      );
    },
  },
];

function Overview() {
  const { data: ingresosData, loading: loadingIngresos, error: errorIngresos } = useSupabaseData<Ingreso>({ tableName: 'ingresos' });
  const { data: gastosData, loading: loadingGastos, error: errorGastos } = useSupabaseData<Gasto>({ tableName: 'gastos' });
  const { data: colaboradoresData, loading: loadingColaboradores, error: errorColaboradores } = useSupabaseData<Colaborador>({ tableName: 'colaboradores' });
  const { data: socioTitularesData, loading: loadingSocioTitulares, error: errorSocioTitulares } = useSupabaseData<SocioTitular>({ tableName: 'socio_titulares' });

  const totalIngresos = useMemo(() => ingresosData.reduce((sum, item) => sum + item.amount, 0), [ingresosData]);
  const totalGastos = useMemo(() => gastosData.reduce((sum, item) => sum + item.amount, 0), [gastosData]);
  const netBalance = totalIngresos - totalGastos;
  const totalColaboradores = colaboradoresData.length;
  const totalSocioTitulares = socioTitularesData.length;

  // --- Lógica para Socios Pagados y Pendientes ---
  const paidDnis = useMemo(() => new Set(ingresosData.map(ingreso => ingreso.dni)), [ingresosData]);

  const shouldPaySocioTitulares = useMemo(() =>
    socioTitularesData.filter(socio =>
      socio.situacionEconomica === 'Pobre' || socio.situacionEconomica === null
    ), [socioTitularesData]);

  const paidSocioTitularesCount = useMemo(() => {
    if (!shouldPaySocioTitulares.length) return 0;
    return shouldPaySocioTitulares.filter(socio => socio.dni && paidDnis.has(socio.dni)).length;
  }, [shouldPaySocioTitulares, paidDnis]);

  const unpaidSocioTitularesCount = useMemo(() => {
    if (!shouldPaySocioTitulares.length) return 0;
    return shouldPaySocioTitulares.filter(socio => socio.dni && !paidDnis.has(socio.dni)).length;
  }, [shouldPaySocioTitulares, paidDnis]);
  // --- Fin Lógica para Socios Pagados y Pendientes ---

  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: { ingresos: number; gastos: number } } = {};

    [...ingresosData, ...gastosData].forEach(item => {
      const monthYear = format(parseISO(item.date), 'yyyy-MM');
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { ingresos: 0, gastos: 0 };
      }
      if ('receipt_number' in item) {
        monthlyData[monthYear].ingresos += item.amount;
      } else if ('numero_gasto' in item) {
        monthlyData[monthYear].gastos += item.amount;
      }
    });

    return Object.keys(monthlyData)
      .sort()
      .map(monthYear => ({
        date: format(parseISO(`${monthYear}-01`), 'MMM yy', { locale: es }),
        ingresos: monthlyData[monthYear].ingresos,
        gastos: monthlyData[monthYear].gastos,
      }));
  }, [ingresosData, gastosData]);

  const recentTransactions = useMemo(() => {
    const allTransactions: Transaction[] = [...ingresosData, ...gastosData];
    return allTransactions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [ingresosData, gastosData]);

  if (loadingIngresos || loadingGastos || loadingColaboradores || loadingSocioTitulares) {
    return <div className="text-center text-muted-foreground">Cargando datos del dashboard...</div>;
  }

  if (errorIngresos || errorGastos || errorColaboradores || errorSocioTitulares) {
    return <div className="text-center text-destructive">Error al cargar los datos: {errorIngresos || errorGastos || errorColaboradores || errorSocioTitulares}</div>;
  }

  const chartConfig = {
    ingresos: {
      label: 'Ingresos',
      color: 'hsl(var(--success))',
      icon: ArrowUpCircle,
    },
    gastos: {
      label: 'Gastos',
      color: 'hsl(var(--error))',
      icon: ArrowDownCircle,
    },
  };

  return (
    <div className="space-y-6"> {/* Espacio general para el contenedor de tabs */}
      <Tabs defaultValue="socios" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="socios">Socios Titulares</TabsTrigger>
          <TabsTrigger value="finanzas">Balance General</TabsTrigger>
        </TabsList>

        <TabsContent value="socios" className="space-y-6 mt-6 animate-fade-in-up">
          <h2 className="text-3xl font-bold text-foreground mb-4">Resumen de Socios Titulares</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="rounded-xl border-border shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-textSecondary">Total Socios Registrados</CardTitle>
                <UserCheck className="h-5 w-5 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{totalSocioTitulares}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de socios en la base de datos
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-textSecondary">Socios que han pagado</CardTitle>
                <UserCheck className="h-5 w-5 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{paidSocioTitularesCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Socios con pagos registrados este mes
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-textSecondary">Socios pendientes de pago</CardTitle>
                <Users className="h-5 w-5 text-error" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{unpaidSocioTitularesCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Socios que aún no han pagado este mes
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finanzas" className="space-y-6 mt-6 animate-fade-in-up">
          <h2 className="text-3xl font-bold text-foreground mb-4">Finanzas y Actividad General</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-xl border-border shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-textSecondary">Ingresos Totales</CardTitle>
                <ArrowUpCircle className="h-5 w-5 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalIngresos)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +20.1% desde el mes pasado
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-textSecondary">Gastos Totales</CardTitle>
                <ArrowDownCircle className="h-5 w-5 text-error" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(totalGastos)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  -5.3% desde el mes pasado
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-textSecondary">Balance Neto</CardTitle>
                <DollarSign className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold",
                  netBalance >= 0 ? 'text-success' : 'text-error'
                )}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(netBalance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {netBalance >= 0 ? 'En positivo' : 'En negativo'}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-textSecondary">Colaboradores Registrados</CardTitle>
                <Users className="h-5 w-5 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{totalColaboradores}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  +19% desde el mes pasado
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border-border shadow-lg animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-foreground">Tendencia de Ingresos y Gastos</CardTitle>
              <CardDescription className="text-muted-foreground">
                Visualización mensual de tus finanzas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Chart data={chartData} config={chartConfig} className="min-h-[300px] w-full">
                <Line
                  type="monotone"
                  dataKey="ingresos"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{
                    fill: 'hsl(var(--success))',
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                    style: { fill: 'hsl(var(--success))', stroke: 'hsl(var(--success))' },
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="gastos"
                  stroke="hsl(var(--error))"
                  strokeWidth={2}
                  dot={{
                    fill: 'hsl(var(--error))',
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                    style: { fill: 'hsl(var(--error))', stroke: 'hsl(var(--error))' },
                  }}
                />
              </Chart>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-lg animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-foreground">Transacciones Recientes</CardTitle>
              <CardDescription className="text-muted-foreground">
                Las últimas 5 transacciones registradas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={recentTransactionsColumns} data={recentTransactions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Overview;
