// Generado desde Supabase (MCP generate_typescript_types). No editar a mano:
// regenerar después de cada migración.

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
      rondas_resultado: {
        Row: { acertada: boolean; intentos: number; item: string; orden: number; resultado_id: string }
        Insert: { acertada: boolean; intentos: number; item: string; orden: number; resultado_id: string }
        Update: { acertada?: boolean; intentos?: number; item?: string; orden?: number; resultado_id?: string }
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
      [_ in never]: never
    }
    Functions: {
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
