import {assertEquals, equal} from 'https://deno.land/std/testing/asserts.ts';

type AsyncSuiteBody = (test: Suite) => Promise<void>;
type SyncSuiteBody = (test: Suite) => void;
type SuiteBody = AsyncSuiteBody | SyncSuiteBody;
type AsyncTestBody = () => Promise<void>;
type SyncTestBody = () => void;
type TestBody = AsyncTestBody | SyncTestBody;

function joinName(a: string, b?: string) {
    return [a, b].filter((x) => x).join(' ');
}

export function suite(name: string, cb: AsyncSuiteBody): Promise<void>;
export function suite(name: string, cb: SyncSuiteBody): void;
export function suite(name: string, cb: SuiteBody): Promise<void>|void {
    const namer = (t: Suite) => {
        return t.suite(`${name}:`, cb);
    }
    const suite = new SuiteRegister('', [], namer);

    return namer(suite);
}

export interface Suite {
    test(name: string, cb: AsyncTestBody): Promise<void>|void;
    test(name: string, cb: SyncTestBody): void;
    test(name: string, cb: TestBody): Promise<void>|void;
    suite(name: string, cb: AsyncSuiteBody): Promise<void>|void;
    suite(name: string, cb: SyncSuiteBody): void;
    suite(name: string, cb: SuiteBody): Promise<void>|void;
    later<T>(cb: () => Promise<T>): Promise<T>|T;
}

class SuiteRegister implements Suite {
    private id: number = 0;
    private eof: boolean = false;

    constructor(private name: string, private idPrefix: number[], private cb: (t: Suite) => void) {
    }

    test(name: string, _: TestBody): Promise<void>|void {
        const testName = joinName(this.name, name);
        const thisId = this.idPrefix.concat([this.id++]);
        Deno.test(testName, () => {
            const runner = new SuiteRunner('', [], testName, thisId);
            return this.cb(runner);
        });
    }

    suite(name: string, cb: SuiteBody): Promise<void>|void {
        const thisId = this.idPrefix.concat([this.id++]);
        const testName = joinName(this.name, name);
        const suite = new SuiteRegister(testName, thisId, this.cb);
        return cb(suite);
    }

    later<T>(cb: () => Promise<T>): T {
        return null as any;
    }
}

class SuiteRunner implements Suite {
    private id: number = 0;

    constructor(private name: string, private idPrefix: number[], private filterName: string, private filterId: number[]) {
    }

    test(name: string, cb: TestBody): Promise<void>|void {
        const thisId = this.idPrefix.concat([this.id++]);
        const testName = joinName(this.name, name);
        if (equal(thisId, this.filterId)) {
            assertEquals(testName, this.filterName, `Undeterministic test suite, should run ${JSON.stringify(this.filterName)} but is running ${JSON.stringify(testName)}`);
            return cb();
        }
    }

    suite(name: string, cb: SuiteBody): Promise<void>|void {
        const thisId = this.idPrefix.concat([this.id++]);
        const testName = joinName(this.name, name);
        if (equal(thisId, this.filterId.slice(0, thisId.length))) {
            return cb(new SuiteRunner(testName, thisId, this.filterName, this.filterId));
        }
    }

    later<T>(cb: () => Promise<T>): Promise<T> {
        return cb();
    }
}