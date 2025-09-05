npm run build ❯ npm run build
> vite-shadcn@0.0.0 build
> tsc -b && vite build
src/components/ui/chart.tsx:86:6 - error TS2322: Type '{ children: (false | "" | 0 | Element | undefined)[]; separator?: string | undefined; wrapperClassName?: string | undefined; labelClassName?: string | undefined; formatter?: Formatter<...
> | undefined; ... 27 more ...; className: string; }' is not assignable to type 'DetailedHTMLProps<HTMLAttributes<HTMLDivElement
>, HTMLDivElement
>'.
Type '{ children: (false | "" | 0 | Element | undefined)[]; separator?: string | undefined; wrapperClassName?: string | undefined; labelClassName?: string | undefined; formatter?: Formatter<...
> | undefined; ... 27 more ...; className: string; }' is not assignable to type 'HTMLAttributes<HTMLDivElement
>'.
Types of property 'content' are incompatible.
Type 'ContentType<ValueType, NameType
> | undefined' is not assignable to type 'string | undefined'.
Type 'ReactElement<any, string | JSXElementConstructor<any
>
>' is not assignable to type 'string'.
86 <div
~~~
src/components/ui/chart.tsx:153:6 - error TS2322: Type '{ children: Element[]; string?: string | number | undefined; filter?: string | undefined; fill?: string | undefined; values?: string | undefined; style?: CSSProperties | undefined; ... 485 more ...; className: string; }' is not assignable to type 'DetailedHTMLProps<HTMLAttributes<HTMLDivElement
>, HTMLDivElement
>'.
Type '{ children: Element[]; string?: string | number | undefined; filter?: string | undefined; fill?: string | undefined; values?: string | undefined; style?: CSSProperties | undefined; ... 485 more ...; className: string; }' is not assignable to type 'HTMLAttributes<HTMLDivElement
>'.
Types of property 'content' are incompatible.
Type 'ContentType | undefined' is not assignable to type 'string | undefined'.
Type 'ReactElement<any, string | JSXElementConstructor<any
>
>' is not assignable to type 'string'.
153 <div
~~~
src/pages/Expenses.tsx:5:28 - error TS6133: 'Trash2' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, Tag, Hash, User } from 'lucide-react';
~~~~~~
src/pages/Expenses.tsx:5:49 - error TS6133: 'Tag' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, Tag, Hash, User } from 'lucide-react';
~~~
src/pages/Expenses.tsx:5:54 - error TS6133: 'Hash' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, Tag, Hash, User } from 'lucide-react';
~~~~
src/pages/Expenses.tsx:5:60 - error TS6133: 'User' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, Tag, Hash, User } from 'lucide-react';
~~~~
src/pages/Expenses.tsx:19:1 - error TS6133: 'toast' is declared but its value is never read.
19 import { toast } from 'sonner';
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
src/pages/Expenses.tsx:141:9 - error TS6133: 'colaboradoresData' is declared but its value is never read.
141 const { data: colaboradoresData } = useSupabaseData<Colaborador
>({ tableName: 'colaboradores', enabled: false }); // Fetch only when needed or for dropdown
~~~~~~~~~~~~~~~~~~~~~~~~~~~
src/pages/Income.tsx:5:28 - error TS6133: 'Trash2' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, Receipt, User, DollarSign } from 'lucide-react';
~~~~~~
src/pages/Income.tsx:5:49 - error TS6133: 'Receipt' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, Receipt, User, DollarSign } from 'lucide-react';
~~~~~~~
src/pages/Income.tsx:5:58 - error TS6133: 'User' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, Receipt, User, DollarSign } from 'lucide-react';
~~~~
src/pages/Income.tsx:5:64 - error TS6133: 'DollarSign' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, Receipt, User, DollarSign } from 'lucide-react';
~~~~~~~~~~
src/pages/Income.tsx:12:1 - error TS6133: 'Textarea' is declared but its value is never read.
12 import { Textarea } from '@/components/ui/textarea';
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
src/pages/Income.tsx:19:1 - error TS6133: 'toast' is declared but its value is never read.
19 import { toast } from 'sonner';
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
src/pages/Overview.tsx:8:66 - error TS6133: 'ChartDataPoint' is declared but its value is never read.
8 import { Ingreso, Gasto, Colaborador, SocioTitular, Transaction, ChartDataPoint } from '@/lib/types';
~~~~~~~~~~~~~~
src/pages/People.tsx:5:28 - error TS6133: 'Trash2' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, ArrowUpCircle, ArrowDownCircle, UserCheck } from 'lucide-react'; // Removed unused icons
~~~~~~
src/pages/People.tsx:5:49 - error TS6133: 'ArrowUpCircle' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, ArrowUpCircle, ArrowDownCircle, UserCheck } from 'lucide-react'; // Removed unused icons
~~~~~~~~~~~~~
src/pages/People.tsx:5:64 - error TS6133: 'ArrowDownCircle' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, ArrowUpCircle, ArrowDownCircle, UserCheck } from 'lucide-react'; // Removed unused icons
~~~~~~~~~~~~~~~
src/pages/People.tsx:5:81 - error TS6133: 'UserCheck' is declared but its value is never read.
5 import { PlusCircle, Edit, Trash2, ArrowUpDown, ArrowUpCircle, ArrowDownCircle, UserCheck } from 'lucide-react'; // Removed unused icons
~~~~~~~~~
src/pages/People.tsx:19:1 - error TS6133: 'toast' is declared but its value is never read.
19 import { toast } from 'sonner';
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
src/pages/People.tsx:136:46 - error TS2304: Cannot find name 'handleOpenDialog'.
136 <DropdownMenuItem onClick={() =
> handleOpenDialog(socioTitular)} className="hover:bg-muted/50 cursor-pointer"
>
~~~~~~~~~~~~~~~~
src/pages/People.tsx:139:46 - error TS2304: Cannot find name 'handleDelete'.
139 <DropdownMenuItem onClick={() =
> handleDelete(socioTitular.id)} className="hover:bg-destructive/20 text-destructive cursor-pointer"
>
~~~~~~~~~~~~
Found 22 errors.
\
