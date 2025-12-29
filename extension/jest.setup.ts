import { chrome } from 'jest-chrome';

Object.assign(global as any, { chrome, fetch: jest.fn() });
