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
  api_keys: z
    .array(
      z.object({
        name: z.string(),
        key: z.string(),
      }),
    )
    .optional(),
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

const PaginationMetaDto = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  totalPages: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
  sort: z.enum(["createdAt", "updatedAt", "first_name", "last_name", "dob", "system_id"]),
  order: z.enum(["asc", "desc"]),
})

// Top-level zod DTO additions
const BulkUploadFromFacilityDto = z.object({
  facility_id: z.string(),
})

const MergeInfoDto = z.object({
  primary_patient_id: z.string(),
  secondary_patient_ids: z.string(),
})

const MergePatientsDto = z.object({
  merge_info: z.array(MergeInfoDto),
})

// API responses
const BulkUploadResponseDto = z.object({
  message: z.string(),
  facilityId: z.string(),
  status: z.enum(["processing"]),
  startedAt: z.string(), // ISODateString
})

// Duplicates return a record keyed by syncable primary patient id, value is array of potential duplicate patients.
// We reuse PatientDto.partial() to keep it flexible and avoid mismatches if backend adds fields.
const DuplicatesResponseDto = z.record(z.array(PatientDto.partial()))

const UpdateCanSyncDto = z.object({
  facility_id: z.string(),
  can_sync: z.boolean(),
})

const UpdateCanSyncResponseDto = z.object({
  facility_id: z.string(),
  can_sync: z.boolean(),
  message: z.string().optional(),
})

export const contract = c.router({
  ehr: {
    bulkUploadFromFacility: {
      method: "POST",
      path: "/ehr/bulk-upload-from-facility",
      body: BulkUploadFromFacilityDto,
      responses: {
        201: BulkUploadResponseDto,
      },
      summary: "Start bulk upload for a facility",
    },
    merge: {
      method: "POST",
      path: "/ehr/merge",
      body: MergePatientsDto,
      responses: {
        // Backend returns a merge log; we model success/failed arrays using the MergeInfo shape for visibility.
        201: z.object({
          successful: z.array(MergeInfoDto),
          failed: z.array(MergeInfoDto),
        }),
      },
      summary: "Merge duplicate patients",
    },
    getDuplicates: {
      method: "GET",
      path: "/ehr/duplicates/:facility_id",
      pathParams: z.object({ facility_id: z.string() }),
      responses: {
        200: DuplicatesResponseDto,
      },
      summary: "Get duplicate groups for a facility",
    },
    updateCanSync: {
      method: "PUT",
      path: "/ehr/update-can-sync",
      body: UpdateCanSyncDto,
      responses: {
        200: UpdateCanSyncResponseDto,
        // Backend may throw validation errors if duplicates exist; ts-rest will surface non-2xx statuses.
      },
      summary: "Update facility can_sync flag",
    },
  },
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
      // Accept pagination/sorting query params
      query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        sort: z.enum(["createdAt", "updatedAt", "first_name", "last_name", "dob", "system_id"]).default("createdAt"),
        order: z.enum(["asc", "desc"]).default("desc"),
      }),
      responses: {
        // Return data + meta per new contract
        200: z.object({
          data: z.array(PatientDto),
          meta: PaginationMetaDto,
        }),
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
  keys: {
    create: {
      method: "POST",
      path: "/keys",
      body: z.object({
        facilityUniqueId: z.string(),
        name: z.string().optional(),
      }),
      responses: {
        201: z.object({
          _id: z.string(),
          key: z.string(),
          name: z.string(),
          facility_unique_id: z.string(),
          active: z.boolean(),
          createdAt: z.string(),
          updatedAt: z.string(),
        }),
      },
      summary: "Create API Key",
    },
    delete: {
      method: "DELETE",
      path: "/keys/:id",
      pathParams: z.object({ id: z.string() }),
      query: z.object({
        facilityUniqueId: z.string(),
      }),
      responses: {
        200: z.object({ deleted: z.boolean() }),
        404: z.object({ message: z.string() }).optional(),
      },
      body: z.object({}), // allow passing an empty body to match usage
      summary: "Delete API Key",
    },
  },
})

export type AuthResponse = z.infer<typeof AuthResponseDto>
export type FacilityType = z.infer<typeof FacilityDto>
export type PatientType = z.infer<typeof PatientDto>
export type CreatePatientType = z.infer<typeof CreatePatientDto>
// Add exported types for new DTOs
export type BulkUploadFromFacilityDtoType = z.infer<typeof BulkUploadFromFacilityDto>
export type MergePatientsDtoType = z.infer<typeof MergePatientsDto>
export type ApiKey = {
  _id: string
  key: string
  name: string
  facility_unique_id: string
  active: boolean
  createdAt: string
  updatedAt: string
}

