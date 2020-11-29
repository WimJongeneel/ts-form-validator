import React = require("react")
import { Action, any, fromJSX, onlyIf, promise, Widget } from "widgets-for-react"
import { FieldState, ValidatorState, Result } from "."

/**
 * The IOWidget that contains the statemachine for the validator
 * @param s0    the current ValidatorState<?>
 */
export const validator = <a,>(s0:ValidatorState<a>): Widget<Action<ValidatorState<a>>> => any<Action<ValidatorState<a>>>()(
    Object.keys(s0.fields).map(k => {
        const key = k as keyof a

        return field(s0.fields[key]).map(a => s1 => ({...s1, fields: {...s1.fields, [k]: a(s1.fields[key])}}))
    })
)

/**
 * The IOWidget that contains the statemachine for a single field 
 * @param s0    the current FieldState<?>
 */
const field = <a,>(s0: FieldState<a>): Widget<Action<FieldState<a>>> => any<Action<FieldState<a>>>()([
    jobManager(s0),
    onlyIf(
        s0.jobs.current != null,
        promise<FieldState<a>, Result>(
            s1 => s1.jobs.current, 
            // todo: generic error msg here
            {on_fail: () => console.log('fail') as null}
        )(s0).map(r => s1 => s1.jobs.next == null
            ? ({ ...s1, kind: 'validated', result: r, jobs: { ...s1.jobs, current: null }})
            : ({ ...s1, jobs: { ...s1.jobs, current: null }})
        )
    )
])

/**
 * The IOWidget that manages the async jobs for a a single field
 * @param s0    the current FieldState<?>
 */
const jobManager = <a,>(s0: FieldState<a>): Widget<Action<FieldState<a>>> => fromJSX(c => {
    if(s0.jobs.next != null && s0.jobs.current == null) {
        c(s1 => ({
            ...s1,
            jobs: {
                current: s1.jobs.next(),
                next: null
            }
        }))
    }
    return <></>
})
