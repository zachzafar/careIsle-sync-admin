import { initContract } from "@ts-rest/core"
import { z } from "zod"

const c = initContract()

// Auth DTOs
const LoginDto = z.object({
  email: z.string().email(),
  password: z.string(),
})

const RegisterAdminDto = z.object({
  email: z.string().email(),
  firstname: z.string(),
  lastname: z.string(),
  password: z.string(),
})

const AuthResponseDto = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    roles: z.array(z.string()),
  }),
  token: z.string(),
  refreshToken: z.string(),
})

const RefreshResponseDto = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    roles: z.array(z.string()),
  }),
  token: z.string(),
  refreshToken: z.string(),
})

// Facility DTOs
const ApiCredentialsDto = z.object({
  type: z.enum(["oauth2", "apikey", "basic"]),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  token_url: z.string().optional(),
  api_key: z.string().optional(),
})

const FacilityDto = z.object({
  id: z.string().optional(),
  name: z.string(),
  email_id: z.string().optional(),
  unique_id: z.string().optional(),
  ehr_type: z.string(),
  api_credentials: ApiCredentialsDto,
  auth: z
    .object({
      access_token: z.string().optional(),
      expires_at: z.string().optional(),
    })
    .optional(),
  facilities_to_sync: z.array(z.string()).optional(),
  webhook_secret: z.string().optional(),
})

// Patient DTOs
const PatientIdentifierDto = z.object({
  type: z.enum(["NATIONAL_ID", "PASSPORT", "SYSTEM_ID"]),
  value: z.string(),
})

const CreatePatientDto = z.object({
  patient_identifiers: z.array(PatientIdentifierDto),
  first_name: z.string(),
  last_name: z.string(),
  dob: z.string(),
  gender: z.string(),
  demographics: z.record(z.any()),
  email_id: z.string().optional(),
  synced_facilities: z.array(z.string()).optional(),
  origin_facility_id: z.string(),
  isDuplicate: z.boolean().optional(),
})

const PatientDto = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  dob: z.string(),
  gender: z.string(),
  origin_facility_id: z.string(),
  email_id: z.string().optional(),
  isDuplicate: z.boolean().optional(),
  synced_facilities: z.array(z.string()).optional(),
  patient_identifiers: z.array(PatientIdentifierDto),
  demographics: z.record(z.any()),
})

export const contract = c.router({
  auth: {
    login: {
      method: "POST",
      path: "/login",
      responses: {
        201: AuthResponseDto,
      },
      body: LoginDto,
      summary: "Login",
    },
    registerAdmin: {
      method: "POST",
      path: "/register-admin",
      responses: {
        201: z.object({ id: z.string() }),
      },
      body: RegisterAdminDto,
      summary: "Register Admin",
    },
    refresh: {
      method: "POST",
      path: "/refresh",
      responses: {
        200: RefreshResponseDto,
      },
      body: z.object({ refreshToken: z.string() }),
      summary: "Refresh Token",
    },
    verifyEmail: {
      method: "POST",
      path: "/verify-email/:token",
      pathParams: z.object({ token: z.string() }),
      responses: {
        201: z.object({ message: z.string() }),
      },
      body: z.object({}),
      summary: "Verify Email",
    },
  },
  facilities: {
    getAll: {
      method: "GET",
      path: "/facility",
      responses: {
        200: z.array(FacilityDto),
      },
      summary: "Get All Facilities",
    },
    getOne: {
      method: "GET",
      path: "/facility/:id",
      pathParams: z.object({ id: z.string() }),
      responses: {
        200: FacilityDto,
      },
      summary: "Get Facility",
    },
    create: {
      method: "POST",
      path: "/facility",
      responses: {
        201: FacilityDto,
      },
      body: FacilityDto,
      summary: "Create Facility",
    },
    update: {
      method: "POST",
      path: "/facility/:id",
      pathParams: z.object({ id: z.string() }),
      responses: {
        200: FacilityDto,
      },
      body: FacilityDto.partial(),
      summary: "Update Facility",
    },
    delete: {
      method: "DELETE",
      path: "/facility/:id",
      pathParams: z.object({ id: z.string() }),
      responses: {
        200: z.object({ message: z.string() }),
      },
      body: z.object({}),
      summary: "Delete Facility",
    },
  },
  patients: {
    getAll: {
      method: "GET",
      path: "/patients",
      responses: {
        200: z.array(PatientDto),
      },
      summary: "Get All Patients",
    },
    create: {
      method: "POST",
      path: "/patients",
      responses: {
        201: PatientDto,
      },
      body: CreatePatientDto,
      summary: "Create Patient",
    },
  },
})

export type AuthResponse = z.infer<typeof AuthResponseDto>
export type FacilityType = z.infer<typeof FacilityDto>
export type PatientType = z.infer<typeof PatientDto>
export type CreatePatientType = z.infer<typeof CreatePatientDto>
