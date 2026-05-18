import { ReceivedWSPayload } from 'shared/db-types';

export interface ReceivedWSPaginatedPayload {
  items: ReceivedWSPayload;
  page: number;
  pages: number;
  size: number;
  total: number;
}
