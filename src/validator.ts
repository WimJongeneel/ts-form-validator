import i18next = require("i18next");
import React = require("react");
import { Widget, Action, fromJSX, nothing } from "widgets-for-react"
import { Map } from 'immutable'

interface Rule<a> {
    and: (r: Rule<a>) => Rule<a>
    or: (r: Rule<a>) => Rule<a>
    run: (v: a) => Result
}

interface StringRuleBuilder {
    required: Rule<string>
    is(s: string): Rule<string>
    min: (n: number) => Rule<string>
    max: (n: number) => Rule<string>
    contains: (s: string, c?: boolean) => Rule<string>
    containsNot: (s: string, c?: boolean) => Rule<string>
    hasNumber: Rule<string>
    hasLetter: Rule<string>
    hasCapital: Rule<string>
    startsWith: (s: string) => Rule<string>
    startsNotWith: (s: string) => Rule<string>
    endsWith: (s: string) => Rule<string>
    endsNotWith: (s: string) => Rule<string>
    length: (n: number) => Rule<string>
    email: Rule<string>
    url: Rule<string>
    alpha: Rule<string>
    numeric: Rule<string>
    alphaNumeric: Rule<string>
    regex: (r: RegExp) => Rule<string>
}

interface DateRuleBuilder {
    is(s: Date): Rule<Date>
    afterOr: (d: Date) => Rule<Date>
    oneOf(s: Date, ...as: Date[]): Rule<Date>
    after: (d: Date) => Rule<Date>
    before: (d: Date) => Rule<Date>
    beforeOr: (d: Date) => Rule<Date>
    betweenIncuding: (d1: Date, d2: Date) => Rule<Date>
    between: (d1: Date, d2: Date) => Rule<Date>
}

interface BoolRuleBuilder {
    is:(s: boolean) => Rule<boolean>
    oneOf(s: boolean, ...as: boolean[]): Rule<boolean>
    true: Rule<boolean>
    false: Rule<boolean>
}

interface NumberRuleBuilder {
    is(s: number): Rule<number>
    oneOf(s: number, ...as: number[]): Rule<number>
    bigger: (n:number) => Rule<number>
    biggerOr: (n:number) => Rule<number>
    lesser: (n:number) => Rule<number>
    lesserOr: (n:number) => Rule<number>
}

type Builder<a> = 
    a extends string ? StringRuleBuilder :
    a extends boolean ? BoolRuleBuilder :
    a extends Date ? DateRuleBuilder :
    never

type Result = 
    | { kind: 'passed' }
    | { kind: 'failed', name:string, data: object}

const passed: Result = {kind: 'passed'}

const failed = (name: string, data: object = {}): Result => ({
    kind: 'failed', name, data: {...data, name}
})

const rule = <a>(p: (a:a) => Result): Rule<a> => ({
    run: p,
    and(r) {
        return rule(a => {
            const r1 = this.run(a)
            if(r1.kind == 'failed') return r1
            return r.run(a)
        })
    },
    or(r) {
        return rule(a => {
            const r1 = this.run(a)
            if(r1.kind == 'passed') return r1
            return r.run(a)
        })
    },
})

const ruleBuilder: DateRuleBuilder & StringRuleBuilder & BoolRuleBuilder & NumberRuleBuilder = {
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

type Rules<a> = Partial<{ [k in keyof a]: (b: Builder<a[k]>) => Rule<a[k]> }>

interface BaseFieldState<a> {
    /**
     * Run the validation rule for this field
     * @param data      the data for the field
     * @param delay     delay the validation
     */
    validate(data: a, delay?: number): FieldState<a>
    
    /**
     * Has this field passed the validation rule?
     */
    passed(): boolean
    
    /**
     * The validation rule for this field
     */
    rule: Rule<a>

    /**
     * Clears the validation result for this field
     * note: to clear running jobs, schedule new job that returns passed result
     */
    clear(): FieldState<a>

    /**
     * Holds the state for async validators
     */
    jobs: {
        /**
         * Reference to the current running job
         */
        current?: Promise<Result>
        /**
         * The job to be ran next, after the current job completes
         */
        next?: () => Promise<Result>
    }
}

export type FieldState<a> = BaseFieldState<a> & (
    | { kind: 'unvalidated' }
    | { kind: 'validating', job: () => Promise<Result> }
    | { kind: 'validated', result: Result })

export interface ValidatorState<a> {
    /**
     * Contains the state of all the field of a
     */
    fields: Partial<{ [k in keyof a]: FieldState<a> }>

    /**
     * Get the translated error message for a field
     * Returns null if there is no error for the specified field
     * @param field the name of the field
     */
    message(field: keyof a): string | null
    
    /**
     * Validate all fields
     * @param data  the data to validate
     * @param delay the delay for showing the error
     */
    validate(data: a, delay?: number): ValidatorState<a>

    kind(): 'unvalidated' | 'validating' | 'partially validated' | 'validated'

    error(field: keyof a): boolean
}

const unvalidated = <a>(rule: Rule<a>): FieldState<a> => ({
    kind: 'unvalidated',
    rule,
    // todo: keep old jobs
    jobs: {},
    clear() {
        // clear jobs
        // todo: seperate clear updater?
        return unvalidated(this.rule)
    },
    passed() {
        return this.kind == 'validated' && this.result.kind == 'passed'
    },
    validate(data: a) {
        // todo: add logic for async validating
        return validated(this, data)
    }
})

const validated = <a>(a: FieldState<a>, data: a): FieldState<a> => ({
    ...a,
    kind: 'validated',
    result: a.rule.run(data),
})

export const validatorState = <a = {}>(rules: Rules<a>): ValidatorState<a> => {
    
    const fields: Partial<{ [k in keyof a]: FieldState<a> }> = {}

    for(const k in rules) {
        fields[k] = unvalidated(rules[k](ruleBuilder as any) as any)
    }

    return {
        fields,
        kind() {
            const s: ValidatorState<a> = this

            // todo: add logic for validating and partially (if needed?)
            for(const k in s.fields) {
                console.log(s.fields[k])
                if(s.fields[k].kind != 'validated') return 'unvalidated'
            }

            return 'validated'
        },
        message(k) {
            const s: ValidatorState<a> = this
            const data: FieldState<a[typeof k]> = s.fields[k] as any
            if(data.kind != 'validated') return null
            if(data.result.kind == 'passed') return null
            // todo: type translation data object
            // @ts-ignore
            return i18next.default.t(data.result.name, {...data.result.data, field: k, kind: data.result.name})
        },
        validate(data: a) {
            const newS: ValidatorState<a> = {...this}

            for(const k in newS.fields) {
                newS.fields[k] = newS.fields[k].validate(data[k] as any)
            }

            return newS
        },
        error(k) {
            const s: ValidatorState<a> = this
            const field = s.fields[k]

            if(field == null) return false
            if(field.kind != 'validated') return false
            return !field.passed()
        }
    }
}