import { ZodTypeAny, z } from 'zod';

export type InferType<T> = T extends ZodTypeAny
  ? z.infer<T> extends { body: infer B }
    ? B
    : z.infer<T>
  : any;
