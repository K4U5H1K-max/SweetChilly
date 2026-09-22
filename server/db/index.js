/**
 * Project Brahmaputra — Database Module Entrypoint
 */

export { getPool, isDatabaseConfigured, testConnection, query, closePool, sanitizeDbString } from './db.js';
export { initializeDatabase, INITIAL_NER_VEHICLES, CREATE_VEHICLES_TABLE_SQL, INITIAL_NER_DEPLOYMENTS, CREATE_DEPLOYMENTS_TABLE_SQL, CREATE_USERS_TABLE_SQL, INITIAL_NER_ADMIN } from './schema.js';
export { vehicleRepository, VehicleRepository } from './vehicleRepository.js';
export { deploymentRepository, DeploymentRepository, VALID_DEPLOYMENT_STATUSES, ACTIVE_DEPLOYMENT_STATUSES } from './deploymentRepository.js';
export { userRepository, UserRepository } from './userRepository.js';
