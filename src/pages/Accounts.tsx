import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PlusCircle } from 'lucide-react';

// Dummy data for accounts
const dummyAccounts = [
  { id: '1', name: 'Cuenta Corriente Principal', type: 'Corriente', balance: 15230.50, currency: 'USD' },
  { id: '2', name: 'Cuenta de Ahorros', type: 'Ahorros', balance: 28750.00, currency: 'USD' },
  { id: '3', name: 'Inversiones a Largo Plazo', type: 'Inversión', balance: 50000.00, currency: 'USD' },
  { id: '4', name: 'Fondo de Emergencia', type: 'Ahorros', balance: 7500.00, currency: 'USD' },
];

const Accounts: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-white">Cuentas</h1>
        <Button className="bg-primary hover:bg-primary/90 text-white rounded-lg px-6 py-3 shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Nueva Cuenta
        </Button>
      </div>

      <p className="text-textSecondary text-lg">
        Gestiona todas tus cuentas financieras en un solo lugar. Visualiza saldos, tipos y movimientos.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dummyAccounts.map((account) => (
          <Card key={account.id} className="bg-surface border-border rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold text-white">{account.name}</CardTitle>
              <span className="text-sm text-textSecondary bg-background px-3 py-1 rounded-full">{account.type}</span>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-extrabold text-primary mb-2">
                {account.currency} {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-textSecondary text-sm">Saldo actual</p>
              <div className="mt-4 flex justify-end space-x-2">
                <Button variant="ghost" className="text-textSecondary hover:text-white hover:bg-background rounded-lg">Ver Detalles</Button>
                <Button variant="ghost" className="text-accent hover:text-white hover:bg-background rounded-lg">Editar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Accounts;
