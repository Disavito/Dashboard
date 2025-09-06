import React, { useState, useEffect } from 'react';
import { User, Home, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { ECONOMIC_SITUATIONS } from '@/lib/data/constants';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// REMOVED: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SocioTitular as SocioTitularType } from '@/lib/types';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';

const API_TOKEN = import.meta.env.VITE_CONSULTAS_PERU_API_TOKEN || 'bee07ff13163585f6a0d648bf7c1b13b9a2d7b2591139eab891';
const API_URL = 'https://api.consultasperu.com/api/v1/query';

// --- Form Schema ---
const socioTitularFormSchema = z.object({
  nombres: z.string().min(1, { message: 'Los nombres son requeridos.' }).max(255, { message: 'Los nombres son demasiado largos.' }),
  apellidoPaterno: z.string().min(1, { message: 'El apellido paterno es requerido.' }).max(255, { message: 'El apellido paterno es demasiado largo.' }),
  apellidoMaterno: z.string().min(1, { message: 'El apellido materno es requerido.' }).max(255, { message: 'El apellido materno es demasiado largo.' }),
  dni: z.string().min(8, { message: 'El DNI debe tener 8 dígitos.' }).max(8, { message: 'El DNI debe tener 8 dígitos.' }).regex(/^\d{8}$/, { message: 'El DNI debe ser 8 dígitos numéricos.' }).optional().nullable(),
  edad: z.preprocess(
    (val) => (val === '' ? null : Number(val)),
    z.number().int().positive({ message: 'La edad debe ser un número positivo.' }).min(18, { message: 'La edad mínima es 18.' }).max(99, { message: 'La edad máxima es 99.' }).optional().nullable()
  ),
  direccionDNI: z.string().optional().nullable(),
  distritoDNI: z.string().optional().nullable(),
  provinciaDNI: z.string().optional().nullable(),
  regionDNI: z.string().optional().nullable(),
  fechaNacimiento: z.string().optional().nullable(), // Expected DD/MM/YYYY from user, stored as YYYY-MM-DD
  celular: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  direccionVivienda: z.string().optional().nullable(),
  mz: z.string().optional().nullable(),
  lote: z.string().optional().nullable(),
  ubicacionReferencia: z.string().optional().nullable(),
  distritoVivienda: z.string().optional().nullable(),
  provinciaVivienda: z.string().optional().nullable(),
  regionVivienda: z.string().optional().nullable(),
  situacionEconomica: z.enum(['Pobre', 'Extremo Pobre']).optional().nullable(),
  // genero: z.string().optional().nullable(), // Eliminado el campo genero
});

type SocioTitularFormValues = z.infer<typeof socioTitularFormSchema>;

interface SocioTitularRegistrationFormProps {
  socioId?: string; // Optional ID for editing existing socio
  onClose: () => void; // Callback para cerrar el diálogo
  onSuccess: () => void; // Callback para una presentación exitosa
}

const SocioTitularRegistrationForm: React.FC<SocioTitularRegistrationFormProps> = ({ socioId, onClose, onSuccess }) => {
  const [isLoadingDni, setIsLoadingDni] = useState<boolean>(false);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(!!socioId);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'housing'>('personal');
  const [dniFoundInSupabase, setDniFoundInSupabase] = useState<boolean | null>(null);

  const form = useForm<SocioTitularFormValues>({
    resolver: zodResolver(socioTitularFormSchema),
    defaultValues: {
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      dni: null,
      edad: null,
      direccionDNI: null,
      distritoDNI: null,
      provinciaDNI: null,
      regionDNI: null,
      fechaNacimiento: null,
      celular: null,
      localidad: null,
      direccionVivienda: null,
      mz: null,
      lote: null,
      ubicacionReferencia: null,
      distritoVivienda: null,
      provinciaVivienda: null,
      regionVivienda: null,
      situacionEconomica: 'Pobre',
      // genero: null, // Eliminado el campo genero
    },
  });

  const { handleSubmit, register, watch, formState: { errors, isSubmitting } } = form; // REMOVED: setValue

  // --- Date Formatting Helpers ---
  const formatDateForInput = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;
    try {
      // Assuming dateString from DB is YYYY-MM-DD
      const date = parse(dateString, 'yyyy-MM-dd', new Date());
      return format(date, 'dd/MM/yyyy');
    } catch (e) {
      console.error("Error parsing date for input:", dateString, e);
      return dateString; // Return original if parsing fails
    }
  };

  const formatDateForDB = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;
    try {
      // Assuming dateString from input is DD/MM/YYYY
      const date = parse(dateString, 'dd/MM/yyyy', new Date());
      return format(date, 'yyyy-MM-dd');
    } catch (e) {
      console.error("Error parsing date for DB:", dateString, e);
      return dateString; // Return original if parsing fails
    }
  };

  // --- Load existing data for editing ---
  useEffect(() => {
    setIsEditingExisting(!!socioId); // Actualizar el estado de edición cuando la prop socioId cambia
    const loadSocioData = async () => {
      if (!socioId) {
        form.reset({ // Resetear el formulario si no hay socioId (para nuevo registro)
          nombres: '', apellidoPaterno: '', apellidoMaterno: '', dni: null, edad: null,
          direccionDNI: null, distritoDNI: null, provinciaDNI: null, regionDNI: null,
          fechaNacimiento: null, celular: null, localidad: null, direccionVivienda: null,
          mz: null, lote: null, ubicacionReferencia: null, distritoVivienda: null,
          provinciaVivienda: null, regionVivienda: null, situacionEconomica: 'Pobre', // genero: null, // Eliminado
        });
        setDniFoundInSupabase(null);
        setSubmitMessage(null);
        return;
      }

      const { data, error } = await supabase
        .from('socio_titulares')
        .select('*')
        .eq('id', socioId)
        .single();

      if (error) {
        console.error('Error loading socio data:', error.message);
        setSubmitMessage({ type: 'error', text: `Error al cargar datos del socio: ${error.message}` });
        return;
      }

      if (data) {
        form.reset({
          ...data,
          edad: data.edad || null,
          fechaNacimiento: formatDateForInput(data.fechaNacimiento),
          situacionEconomica: data.situacionEconomica || 'Pobre',
          dni: data.dni || null,
          celular: data.celular || null,
          // genero: data.genero || null, // Eliminado
        });
        setDniFoundInSupabase(true); // DNI encontrado en la DB
        setSubmitMessage(null); // Limpiar mensajes al cargar exitosamente
      }
    };

    loadSocioData();
  }, [socioId, form]);

  const currentDni = watch('dni');

  const searchDniInSupabase = async (dni: string | null | undefined) => {
    if (!dni || dni.length !== 8) {
      setSubmitMessage({ type: 'warning', text: 'Por favor, ingresa un DNI válido de 8 dígitos.' });
      setDniFoundInSupabase(null);
      setIsEditingExisting(!!socioId); // Re-evaluar basado en la prop
      return;
    }

    setIsLoadingDni(true);
    setSubmitMessage(null);

    try {
      const { data: dbData, error: dbError } = await supabase
        .from('socio_titulares')
        .select('*')
        .eq('dni', dni)
        .single();

      if (dbError && dbError.code !== 'PGRST116') { // PGRST116 significa "no se encontraron filas"
        throw dbError;
      }

      if (dbData) {
        // Si estamos en modo edición para un socio diferente, no sobrescribir
        if (socioId && dbData.id !== socioId) {
          setSubmitMessage({ type: 'warning', text: 'Este DNI ya está registrado por otro socio.' });
          setDniFoundInSupabase(true);
          setIsEditingExisting(false); // No estamos editando el socio actual
          return;
        }
        form.reset({
          ...dbData,
          edad: dbData.edad || null,
          fechaNacimiento: formatDateForInput(dbData.fechaNacimiento),
          situacionEconomica: dbData.situacionEconomica || 'Pobre',
          dni: dbData.dni || null,
          celular: dbData.celular || null,
          // genero: dbData.genero || null, // Eliminado
        });
        setIsEditingExisting(true); // Ahora estamos editando este socio existente
        setDniFoundInSupabase(true);
        setSubmitMessage({ type: 'success', text: 'Datos existentes cargados para edición desde la base de datos.' });
      } else {
        // Limpiar otros campos, mantener DNI
        form.reset({ ...form.getValues(), dni: dni, nombres: '', apellidoPaterno: '', apellidoMaterno: '', edad: null, direccionDNI: null, distritoDNI: null, provinciaDNI: null, regionDNI: null, fechaNacimiento: null, celular: null, /* genero: null */ }); // Eliminado
        setIsEditingExisting(false); // Es un nuevo registro
        setDniFoundInSupabase(false);
        setSubmitMessage({ type: 'warning', text: 'DNI no encontrado en la base de datos. Puedes consultar RENIEC.' });
      }
    } catch (error: any) {
      console.error('Error al buscar socio por DNI en Supabase:', error.message);
      setSubmitMessage({ type: 'error', text: `Error al buscar DNI en DB: ${error.message}` });
      form.reset({ ...form.getValues(), dni: dni, nombres: '', apellidoPaterno: '', apellidoMaterno: '', edad: null, direccionDNI: null, provinciaDNI: null, regionDNI: null, fechaNacimiento: null, celular: null, /* genero: null */ }); // Eliminado
      setIsEditingExisting(false);
      setDniFoundInSupabase(null);
    } finally {
      setIsLoadingDni(false);
    }
  };

  const searchDniInExternalApi = async (dni: string | null | undefined) => {
    if (!dni || dni.length !== 8) {
      setSubmitMessage({ type: 'error', text: 'Por favor, ingresa un DNI válido de 8 dígitos para consultar RENIEC.' });
      return;
    }

    setIsLoadingDni(true);
    setSubmitMessage(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: API_TOKEN,
          type_document: 'dni',
          document_number: dni,
        }),
      });

      const apiResponse = await response.json();
      console.log('Raw API Response from external API (RENIEC):', apiResponse);

      if (!apiResponse.success) {
        if (apiResponse.message === 'No data found') {
          setSubmitMessage({ type: 'warning', text: 'DNI no encontrado en RENIEC.' });
        } else {
          throw new Error(apiResponse.message || 'Error al consultar RENIEC');
        }
        // Limpiar campos pero mantener DNI
        form.reset({ ...form.getValues(), dni: dni, nombres: '', apellidoPaterno: '', apellidoMaterno: '', edad: null, direccionDNI: null, distritoDNI: null, provinciaDNI: null, regionDNI: null, fechaNacimiento: null, celular: null, /* genero: null */ }); // Eliminado
        setIsEditingExisting(false);
        setDniFoundInSupabase(false);
        return;
      }

      let dniFromApi = String(apiResponse.data.number);
      if (!/^\d{8}$/.test(dniFromApi)) {
        console.log('Invalid DNI from API:', dniFromApi);
        setSubmitMessage({ type: 'error', text: 'El DNI retornado por RENIEC no es válido.' });
        form.reset({ ...form.getValues(), dni: null });
        setIsEditingExisting(false);
        setDniFoundInSupabase(false);
        return;
      }

      const apiMappedData: Partial<SocioTitularFormValues> = {
        nombres: apiResponse.data.name || '',
        apellidoPaterno: apiResponse.data.surname?.split(' ')[0] || '',
        apellidoMaterno: apiResponse.data.surname?.split(' ')[1] || '',
        direccionDNI: apiResponse.data.address || '',
        distritoDNI: apiResponse.data.district || '',
        provinciaDNI: apiResponse.data.province || '',
        regionDNI: apiResponse.data.department || '',
        fechaNacimiento: formatDateForInput(apiResponse.data.date_of_birth) || '', // Convertir YYYY-MM-DD a DD/MM/YYYY
        dni: dniFromApi,
        celular: null, // La API no lo proporciona, mantener nulo
        localidad: null, // La API no lo proporciona, mantener nulo
        edad: null, // La API no lo proporciona, mantener nulo
        direccionVivienda: null,
        mz: null,
        lote: null,
        ubicacionReferencia: null,
        distritoVivienda: null,
        provinciaVivienda: null,
        regionVivienda: null,
        situacionEconomica: 'Pobre',
        // genero: null, // Eliminado
      };

      form.reset({
        ...form.getValues(), // Mantener los valores existentes para los campos que no provienen de la API
        ...apiMappedData,
        dni: dniFromApi, // Asegurar que el DNI se establece desde la API
      });
      setIsEditingExisting(false); // Es un nuevo registro para Supabase (o se actualizará si el DNI coincide con uno existente)
      setDniFoundInSupabase(false); // Todavía no está en Supabase
      setSubmitMessage({ type: 'warning', text: 'DNI encontrado en RENIEC. Registrando nuevo socio en la base de datos.' });

    } catch (error: any) {
      console.error('Error al consultar RENIEC:', error.message);
      setSubmitMessage({ type: 'error', text: `Error al consultar RENIEC: ${error.message}` });
      form.reset({ ...form.getValues(), dni: dni, nombres: '', apellidoPaterno: '', apellidoMaterno: '', edad: null, direccionDNI: null, provinciaDNI: null, regionDNI: null, fechaNacimiento: null, celular: null, /* genero: null */ }); // Eliminado
      setIsEditingExisting(false);
      setDniFoundInSupabase(false);
    } finally {
      setIsLoadingDni(false);
    }
  };

  const handleDniBlur = () => {
    const dniValue = watch('dni');
    if (dniValue && /^\d{8}$/.test(dniValue)) {
      searchDniInSupabase(dniValue);
    } else {
      setDniFoundInSupabase(null);
      setIsEditingExisting(!!socioId); // Resetear basado en la prop
      setSubmitMessage(null);
    }
  };

  const onSubmit = async (values: SocioTitularFormValues) => {
    setSubmitMessage(null); // Limpiar mensajes previos

    try {
      const dataToSubmit: Partial<SocioTitularType> = {
        nombres: values.nombres,
        apellidoPaterno: values.apellidoPaterno,
        apellidoMaterno: values.apellidoMaterno,
        edad: values.edad,
        dni: values.dni,
        direccionDNI: values.direccionDNI,
        distritoDNI: values.distritoDNI,
        provinciaDNI: values.provinciaDNI,
        regionDNI: values.regionDNI,
        fechaNacimiento: formatDateForDB(values.fechaNacimiento), // Convertir a YYYY-MM-DD
        celular: values.celular,
        localidad: values.localidad,
        situacionEconomica: values.situacionEconomica,
        direccionVivienda: values.direccionVivienda,
        mz: values.mz,
        lote: values.lote,
        ubicacionReferencia: values.ubicacionReferencia,
        distritoVivienda: values.distritoVivienda,
        provinciaVivienda: values.provinciaVivienda,
        regionVivienda: values.regionVivienda,
        // genero: values.genero, // Eliminado
      };

      // Asegurar que las cadenas vacías se conviertan a nulo para Supabase
      for (const key in dataToSubmit) {
        const value = dataToSubmit[key as keyof typeof dataToSubmit];
        if (typeof value === 'string' && value.trim() === '') {
          (dataToSubmit as any)[key] = null;
        }
      }

      console.log('Payload being sent to Supabase:', dataToSubmit);

      let response;
      if (isEditingExisting && socioId) {
        response = await supabase
          .from('socio_titulares')
          .update(dataToSubmit)
          .eq('id', socioId)
          .select();
      } else {
        // Verificar si el DNI ya existe antes de insertar
        const { data: existingSocio, error: existingError } = await supabase
          .from('socio_titulares')
          .select('id')
          .eq('dni', values.dni)
          .single();

        if (existingError && existingError.code !== 'PGRST116') {
          throw existingError;
        }

        if (existingSocio) {
          setSubmitMessage({ type: 'error', text: 'Ya existe un socio registrado con este DNI.' });
          return;
        }

        response = await supabase
          .from('socio_titulares')
          .insert([dataToSubmit])
          .select();
      }

      const { data, error } = response;

      if (error) {
        throw error;
      }

      console.log('Formulario enviado y datos guardados en Supabase:', data);
      setSubmitMessage({ type: 'success', text: `Formulario ${isEditingExisting ? 'actualizado' : 'enviado'} con éxito y datos guardados.` });
      onSuccess(); // Llamar al callback onSuccess
      onClose(); // Cerrar el diálogo
    } catch (error: any) {
      console.error('Error al enviar el formulario a Supabase:', error.message);
      setSubmitMessage({ type: 'error', text: `Error al guardar los datos: ${error.message}` });
    }
  };

  const renderInputField = (
    label: string,
    name: keyof SocioTitularFormValues,
    type: string = 'text',
    placeholder: string = '',
    pattern?: string,
    onBlurHandler?: () => void,
    isRequired: boolean = true
  ) => (
    <div className="grid gap-2">
      <Label htmlFor={name} className="text-textSecondary">
        {label} {isRequired && <span className="text-error">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={name}
          type={type}
          placeholder={placeholder}
          {...register(name)}
          onBlur={onBlurHandler}
          className={cn(
            "rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300",
            errors[name] && "border-error focus:ring-error focus:border-error"
          )}
          pattern={pattern}
        />
        {name === 'dni' && isLoadingDni && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
        )}
      </div>
      {errors[name] && <p className="text-error text-sm mt-1">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-surface p-8 md:p-12 rounded-2xl shadow-xl border border-border">
        <div className="mb-8 border-b border-border">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={`px-6 py-3 text-lg font-semibold rounded-t-lg transition-all duration-200 ${
                activeTab === 'personal'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface text-textSecondary hover:bg-surface/70'
              }`}
            >
              Datos Personales
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('housing')}
              className={`px-6 py-3 text-lg font-semibold rounded-t-lg transition-all duration-200 ${
                activeTab === 'housing'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface text-textSecondary hover:bg-surface/70'
              }`}
            >
              Datos de Vivienda
            </button>
          </div>
        </div>

        {activeTab === 'personal' && (
          <section className="mb-10 pb-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-primary mb-6 flex items-center">
              <User className="mr-3 text-accent" size={32} /> Datos Personales
            </h2>

            {/* Opciones de búsqueda de DNI */}
            <div className="mb-4">
              <Label className="block text-textSecondary text-sm font-medium mb-2">
                Opciones de búsqueda de DNI:
              </Label>
              <div className="flex space-x-4">
                <Button
                  type="button"
                  onClick={() => searchDniInSupabase(currentDni)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                    dniFoundInSupabase === true
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-surface text-textSecondary hover:bg-surface/70'
                  )}
                  disabled={isLoadingDni || !currentDni || !/^\d{8}$/.test(currentDni)}
                >
                  Buscar en Base de Datos
                </Button>

                {dniFoundInSupabase === false && (
                  <Button
                    type="button"
                    onClick={() => searchDniInExternalApi(currentDni)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                      isLoadingDni ? 'bg-gray-600' : 'bg-accent text-white shadow-md hover:bg-accent/90'
                    )}
                    disabled={isLoadingDni || !currentDni || !/^\d{8}$/.test(currentDni)}
                  >
                    Consultar RENIEC
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInputField('DNI', 'dni', 'text', 'Ej: 12345678', '\\d{8}', handleDniBlur)}
              {renderInputField('Nombres', 'nombres', 'text', 'Ej: Juan Carlos')}
              {renderInputField('Apellido Paterno', 'apellidoPaterno', 'text', 'Ej: García')}
              {renderInputField('Apellido Materno', 'apellidoMaterno', 'text', 'Ej: Pérez')}
              {renderInputField('Fecha de Nacimiento', 'fechaNacimiento', 'text', 'DD/MM/YYYY', '\\d{2}/\\d{2}/\\d{4}')}
              {renderInputField('Edad', 'edad', 'number', 'Ej: 35')}
              {renderInputField('Localidad', 'localidad', 'text', 'Ej: San Juan')}
              {renderInputField('Dirección de DNI', 'direccionDNI', 'text', 'Ej: Av. Los Girasoles 123')}
              {renderInputField('Región (DNI)', 'regionDNI', 'text', 'Ej: Lima')}
              {renderInputField('Provincia (DNI)', 'provinciaDNI', 'text', 'Ej: Lima')}
              {renderInputField('Distrito (DNI)', 'distritoDNI', 'text', 'Ej: Miraflores')}
              {renderInputField('Celular', 'celular', 'text', 'Ej: 987654321', '\\d{9}', undefined, false)}
              {/* Eliminado el campo de Género */}
            </div>
          </section>
        )}

        {activeTab === 'housing' && (
          <section className="mb-10 pb-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-primary mb-6 flex items-center">
              <Home className="mr-3 text-accent" size={32} /> Datos de Instalación de Vivienda
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInputField('Dirección (Vivienda)', 'direccionVivienda', 'text', 'Ej: Calle Las Flores 456', undefined, undefined, false)}
              {renderInputField('MZ (Manzana)', 'mz', 'text', 'Ej: A', undefined, undefined, false)}
              {renderInputField('Lote', 'lote', 'text', 'Ej: 15', undefined, undefined, false)}
              {renderInputField('Ubicación (Referencia)', 'ubicacionReferencia', 'text', 'Ej: Frente al parque', undefined, undefined, false)}
              {renderInputField('Región (Vivienda)', 'regionVivienda', 'text', 'Ej: Lima', undefined, undefined, false)}
              {renderInputField('Provincia (Vivienda)', 'provinciaVivienda', 'text', 'Ej: Lima', undefined, undefined, false)}
              {renderInputField('Distrito (Vivienda)', 'distritoVivienda', 'text', 'Ej: San Juan de Lurigancho', undefined, undefined, false)}
            </div>
          </section>
        )}

        <section className="mb-10 pb-8 border-b border-border animate-fade-in delay-100">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center">
            Situación Económica
          </h2>
          <div className="mb-6">
            <Label className="block text-textSecondary text-sm font-medium mb-2">
              Situación Económica
            </Label>
            <div className="flex flex-wrap gap-4">
              {ECONOMIC_SITUATIONS.map(option => (
                <label key={option.value} className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    {...register('situacionEconomica')}
                    value={option.value}
                    checked={watch('situacionEconomica') === option.value}
                    className="form-radio h-5 w-5 text-primary border-border bg-surface focus:ring-primary transition-colors duration-200"
                  />
                  <span className="ml-2 text-text">{option.label}</span>
                </label>
              ))}
            </div>
            {errors.situacionEconomica && <p className="text-error text-sm mt-1">{errors.situacionEconomica.message}</p>}
          </div>
        </section>

        {submitMessage && (
          <div className={`mb-4 p-4 rounded-lg text-center ${
            submitMessage.type === 'success' ? 'bg-success/20 text-success' :
            submitMessage.type === 'warning' ? 'bg-warning/20 text-warning' :
            'bg-error/20 text-error'
          }`}>
            {submitMessage.text}
          </div>
        )}
        <div className="flex justify-end animate-fade-in delay-300">
          <Button
            type="submit"
            className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoadingDni || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              isEditingExisting ? 'Actualizar Socio Titular' : 'Registrar Socio Titular'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SocioTitularRegistrationForm;
