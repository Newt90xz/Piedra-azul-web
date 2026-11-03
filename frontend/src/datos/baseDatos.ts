// Generado desde Supabase (MCP generate_typescript_types). No editar a mano:
// regenerar después de cada migración.
// PENDIENTE: ajustado a mano para 20261103120000_salas_conectadas_recreo; regenerar al aplicarla.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      cursos: {
        Row: { creado_en: string; docente_id: string; id: string; nombre: string }
        Insert: { creado_en?: string; docente_id?: string; id?: string; nombre: string }
        Update: { creado_en?: string; docente_id?: string; id?: string; nombre?: string }
        Relationships: [
          {
            foreignKeyName: 'cursos_docente_id_fkey'
            columns: ['docente_id']
            isOneToOne: false
            referencedRelation: 'docentes'
            referencedColumns: ['id']
          },
        ]
      }
      docentes: {
        Row: { creado_en: string; email: string; id: string; nombre: string }
        Insert: { creado_en?: string; email: string; id: string; nombre: string }
        Update: { creado_en?: string; email?: string; id?: string; nombre?: string }
        Relationships: []
      }
      estudiantes: {
        Row: {
          activo: boolean
          ajustes: Json
          avatar: string
          color: string
          creado_en: string
          curso_id: string
          foto_url: string | null
          id: string
          monedas: number
          nivel_habilitado: number
          nombre: string
          personaje: Json | null
        }
        Insert: {
          activo?: boolean
          ajustes?: Json
          avatar: string
          color: string
          creado_en?: string
          curso_id: string
          foto_url?: string | null
          id?: string
          monedas?: number
          nivel_habilitado?: number
          nombre: string
          personaje?: Json | null
        }
        Update: {
          activo?: boolean
          ajustes?: Json
          avatar?: string
          color?: string
          creado_en?: string
          curso_id?: string
          foto_url?: string | null
          id?: string
          monedas?: number
          nivel_habilitado?: number
          nombre?: string
          personaje?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'estudiantes_curso_id_fkey'
            columns: ['curso_id']
            isOneToOne: false
            referencedRelation: 'cursos'
            referencedColumns: ['id']
          },
        ]
      }
      observaciones: {
        Row: { docente_id: string; estudiante_id: string; fecha: string; id: string; texto: string }
        Insert: { docente_id?: string; estudiante_id: string; fecha?: string; id?: string; texto: string }
        Update: { docente_id?: string; estudiante_id?: string; fecha?: string; id?: string; texto?: string }
        Relationships: [
          {
            foreignKeyName: 'observaciones_docente_id_fkey'
            columns: ['docente_id']
            isOneToOne: false
            referencedRelation: 'docentes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'observaciones_estudiante_id_fkey'
            columns: ['estudiante_id']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id']
          },
        ]
      }
      registros_emocion: {
        Row: { emocion: Database['public']['Enums']['emocion']; estudiante_id: string; fecha: string; id: string }
        Insert: { emocion: Database['public']['Enums']['emocion']; estudiante_id: string; fecha?: string; id?: string }
        Update: { emocion?: Database['public']['Enums']['emocion']; estudiante_id?: string; fecha?: string; id?: string }
        Relationships: [
          {
            foreignKeyName: 'registros_emocion_estudiante_id_fkey'
            columns: ['estudiante_id']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id']
          },
        ]
      }
      resultados_actividad: {
        Row: {
          actividad_id: string
          duracion_ms: number
          estrellas: number
          estudiante_id: string
          fecha: string
          id: string
          monedas: number
        }
        Insert: {
          actividad_id: string
          duracion_ms: number
          estrellas: number
          estudiante_id: string
          fecha?: string
          id?: string
          monedas?: number
        }
        Update: {
          actividad_id?: string
          duracion_ms?: number
          estrellas?: number
          estudiante_id?: string
          fecha?: string
          id?: string
          monedas?: number
        }
        Relationships: [
          {
            foreignKeyName: 'resultados_actividad_estudiante_id_fkey'
            columns: ['estudiante_id']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id']
          },
        ]
      }
      articulos_comprados: {
        Row: { articulo_id: string; comprado_en: string; estudiante_id: string }
        Insert: { articulo_id: string; comprado_en?: string; estudiante_id: string }
        Update: { articulo_id?: string; comprado_en?: string; estudiante_id?: string }
        Relationships: [
          {
            foreignKeyName: 'articulos_comprados_estudiante_id_fkey'
            columns: ['estudiante_id']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id']
          },
        ]
      }
      mensajes_sala: {
        Row: { enviado_en: string; estudiante_id: string; id: number; picto: string; sala_id: string }
        Insert: { enviado_en?: string; estudiante_id: string; id?: never; picto: string; sala_id: string }
        Update: { enviado_en?: string; estudiante_id?: string; id?: never; picto?: string; sala_id?: string }
        Relationships: [
          {
            foreignKeyName: 'mensajes_sala_estudiante_id_fkey'
            columns: ['estudiante_id']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensajes_sala_sala_id_fkey'
            columns: ['sala_id']
            isOneToOne: false
            referencedRelation: 'salas'
            referencedColumns: ['id']
          },
        ]
      }
      progreso_sala: {
        Row: {
          actualizado: string
          asignacion: string
          estudiante_id: string
          necesita_ayuda: boolean
          paso: number
          repeticiones: number
          sala_id: string
          ultimo_resultado: string | null
        }
        Insert: {
          actualizado?: string
          asignacion: string
          estudiante_id: string
          necesita_ayuda?: boolean
          paso?: number
          repeticiones?: number
          sala_id: string
          ultimo_resultado?: string | null
        }
        Update: {
          actualizado?: string
          asignacion?: string
          estudiante_id?: string
          necesita_ayuda?: boolean
          paso?: number
          repeticiones?: number
          sala_id?: string
          ultimo_resultado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'progreso_sala_estudiante_id_fkey'
            columns: ['estudiante_id']
            isOneToOne: true
            referencedRelation: 'estudiantes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progreso_sala_sala_id_fkey'
            columns: ['sala_id']
            isOneToOne: false
            referencedRelation: 'salas'
            referencedColumns: ['id']
          },
        ]
      }
      sesiones_alumno: {
        Row: { estudiante_id: string; iniciada_en: string; token_hash: string; visto_en: string }
        Insert: { estudiante_id: string; iniciada_en?: string; token_hash: string; visto_en?: string }
        Update: { estudiante_id?: string; iniciada_en?: string; token_hash?: string; visto_en?: string }
        Relationships: [
          {
            foreignKeyName: 'sesiones_alumno_estudiante_id_fkey'
            columns: ['estudiante_id']
            isOneToOne: true
            referencedRelation: 'estudiantes'
            referencedColumns: ['id']
          },
        ]
      }
      sala_miembros: {
        Row: { estudiante_id: string; sala_id: string; unido_en: string }
        Insert: { estudiante_id: string; sala_id: string; unido_en?: string }
        Update: { estudiante_id?: string; sala_id?: string; unido_en?: string }
        Relationships: [
          {
            foreignKeyName: 'sala_miembros_estudiante_id_fkey'
            columns: ['estudiante_id']
            isOneToOne: true
            referencedRelation: 'estudiantes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sala_miembros_sala_id_fkey'
            columns: ['sala_id']
            isOneToOne: false
            referencedRelation: 'salas'
            referencedColumns: ['id']
          },
        ]
      }
      salas: {
        Row: {
          asignacion: string
          contenidos: string[]
          creado_en: string
          curso_id: string
          id: string
          juegos: string[]
          nombre: string
          tipo: string
          actividad: string
          siguiente_sala: string | null
          canal_parque: string
        }
        Insert: {
          actividad?: string
          siguiente_sala?: string | null
          asignacion?: string
          contenidos?: string[]
          creado_en?: string
          curso_id: string
          id?: string
          juegos?: string[]
          nombre: string
          tipo?: string
        }
        Update: {
          actividad?: string
          siguiente_sala?: string | null
          asignacion?: string
          contenidos?: string[]
          creado_en?: string
          curso_id?: string
          id?: string
          juegos?: string[]
          nombre?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'salas_curso_id_fkey'
            columns: ['curso_id']
            isOneToOne: false
            referencedRelation: 'cursos'
            referencedColumns: ['id']
          },
        ]
      }
      rondas_resultado: {
        Row: { acertada: boolean; error: string | null; intentos: number; item: string; orden: number; resultado_id: string }
        Insert: { acertada: boolean; error?: string | null; intentos: number; item: string; orden: number; resultado_id: string }
        Update: { acertada?: boolean; error?: string | null; intentos?: number; item?: string; orden?: number; resultado_id?: string }
        Relationships: [
          {
            foreignKeyName: 'rondas_resultado_resultado_id_fkey'
            columns: ['resultado_id']
            isOneToOne: false
            referencedRelation: 'resultados_actividad'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      ultimas_emociones: {
        Row: { emocion: Database['public']['Enums']['emocion'] | null; estudiante_id: string | null; fecha: string | null }
        Relationships: [
          {
            foreignKeyName: 'registros_emocion_estudiante_id_fkey'
            columns: ['estudiante_id']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Functions: {
      alumno_actual: {
        Args: { p_estudiante: string; p_token: string }
        Returns: {
          activo: boolean
          ajustes: Json
          asignacion: string | null
          avatar: string
          color: string
          comprados: string[]
          contenidos: string[] | null
          curso_id: string
          id: string
          juegos: string[] | null
          monedas: number
          nivel_habilitado: number
          nombre: string
          paso: number
          personaje: Json | null
          repeticiones: number
          sala_id: string | null
          sala_nombre: string | null
          sala_actividad: string | null
          sala_tipo: string | null
          siguiente_sala: string | null
          siguiente_tipo: string | null
        }[]
      }
      pasar_sala_conectada: { Args: { p_estudiante: string; p_token: string }; Returns: undefined }
      comprar_articulo: { Args: { p_articulo: string; p_estudiante: string; p_token: string }; Returns: undefined }
      entrar_alumno: { Args: { p_estudiante: string }; Returns: string }
      enviar_mensaje: { Args: { p_estudiante: string; p_picto: string; p_token: string }; Returns: undefined }
      guardar_resultado_sala: {
        Args: {
          p_actividad_id: string
          p_duracion_ms: number
          p_estrellas: number
          p_estudiante_id: string
          p_fecha: string
          p_id: string
          p_monedas: number
          p_rondas: Json
          p_token: string
        }
        Returns: undefined
      }
      guardar_personaje: { Args: { p_estudiante: string; p_personaje: Json; p_token: string }; Returns: undefined }
      parque_alumno: {
        Args: { p_estudiante: string; p_token: string }
        Returns: { canal: string; color: string; ficha: string; mia: boolean; nombre: string; personaje: Json | null }[]
      }
      perfiles_alumnos: {
        Args: Record<PropertyKey, never>
        Returns: { color: string; id: string; nombre: string; ocupado: boolean; personaje: Json | null }[]
      }
      registrar_emocion_sala: {
        Args: { p_emocion: Database['public']['Enums']['emocion']; p_estudiante: string; p_token: string }
        Returns: undefined
      }
      registrar_progreso: {
        Args: {
          p_aprobado: boolean
          p_asignacion: string
          p_estudiante: string
          p_paso: number
          p_resultado: string
          p_token: string
        }
        Returns: { paso: number; repeticiones: number }[]
      }
      salir_alumno: { Args: { p_estudiante: string; p_token: string }; Returns: undefined }
      guardar_resultado: {
        Args: {
          p_actividad_id: string
          p_duracion_ms: number
          p_estrellas: number
          p_estudiante_id: string
          p_fecha: string
          p_id: string
          p_monedas: number
          p_rondas: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      emocion: 'alegria' | 'calma' | 'tristeza' | 'enojo'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
