import { failed, passed, rule, SyncRule } from ".";

export interface StringRuleBuilder {
    required: SyncRule<string>
    is(s: string): SyncRule<string>
    min: (n: number) => SyncRule<string>
    max: (n: number) => SyncRule<string>
    contains: (s: string, c?: boolean) => SyncRule<string>
    containsNot: (s: string, c?: boolean) => SyncRule<string>
    hasNumber: SyncRule<string>
    hasLetter: SyncRule<string>
    hasCapital: SyncRule<string>
    startsWith: (s: string) => SyncRule<string>
    startsNotWith: (s: string) => SyncRule<string>
    endsWith: (s: string) => SyncRule<string>
    endsNotWith: (s: string) => SyncRule<string>
    length: (n: number) => SyncRule<string>
    email: SyncRule<string>
    url: SyncRule<string>
    alpha: SyncRule<string>
    numeric: SyncRule<string>
    alphaNumeric: SyncRule<string>
    regex: (r: RegExp) => SyncRule<string>
}

export interface DateRuleBuilder {
    is(s: Date): SyncRule<Date>
    afterOr: (d: Date) => SyncRule<Date>
    oneOf(s: Date, ...as: Date[]): SyncRule<Date>
    after: (d: Date) => SyncRule<Date>
    before: (d: Date) => SyncRule<Date>
    beforeOr: (d: Date) => SyncRule<Date>
    betweenIncuding: (d1: Date, d2: Date) => SyncRule<Date>
    between: (d1: Date, d2: Date) => SyncRule<Date>
}

export interface BoolRuleBuilder {
    is:(s: boolean) => SyncRule<boolean>
    oneOf(s: boolean, ...as: boolean[]): SyncRule<boolean>
    true: SyncRule<boolean>
    false: SyncRule<boolean>
}

export interface NumberRuleBuilder {
    is(s: number): SyncRule<number>
    oneOf(s: number, ...as: number[]): SyncRule<number>
    bigger: (n:number) => SyncRule<number>
    biggerOr: (n:number) => SyncRule<number>
    lesser: (n:number) => SyncRule<number>
    lesserOr: (n:number) => SyncRule<number>
}

export type Builder<a> = 
    a extends string ? StringRuleBuilder :
    a extends boolean ? BoolRuleBuilder :
    a extends Date ? DateRuleBuilder :
    never
    
export const ruleBuilder: DateRuleBuilder & StringRuleBuilder & BoolRuleBuilder & NumberRuleBuilder = {
    is: (v:any) => rule(a => v == a ? passed : failed('is', {expected: v, given: a, kind: 'is'})),
    max: (n:number) => rule((a:string) => n >= a.length ? passed : failed('max', {expected: n, given: a, length: a.length})),
    min: (n:number) => rule((a:string) => n <= a.length ? passed : failed('min', {expected: n, given: a, length: a.length,})),
    hasCapital: rule((a:string) => a.toLocaleLowerCase() != a ? passed : failed('hasCapital', {given: a})),
    alphaNumeric: rule((a:string) => /^[a-z0-9]+$/i.test(a) ? passed : failed('alphaNumeric', {given: a})),
    oneOf: (...vs: any[]) => rule(a => vs.some(v => v == a) ? passed :failed('oneOf', {given: a, expected: vs.join(', ')})),
    required: rule<string>(a => !!!a ? passed : failed('required')),
    false: rule(b => b === false ? passed : failed('false')),
    true: rule(b => b === true ? passed : failed('true')),
    email: rule((e:string) => e.includes('@') ? passed : failed('email', {given: e})),
    // todo: implement all other rules
} as any // DateRuleBuilder & StringRuleBuilder & BoolRuleBuilder & NumberRuleBuilder