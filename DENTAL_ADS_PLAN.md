# Add Dental Ads Feature

This plan outlines the steps required to add a new `DentalAd` feature to the backend. The feature will allow administrators to manage dental advertisements within the `subscription` module.

## Proposed Changes

### Prisma Schema
- Add a new `DentalAd` model with auditing fields.

#### [MODIFY] prisma/schema.prisma
```prisma
model DentalAd {
  id         Int       @id @default(autoincrement())
  name       String
  category   String
  image_path String
  created_at DateTime  @default(now())
  created_by Int?
  updated_at DateTime  @updatedAt
  updated_by Int?
  deleted_at DateTime?
  deleted_by Int?

  @@map("dental_ads")
}
```

---

### Admin (Subscription) Module
Provides CRUD operations for administrators.

#### [NEW] src/subscription/repositories/dental-ad.repository.ts
- Implement `create`, `findAll`, `findById`, `update`, and `delete` methods using Prisma.

#### [NEW] src/subscription/services/dental-ad.service.ts
- Implement business logic using `DentalAdRepository`.

#### [NEW] src/subscription/controllers/dental-ad.controller.ts
- Express controller handling HTTP requests and responses.

#### [NEW] src/subscription/routes/dental-ad.routes.ts
- Define `POST /`, `GET /`, `GET /:id`, `PUT /:id`, and `DELETE /:id` routes. Ensure routes require authentication.

#### [MODIFY] src/subscription/routes/index.ts
- Mount the new router at `/dental-ads`.

---

### Dependency Injection Container
Update the container to lazy-load the new components.

#### [MODIFY] src/shared/container/repositories.container.ts
- Register `DentalAdRepository`.

#### [MODIFY] src/shared/container/services.container.ts
- Register `DentalAdService`.

#### [MODIFY] src/shared/container/controllers.container.ts
- Register `DentalAdController`.

#### [MODIFY] src/index.ts
- Update router instantiation to accept the new controller.

## Verification Plan

### Automated/Manual Testing
1. Run `npx prisma format` and `npx prisma db push` (or create a migration) to update the database schema.
2. Ensure the backend compiles successfully with `npm run build`.
3. Verify via REST client (like Postman or cURL) that `POST /api/v1/subscription/dental-ads` successfully creates a new ad and `GET /api/v1/subscription/dental-ads` returns the created ad.
