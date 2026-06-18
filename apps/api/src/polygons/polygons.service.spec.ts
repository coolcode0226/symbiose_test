import { NotFoundException } from '@nestjs/common';
import { PolygonsService } from './polygons.service';

describe('PolygonsService', () => {
    const makeService = (query: jest.Mock, analyzer: any) =>
        new PolygonsService({ query } as any, analyzer);

    describe('delete', () => {
        it('returns true when a row is removed', async () => {
            const svc = makeService(jest.fn().mockResolvedValue([{ id: 'p1' }]), { analyze: jest.fn() });
            await expect(svc.delete('u1', 'p1')).resolves.toBe(true);
        });

        it("throws NotFound when the polygon isn't owned/found", async () => {
            const svc = makeService(jest.fn().mockResolvedValue([]), { analyze: jest.fn() });
            await expect(svc.delete('u1', 'p1')).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('save', () => {
        it("degrades to status 'failed' when analysis throws, without failing the request", async () => {
            jest.spyOn(console, 'error').mockImplementation(() => {}); // expected failure log
            const analyzer = { analyze: jest.fn().mockRejectedValue(new Error('boom')) };
            const query = jest
                .fn()
                .mockResolvedValueOnce([{ area: '12.5' }]) // areaHectares()
                .mockResolvedValueOnce([{ id: 'p1' }]) // INSERT ... RETURNING id
                .mockResolvedValueOnce([{ id: 'p1', name: 'x', areaHectares: 12.5, status: 'failed', geometry: {}, analysisResults: null }]); // findOne()
            const svc = makeService(query, analyzer);

            const res = await svc.save('u1', 'x', { type: 'Polygon', coordinates: [] });

            expect(analyzer.analyze).toHaveBeenCalled();
            // INSERT params: [userId, name, geomJson, areaHectares, analysisJson, status]
            const insertParams = query.mock.calls[1][1];
            expect(insertParams[5]).toBe('failed');
            expect(insertParams[4]).toBeNull(); // no analysis persisted on failure
            expect(res.status).toBe('failed');
        });
    });
});
