import { cleanupTimeString } from '../../../lib/helpers/ratecon-vertex-helpers';

describe('ratecon vertex', () => {
    it('cleanUp string test 1', () => {
        const result = cleanupTimeString('8:00 AM\n04/28/22 3:00 PM');
        expect(result).toBe('8:00 AM - 3:00 PM');
    });
});
