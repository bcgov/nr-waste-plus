import type { ForestClientDto } from '@/services/types';

/**
 * Matches a forest client against a free-text keyword across multiple display fields.
 *
 * @param client The client to test.
 * @param keyword The search keyword.
 * @returns True when any searchable field contains the keyword.
 */
export const filterClientByKeyword = (client: ForestClientDto, keyword: string): boolean => {
  return [
    client.acronym,
    client.clientName,
    client.clientNumber,
    client.legalFirstName,
    client.legalMiddleName,
    client.name,
  ]
    .filter((field): field is string => Boolean(field))
    .some((field) => field.trim().toLowerCase().includes(keyword.toLowerCase()));
};
