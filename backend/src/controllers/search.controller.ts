import { z } from 'zod';
import { controller } from '../http/controller';
import { empty, read } from '../http/schemas';
import { search } from '../services/search/search.service';

export const find = controller(read(empty, z.object({ q: z.string().max(200).default('') }).strict()), ({ query }, teacherId) => search(teacherId, query.q));
