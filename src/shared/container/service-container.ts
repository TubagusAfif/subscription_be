import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';
import { RepositoriesContainer } from './repositories.container';
import { ServicesContainer } from './services.container';
import { ControllersContainer } from './controllers.container';

/**
 * ServiceContainer — Root Singleton (Composition Root)
 *
 * This is the single entry point for the entire DI system. It uses the classic
 * Singleton pattern (private constructor + static getInstance()) to guarantee
 * exactly one instance exists across the application lifetime.
 *
 * Layer wiring order:
 *   PrismaClient → RepositoriesContainer → ServicesContainer → ControllersContainer
 *
 * Adapted for monolithic architecture — uses a flat 3-layer approach
 * (Repositories → Services → Controllers) instead of DDD's separated
 * Domain Services and Application Services layers.
 */
class ServiceContainer {
  private static instance: ServiceContainer;

  private _prisma: PrismaClient;
  private _repositories: RepositoriesContainer;
  private _services: ServicesContainer;
  private _controllers: ControllersContainer;

  // Private constructor — cannot be instantiated externally
  private constructor() {
    // 1. Prisma initialization
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
    this._prisma = new PrismaClient({ adapter });

    // 2. Layer 1 — Repositories (receives Prisma)
    this._repositories = new RepositoriesContainer(this._prisma);

    // 3. Layer 2 — Services (receives Repositories)
    this._services = new ServicesContainer(this._repositories);

    // 4. Layer 3 — Controllers (receives Services + Prisma for transactional ops)
    this._controllers = new ControllersContainer(this._services, this._prisma);
  }

  /**
   * Single entry point — creates instance on first call, reuses thereafter.
   */
  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /** The shared PrismaClient instance */
  get prisma(): PrismaClient {
    return this._prisma;
  }

  /** Layer 1: Data-access repositories */
  get repositories(): RepositoriesContainer {
    return this._repositories;
  }

  /** Layer 2: Business-logic services */
  get services(): ServicesContainer {
    return this._services;
  }

  /** Layer 3: Request-handling controllers */
  get controllers(): ControllersContainer {
    return this._controllers;
  }

  /**
   * Teardown — cascades through all layers, clearing cached instances.
   * Useful for test isolation between test suites.
   */
  reset(): void {
    this._repositories.reset();
    this._services.reset();
    this._controllers.reset();
  }
}

// Pre-resolved singleton exported for convenience
export const container = ServiceContainer.getInstance();

// Re-export container class for typing purposes
export { ServiceContainer };
