
import Fuse from 'fuse.js';

export class FuzzySearch {
  private fuse: Fuse<any>;

  constructor(data: any[], headers: string[]) {
    // Create search keys for all headers
    const keys = headers.map(header => header);
    
    const options = {
      keys,
      threshold: 0.4, // Lower = more strict, higher = more fuzzy
      distance: 100,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 1,
      shouldSort: true,
      findAllMatches: true
    };

    this.fuse = new Fuse(data, options);
    console.log('Fuzzy search initialized with keys:', keys);
  }

  search(query: string): any[] {
    if (!query.trim()) {
      return [];
    }

    const results = this.fuse.search(query);
    console.log(`Fuzzy search for "${query}" returned ${results.length} results`);
    
    // Return the original items, sorted by relevance score
    return results.map(result => result.item);
  }

  // Advanced search with multiple terms
  searchMultiple(queries: string[]): any[] {
    const allResults = new Map();
    
    queries.forEach(query => {
      const results = this.search(query);
      results.forEach(item => {
        const key = JSON.stringify(item);
        if (!allResults.has(key)) {
          allResults.set(key, item);
        }
      });
    });
    
    return Array.from(allResults.values());
  }
}
