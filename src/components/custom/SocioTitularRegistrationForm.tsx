import { useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { SocioTitular, EconomicSituationOption } from '@/lib/types';
import { Loader2, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { DialogFooter } from '@/components/ui/dialog';
import axios from 'axios';


// --- Zod Schemas ---
const personalDataSchema = z.object({
  nombres: z.string().min(1, { message: 'Los nombres son requeridos.' }).max(255, { message: 'Los nombres son demasiado largos.' }),
  apellidoPaterno: z.string().min(1, { message: 'El apellido paterno es requerido.' }).max(255, { message: 'El apellido paterno es demasiado largo.' }),
  apellidoMaterno: z.string().min(1, { message: 'El apellido materno es requerido.' }).max(255, { message: 'El apellido materno es demasiado largo.' }),
  dni: z.string().min(8, { message: 'El DNI debe tener 8 dígitos.' }).max(8, { message: 'El DNI debe tener 8 dígitos.' }).regex(/^\d{8}$/, { message: 'El DNI debe ser 8 dígitos numéricos.' }),
  fechaNacimiento: z.string().min(1, { message: 'La fecha de nacimiento es requerida.' }),
  edad: z.number().int().min(0, { message: 'La edad no puede ser negativa.' }).optional().nullable(), // Edad es calculada, no se valida directamente como requerida
  celular: z.string().min(9, { message: 'El celular debe tener al menos 9 dígitos.' }).max(15, { message: 'El celular es demasiado largo.' }).regex(/^\d+$/, { message: 'El celular debe contener solo números.' }),
  situacionEconomica: z.enum(['Pobre', 'Extremo Pobre'], { message: 'La situación económica es requerida.' }),
  direccionDNI: z.string().min(1, { message: 'La dirección DNI es requerida.' }).max(255, { message: 'La dirección DNI es demasiado larga.' }), // Made required
  regionDNI: z.string().min(1, { message: 'La región DNI es requerida.' }).max(255, { message: 'La región DNI es demasiado larga.' }), // Made required
  provinciaDNI: z.string().min(1, { message: 'La provincia DNI es requerida.' }).max(255, { message: 'La provincia DNI es demasiado larga.' }), // Made required
  distritoDNI: z.string().min(1, { message: 'El distrito DNI es requerido.' }).max(255, { message: 'El distrito DNI es demasiado larga.' }), // Made required
  localidad: z.string().min(1, { message: 'La localidad es requerida.' }).max(255, { message: 'La localidad es demasiado larga.' }), // Moved from addressDataSchema and made required
  genero: z.string().optional().nullable(),
});

const addressDataSchema = z.object({
  regionVivienda: z.string().optional().nullable(),
  provinciaVivienda: z.string().optional().nullable(),
  distritoVivienda: z.string().optional().nullable(),
  direccionVivienda: z.string().optional().nullable(),
  mz: z.string().optional().nullable(),
  lote: z.string().optional().nullable(),
});

const formSchema = z.intersection(personalDataSchema, addressDataSchema);

type SocioTitularFormValues = z.infer<typeof formSchema>;

interface SocioTitularRegistrationFormProps {
  socioId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const economicSituationOptions: EconomicSituationOption[] = [
  { value: 'Pobre', label: 'Pobre' },
  { value: 'Extremo Pobre', label: 'Extremo Pobre' },
];

const genderOptions = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Femenino', label: 'Femenino' },
  { value: 'Otro', label: 'Otro' },
];

// Helper function to calculate age
const calculateAge = (dobString: string): number | null => {
  if (!dobString) return null;
  try {
    const dob = parseISO(dobString);
    return differenceInYears(new Date(), dob);
  } catch (e) {
    console.error("Error calculating age:", e);
    return null;
  }
};

function SocioTitularRegistrationForm({ socioId, onClose, onSuccess }: SocioTitularRegistrationFormProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'address'>('personal');
  const [isDniSearching, setIsDniSearching] = useState(false);
  const [isReniecSearching, setIsReniecSearching] = useState(false);

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [dataToConfirm, setDataToConfirm] = useState<SocioTitularFormValues | null>(null);
  const [isConfirmingSubmission, setIsConfirmingSubmission] = useState(false);

  const form = useForm<SocioTitularFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      dni: '',
      fechaNacimiento: '',
      edad: null,
      celular: '',
      situacionEconomica: undefined,
      direccionDNI: '',
      regionDNI: '',
      provinciaDNI: '',
      distritoDNI: '',
      localidad: '',
      genero: undefined,
      
      regionVivienda: '',
      provinciaVivienda: '',
      distritoVivienda: '',
      direccionVivienda: '',
      mz: '',
      lote: '',
    },
  });

  const { handleSubmit, setValue, watch, reset, register, control, formState: { errors } } = form;
  const watchedDni = watch('dni');
  const watchedFechaNacimiento = watch('fechaNacimiento');

  useEffect(() => {
    if (watchedFechaNacimiento) {
      const calculatedAge = calculateAge(watchedFechaNacimiento);
      setValue('edad', calculatedAge);
    } else {
      setValue('edad', null);
    }
  }, [watchedFechaNacimiento, setValue]);


  const renderInputField = (
    id: keyof SocioTitularFormValues,
    label: string,
    placeholder: string,
    type: string = 'text',
    readOnly: boolean = false,
    isSearching: boolean = false,
    onBlur?: () => void
  ) => {
    return (
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={id} className="text-right text-textSecondary">
          {label}
        </Label>
        <div className="col-span-3 relative">
          <Input
            id={id}
            type={type}
            {...register(id, { valueAsNumber: id === 'edad' ? true : false })}
            className="rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
            placeholder={placeholder}
            readOnly={readOnly}
            onBlur={onBlur}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        {errors[id] && <p className="col-span-4 text-right text-error text-sm">{errors[id]?.message}</p>}
      </div>
    );
  };

  const renderTextareaField = (
    id: keyof SocioTitularFormValues,
    label: string,
    placeholder: string,
    readOnly: boolean = false,
    isSearching: boolean = false
  ) => {
    return (
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={id} className="text-right text-textSecondary">
          {label}
        </Label>
        <div className="col-span-3 relative">
          <Textarea
            id={id}
            {...register(id)}
            className="flex-grow rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
            placeholder={placeholder}
            readOnly={readOnly}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
        </div>
        {errors[id] && <p className="col-span-4 text-right text-error text-sm">{errors[id]?.message}</p>}
      </div>
    );
  };

  const renderRadioGroupField = (
    id: keyof SocioTitularFormValues,
    label: string,
    options: { value: string; label: string }[]
  ) => {
    return (
      <FormField
        control={control}
        name={id}
        render={({ field }) => (
          <FormItem className="grid grid-cols-4 items-center gap-4">
            <FormLabel className="text-right text-textSecondary">{label}</FormLabel>
            <FormControl className="col-span-3">
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value as string}
                className="flex flex-row space-x-4"
              >
                {options.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
                    <Label htmlFor={`${id}-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            {errors[id] && <FormMessage className="col-span-4 text-right">{errors[id]?.message}</FormMessage>}
          </FormItem>
        )}
      />
    );
  };

  const handleReniecSearch = useCallback(async () => {
    console.log('handleReniecSearch called');

    if (!watchedDni || watchedDni.length !== 8) {
      console.log('DNI invalid or not 8 digits:', watchedDni);
      toast.error('DNI inválido', { description: 'Por favor, ingresa un DNI de 8 dígitos.' });
      return;
    }

    setIsReniecSearching(true);
    console.log('setIsReniecSearching(true)');

    try {
      const token = import.meta.env.VITE_CONSULTAS_PERU_API_TOKEN;
      console.log('Reniec API Token:', token ? 'Loaded' : 'NOT LOADED');
      if (!token) {
        throw new Error('VITE_CONSULTAS_PERU_API_TOKEN no está configurado en el archivo .env');
      }

      const apiUrl = `https://api.consultasperu.com/api/v1/query`;
      console.log('Reniec API URL:', apiUrl);

      const requestBody = {
        token: token,
        type_document: "dni",
        document_number: watchedDni,
      };
      console.log('Reniec API Request Body:', requestBody);

      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Reniec API Raw Response:', response);
      const data = response.data.data;
      console.log('Reniec API Parsed Data (response.data.data):', data);


      if (response.data && response.data.success && data) {
        console.log('Reniec API Success. Populating fields.');
        setValue('nombres', data.name || '');
        const surnames = data.surname ? data.surname.split(' ') : [];
        setValue('apellidoPaterno', surnames[0] || '');
        setValue('apellidoMaterno', surnames[1] || '');
        setValue('fechaNacimiento', data.date_of_birth || '');
        setValue('celular', '');
        setValue('direccionDNI', data.address || '');
        setValue('regionDNI', data.department || '');
        setValue('provinciaDNI', data.province || '');
        setValue('distritoDNI', data.district || '');
        setValue('localidad', data.district || ''); // Mapped to new 'localidad' field

        toast.success('Datos Reniec encontrados', { description: `Nombre: ${data.name} ${data.surname}` });
      } else {
        console.log('Reniec API No data found or unsuccessful response.');
        toast.warning('DNI no encontrado en Reniec', { description: response.data.message || 'No se encontraron datos para el DNI proporcionado.' });
        setValue('nombres', '');
        setValue('apellidoPaterno', '');
        setValue('apellidoMaterno', '');
        setValue('fechaNacimiento', '');
        setValue('edad', null);
        setValue('celular', '');
        setValue('direccionDNI', '');
        setValue('regionDNI', '');
        setValue('provinciaDNI', '');
        setValue('distritoDNI', '');
        setValue('localidad', ''); // Clear new 'localidad' field
      }
    } catch (error: any) {
      console.error('Error al consultar Reniec:', error);
      // Añadir log para la respuesta de error de Axios si está disponible
      if (axios.isAxiosError(error) && error.response) {
        console.error('Axios Error Response Data:', error.response.data);
        console.error('Axios Error Response Status:', error.response.status);
        console.error('Axios Error Response Headers:', error.response.headers);
      }
      toast.error('Error al consultar Reniec', { description: error.message || 'Hubo un problema al conectar con el servicio Reniec.' });
      setValue('nombres', '');
      setValue('apellidoPaterno', '');
      setValue('apellidoMaterno', '');
      setValue('fechaNacimiento', '');
      setValue('edad', null);
      setValue('celular', '');
      setValue('direccionDNI', '');
      setValue('regionDNI', '');
      setValue('provinciaDNI', '');
      setValue('distritoDNI', '');
      setValue('localidad', ''); // Clear new 'localidad' field
    } finally {
      setIsReniecSearching(false);
      console.log('setIsReniecSearching(false)');
    }
  }, [watchedDni, setValue]);


  useEffect(() => {
    const fetchSocio = async () => {
      if (socioId) {
        const { data, error } = await supabase
          .from('socio_titulares')
          .select('*')
          .eq('id', socioId)
          .single();

        if (error) {
          console.error('Error fetching socio:', error.message);
          toast.error('Error al cargar socio', { description: error.message });
        } else if (data) {
          reset({
            ...data,
            fechaNacimiento: data.fechaNacimiento ? format(parseISO(data.fechaNacimiento), 'yyyy-MM-dd') : '',
            situacionEconomica: data.situacionEconomica || undefined,
            mz: data.mz || '',
            lote: data.lote || '',
            regionVivienda: data.regionVivienda || '',
            provinciaVivienda: data.provinciaVivienda || '',
            distritoVivienda: data.distritoVivienda || '',
            localidad: data.localidad || '', // Mapped to new 'localidad' field
            direccionDNI: data.direccionDNI || '',
            regionDNI: data.regionDNI || '',
            provinciaDNI: data.provinciaDNI || '',
            distritoDNI: data.distritoDNI || '',
            edad: data.edad || null,
            genero: data.genero || undefined, // Added
          });
        }
      }
    };
    fetchSocio();
  }, [socioId, reset]);

  const searchSocioByDni = useCallback(async (dni: string) => {
    if (!dni || dni.length !== 8) {
      setValue('nombres', '');
      setValue('apellidoPaterno', '');
      setValue('apellidoMaterno', '');
      return;
    }
    setIsDniSearching(true);
    const { data, error } = await supabase
      .from('socio_titulares')
      .select('nombres, apellidoPaterno, apellidoMaterno, fechaNacimiento, edad, celular, direccionDNI, regionDNI, provinciaDNI, distritoDNI, localidad, genero') // Updated select fields
      .eq('dni', dni)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error searching socio by DNI:', error.message);
      toast.error('Error al buscar DNI en la base de datos', { description: error.message });
      setValue('nombres', '');
      setValue('apellidoPaterno', '');
      setValue('apellidoMaterno', '');
      setValue('fechaNacimiento', '');
      setValue('edad', null);
      setValue('celular', '');
      setValue('direccionDNI', '');
      setValue('regionDNI', '');
      setValue('provinciaDNI', '');
      setValue('distritoDNI', '');
      setValue('localidad', ''); // Clear new 'localidad' field
      setValue('genero', undefined); // Clear new 'genero' field
    } else if (data) {
      setValue('nombres', data.nombres);
      setValue('apellidoPaterno', data.apellidoPaterno);
      setValue('apellidoMaterno', data.apellidoMaterno);
      setValue('fechaNacimiento', data.fechaNacimiento ? format(parseISO(data.fechaNacimiento), 'yyyy-MM-dd') : '');
      setValue('edad', data.edad);
      setValue('celular', data.celular);
      setValue('direccionDNI', data.direccionDNI);
      setValue('regionDNI', data.regionDNI);
      setValue('provinciaDNI', data.provinciaDNI);
      setValue('distritoDNI', data.distritoDNI);
      setValue('localidad', data.localidad); // Set new 'localidad' field
      setValue('genero', data.genero || undefined); // Set new 'genero' field
      toast.success('Socio encontrado en la base de datos', { description: `Nombre: ${data.nombres} ${data.apellidoPaterno}` });
    } else {
      setValue('nombres', '');
      setValue('apellidoPaterno', '');
      setValue('apellidoMaterno', '');
      setValue('fechaNacimiento', '');
      setValue('edad', null);
      setValue('celular', '');
      setValue('direccionDNI', '');
      setValue('regionDNI', '');
      setValue('provinciaDNI', '');
      setValue('distritoDNI', '');
      setValue('localidad', ''); // Clear new 'localidad' field
      setValue('genero', undefined); // Clear new 'genero' field
      toast.warning('DNI no encontrado en la base de datos', { description: 'No se encontró un socio con este DNI. Puedes consultar Reniec.' });
    }
    setIsDniSearching(false);
  }, [setValue]);

  useEffect(() => {
    if (socioId && watchedDni) {
      searchSocioByDni(watchedDni);
    }
  }, [socioId, watchedDni, searchSocioByDni]);

  const handleCloseConfirmationOnly = () => {
    setIsConfirmDialogOpen(false);
    setDataToConfirm(null);
    setIsConfirmingSubmission(false);
  };

  const onSubmit = async (values: SocioTitularFormValues, event?: React.BaseSyntheticEvent) => {
    event?.preventDefault();
    setDataToConfirm(values);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!dataToConfirm) return;

    setIsConfirmingSubmission(true);
    try {
      const dataToSave: Partial<SocioTitular> = {
        ...dataToConfirm,
      };

      if (socioId) {
        const { error } = await supabase
          .from('socio_titulares')
          .update(dataToSave)
          .eq('id', socioId);

        if (error) throw error;
        toast.success('Socio actualizado', { description: 'El socio titular ha sido actualizado exitosamente.' });
        onSuccess();
        onClose();
      } else {
        const { error } = await supabase
          .from('socio_titulares')
          .insert(dataToSave);

        if (error) throw error;
        toast.success('Socio registrado', { description: 'El nuevo socio titular ha sido registrado exitosamente.' });
        onSuccess();
        
        reset({
          nombres: '',
          apellidoPaterno: '',
          apellidoMaterno: '',
          dni: '',
          fechaNacimiento: '',
          edad: null,
          celular: '',
          situacionEconomica: undefined,
          direccionDNI: '',
          regionDNI: '',
          provinciaDNI: '',
          distritoDNI: '',
          localidad: '',
          genero: undefined,

          regionVivienda: '',
          provinciaVivienda: '',
          distritoVivienda: '',
          direccionVivienda: '',
          mz: '',
          lote: '',
        });
        handleCloseConfirmationOnly();
        setActiveTab('personal');
      }
    } catch (submitError: any) {
      console.error('Error al guardar el socio:', submitError.message);
      toast.error('Error al guardar socio', { description: submitError.message });
    } finally {
      setIsConfirmingSubmission(false);
    }
  };

  return (
    <FormProvider {...form}>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex border-b border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab('personal')}
              className={cn(
                "py-2 px-4 text-lg font-semibold transition-colors duration-300",
                activeTab === 'personal' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Datos Personales
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab('address')}
              className={cn(
                "py-2 px-4 text-lg font-semibold transition-colors duration-300",
                activeTab === 'address' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Datos de Vivienda
            </Button>
          </div>

          <div className="p-4 space-y-4">
            {activeTab === 'personal' && (
              <>
                {renderInputField('nombres', 'Nombres', 'Ej: Juan Carlos', 'text', isReniecSearching)}
                {renderInputField('apellidoPaterno', 'Apellido Paterno', 'Ej: García', 'text', isReniecSearching)}
                {renderInputField('apellidoMaterno', 'Apellido Materno', 'Ej: Pérez', 'text', isReniecSearching)}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dni" className="text-right text-textSecondary">
                    DNI
                  </Label>
                  <div className="col-span-3 relative flex items-center gap-2">
                    <Input
                      id="dni"
                      type="text"
                      {...register('dni')}
                      className="flex-grow rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300"
                      placeholder="Ej: 12345678"
                      readOnly={isDniSearching || isReniecSearching}
                      onBlur={() => searchSocioByDni(watchedDni)}
                    />
                    {isDniSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                    )}
                    {watchedDni && watchedDni.length === 8 && (
                      <Button
                        type="button"
                        onClick={handleReniecSearch}
                        disabled={isReniecSearching || isDniSearching}
                        className="rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 px-3 py-2 text-sm"
                      >
                        {isReniecSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Consulta Reniec'}
                      </Button>
                    )}
                  </div>
                  {errors.dni && <p className="col-span-4 text-right text-error text-sm">{errors.dni?.message}</p>}
                </div>
                <FormField
                  control={form.control}
                  name="fechaNacimiento"
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right text-textSecondary">Fecha Nacimiento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "col-span-3 w-full justify-start text-left font-normal rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={isReniecSearching}
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
                {renderInputField('edad', 'Edad', 'Ej: 35', 'number', true)}
                {renderInputField('localidad', 'Localidad', 'Ej: San Juan', 'text', isReniecSearching)}
                {renderTextareaField('direccionDNI', 'Dirección DNI', 'Ej: Av. Los Girasoles 123', isReniecSearching, isReniecSearching)}
                {renderInputField('regionDNI', 'Región DNI', 'Ej: Lima', 'text', isReniecSearching)}
                {renderInputField('provinciaDNI', 'Provincia DNI', 'Ej: Lima', 'text', isReniecSearching)}
                {renderInputField('distritoDNI', 'Distrito DNI', 'Ej: Miraflores', 'text', isReniecSearching)}
                {renderInputField('celular', 'Celular (Opcional)', 'Ej: 987654321', 'tel', isReniecSearching)}
                {renderRadioGroupField('genero', 'Género', genderOptions)}
                {renderRadioGroupField('situacionEconomica', 'Situación Económica', economicSituationOptions)}

                <div className="flex justify-end mt-6">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('address')}
                    className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all duration-300"
                  >
                    Siguiente: Datos de Vivienda
                  </Button>
                </div>
              </>
            )}

            {activeTab === 'address' && (
              <>
                {renderTextareaField('direccionVivienda', 'Dirección (Vivienda) (Opcional)', 'Ej: Calle Las Flores 456')}
                {renderInputField('mz', 'MZ (Manzana) (Opcional)', 'Ej: A')}
                {renderInputField('lote', 'Lote (Opcional)', 'Ej: 15')}
                {renderInputField('regionVivienda', 'Región (Vivienda) (Opcional)', 'Ej: Lima')}
                {renderInputField('provinciaVivienda', 'Provincia (Vivienda) (Opcional)', 'Ej: Lima')}
                {renderInputField('distritoVivienda', 'Distrito (Vivienda) (Opcional)', 'Ej: San Juan de Lurigancho')}
              </>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-lg border-border hover:bg-muted/50 transition-all duration-300">
              Cancelar
            </Button>
            <Button type="submit" className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300">
              {socioId ? 'Guardar Cambios' : 'Registrar Socio Titular'}
            </Button>
          </DialogFooter>
        </form>
      </Form>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCloseConfirmationOnly}
        onConfirm={handleConfirmSubmit}
        title={socioId ? 'Confirmar Edición de Socio' : 'Confirmar Registro de Socio'}
        description="Por favor, revisa los detalles del socio antes de confirmar."
        data={dataToConfirm || {}}
        confirmButtonText={socioId ? 'Confirmar Actualización' : 'Confirmar Registro'}
        isConfirming={isConfirmingSubmission}
      />
    </FormProvider>
  );
}

export default SocioTitularRegistrationForm;
