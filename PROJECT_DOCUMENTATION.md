# Burgeri Ops — Project and Functionality Documentation

## 1. Project overview

Burgeri Ops is a full-stack operations system for recording and reviewing product write-offs in Burgeri restaurants.

The system connects two clients:

- A separate `burgeri-mobile` application used by restaurant employees to photograph and submit write-offs.
- This web application, used by reviewers and administrators to inspect requests, approve or reject them, export history, manage reference data, and send approved acts to iiko.

This repository also provides the shared backend for both clients: authentication, the Cloudflare D1 database, mobile REST endpoints, photo uploads, authorization, and the iiko adapter.

### Main workflow

1. An employee signs in to the mobile app with an employee ID and password.
2. The mobile app loads products, locations, employees, and write-off categories.
3. The employee uploads an evidence photo.
4. The employee submits a request with the product, quantity, location, reason, comment, and optional employee deduction.
5. A reviewer sees the request in the web queue and approves or rejects it.
6. Approval automatically creates and “sends” an iiko write-off act.
7. The request remains available in history, analytics, and CSV exports.

> The current iiko integration is a mock adapter. It produces a realistic payload and synthetic document ID but does not contact a live iiko installation.

## 2. User roles and access

| Role | Capabilities |
| --- | --- |
| `employee` | Sign in to the mobile app, read catalogs, upload photos, create requests, and read their own requests. |
| `reviewer` | All reviewer web functionality: queue, request details, decisions, iiko synchronization, history, CSV export, and analytics. |
| `admin` | All reviewer functionality plus staff, credentials, roles, locations, product categories, and products administration. |

New authenticated users receive an `employee` profile by default. Web self-registration is disabled. Administrators create employee credentials and promote users to reviewer or administrator.

Authorization is enforced on the server:

- `requireUser()` redirects guests to `/sign-in`.
- `requireReviewer()` accepts `reviewer` and `admin`.
- `requireAdmin()` accepts only `admin`.
- Mobile endpoints validate the Better Auth session cookie before doing any work.

## 3. Web application functionality

### `/`

The landing route checks the current viewer:

- Reviewers and administrators are directed toward the review workspace.
- Employees see a notice explaining that write-offs are submitted through the mobile application.
- Guests can sign in.

### `/sign-in`

Provides web authentication through Better Auth:

- Email and password sign-in for reviewers and administrators.
- Safe redirect back to the originally requested internal page.
- Session-aware redirect when the user is already signed in.
- Human-readable authentication error messages.

### `/account`

Displays the signed-in user’s profile, including name, email, role, and account identity. It also provides sign-out controls.

### `/review/write-offs`

The main reviewer queue provides:

- Summary cards for request counts.
- Text search.
- Status and restaurant/location filters.
- Sortable table columns.
- Evidence-photo thumbnails.
- Request number, product, quantity, submitter, location, status, and creation time.
- One-click approval and rejection.
- A review comment/rejection reason.
- Links to the complete request detail.
- A per-location check-in/filtering workflow.

A request can only transition from `pending` once. Concurrent or repeated decisions return a stale-request error instead of overwriting the first review.

### `/review/write-offs/$id`

The request detail page provides:

- Large evidence photo.
- Request number and current status.
- Product, SKU/category, quantity, and unit.
- Restaurant/location.
- Submitter.
- Write-off category and employee-deduction information.
- Employee comment.
- Reviewer identity, review comment, and review time.
- Approval/rejection controls while pending.
- iiko act preview after approval.
- iiko synchronization state, generated document ID, and retry control after failure.

### `/review/history`

Provides a filterable audit/history view across all requests:

- Search and status filters.
- Location, product, category, and date-related request information.
- Reviewer and decision data.
- iiko synchronization state.
- CSV download for accounting or offline analysis.
- CSV escaping for commas, quotes, and line breaks.

### `/review/analytics`

Calculates analytics from the current request collection:

- Total, pending, approved, and rejected counts.
- Requests grouped by restaurant.
- Requests grouped by product.
- Requests grouped by write-off category.
- Employee-deduction versus no-deduction totals.
- iiko states: not started, queued, synchronized, and failed.
- Eight employees most frequently charged for write-offs.
- Daily request totals for the most recent 14 days.

### `/admin`

Staff administration includes:

- Staff directory with name, email, employee ID, role, account age, and login availability.
- Creation of employee accounts.
- Assignment of a default point of sale.
- Role changes between employee, reviewer, and administrator.
- Creation or replacement of employee passwords.
- Protection preventing an administrator from removing their own admin role.

### `/admin/catalog`

Catalog administration includes:

- Create and edit points of sale.
- Store address and active/inactive state.
- Create and edit product categories.
- Configure category display position.
- Create and edit products.
- Assign products to categories.
- Configure product name, SKU, unit, and active/inactive state.

Inactive products and points of sale remain in administration/history but are excluded from mobile selection lists.

### Other routes

- `/privacy` — privacy information.
- `/terms` — terms of use.
- `/api/auth/*` — Better Auth request handler.

## 4. Mobile REST API

Every `/api/mobile/*` endpoint requires a valid Better Auth session cookie.

| Method and path | Functionality |
| --- | --- |
| `GET /api/mobile/me` | Returns employee identity, role, advertised permissions, and issue time. |
| `GET /api/mobile/catalog/product-categories` | Returns ordered product categories. |
| `GET /api/mobile/catalog/products` | Returns active products with category, SKU, and unit. |
| `GET /api/mobile/catalog/points-of-sale` | Returns active restaurant locations and addresses. |
| `GET /api/mobile/catalog/write-off-categories` | Returns ordered write-off reasons/categories. |
| `GET /api/mobile/catalog/employees` | Returns employees eligible for an employee deduction. |
| `POST /api/mobile/files/write-off-photo` | Accepts multipart field `file`, uploads it to Google Drive, and returns `photoFileId`, `photoUrl`, and `photoUri`. Maximum size: 8 MB. |
| `POST /api/mobile/write-off-requests` | Validates and creates a write-off request. |
| `GET /api/mobile/write-off-requests/mine` | Returns the signed-in employee’s requests, newest first. |
| `GET /api/mobile/write-off-requests/:id` | Returns one request only if it belongs to the signed-in employee. |

The permissions returned by `/api/mobile/me` are:

- `writeoff.catalog.read`
- `writeoff.photo.upload`
- `writeoff.request.create`
- `writeoff.request.read.own`

### Write-off submission fields

| Field | Rule |
| --- | --- |
| `photoFileId` | Required. Obtained from the photo-upload endpoint. |
| `productId` | Required and must identify an active product. |
| `quantity` | Positive number, maximum `100000`. |
| `pointOfSaleId` | Required and must identify an active point of sale. |
| `deductionMode` | `none` or `employee`. |
| `deductionEmployeeId` | Required when `deductionMode` is `employee`. |
| `writeOffCategoryId` | Required and must exist. |
| `comment` | Trimmed text from 10 to 1000 characters. |

The backend generates request numbers in the form `WR-00001`.

### Mobile error behavior

- `400` — invalid input, missing file, unavailable catalog item, or oversized photo.
- `401` — missing/expired session or missing account.
- `404` — the employee’s requested write-off does not exist.
- `500` — unexpected backend or integration failure.

Errors use JSON: `{ "message": "..." }`.

## 5. Business rules and state

### Request status

| Status | Meaning |
| --- | --- |
| `pending` | Waiting for reviewer action. |
| `approved` | Accepted by a reviewer. |
| `rejected` | Rejected by a reviewer. |

Only a pending request can be reviewed. Rejection requires a review comment of at least three characters. Any review comment is limited to 1000 characters.

### Employee deduction

- `none` — no employee is charged.
- `employee` — a valid employee must be selected and stored on the request.

### iiko synchronization

| Status | Meaning |
| --- | --- |
| `not_started` | No synchronization is needed or has begun. |
| `queued` | Approval has queued the act. |
| `synced` | The adapter returned a document ID. |
| `failed` | The adapter threw an error; the reviewer may retry. |

Approving a request immediately calls the synchronization action. Rejected requests return to `not_started`. Only approved, not-yet-synchronized requests may be sent.

The generated iiko act contains:

- `WriteoffDocument` type.
- Request ID as external ID.
- Request number as document number.
- Review timestamp.
- Store ID and name.
- Comment.
- One item with product ID, SKU/article, name, quantity, and unit.
- Initial iiko status `NEW`.

## 6. Database model

The application uses Cloudflare D1 (SQLite) through Drizzle ORM.

### Domain tables

| Table | Purpose |
| --- | --- |
| `staff_profile` | One-to-one extension of the auth user with role and default point of sale. |
| `point_of_sale` | Restaurant/location name, address, and active state. |
| `product_category` | Product grouping and display position. |
| `product` | Category, name, SKU, unit, and active state. |
| `write_off_category` | Ordered list of write-off reasons. |
| `write_off_request` | Complete submitted request, review decision, evidence references, deduction details, and iiko state. |

Better Auth also owns `user`, `session`, `account`, and `verification` tables.

Important database behavior:

- IDs are UUIDs.
- Request numbers are unique.
- Catalog references use restrictive deletion so historical requests cannot lose required entities.
- Deleting a charged employee or reviewer sets that optional reference to `null`.
- Deleting a submitter is restricted.
- Staff profiles are deleted with their auth user.
- Requests are indexed by submitter, point of sale, status, and creation date.

## 7. Authentication

Better Auth is configured with:

- Drizzle/D1 storage.
- Email/password authentication for the web.
- Username/password authentication for mobile employee IDs.
- Expo integration for mobile cookie handling.
- Disabled public sign-up.
- Trusted `burgeri://` custom-scheme origins.
- Employee IDs limited to 2–40 letters, digits, hyphens, or underscores.
- Memoized auth initialization per Cloudflare Worker isolate.

## 8. Photo storage

Photo storage spans three components:

1. The mobile client sends multipart data to the Cloudflare endpoint.
2. The Worker authenticates the employee, enforces the 8 MB limit, converts the data to Base64, and forwards it with a shared secret.
3. `gas.gs`, deployed as a Google Apps Script Web App, writes the file to a configured Google Drive folder and enables “anyone with link” viewing.

Reviewer images use the Google Drive thumbnail URL:

`https://drive.google.com/thumbnail?id=<file-id>&sz=w2000`

Required Worker secrets are `GAS_URL` and `GAS_SECRET`. Google Apps Script requires `GAS_SECRET` and optionally `GAS_PHOTO_FOLDER_ID`.

## 9. Important source functions

### Database queries — `src/db/queries.ts`

| Function | Responsibility |
| --- | --- |
| `getStaffProfile` | Fetches a profile for one auth user. |
| `ensureStaffProfile` | Creates a default employee profile when missing. |
| `setStaffRole` | Inserts or updates a user’s role. |
| `listProductCategories` | Lists categories by position and name. |
| `listProducts` | Lists active products alphabetically. |
| `listPointsOfSale` | Lists active locations alphabetically. |
| `listWriteOffCategories` | Lists reasons by position and name. |
| `listEmployees` | Lists users whose profile role is employee. |

### Reviewer/admin service — `src/lib/write-offs.server.ts`

| Function | Responsibility |
| --- | --- |
| `getWriteOffReviewData` | Authorizes a reviewer and loads the review queue. |
| `getWriteOffHistoryData` | Authorizes a reviewer and loads history. |
| `getWriteOffDetailData` | Loads one request and builds an iiko preview when approved. |
| `getWriteOffAnalyticsData` | Produces status, grouping, deduction, iiko, employee, and 14-day metrics. |
| `getCatalogAdminData` | Loads complete active and inactive catalog data for administrators. |
| `getStaffDirectoryData` | Combines users, roles, credentials, and locations for staff administration. |
| `reviewWriteOffRequestAction` | Atomically reviews a pending request and triggers iiko after approval. |
| `syncWriteOffToIikoAction` | Validates eligibility, invokes the adapter, and records success/failure. |
| `setStaffRoleAction` | Changes a role while protecting the current administrator. |
| `createEmployeeAction` | Creates user, credential account, and employee profile records. |
| `upsertPointOfSaleAction` | Creates or updates a location. |
| `upsertProductCategoryAction` | Creates or updates a product category. |
| `upsertProductAction` | Validates the category and creates or updates a product. |
| `setEmployeePasswordAction` | Creates or replaces a credential password hash. |
| `hashPassword` | Uses Better Auth’s configured password hasher. |
| `loadRequests` | Loads requests and joins catalog/user display data. |
| `groupCount` | Builds sorted grouped counts for analytics. |
| `startOfDay` | Normalizes a date for daily trend calculation. |

### Mobile service — `src/lib/mobile.server.ts`

| Function/class | Responsibility |
| --- | --- |
| `MobileApiError` | Carries a public error message and HTTP status. |
| `jsonResponse` | Creates JSON HTTP responses. |
| `mobileErrorResponse` | Converts known errors to JSON and hides unexpected details. |
| `requireMobileContext` | Authenticates the request and loads employee identity/role. |
| `buildMobileSession` | Builds the `/me` response and permissions. |
| `getMobileProductCategories` | Maps categories to the mobile shape. |
| `getMobileProducts` | Maps active products to the mobile shape. |
| `getMobilePointsOfSale` | Maps active locations to the mobile shape. |
| `getMobileWriteOffCategories` | Maps write-off reasons to the mobile shape. |
| `getMobileEmployees` | Maps employees to the mobile shape. |
| `toMobileRequest` | Converts a database request to the mobile API model. |
| `listMyWriteOffs` | Lists only the current employee’s requests. |
| `getMyWriteOff` | Fetches one request with ownership enforcement. |
| `generateRequestNumber` | Produces the next `WR-xxxxx` number from the current count. |
| `submitWriteOff` | Validates referenced records, creates the request, and returns it. |

### Authentication/authorization

| Function | Responsibility |
| --- | --- |
| `getAuth` | Returns the cached Better Auth instance. |
| `getSession` | Reads a session from request headers, returning `null` on failure. |
| `ensureSession` | Requires a session or throws. |
| `getCurrentUserContext` | Combines session and staff profile. |
| `requireUser` | Requires login and redirects otherwise. |
| `requireReviewer` | Requires reviewer/admin access. |
| `requireAdmin` | Requires administrator access. |
| `getViewerState` | Returns compact role flags for layouts/navigation. |

### Integrations and shared helpers

| Function | Responsibility |
| --- | --- |
| `drivePhotoUrl` | Builds a display URL for a Google Drive file ID. |
| `uploadPhotoToDrive` | Sends Base64 photo data to Google Apps Script. |
| `buildIikoWriteOffAct` | Maps an approved request into an iiko-shaped act. |
| `createIikoWriteOffDocument` | Mock-sends the act and generates a document ID. |
| `actionOk` / `actionError` | Standardizes server-action results. |
| `getZodFieldErrors` | Converts Zod issues into form field error arrays. |
| `formatQuantity` | Formats whole/fractional quantity and optional unit. |
| `cn` | Combines conditional Tailwind class names. |
| `getDb` / `getServerDb` | Create/access the typed Drizzle D1 client. |

### Google Apps Script — `gas.gs`

| Function | Responsibility |
| --- | --- |
| `getConfig_` | Reads the shared secret and Drive folder ID. |
| `doPost` | Authenticates and dispatches upload actions. |
| `doGet` | Returns a service health response. |
| `handleUploadPhoto_` | Decodes, stores, shares, and describes a Drive photo. |
| `jsonResponse_` | Formats Apps Script JSON responses. |

## 10. Technology and architecture

- React 19 and TypeScript.
- TanStack Start and file-based TanStack Router.
- Server functions for typed web mutations.
- Tailwind CSS 4 and reusable local UI primitives.
- Better Auth with email/password, username, and Expo plugins.
- Drizzle ORM.
- Cloudflare Workers runtime and D1 database.
- Google Apps Script and Google Drive for photo storage.
- Zod for input validation.

The high-level request flow is:

`React/mobile client → TanStack route/server function → authorization + Zod → service layer → Drizzle/D1 or external adapter`

## 11. Configuration

Runtime configuration:

| Variable/binding | Purpose |
| --- | --- |
| `burgeri_db` | Cloudflare D1 binding. |
| `BETTER_AUTH_SECRET` | Session/authentication signing secret. |
| `BETTER_AUTH_URL` | Public application base URL. |
| `GAS_URL` | Deployed Apps Script Web App URL. |
| `GAS_SECRET` | Shared Worker-to-Apps-Script secret. |

CLI/administration variables:

| Variable | Purpose |
| --- | --- |
| `SEED_STAFF_PASSWORD` | Overrides the default seeded password. |
| `D1_DATABASE_NAME` | Optional database-name override for remote seeding. |
| `CLOUDFLARE_ACCOUNT_ID` | Remote Drizzle Studio access. |
| `CLOUDFLARE_DATABASE_ID` | Remote Drizzle Studio access. |
| `DRIZZLE_API_TOKEN` | Remote Drizzle Studio access token. |

Use `.dev.vars` for the local Worker runtime and `.env` for Node-based scripts.

## 12. Development commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start local development on port 3000. |
| `pnpm build` | Create a production build. |
| `pnpm preview` | Preview the production build. |
| `pnpm deploy` | Build and deploy with Wrangler. |
| `pnpm db:generate` | Generate a migration after schema changes. |
| `pnpm db:migrate:local` | Apply migrations to local D1. |
| `pnpm db:migrate:remote` | Apply migrations to remote D1. |
| `pnpm db:seed:local` | Seed local D1. |
| `pnpm db:seed:remote` | Seed remote D1. |
| `pnpm db:studio:local` | Open local Drizzle Studio. |
| `pnpm db:studio:remote` | Open remote Drizzle Studio. |
| `pnpm typecheck` | Run TypeScript without emitting files. |
| `pnpm lint` | Run ESLint. |
| `pnpm check` | Check Prettier formatting. |
| `pnpm format` | Format source files. |

## 13. Seed data

The seed process creates staff, password credentials, catalog records, and sample write-off requests.

| Account | Role |
| --- | --- |
| `admin@burgeri.kz` | Administrator |
| `reviewer@burgeri.kz` | Reviewer |
| `manager@burgeri.kz` | Reviewer |

Mobile employees use employee IDs such as `EMP-1001`. The default demo password is `Burgeri123!`, unless overridden through `SEED_STAFF_PASSWORD`.

## 14. Current limitations and implementation notes

- iiko synchronization is mocked and must be replaced with authenticated iiko Server API calls for production.
- Photo links are publicly viewable by anyone who has the Drive link.
- Request-number generation is based on row count; concurrent submissions could attempt the same number. The database unique constraint prevents duplicates, but production code should use a sequence or retry strategy.
- Analytics are computed in application memory from all loaded requests, which is suitable for the current dataset but should move to database aggregations at scale.
- The repository does not currently expose automated test scripts in `package.json`.
- `src/routeTree.gen.ts` is generated by TanStack Router and should not be edited manually.
