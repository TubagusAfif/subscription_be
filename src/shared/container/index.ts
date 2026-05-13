/**
 * Container Module — Barrel Export
 *
 * Re-exports the singleton container and all sub-container types.
 * Consumers import from this module:
 *
 *   import { container } from './shared/container';
 *   // Access via: container.services.taxService, container.controllers.taxController, etc.
 */
export { container, ServiceContainer } from './service-container';
export { RepositoriesContainer } from './repositories.container';
export { ServicesContainer } from './services.container';
export { ControllersContainer } from './controllers.container';
