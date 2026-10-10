// The database's tables and functions as TypeScript types, generated from
// supabase/migrations on a throwaway local stack. Do not edit by hand. After
// a new migration, regenerate it (CLAUDE.md, "Things to know": generating
// the database types). It knows nothing of column grants or row-level
// security; the e2e fake checks those.


export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "chefs": {
                  Row: {
                    "created_at": string,"extras": (string)[],"facial_hair": number,"glasses": number,"hair": number,"hair_style": number,"name": string,"skin": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"extras"?: (string)[],"facial_hair"?: number,"glasses"?: number,"hair"?: number,"hair_style"?: number,"name": string,"skin"?: number,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"extras"?: (string)[],"facial_hair"?: number,"glasses"?: number,"hair"?: number,"hair_style"?: number,"name"?: string,"skin"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cook_logs": {
                  Row: {
                    "cooked_on": string,"created_at": string,"id": string,"notes": string,"rating": number,"recipe_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cooked_on": string,"created_at"?: string,"id"?: string,"notes"?: string,"rating": number,"recipe_id": string,"user_id"?: string
                  }
                  Update: {
                    "cooked_on"?: string,"created_at"?: string,"id"?: string,"notes"?: string,"rating"?: number,"recipe_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"grocery_checks": {
                  Row: {
                    "ingredient_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ingredient_id": string,"user_id"?: string
                  }
                  Update: {
                    "ingredient_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"kit_items": {
                  Row: {
                    "equipment_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "equipment_id": string,"user_id"?: string
                  }
                  Update: {
                    "equipment_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pantry_items": {
                  Row: {
                    "ingredient_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ingredient_id": string,"user_id"?: string
                  }
                  Update: {
                    "ingredient_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"plan_items": {
                  Row: {
                    "added_at": string,"recipe_id": string,"shopped": boolean,"shopped_on": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"recipe_id": string,"shopped"?: boolean,"shopped_on"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "added_at"?: string,"recipe_id"?: string,"shopped"?: boolean,"shopped_on"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"price_overrides": {
                  Row: {
                    "ingredient_id": string,"price_cents": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ingredient_id": string,"price_cents": number,"user_id"?: string
                  }
                  Update: {
                    "ingredient_id"?: string,"price_cents"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "finish_shopping":
{ Args: { "bought_kit"?: (string)[],"bought_on"?: string,"bought_staples": (string)[],"seen_checks"?: (string)[],"shopped_recipes": (string)[] }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
