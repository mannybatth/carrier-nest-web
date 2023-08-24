import { fuzzySearch } from '../../../lib/helpers/levenshtein';

describe('FuzzySearch', () => {
    it('should not find match with Transplace', () => {
        const customers = [
            'Pepsi Logistics Company, Inc.',
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
            'Blue Grace',
        ];
        const query = 'Transplace';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(-1);
    });

    it('should find match with Pepsi', () => {
        const customers = [
            'Pepsi Logistics Company, Inc.',
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
            'Blue Grace',
        ];
        const query = 'Pepsi';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(0);
    });

    it('should find match with Pepsi Logistics Company, Inc.', () => {
        const customers = [
            'Pepsi Logistics Company, Inc.',
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
            'Blue Grace',
        ];
        const query = 'Pepsi Logistics Company, Inc.';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(0);
    });

    it('should find match with Pepsi Logistics Company, Inc. (case insensitive)', () => {
        const customers = [
            'Pepsi Logistics Company, Inc.',
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
            'Blue Grace',
        ];
        const query = 'pepsi logistics company, inc.';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(0);
    });

    it('should find match with Pepsi Logistics Company, Inc. (case insensitive and with extra spaces)', () => {
        const customers = [
            'Pepsi Logistics Company, Inc.',
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
            'Blue Grace',
        ];
        const query = 'pepsi logistics company, inc. ';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(0);
    });

    it('should find match with Pepsi Logistics Company, Inc. (case insensitive and with extra spaces and extra characters)', () => {
        const customers = [
            'Pepsi Logistics Company, Inc.',
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
            'Blue Grace',
        ];
        const query = 'pepsi logistics company, inc.!';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(0);
    });

    it('should find match with Pepsi Logistics Company, Inc. (case insensitive and with extra spaces and extra characters and extra words)', () => {
        const customers = [
            'Pepsi Logistics Company, Inc.',
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
            'Blue Grace',
        ];
        const query = 'pepsi logistics company, inc.! hello world';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(0);
    });

    it('should find match with JB Hunt', () => {
        const customers = [
            'Pepsi Logistics Company, Inc.',
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
            'Blue Grace',
        ];
        const query = 'JB Hunt';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(11);
    });

    it('should not find match with Cowan', () => {
        const customers = [
            'Pepsi Logistics Company, Inc.',
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
            'Blue Grace',
        ];
        const query = 'Cowan';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(-1);
    });

    it('should find match with cowan logistics, llc (case insensitive)', () => {
        const customers = [
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Cowan',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'Pepsi Logistics Company, Inc.',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
        ];
        const query = 'cowan logistics, llc';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(2);
    });

    it('should find match with TQL (case insensitive)', () => {
        const customers = [
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Cowan',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'Pepsi Logistics Company, Inc.',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
        ];
        const query = 'tql';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(4);
    });

    it('should find match with MIDLINK LOGISTICS', () => {
        const customers = [
            'WORLDWIDE ISCS',
            'Priority 1 Inc.',
            'Cowan',
            'Allen Lund Company',
            'TOTAL QUALITY LOGISTICS (TQL)',
            'Integrity Express Logistics LLC',
            'VarStar Alliance, LLC',
            'Boomerang Transportation',
            'Pepsi Logistics Company, Inc.',
            'C.H. Robinson',
            'Convoy',
            'MIDLINK LOGISTICS',
            'J.B. Hunt Transport, Inc.',
        ];
        const query = 'MidLink LOGISTICS';
        const result = fuzzySearch(query, customers);
        expect(result).toBe(11);
    });
});
