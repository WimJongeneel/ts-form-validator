import i18next = require("i18next");

interface Rule<a> {
    and: (r: Rule<a>) => Rule<a>
    or: (r: Rule<a>) => Rule<a>
    run: (v: a) => Result
}

// todo: move this to specifix types
interface RuleBuilder {
    is(s: number): Rule<number>
    is(s: Date): Rule<Date>
    required: Rule<string>
    oneOf(s: string, ...as: string[]): Rule<string>
    oneOf(s: boolean, ...as: boolean[]): Rule<boolean>
    oneOf(s: number, ...as: number[]): Rule<number>
}

interface StringRuleBuilder {
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
    afterOr: (d: Date) => Rule<Date>
    after: (d: Date) => Rule<Date>
    before: (d: Date) => Rule<Date>
    beforeOr: (d: Date) => Rule<Date>
    betweenIncuding: (d1: Date, d2: Date) => Rule<Date>
    between: (d1: Date, d2: Date) => Rule<Date>
}

interface BoolRuleBuilder {
    is:(s: boolean) => Rule<boolean>
    true: Rule<boolean>
    false: Rule<boolean>
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
    kind: 'failed', name, data
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

const ruleBuilder: DateRuleBuilder & StringRuleBuilder & BoolRuleBuilder & RuleBuilder = {
    is: (v: any) => rule(a => v == a ? passed : failed('is', {expected: v, given: a, kind: 'is'})),
    max: n => rule(a => n >= a.length ? passed : failed('max', {expected: n, given: a, length: a.length})),
    min: n => rule(a => n <= a.length ? passed : failed('min', {expected: n, given: a, length: a.length,})),
    hasCapital: rule(a => a.toLocaleLowerCase() != a ? passed : failed('hasCapital', {given: a})),
    alphaNumeric: rule(a => /^[a-z0-9]+$/i.test(a) ? passed : failed('alphaNumeric', {given: a})),
    oneOf: (...vs: string[]) => rule(a => vs.some(v => v == a) ? passed :failed('oneOf', {given: a, expected: vs.join(', ')})),
    required: rule<string>(a => !!!a ? passed : failed('required')),
    false: rule(b => b === false ? passed : failed('false')),
    true: rule(b => b === true ? passed : failed('true')),
    email: rule(e => e.includes('@') ? passed : failed('email', {given: e})),
    // todo: implement all other rules
} as DateRuleBuilder & StringRuleBuilder & BoolRuleBuilder & RuleBuilder

interface rule {
    field: string
    rule: Rule<any>
}

type Rules<a> = Partial<{ [k in keyof a]: (b: Builder<a[k]>) => Rule<a[k]> }>

// todo: maybe add result as readonly field for easier debugging in react dev tools?
export interface ValidatorState<a> {
    fields(): Map<string, Result>
    field(field: keyof a): Result | null
    message(field: keyof a): string | null
    clear(field?: keyof a): ValidatorState<a>
    validate(data: a, field?: keyof a): ValidatorState<a>
    error(field: keyof a): boolean
}

export const validator = <a = {}>(rules: Rules<a>): ValidatorState<a> => {
    return {
        field() {
            return null
        },
        message() {
            return null
        },
        clear() {
            return this
        },
        validate(data: a, field?: keyof a) {
            if(field != null && rules[field] == null) return this
            if(field != null) {
                const newResults = new Map<string, Result>()
                newResults.set(field.toString(), rules[field](ruleBuilder as any).run(data[field]))
                return validatorFromResult(rules, newResults)
            }
            
            const newResults = new Map<string, Result>()
            for(const r in rules) newResults.set(r.toString(), rules[r](ruleBuilder as any).run(data[r]))
            return validatorFromResult(rules, newResults)
        },
        error(field) {
            return rules[field] != null
        },
        fields() {
            return new Map()
        }
    }
}

const validatorFromResult = <a = {}>(rules: Rules<a>, results: Map<string, Result>): ValidatorState<a> => ({
    clear: (field) => {
        if(field == null) return validatorFromResult(rules, new Map())
        const newResults = new Map<string, Result>(results.entries())
        console.log(newResults)
        newResults.delete(field.toString())
        return validatorFromResult(rules, newResults)
    },
    field(field) {
        if(results.has(field.toString())) return results.get(field.toString())
    },
    error(field) {
        if(field == null) return results.size != 0
        if(rules[field] == null) return false
        if(results.has(field.toString()) == false) return true
        return results.get(field.toString()).kind == 'failed'
    },
    message(field) {
        if(results.has(field.toString())) {
            const data = results.get(field.toString())
            if(data.kind == 'passed') return null
            // @ts-ignore
            return i18next.default.t(data.name, {...data.data, field, kind: data.name})
        } 
    },
    validate(data, field) {
        if(field != null && rules[field] == null) return this
        if(field != null) {
            const newResults = new Map<string, Result>(results.entries())
            newResults.set(field.toString(), rules[field](ruleBuilder as any).run(data[field]))
            return validatorFromResult(rules, newResults)
        }
        
        const newResults = new Map<string, Result>()
        for(const r in rules) {
            newResults.set(r.toString(), rules[r](ruleBuilder as any).run(data[r]))
        }
        return validatorFromResult(rules, newResults)
    },
    fields() {
        return new Map(results.entries())
    }
})