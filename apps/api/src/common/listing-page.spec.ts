import { parseListingPage, DEFAULT_PAGE_SIZE } from './listing-page';

describe('parseListingPage', () => {
  it('defaults to page 1 and size 20', () => {
    expect(parseListingPage()).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it('accepts a valid page and page size', () => {
    expect(parseListingPage('3', '50')).toEqual({ page: 3, pageSize: 50 });
  });

  it('rejects a non-positive page and an unknown size', () => {
    expect(parseListingPage('0', '7')).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });
});
