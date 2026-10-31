// Falhas de regra de negócio. Os controllers decidem o status HTTP de cada classe.
export class ServiceError extends Error {}
/** O recurso não existe ou não pertence ao professor. */
export class NotFoundError extends ServiceError {}
/** A entrada é inválida. */
export class ValidationError extends ServiceError {}
/** As credenciais são inválidas ou estão ausentes. */
export class UnauthorizedError extends ServiceError {}
/** A operação não é permitida no estado atual do fluxo. */
export class ConflictError extends ServiceError {}
