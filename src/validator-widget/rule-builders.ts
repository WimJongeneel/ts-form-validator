import { failed, passed, rule, SyncRule, Result } from ".";

export interface StringRuleBuilder<root> {

    /**
     * Validates with a custom function
     * @param f     the custom validator function
     */
    custom(f: (v:string, root: root) => Result): SyncRule<root, string>

    /**
     * Validates with the picked validator
     * @param f     the function that picks the rule
     */
    fromState(f: (v:string, root: root) => SyncRule<root, string>): SyncRule<root, string>

    /**
     * Validates if all rules matched
     * @param r     the first rule
     * @param rs    the rest of the rules
     */
    all(r:SyncRule<root, string>, ...rs: SyncRule<root, string>[]): SyncRule<root, string>

    /**
     * Validates if any rule matches
     * @param r     the first rule
     * @param rs    the rest of the rules
     */
    any(r:SyncRule<root, string>, ...rs: SyncRule<root, string>[]): SyncRule<root, string>
    
    /**
     * Validates if this value is equal to another field in a
     * @param k     key of the other field
     */
    equalTo(k: keyof root): SyncRule<root, string>
    
    /**
     * Validates if the field is non-empty
     */
    isRequired: SyncRule<root, string>
   
    /**
     * Validates if the value is equal to the provided value
     * @param s     the string to test the value againts
     */
    is(s: string): SyncRule<root, string>
    
    /**
     * Validates if the value has a min length
     * @param n     the min length
     */
    hasMinLength(n: number): SyncRule<root, string>
    
    /**
     * Validates if the value is below a max length
     * @param n     the max length
     */
    hasMaxLength(n: number): SyncRule<root, string>
    
    /**
     * Validates if the value contains a number
     */
    hasNumber: SyncRule<root, string>
    
    /**
     * Validates if the value contains an a lowercase letter
     */
    hasLetter: SyncRule<root, string>
    
    /**
     * Validates if the value contains a uppercase letter
     */
    hasCapital: SyncRule<root, string>
    
    /**
     * Validates if the value starts with a certain string
     * @param s     the string to test with
     */
    startsWith(s: string): SyncRule<root, string>
    
    /**
     * Validates if the value start not with a certain string
     * @param s     the string to test with
     */
    startsNotWith(s: string): SyncRule<root, string>

    /**
     * Validates if the value ends with a certain string
     * @param s     the string to test with
     */
    endsWith(s: string): SyncRule<root, string>

    /**
     * Validates if the value ends not with a certain string
     * @param s     the string to test with
     */
    endsNotWith(s: string): SyncRule<root, string>

    /**
     * Validates if the value has a certain length
     * @param n     the length of the value
     */
    hasLength(n: number): SyncRule<root, string>

    /**
     * Validates if the value is an email
     */
    isEmail: SyncRule<root, string>

    /**
     * Validates if the value is a valid url
     */
    isUrl: SyncRule<root, string>

    /**
     * Validates if the value only consists of alpha chars
     */
    isAlpha: SyncRule<root, string>

    /**
     * Validates if the value only consists of numeric chars
     */
    isNumeric: SyncRule<root, string>

    /**
     * Validates if the value only consists of alpha and numeric chars
     */
    isAlphaNumeric: SyncRule<root, string>

    /**
     * Validates if the value matches a certain reges
     * @param r     the regex to test the value against
     */
    matchesRegex(r: RegExp): SyncRule<root, string>

    /**
     * Validates if the value is empty
     */
    isEmpty: SyncRule<root, string>

    /**
     * Validates if the value is a valid phone number
     */
    isPhone: SyncRule<root, string>
}

export interface DateRuleBuilder<root> {
    
    /**
     * Validates if the value is equal to a given date
     * @param d     the date to compare with
     */
    is(d: Date): SyncRule<root, Date>

    /**
     * Validates if the value is equal or after a given date
     * @param d     the date to compare with
     */
    afterOr(d: Date): SyncRule<root, Date>

    /**
     * Validates if the value is equal to one of the given dates
     * @param d     the first date to compare with
     * @param as    the rest of the dates to compare with
     */
    oneOf(d: Date, ...as: Date[]): SyncRule<root, Date>

    /**
     * Validates if the value is after a given date
     * @param d     the date to compare with
     */
    after(d: Date): SyncRule<root, Date>

    /**
     * Validates if the value is before a given date
     * @param d     the date to compare with
     */
    before(d: Date): SyncRule<root, Date>

    /**
     * Validates if the value is equal to or before a given date
     * @param d     the date to compare with
     */
    beforeOr(d: Date): SyncRule<root, Date>
}

export interface BoolRuleBuilder<root> {
    /**
     * Validates if the value is true
     */
    isTrue: SyncRule<root, boolean>

    /**
     * validates is the value is false
     */
    isFalse: SyncRule<root, boolean>

    /**
     * Validates if the value is equal to the given boolean
     * @param b     the boolean to compare with
     */
    is(b: boolean): SyncRule<root, boolean>
}

export interface NumberRuleBuilder<root> {
    /**
     * Validates if the value is equal to the given number
     * @param n     the number to compare with
     */
    is(n: number): SyncRule<root, number>

    /**
     * Validates if the value is equal to one of the given numbers
     * @param n     the first number to compare to     
     * @param ns    the other numbers to compare to 
     */
    oneOf(n: number, ...ns: number[]): SyncRule<root, number>

    /**
     * Validates if the value is bigger then a given number
     * @param n     the number to compare with
     */
    bigger(n:number): SyncRule<root, number>

    /**
     * Validates if the value is bigger or equal to a given number
     * @param n     the number to compare with
     */
    biggerOr(n:number): SyncRule<root, number>

    /**
     * Validates if the value is less then a given number
     * @param n     the number to compare with
     */
    lesser(n:number): SyncRule<root, number>

    /**
     * Validates if the value is less or equal to a given number
     * @param n     the number to compare with
     */
    lesserOr(n:number): SyncRule<root, number>
}

/**
 * Mapped type to get a specif builder for a generic a
 */
export type Builder<root, prop> = 
    prop extends string ? StringRuleBuilder<root> :
    prop extends boolean ? BoolRuleBuilder<root> :
    prop extends Date ? DateRuleBuilder<root> :
    never
    
/**
 * Runtime implementation of all the rule builder in one object
 */
export const ruleBuilder: <root>() => DateRuleBuilder<root> & StringRuleBuilder<root> & BoolRuleBuilder<root> & NumberRuleBuilder<root> = () => ({
    
    all:(...r) => r.reduce((v, c) => v.and(c)),

    any:(...r) => r.reduce((v, c) => v.or(c)),

    is:(v:any) => rule<any, any>(a => v == a ? passed : failed('is', {expected: v, given: a, kind: 'is'})),

    hasMaxLength:(n:number) => rule((a:string) => n >= a.length ? passed : failed('max', {expected: n, given: a, length: a.length})),

    hasMinLength:(n:number) => rule((a:string) => n <= a.length ? passed : failed('min', {expected: n, given: a, length: a.length,})),

    hasCapital: rule((a:string) => a.toLocaleLowerCase() != a ? passed : failed('hasCapital', {given: a})),

    isAlphaNumeric: rule((a:string) => /^[a-zA-Z0-9]+$/i.test(a) ? passed : failed('alphaNumeric', {given: a})),

    oneOf:(...vs: any[]) => rule<any, any>(a => vs.some(v => v == a) ? passed :failed('oneOf', {given: a, expected: vs.join(', ')})),

    isRequired: rule(a => (a || '').length > 0 ? passed : failed('required')),

    isFalse: rule(b => b === false ? passed : failed('false')),

    isTrue: rule(b => b === true ? passed : failed('true')),

    isEmail: rule((e:string) => e.includes('@') ? passed : failed('email', {given: e})),

    // todo: date rendering for render data
    after: d => rule(v => d > v ? passed : failed('after', { kind: 'after'})),

    afterOr: d => rule(v => d >= v ? passed : failed('afterOr', { kind: 'afterOr'})),

    beforeOr: d => rule(v => d <= v ? passed : failed('beforeOr', { kind: 'beforeOr'})),

    before: d => rule(v => d < v ? passed : failed('before', { kind: 'before', given: v})),

    bigger: n => rule(v => v > n ? passed : failed('bigger', { kind: 'bigger', given: v})),

    biggerOr: n => rule(v => v > n ? passed : failed('biggerOr', { kind: 'biggerOr', given: v})),

    lesser: n => rule(v => v > n ? passed : failed('lesser', { kind: 'lesser', given: v})),

    lesserOr: n => rule(v => v > n ? passed : failed('lesserOr', { kind: 'lesserOr', given: v})),

    hasLength: n => rule(v => (v || '').length == n ? passed : failed('length', {kind: 'length', given: (v || '').length, expected: n})),

    endsWith: s => rule(v => (v || '').endsWith(s) ? passed: failed('endswith', { kind: 'endswith', given: v, expected: s})),

    endsNotWith: s => rule(v => !(v || '').endsWith(s) ? passed: failed('endsNotWith', { kind: 'endsNotWith', given: v, expected: s})),

    startsWith: s => rule(v => (v || '').startsWith(s) ? passed: failed('startsWith', { kind: 'startsWith', given: v, expected: s})),

    startsNotWith: s => rule(v => !(v || '').startsWith(s) ? passed: failed('startsNotWith', { kind: 'startsNotWith', given: v, expected: s})),

    matchesRegex: r => rule(v => r.test(v) ? passed : failed('regex', {kind: 'regex', given: v})),

    isAlpha: rule(a => /^[a-zA-Z]+$/i.test(a) ? passed : failed('alpha', {kind: 'alpha', given: a})),

    isNumeric: rule(a => /^[0-9]+$/i.test(a) ? passed : failed('numeric', {kind: 'numeric',given: a})),

    hasNumber: rule(a => /[0-9]/.test(a) ? passed : failed('hasNumber', {kind: 'hasNumber',given: a})),

    hasLetter: rule(a => /[a-z]/.test(a) ? passed : failed('hasLetter', {kind: 'hasLetter',given: a})),

    isUrl: rule(v => ((v || '').startsWith('http://') || (v || '').startsWith('https://')) && (v || '').includes('.') ? passed : failed('url', {kind: 'url',given: v})),

    equalTo: (k) => rule((a, r) => (a as any) === r[k] ? passed : failed('equalTo', {kind: 'equalTo', given: a, key: k, other: r[k]})),

    custom: (f) => rule(f),

    isEmpty: rule(a => (a || '').length == 0 ? passed : failed('empty')),

    isPhone: rule(a => /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g.test(a) ? passed : failed('phone')),

    fromState: f => rule((a, r) => f(a, r).run(a, r))
})