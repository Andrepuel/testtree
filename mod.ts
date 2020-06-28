import {assertEquals, equal} from 'https://deno.land/std/testing/asserts.ts';

type TestContext = (test: Suite) => void;
type TestContext2 = () => /*Promise<void>|*/void;

function joinName(a: string, b?: string) {
    return [a, b].filter((x) => x).join(' ');
}

export function suite(name: string, cb: TestContext): void {
    const namer = (t: Suite) => {
        t.suite(`${name}:`, cb);
    }
    const suite = new SuiteRegister('', [], namer);
    namer(suite);
}

export interface Suite {
    test(name: string, cb: TestContext2): void;
    suite(name: string, cb: TestContext): void;
    later<T>(cb: () => Promise<T>): Promise<T>|T;
}

class SuiteRegister {
    private id: number = 0;
    private eof: boolean = false;

    constructor(private name: string, private idPrefix: number[], private cb: (t: Suite) => void) {
    }

    test(name: string, _: TestContext2) {
        const testName = joinName(this.name, name);
        const thisId = this.idPrefix.concat([this.id++]);
        Deno.test(testName, () => {
            const runner = new SuiteRunner('', [], testName, thisId);
            this.cb(runner);
        });
    }

    suite(name: string, cb: TestContext) {
        const thisId = this.idPrefix.concat([this.id++]);
        const testName = joinName(this.name, name);
        const suite = new SuiteRegister(testName, thisId, this.cb);
        cb(suite);
    }

    later<T>(cb: () => Promise<T>): T {
        return null as any;
    }
}

class SuiteRunner implements Suite {
    private id: number = 0;

    constructor(private name: string, private idPrefix: number[], private filterName: string, private filterId: number[]) {
    }

    test(name: string, cb: TestContext2) {
        const thisId = this.idPrefix.concat([this.id++]);
        const testName = joinName(this.name, name);
        if (equal(thisId, this.filterId)) {
            assertEquals(testName, this.filterName, `Undeterministic test suite, should run ${JSON.stringify(this.filterName)} but is running ${JSON.stringify(testName)}`);
            cb();
        }
    }

    suite(name: string, cb: TestContext) {
        const thisId = this.idPrefix.concat([this.id++]);
        const testName = joinName(this.name, name);
        if (equal(thisId, this.filterId.slice(0, thisId.length))) {
            cb(new SuiteRunner(testName, thisId, this.filterName, this.filterId));
        }
    }

    later<T>(cb: () => Promise<T>): Promise<T> {
        return cb();
    }
}